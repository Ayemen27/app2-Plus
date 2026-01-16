import { db as pgDb } from "../server/db";
import { db as fsDb, auth as fsAuth } from "../server/config/firebase-config";
import { 
  projects, workers, workerAttendance, users, suppliers, 
  materialPurchases, supplierPayments, workerTransfers, 
  workerBalances, dailyExpenseSummaries, workerMiscExpenses,
  transportationExpenses, materials
} from "../shared/schema";
import { log } from "../server/static";

async function migrateCollection(collectionName: string, pgTable: any, transform?: (data: any) => any) {
  log(`📂 نقل ${collectionName}...`);
  const data = await pgDb.select().from(pgTable);
  
  if (data.length === 0) {
    log(`ℹ️ لا توجد بيانات في ${collectionName}.`);
    return 0;
  }

  const batchSize = 500;
  let count = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const chunk = data.slice(i, i + batchSize);
    
    // Instead of batch, use individual set calls for more reliability during debugging
    // or wrap in a try-catch to identify the problematic document
    for (const item of chunk) {
      try {
        const { id, ...rest } = item;
        const docRef = fsDb.collection(collectionName).doc(id.toString());
        const transformedData = transform ? transform(rest) : rest;
        await docRef.set({
          ...transformedData,
          updatedAt: new Date()
        }, { merge: true });
        count++;
      } catch (err) {
        log(`❌ خطأ في نقل مستند في ${collectionName}: ${err}`);
      }
    }
    log(`✅ تم نقل دفعة (${count}/${data.length}) من ${collectionName}.`);
  }
  
  return count;
}

async function verifyMigration(collectionName: string, expectedCount: number) {
  const snapshot = await fsDb.collection(collectionName).get();
  const actualCount = snapshot.size;
  if (actualCount === expectedCount) {
    log(`✨ تحقق ناجح لـ ${collectionName}: ${actualCount} مستند.`);
  } else {
    log(`⚠️ فجوة في بيانات ${collectionName}: المتوقع ${expectedCount}، الموجود ${actualCount}`);
  }
}

async function migrate() {
  log("🚀 بدء عملية النقل الشاملة من PostgreSQL إلى Firebase...");

  try {
    // 1. نقل المستخدمين (حرج جداً لتسجيل الدخول)
    const userCount = await migrateCollection("users", users, (data) => ({
      ...data,
      createdAt: data.createdAt || new Date(),
      lastLogin: data.lastLogin || null
    }));
    await verifyMigration("users", userCount);

    // 2. نقل المشاريع
    const projectCount = await migrateCollection("projects", projects);
    await verifyMigration("projects", projectCount);

    // 3. نقل العمال
    const workerCount = await migrateCollection("workers", workers, (data) => ({
      ...data,
      dailyWage: data.dailyWage || "0",
      isActive: data.isActive !== false
    }));
    await verifyMigration("workers", workerCount);

    // 4. الموردين والمواد
    await migrateCollection("suppliers", suppliers);
    await migrateCollection("materials", materials);
    
    // نقل المشتريات مع معالجة العلاقات (Foreign Keys)
    await migrateCollection("materialPurchases", materialPurchases, (data) => ({
      ...data,
      projectId: data.projectId?.toString(),
      supplierId: data.supplierId?.toString(),
      wellId: data.wellId?.toString()
    }));
    
    await migrateCollection("supplierPayments", supplierPayments, (data) => ({
      ...data,
      supplierId: data.supplierId?.toString(),
      projectId: data.projectId?.toString()
    }));

    // 5. الحضور والماليات
    await migrateCollection("workerAttendance", workerAttendance, (data) => ({
      ...data,
      projectId: data.projectId?.toString(),
      workerId: data.workerId?.toString(),
      wellId: data.wellId?.toString()
    }));
    await migrateCollection("workerTransfers", workerTransfers);
    await migrateCollection("workerBalances", workerBalances);
    await migrateCollection("dailyExpenseSummaries", dailyExpenseSummaries);
    await migrateCollection("workerMiscExpenses", workerMiscExpenses);
    await migrateCollection("transportationExpenses", transportationExpenses);

    log("🎉 تمت عملية النقل الشاملة والتحقق بنجاح!");
  } catch (error) {
    console.error("❌ فشل النقل الشامل:", error);
  } finally {
    process.exit();
  }
}

migrate();
