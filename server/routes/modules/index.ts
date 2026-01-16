/**
 * فهرس الـ Routers المنظمة
 * Organized Routers Index - الحل الاحترافي لتنظيم المسارات
 */

import express from 'express';
import type { Express } from "express";

// استيراد جميع الـ routers المنظمة
import healthRouter from './healthRoutes.js';
import projectRouter from './projectRoutes.js';
import { projectTypeRouter } from './projectTypeRoutes.js';
import wellRouter from './wellRoutes.js';
import wellExpenseRouter from './wellExpenseRoutes.js';
// import sshRoutes from './sshRoutes'; // معطل مؤقتاً بسبب مشكلة ssh2
import workerRouter from './workerRoutes.js';
import financialRouter from './financialRoutes.js';
import autocompleteRouter, { registerAutocompleteAdminRoutes } from './autocompleteRoutes.js';
import notificationRouter from './notificationRoutes.js';
import { reportRouter } from './reportRoutes.js';
import activityRouter from './activityRoutes.js';
import aiRouter from './aiRoutes.js';
import syncRouter from './syncRoutes.js';
import securityRouter from './securityRoutes.js'; // إضافة مسارات الأمان
// authRouter moved to main routes/auth.ts to avoid duplication

/**
 * تسجيل جميع الـ routers المنظمة
 * Register all organized routers
 */
export function registerOrganizedRoutes(app: Express) {
  console.log('🏗️ [OrganizedRoutes] بدء تسجيل المسارات المنظمة...');

  // ===== المسارات العامة - بدون مصادقة =====

  // مسارات الصحة والمراقبة (عامة)
  app.use('/api', healthRouter);

  // ملاحظة: تم نقل مسارات المصادقة إلى routes/auth.ts لتجنب التضارب

  // مسارات autocomplete - منطق مختلط (عام/محمي)
  app.use('/api/autocomplete', autocompleteRouter);

  // مسارات إدارة autocomplete - مسجلة مباشرة على المستوى الرئيسي
  registerAutocompleteAdminRoutes(app);

  // ===== المسارات المحمية - تحتاج مصادقة =====

  // 🤖 مسارات الوكيل الذكي (AI Agent)
  // تم نقلها للأعلى لضمان الأولوية القصوى
  app.use('/api/ai', aiRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الوكيل الذكي: /api/ai');

  // مسارات المشاريع
  app.use('/api/projects', projectRouter);

  // مسارات أنواع المشاريع
  app.use('/api/project-types', projectTypeRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات أنواع المشاريع: /api/project-types');

  // مسارات الآبار
  app.use('/api/wells', wellRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الآبار: /api/wells');

  // مسارات مصاريف الآبار
  app.use('/api/well-expenses', wellExpenseRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات مصاريف الآبار: /api/well-expenses');

  // مسارات العمال - تحتوي على مسارات أساسية ومسارات فرعية
  app.use('/api', workerRouter); // تركيب على /api للمسارات الفرعية مثل worker-attendance

  // المسارات المالية
  app.use('/api', financialRouter); // يحتوي على عدة prefixes

  // مسارات التقارير الاحترافية
  app.use('/api', reportRouter);

  // مسارات آخر الإجراءات
  app.use('/api', activityRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الإجراءات: /api/recent-activities');

  // مسارات الإشعارات
  app.use('/api/notifications', notificationRouter);

  // مسارات المزامنة المتقدمة
  app.use('/api/sync', syncRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات المزامنة المتقدمة: /api/sync');

  // مسارات الأمان
  app.use('/api/security', securityRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الأمان: /api/security');

  console.log('✅ [OrganizedRoutes] تم تسجيل جميع المسارات المنظمة بنجاح');

  // طباعة ملخص المسارات المسجلة
  const routeSummary = {
    publicRoutes: ['health', 'status', 'db/info', 'autocomplete (HEAD/OPTIONS)'],
    protectedRoutes: [
      'projects/*',
      'workers/*', 
      'fund-transfers/*',
      'project-fund-transfers/*',
      'worker-transfers/*',
      'worker-misc-expenses/*',
      'notifications/*',
      'recent-activities',
      'autocomplete (GET/POST)'
    ]
  };

  console.log('📋 [OrganizedRoutes] ملخص المسارات المنظمة:');
  console.log(`   🌐 المسارات العامة: ${routeSummary.publicRoutes.length} مجموعة`);
  console.log(`   🔒 المسارات المحمية: ${routeSummary.protectedRoutes.length} مجموعة`);
}

/**
 * معلومات إضافية عن النظام المنظم
 */
export function getOrganizedRoutesInfo() {
  return {
    version: '2.0.0-organized',
    totalRouters: 6,
    routerTypes: {
      health: 'مسارات الصحة والمراقبة',
      project: 'إدارة المشاريع',
      worker: 'إدارة العمال',
      financial: 'التحويلات المالية',
      autocomplete: 'الإكمال التلقائي',
      notification: 'إدارة الإشعارات'
    },
    features: {
      organizedStructure: true,
      separatedConcerns: true,
      middlewareOptimization: true,
      reducedCodeDuplication: true,
      maintainableArchitecture: true
    },
    nextSteps: [
      'نقل المنطق من الملف الأصلي routes.ts',
      'إضافة validation schemas',
      'تحسين معالجة الأخطاء',
      'إضافة unit tests',
      'إضافة documentation'
    ]
  };
}

/**
 * التحقق من سلامة النظام المنظم
 */
export function validateOrganizedRoutes(): boolean {
  try {
    // فحص أساسي للتأكد من تحميل الـ routers
    const routers = [
      healthRouter,
      projectRouter,
      workerRouter,
      financialRouter,
      autocompleteRouter,
      notificationRouter
    ];

    return routers.every(router => router && typeof router === 'function');
  } catch (error) {
    console.error('❌ [OrganizedRoutes] خطأ في التحقق:', error);
    return false;
  }
}

// تصدير جميع الـ routers للاستخدام المستقل
export {
  healthRouter,
  projectRouter,
  projectTypeRouter,
  wellRouter,
  wellExpenseRouter,
  workerRouter,
  financialRouter,
  autocompleteRouter,
  notificationRouter,
  syncRouter
  // Note: authRouter removed from organized routes to prevent conflicts with main auth.ts
};

export default {
  registerOrganizedRoutes,
  getOrganizedRoutesInfo,
  validateOrganizedRoutes
};