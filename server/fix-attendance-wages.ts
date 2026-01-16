/**
 * سكربت إصلاح سجلات الحضور المتأثرة بتغيير اليومية
 * يقوم بتحديث جميع سجلات الحضور لتتوافق مع اليومية الحالية للعامل
 */

import { db } from './db.js';
import { sql } from 'drizzle-orm';

async function fixAttendanceWages() {
  console.log('🔧 بدء إصلاح سجلات الحضور...\n');

  try {
    // 1. جلب قائمة بالعمال الذين لديهم سجلات حضور بيومية مختلفة عن اليومية الحالية
    console.log('📊 البحث عن السجلات المتأثرة...');
    const affectedRecords = await db.execute(sql`
      SELECT 
        w.id as worker_id,
        w.name as worker_name,
        w.daily_wage as current_wage,
        COUNT(wa.id) as records_count,
        COUNT(DISTINCT wa.daily_wage) as different_wages,
        array_agg(DISTINCT wa.daily_wage) as wages_found
      FROM workers w
      INNER JOIN worker_attendance wa ON w.id = wa.worker_id
      WHERE CAST(wa.daily_wage AS DECIMAL(15,2)) != CAST(w.daily_wage AS DECIMAL(15,2))
      GROUP BY w.id, w.name, w.daily_wage
      ORDER BY w.name
    `);

    if (affectedRecords.rows.length === 0) {
      console.log('✅ لا توجد سجلات تحتاج إلى إصلاح!');
      return;
    }

    console.log(`\n⚠️ تم العثور على ${affectedRecords.rows.length} عامل لديهم سجلات بيومية مختلفة:\n`);
    
    for (const record of affectedRecords.rows) {
      console.log(`👷 العامل: ${record.worker_name}`);
      console.log(`   - اليومية الحالية: ${record.current_wage}`);
      console.log(`   - اليوميات الموجودة في السجلات: ${record.wages_found}`);
      console.log(`   - عدد السجلات المتأثرة: ${record.records_count}`);
      console.log('');
    }

    // 2. تحديث سجلات الحضور لتتوافق مع اليومية الحالية
    // نستخدم work_days الفعلية المحفوظة في السجل (لا نستبدل NULL أو 0 بـ 1)
    console.log('🔄 جاري تحديث سجلات الحضور...\n');

    const updateResult = await db.execute(sql`
      UPDATE worker_attendance wa
      SET 
        daily_wage = w.daily_wage,
        actual_wage = CAST(w.daily_wage AS DECIMAL(15,2)) * wa.work_days,
        total_pay = CAST(w.daily_wage AS DECIMAL(15,2)) * wa.work_days,
        remaining_amount = (CAST(w.daily_wage AS DECIMAL(15,2)) * wa.work_days) - COALESCE(wa.paid_amount, 0)
      FROM workers w
      WHERE wa.worker_id = w.id
        AND CAST(wa.daily_wage AS DECIMAL(15,2)) != CAST(w.daily_wage AS DECIMAL(15,2))
        AND wa.work_days IS NOT NULL
        AND wa.work_days > 0
    `);

    console.log(`✅ تم تحديث ${updateResult.rowCount} سجل حضور بنجاح!`);

    // 3. تحديث أرصدة العمال
    console.log('\n💰 جاري إعادة حساب أرصدة العمال...');

    await db.execute(sql`
      UPDATE worker_balances wb
      SET 
        total_earned = COALESCE((
          SELECT SUM(CAST(total_pay AS DECIMAL(15,2)))
          FROM worker_attendance wa
          WHERE wa.worker_id = wb.worker_id AND wa.project_id = wb.project_id
        ), 0),
        current_balance = COALESCE((
          SELECT SUM(CAST(total_pay AS DECIMAL(15,2)))
          FROM worker_attendance wa
          WHERE wa.worker_id = wb.worker_id AND wa.project_id = wb.project_id
        ), 0) - wb.total_paid - wb.total_transferred,
        last_updated = NOW()
    `);

    console.log('✅ تم تحديث أرصدة العمال بنجاح!');

    // 4. التحقق من النتائج
    console.log('\n📋 التحقق من النتائج...');
    
    const verifyResult = await db.execute(sql`
      SELECT 
        w.name as worker_name,
        w.daily_wage as current_wage,
        COUNT(wa.id) as total_records,
        SUM(CAST(wa.total_pay AS DECIMAL(15,2))) as total_earned
      FROM workers w
      INNER JOIN worker_attendance wa ON w.id = wa.worker_id
      WHERE w.id IN (${sql.raw(affectedRecords.rows.map(r => `'${r.worker_id}'`).join(','))})
      GROUP BY w.id, w.name, w.daily_wage
      ORDER BY w.name
    `);

    console.log('\n📊 ملخص النتائج بعد الإصلاح:\n');
    for (const record of verifyResult.rows) {
      console.log(`👷 ${record.worker_name}:`);
      console.log(`   - اليومية: ${record.current_wage}`);
      console.log(`   - عدد أيام العمل: ${record.total_records}`);
      console.log(`   - إجمالي المستحقات: ${record.total_earned}`);
      console.log('');
    }

    console.log('\n🎉 تم الإصلاح بنجاح!');

  } catch (error) {
    console.error('❌ خطأ أثناء الإصلاح:', error);
    throw error;
  }
}

// تشغيل السكربت
fixAttendanceWages()
  .then(() => {
    console.log('\n✅ اكتمل السكربت بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكربت:', error);
    process.exit(1);
  });
