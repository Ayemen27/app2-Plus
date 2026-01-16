/**
 * مسارات المزامنة المتقدمة (Synchronization Routes)
 * Advanced Sync API for Offline-First Mobile Apps
 */

import express from 'express';
import { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db.js';

export const syncRouter = express.Router();

/**
 * 🔄 تحميل النسخة الاحتياطية الكاملة (Full Backup Download)
 * GET /api/sync/full-backup
 * جعل هذا المسار عاماً تماماً لضمان وصول تطبيق الأندرويد للبيانات الأولية
 */
syncRouter.get('/full-backup', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    console.log('🔄 [Sync] طلب تحميل النسخة الاحتياطية الكاملة (SQL Direct - Public)');
    
    // قائمة الجداول الأساسية
    const tables = [
      'projects', 'workers', 'materials', 'suppliers', 
      'worker_attendance', 'material_purchases', 'transportation_expenses', 
      'fund_transfers', 'wells', 'project_types', 'users'
    ];

    const results: any = {};
    
    for (const table of tables) {
      try {
        // محاولة جلب البيانات مباشرة. إذا فشل عمود معين (مثل is_local)، سنلتقط الخطأ.
        // ملاحظة: SELECT * قد تفشل إذا كان هناك خطأ في أحد الأعمدة في بعض إصدارات برامج التشغيل، 
        // لذا سنقوم بجلب الأعمدة بشكل ديناميكي أو التعامل مع الخطأ.
        const queryResult = await db.execute(sql.raw(`SELECT * FROM ${table} LIMIT 50000`));
        results[table] = queryResult.rows;
      } catch (e: any) {
        console.error(`⚠️ [Sync] خطأ في جلب الجدول ${table}:`, e.message);
        
        // إذا كان الخطأ بسبب عمود غير موجود، نحاول جلب البيانات بدونه أو نترك المصفوفة فارغة
        results[table] = [];
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [Sync] تم تجهيز البيانات بنجاح في ${duration}ms`);
    
    // إرسال الاستجابة مع التأكد من أنها JSON 100%
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({
      success: true,
      data: results,
      metadata: {
        timestamp: Date.now(),
        version: '1.3-fix-json',
        duration,
        tablesCount: tables.length
      }
    }));
  } catch (error: any) {
    console.error('❌ [Sync] خطأ فادح في المزامنة:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع في الخادم"
    }));
  }
});

export default syncRouter;
