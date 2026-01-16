
import { db as pgDb } from "../db";
import { db as firestore } from "../config/firebase-config";
import * as schema from "@shared/schema";
import { count } from "drizzle-orm";

async function compareAndReport() {
  console.log("📊 بدء عملية المقارنة الدقيقة بين PostgreSQL و Firestore...");
  
  const tables = [
    { name: "users", table: schema.users },
    { name: "projects", table: schema.projects },
    { name: "workers", table: schema.workers },
    { name: "wells", table: schema.wells },
    { name: "materials", table: schema.materials },
    { name: "suppliers", table: schema.suppliers },
    { name: "material_purchases", table: schema.materialPurchases },
    { name: "supplier_payments", table: schema.supplierPayments },
    { name: "fund_transfers", table: schema.fundTransfers },
    { name: "transportation_expenses", table: schema.transportationExpenses },
    { name: "worker_attendance", table: schema.workerAttendance },
    { name: "worker_transfers", table: schema.workerTransfers },
    { name: "worker_balances", table: schema.workerBalances },
    { name: "daily_expense_summaries", table: schema.dailyExpenseSummaries },
    { name: "worker_misc_expenses", table: schema.workerMiscExpenses }
  ];

  const report = [];

  for (const item of tables) {
    try {
      // Get count from PG
      const pgCountResult = await pgDb.select({ value: count() }).from(item.table);
      const pgCount = Number(pgCountResult[0].value);

      // Get count from Firestore
      const firestoreSnapshot = await firestore.collection(item.name).get();
      const firestoreCount = firestoreSnapshot.size;

      const diff = pgCount - firestoreCount;
      
      report.push({
        table: item.name,
        postgresql: pgCount,
        firestore: firestoreCount,
        missing: diff > 0 ? diff : 0
      });

      if (diff > 0) {
        console.log(`⚠️ فجوة بيانات في ${item.name}: مفقود ${diff} سجل.`);
      } else {
        console.log(`✅ تطابق تام في ${item.name}.`);
      }
    } catch (error) {
      console.error(`❌ خطأ أثناء مقارنة ${item.name}:`, error.message);
    }
  }

  console.table(report);
  
  const totalMissing = report.reduce((acc, curr) => acc + curr.missing, 0);
  if (totalMissing > 0) {
    console.log(`\n🚨 إجمالي السجلات المفقودة عبر جميع الجداول: ${totalMissing}`);
  } else {
    console.log("\n🎉 تم التحقق: تطابق تام 100% بين القاعدتين.");
  }
}

compareAndReport().then(() => process.exit(0));
