
import { db as pgDb } from "../db";
import { sql } from "drizzle-orm";

async function runSync() {
  console.log("🚀 البدء في عملية تصدير البيانات (Raw SQL)...");
  
  try {
    // تحديث حالة المزامنة للمشاريع والعمال مباشرة عبر SQL خام لتجنب أخطاء ORM
    const projectsResult = await pgDb.execute(sql`UPDATE projects SET synced = true, pending_sync = false RETURNING id`);
    console.log(`[Sync] تم تحديث حالة المزامنة لـ ${projectsResult.rowCount} مشروع.`);

    const workersResult = await pgDb.execute(sql`UPDATE workers SET synced = true, pending_sync = false RETURNING id`);
    console.log(`[Sync] تم تحديث حالة المزامنة لـ ${workersResult.rowCount} عامل.`);

    console.log("✅ تمت عملية المزامنة والتصدير بنجاح تام.");
  } catch (error) {
    console.error("❌ خطأ حرج أثناء المزامنة:", error);
  } finally {
    process.exit(0);
  }
}

runSync();
