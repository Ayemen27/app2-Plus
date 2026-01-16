
import { db as pgDb } from "../db";
import { db as firestore } from "../config/firebase-config";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

async function migrateCollection(tableName: string, pgTable: any, collectionName: string) {
  console.log(`🚀 البدء في نقل جدول ${tableName} إلى Firestore...`);
  
  try {
    // محاولة "تنبيه" Firestore عن طريق كتابة سجل تجريبي
    await firestore.collection(collectionName).doc("_init_").set({ init: true });
    await firestore.collection(collectionName).doc("_init_").delete();

    // 1. جلب كافة البيانات من PostgreSQL
    const records = await pgDb.select().from(pgTable);
    console.log(`📦 تم العثور على ${records.length} سجل في ${tableName}.`);

    if (records.length === 0) return;

    // 2. النقل إلى Firestore باستخدام Batch لضمان السرعة والأمان
    const batch = firestore.batch();
    let count = 0;

    for (const record of records) {
      const docRef = firestore.collection(collectionName).doc(String(record.id));
      
      // تحويل البيانات لتناسب Firestore (مثل التواريخ)
      const data = { ...record };
      Object.keys(data).forEach(key => {
        if (data[key] instanceof Date) {
          data[key] = data[key].toISOString();
        }
        if (data[key] === null) {
          delete data[key]; // Firestore لا يفضل التخزين الفارغ
        }
      });

      batch.set(docRef, data, { merge: true });
      count++;

      // Firestore batch limit is 500
      if (count === 499) {
        await batch.commit();
        console.log(`✅ تم نقل دفعة من 500 سجل لـ ${tableName}`);
      }
    }

    await batch.commit();
    console.log(`✨ اكتمل نقل ${count} سجل إلى مجموعة ${collectionName}.`);

    // 3. تحديث حالة المزامنة في PostgreSQL
    await pgDb.execute(sql`UPDATE ${sql.identifier(tableName)} SET synced = true, pending_sync = false`);
    
  } catch (error) {
    console.error(`❌ خطأ أثناء نقل ${tableName}:`, error);
    throw error;
  }
}

async function compareAndMigrateTable(tableName: string, pgTableName: string) {
  console.log(`🔍 جاري فحص ومقارنة الجدول: ${tableName} (${pgTableName})`);
  
  try {
    // 1. جلب البيانات من PostgreSQL
    const pgRecords = await pgDb.execute(sql`SELECT * FROM ${sql.identifier(pgTableName)}`);
    console.log(`📦 سجلات PostgreSQL: ${pgRecords.rows.length}`);

    // 2. جلب البيانات الحالية من Firestore للمقارنة
    const fsSnapshot = await firestore.collection(tableName).get();
    const fsDataMap = new Map();
    fsSnapshot.docs.forEach(doc => fsDataMap.set(doc.id, doc.data()));
    console.log(`🔥 سجلات Firestore الحالية: ${fsSnapshot.size}`);

    let migratedCount = 0;
    let skippedCount = 0;
    let batch = firestore.batch();
    let batchSize = 0;

    for (const record of pgRecords.rows) {
      const docId = record.id ? String(record.id) : null;
      if (!docId) {
        console.warn(`⚠️ تخطي سجل بدون معرف في ${pgTableName}`);
        continue;
      }

      const existingFsData = fsDataMap.get(docId);
      const dataToSync: any = { ...record };
      
      // تحويل البيانات لتناسب Firestore
      Object.keys(dataToSync).forEach(key => {
        if (dataToSync[key] instanceof Date) dataToSync[key] = dataToSync[key].toISOString();
        if (dataToSync[key] === null) delete dataToSync[key];
      });

      // مقارنة السجل: هل نحتاج لتحديثه؟
      const needsUpdate = !existingFsData || JSON.stringify(dataToSync) !== JSON.stringify(existingFsData);

      if (needsUpdate) {
        const docRef = firestore.collection(tableName).doc(docId);
        batch.set(docRef, dataToSync, { merge: true });
        batchSize++;
        migratedCount++;

        if (batchSize >= 400) {
          await batch.commit();
          batch = firestore.batch();
          batchSize = 0;
          console.log(`✅ تم إرسال دفعة تحديث لـ ${tableName}`);
        }
      } else {
        skippedCount++;
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    console.log(`✨ نتيجة ${tableName}: تم نقل/تحديث ${migratedCount}، تم تخطي ${skippedCount} (مطابق).`);
  } catch (error) {
    console.error(`❌ خطأ في مقارنة جدول ${tableName}:`, error);
  }
}

async function startAutoMigration() {
  console.log("🛠️ بدء عملية المزامنة والمقارنة الدقيقة...");
  try {
    const allTables = Object.keys(schema).filter(key => {
      const exportItem = (schema as any)[key];
      return exportItem && typeof exportItem === 'object' && 'id' in exportItem && exportItem.constructor.name === 'PgTable';
    });

    const priorityTables = ["users", "projects", "workers", "materials", "suppliers", "worker_types"];
    const remainingTables = allTables.filter(t => !priorityTables.includes(t));
    const sortedTables = [...priorityTables, ...remainingTables];

    for (const tableName of sortedTables) {
      const pgTableName = tableName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      // التحقق من وجود الجدول في Postgres
      const tableCheck = await pgDb.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${pgTableName}
        ) OR EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${tableName}
        ) as exists
      `);

      if (tableCheck.rows[0].exists) {
        const actualPgName = (await pgDb.execute(sql`SELECT FROM information_schema.tables WHERE table_name = ${pgTableName}`)).rows.length > 0 
          ? pgTableName : tableName;
        
        await compareAndMigrateTable(tableName, actualPgName);
      } else {
        console.warn(`⚠️ الجدول ${tableName} غير موجود في PostgreSQL.`);
      }
    }
    console.log("🏁 اكتملت عملية المزامنة والمقارنة الشاملة.");
  } catch (error) {
    console.error("💀 خطأ حرج:", error);
  } finally {
    process.exit(0);
  }
}

startAutoMigration();
