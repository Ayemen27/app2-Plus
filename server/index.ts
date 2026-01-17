import express, { type Request, Response, NextFunction } from "express";
import { initializeEnvironment } from './utils/env-loader';
// تهيئة البيئة فوراً قبل أي استيراد آخر
initializeEnvironment();

import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { serveStatic, log } from "./static";
import "./db"; // ✅ تشغيل نظام الأمان وإعداد اتصال قاعدة البيانات
import authRoutes from './routes/auth.js';
import { permissionsRouter } from './routes/permissions';
import { initializeRouteOrganizer } from './routes/routerOrganizer.js';
import { registerRoutes } from "./routes.js";
import { storage } from "./FirebaseStorage.js";
import { db as firestoreDb } from "./config/firebase-config.js";
// sshRoutes removed - not needed
import { compressionMiddleware, cacheHeaders, performanceHeaders } from "./middleware/compression";
import { generalRateLimit, trackSuspiciousActivity, securityHeaders, requireAuth } from "./middleware/auth";
import { runSchemaCheck, getAutoPushStatus } from './auto-schema-push';
import { startAutoBackupScheduler, getAutoBackupStatus, triggerManualBackup, listAutoBackups } from './auto-backup-scheduler';
import { db } from './db.js';
import { users } from '@shared/schema';
import { monitoringService } from './services/monitoring.js';
import http from 'http';
import { Server } from 'socket.io';
import compression from "compression"; // Import compression

// Assume setupSession is defined elsewhere and imported
// For demonstration purposes, let's define a placeholder if it's not in the original snippet
const setupSession = (app: express.Express) => {
  // Placeholder for session setup
  console.log("Session setup placeholder");
};


const app = express();

// 🛡️ Relax security headers for production/deployment stability (Cloudflare Compatible)
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  if (req.path.endsWith('.tsx') || req.path.endsWith('.ts') || req.path.endsWith('.jsx')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }

  const cspConfig = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://*.binarjoinanelytic.info https://static.cloudflareinsights.com https://*.cloudflare.com https://cdn-cgi.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https: https://*.google-analytics.com https://*.googletagmanager.com",
    "connect-src 'self' wss://*.replit.dev https://*.googleapis.com https://*.binarjoinanelytic.info https://*.cloudflareinsights.com https://*.cloudflare.com https://*.firebaseio.com wss://*.firebaseio.com",
    "worker-src 'self' blob:"
  ];

  // Add dynamic domain to connect-src if in production
  if (process.env.DOMAIN) {
    const domain = process.env.DOMAIN.replace(/\/$/, '');
    cspConfig[5] = `${cspConfig[5]} ${domain} ${domain}:6000`;
  }

  res.setHeader('Content-Security-Policy', cspConfig.join('; ') + ';');
  next();
});

// اكتشاف البيئة تلقائياً
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';
const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : process.env.DOMAIN;
const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || 'https://app2.binarjoinanelytic.info';
const PORT = Number(process.env.PORT) || 5000;

// ✅ DYNAMIC CORS Configuration
const getAllowedOrigins = (req?: Request) => {
  const origins = [
    `http://localhost:${PORT}`,
    'http://localhost:3000',
    `http://127.0.0.1:${PORT}`,
    PRODUCTION_DOMAIN,
    REPLIT_DOMAIN
  ].filter(Boolean) as string[];

  // في بيئة التطوير، نسمح بالدومين الحالي ديناميكياً
  if (!isProduction && req && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] === 'https' || req.secure ? 'https' : 'http';
    origins.push(`${protocol}://${req.headers.host}`);
  }

  if (process.env.DOMAIN) {
    origins.push(process.env.DOMAIN.replace(/\/$/, ''));
  }

  return origins;
};

app.use(cors({
  origin: (origin, callback) => {
    // طلبات بدون origin (mobile app, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }

    // في الإنتاج، نتحقق بصرامة من الدومين المسموح
    if (isProduction) {
      const allowed = origin === PRODUCTION_DOMAIN || (origin.includes('binarjoinanelytic.info') && !origin.includes('binerjoinanelytic.info'));
      callback(null, allowed);
      return;
    }

    // في التطوير، نكون أكثر مرونة
    const allowedOrigins = getAllowedOrigins();
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.replit.dev') || 
                      origin.endsWith('.replit.app') ||
                      origin.includes('binarjoinanelytic.info');

    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Auth-Token',
    'x-auth-token',
    'Accept',
    'Origin',
    'x-device-type',
    'x-device-name'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200,
  maxAge: 86400
}));

// ✅ Handle preflight requests explicitly
app.options('*', cors());

// 🔧 **Fix trust proxy for rate limiting**
app.set("trust proxy", 1);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(compressionMiddleware);
app.use(performanceHeaders);

// ⚙️ **تطبيق الـ middleware الشاملة**
// تم تعطيل generalRateLimit مؤقتاً لحل مشكلة استجابة HTML بدلاً من JSON
// app.use(generalRateLimit);
app.use(trackSuspiciousActivity);
app.use(securityHeaders);

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io instance globally for mutations
(global as any).io = io;

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('🔌 [WebSocket] عميل متصل:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 [WebSocket] عميل قطع الاتصال:', socket.id);
  });
});

// ✅ **Routes Registration**
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "2.0.0-organized"
  });
});

// ✅ **Schema Status Endpoint**
app.get("/api/schema-status", requireAuth, (req: Request, res: Response) => {
  try {
    const status = getAutoPushStatus() as any;
    res.json({
      success: true,
      data: {
        enabled: status.enabled,
        autoFixEnabled: status.autoFixEnabled,
        lastRun: status.lastRun,
        hoursSinceLastRun: status.hoursSinceLastRun ? Math.round(status.hoursSinceLastRun * 10) / 10 : null,
        lastCheck: status.lastCheck ? {
          isConsistent: status.lastCheck.isConsistent,
          missingTables: (status.lastCheck.missingTables || []).length,
          missingColumns: (status.lastCheck.missingColumns || []).length,
          fixableIssues: status.lastCheck.fixableIssues,
          criticalIssues: status.lastCheck.criticalIssues
        } : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ **Backup Status Endpoints**
app.get("/api/backups/status", requireAuth, (req: Request, res: Response) => {
  try {
    const status = getAutoBackupStatus();
    res.json({
      success: true,
      data: {
        ...status,
        nextBackupInMinutes: Math.round(status.nextBackupIn / 60000),
        lastBackupSizeMB: status.lastBackupSize ? (status.lastBackupSize / 1024 / 1024).toFixed(2) : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/backups/list", requireAuth, (req: Request, res: Response) => {
  try {
    const backups = listAutoBackups();
    res.json({
      success: true,
      data: backups.map(b => ({
        ...b,
        sizeMB: (b.size / 1024 / 1024).toFixed(2)
      })),
      total: backups.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/backups/trigger", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await triggerManualBackup();
    if (result.success) {
      res.json({
        success: true,
        message: 'تم إنشاء النسخة الاحتياطية بنجاح',
        data: {
          file: result.file,
          sizeMB: (result.size / 1024 / 1024).toFixed(2),
          tables: result.tablesCount,
          rows: result.rowsCount,
          durationSeconds: (result.duration / 1000).toFixed(1)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل إنشاء النسخة الاحتياطية'
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Use auth routes
console.log('🔗 [Server] تسجيل مسارات المصادقة على /api/auth');
app.use("/api/auth", authRoutes);

// ✅ تسجيل مسارات المزامنة بأولوية مطلقة قبل أي توجيه آخر
import { sql } from 'drizzle-orm';
app.all("/api/sync/full-backup", async (req, res) => {
  try {
    const tables = ['projects', 'workers', 'materials', 'suppliers', 'worker_attendance', 'material_purchases', 'transportation_expenses', 'fund_transfers', 'wells', 'project_types', 'users'];
    const results: any = {};
    for (const table of tables) {
      try {
        const queryResult = await db.execute(sql.raw(`SELECT * FROM ${table} LIMIT 50000`));
        results[table] = queryResult.rows;
      } catch (e) { results[table] = []; }
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ success: true, data: results });
  } catch (error: any) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Use permissions routes
app.use("/api/permissions", permissionsRouter);

// Register old routes for compatibility
(global as any).storage = storage;
(global as any).db = firestoreDb;
registerRoutes(app);

// Initialize route organizer
initializeRouteOrganizer(app);

// ✅ تسجيل مسار قائمة المستخدمين (للاستخدام في اختيار المهندس)
app.get("/api/users/list", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('📊 [API] جلب قائمة المستخدمين');
    const usersList = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
    }).from(users).orderBy(users.firstName);
    
    const usersWithName = usersList.map(user => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      role: user.role,
    }));
    
    console.log(`✅ [API] تم جلب ${usersWithName.length} مستخدم`);
    res.json({ 
      success: true, 
      data: usersWithName,
      message: `تم جلب ${usersWithName.length} مستخدم بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب المستخدمين:', error);
    res.status(500).json({ 
      success: false, 
      data: [], 
      error: error.message,
      message: "فشل في جلب قائمة المستخدمين"
    });
  }
});

// Setup vite dev server if in development
if (process.env.NODE_ENV === "development") {
  import("./vite.js").then(({ setupVite }) => {
    setupVite(app, server);
  }).catch((err) => {
    console.error('❌ فشل تحميل خادم Vite:', err);
  });
} else {
  // Setup static files ONLY in production
  serveStatic(app);
}

// ✅ **Error Handler Middleware** - Moved after static/vite
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // ضمان إرجاع JSON لمسارات API دائماً
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ 
      success: false, 
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
  
  res.status(status).send(message);
});

// ✅ **404 Handler for API**
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `المسار غير موجود: ${req.originalUrl}` 
  });
});

// ALWAYS serve the app on the port specified in the environment variable PORT
// Other ports are firewalled. Default to 5000 if not specified.
// this serves both the API and the client.
// It is the only port that is not firewalled.

// تم تعريف PORT في الأعلى بناءً على البيئة
// في Replit، يتم تجاهل PORT المخصص أحياناً، لذا نتحقق من متغير البيئة أولاً
const FINAL_PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || (isProduction ? 'production' : 'development');

console.log('🚀 بدء تشغيل الخادم...');
console.log('📂 مجلد العمل:', process.cwd());
console.log('🌐 المنفذ:', FINAL_PORT);
console.log('🔧 بيئة التشغيل:', NODE_ENV);

(async () => {
  try {
    const serverInstance = server.listen(FINAL_PORT, "0.0.0.0", async () => {
      log(`serving on port ${FINAL_PORT}`);
      console.log('✅ Socket.IO server متشغل');

      // ✅ Start monitoring service
      monitoringService.startMonitoring(60000);

      // ✅ تشغيل نظام النسخ الاحتياطي التلقائي
      // تعديل: تشغيل النسخ الاحتياطي بعد فترة أطول لتقليل الحمل عند بدء التشغيل
      setTimeout(() => {
        startAutoBackupScheduler();
      }, 60000); // الانتظار دقيقة كاملة قبل بدء الجدولة

      // ✅ نظام فحص المخطط - يعمل بوضع القراءة فقط مع timeout
      setTimeout(async () => {
        const SCHEMA_CHECK_TIMEOUT = 15000; // 15 ثانية كحد أقصى
        console.log('🔍 [Schema Check] بدء فحص توافق المخطط مع قاعدة البيانات...');
        
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Schema check timeout')), SCHEMA_CHECK_TIMEOUT);
        });
        
        try {
          const result = await Promise.race([runSchemaCheck(), timeoutPromise]) as any;
          if (result) {
            if (result.isConsistent) {
              console.log('✅ [Schema Check] المخطط متوافق تماماً مع قاعدة البيانات');
            } else {
              console.log(`⚠️ [Schema Check] اختلافات: ${(result.missingTables || []).length} جداول مفقودة، ${(result.missingColumns || []).length} أعمدة مفقودة`);
              if (result.issues && result.issues.length > 0) {
                console.log('   أول 3 مشاكل:');
                result.issues.slice(0, 3).forEach((issue: any) => {
                  console.log(`   - [${issue.severity}] ${issue.description}`);
                });
              }
            }
          }
        } catch (error: any) {
          if (error.message === 'Schema check timeout') {
            console.log('⏱️ [Schema Check] تم تجاوز وقت الفحص - سيستمر الخادم بدون انتظار');
          } else {
            console.error('⚠️ [Schema Check] خطأ في الفحص:', error.message);
          }
        }
      }, 3000);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      serverInstance.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ خطأ في بدء الخادم:', error);
    process.exit(1);
  }
})();