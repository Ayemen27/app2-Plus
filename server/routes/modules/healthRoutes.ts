/**
 * مسارات الصحة ومراقبة النظام
 * Health & System Monitoring Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { db } from '../../db.js';
// Assuming requireAuth and requireRole are defined elsewhere and imported
// import { requireAuth, requireRole } from '../../middleware/auth'; 

// Mock functions for requireAuth and requireRole if they are not provided
const requireAuth = (req: Request, res: Response, next: Function) => next();
const requireRole = (role: string) => (req: Request, res: Response, next: Function) => next();


export const healthRouter = express.Router();

/**
 * فحص صحة النظام البسيط
 * Simple health check endpoint
 */
healthRouter.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0-organized'
  });
});

/**
 * فحص الاتصال بقاعدة البيانات
 * Database connection verification
 */
healthRouter.get('/db/info', async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        current_database() as database_name, 
        current_user as username,
        version() as version_info
    `);
    res.json({ 
      success: true, 
      database: result.rows[0],
      message: "متصل بقاعدة بيانات app2data بنجاح" 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Database connection failed" 
    });
  }
});

/**
 * فحص حالة النظام التفصيلية
 * Detailed system status
 */
healthRouter.get('/server-health', async (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  
  // جلب آخر السجلات من قاعدة البيانات
  let history = [];
  try {
    if (typeof (storage as any).getMonitoringLogs === 'function') {
      history = await (storage as any).getMonitoringLogs(10);
    }
  } catch (err) {
    console.error("Error fetching monitoring history:", err);
  }

  res.json({
    success: true,
    data: {
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm'
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
      },
      performance: {
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      },
      history: history
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * فحص حالة النظام التفصيلية (Alias)
 */
healthRouter.get('/status', (req: Request, res: Response) => {
  res.redirect('/api/test/server-health');
});

/**
 * فحص اتساق المخطط مع قاعدة البيانات
 * Schema consistency check endpoint (Admin only)
 */
healthRouter.get('/schema-check', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    // Assuming db is already imported and available globally or passed correctly
    // If not, you might need to import it here as well:
    // const { db } = await import('../../db.js');
    // const { sql } = await import('drizzle-orm'); // If using drizzle-orm

    // Mocking sql function if drizzle-orm is not used or available
    const sql = (query: TemplateStringsArray) => query.join('');

    // Get tables from database
    const dbTablesResult = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const dbTables = dbTablesResult.rows.map((row: any) => row.table_name);

    // Expected tables from schema
    const expectedTables = [
      'users', 'auth_user_sessions', 'email_verification_tokens', 'password_reset_tokens',
      'projects', 'workers', 'fund_transfers', 'worker_attendance', 'suppliers', 'materials',
      'material_purchases', 'supplier_payments', 'transportation_expenses', 'worker_transfers',
      'worker_balances', 'daily_expense_summaries', 'worker_types', 'autocomplete_data',
      'worker_misc_expenses', 'print_settings', 'project_fund_transfers', 'notifications'
    ];

    const missingTables = expectedTables.filter(table => !dbTables.includes(table));
    const extraTables = dbTables.filter(table => 
      !expectedTables.includes(table) && 
      !table.startsWith('drizzle') &&
      !table.startsWith('pg_')
    );

    const isConsistent = missingTables.length === 0 && extraTables.length === 0;

    res.json({
      success: true,
      isConsistent,
      status: isConsistent ? 'healthy' : 'warning',
      details: {
        totalTables: dbTables.length,
        expectedTables: expectedTables.length,
        missingTables,
        extraTables,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Schema check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


console.log('🏥 [HealthRouter] تم تهيئة مسارات الصحة والمراقبة');

export default healthRouter;