
import express from 'express';
import { db } from '../../db';
import { 
  fundTransfers, 
  projectFundTransfers, 
  workerTransfers,
  workerMiscExpenses,
  materialPurchases,
  users,
  projects
} from '@shared/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// جلب آخر الإجراءات
router.get('/recent-activities', authenticate, async (req, res) => {
  console.log('🔍 [API] تم استقبال طلب: GET /api/recent-activities');
  try {
    const { projectId } = req.query;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log('📊 [API] جلب آخر الإجراءات:', { projectId, limit });

    // جمع البيانات من جداول مختلفة
    const activities: any[] = [];

    // 1. تحويلات الصندوق
    const transfers = await db
      .select({
        id: fundTransfers.id,
        amount: fundTransfers.amount,
        createdAt: fundTransfers.createdAt,
        projectId: fundTransfers.projectId,
        projectName: projects.name,
      })
      .from(fundTransfers)
      .leftJoin(projects, eq(fundTransfers.projectId, projects.id))
      .orderBy(desc(fundTransfers.createdAt))
      .limit(limit);

    activities.push(...transfers.map(t => ({
      ...t,
      actionType: 'fund_transfer',
      actionLabel: 'تحويل للصندوق',
      userName: 'النظام',
      description: 'إيداع في الصندوق'
    })));

    // 2. تحويلات المشاريع
    const projectTransfers = await db
      .select({
        id: projectFundTransfers.id,
        amount: projectFundTransfers.amount,
        createdAt: projectFundTransfers.createdAt,
      })
      .from(projectFundTransfers)
      .orderBy(desc(projectFundTransfers.createdAt))
      .limit(limit);

    activities.push(...projectTransfers.map(t => ({
      ...t,
      actionType: 'project_transfer',
      actionLabel: 'تحويل بين المشاريع',
      userName: 'النظام',
      projectName: 'تحويل مشروع',
      description: 'تحويل مالي بين المشاريع'
    })));

    // 3. مصروفات العمال المتنوعة
    const workerExpenses = await db
      .select({
        id: workerMiscExpenses.id,
        amount: workerMiscExpenses.amount,
        description: workerMiscExpenses.description,
        createdAt: workerMiscExpenses.createdAt,
        projectId: workerMiscExpenses.projectId,
        projectName: projects.name,
      })
      .from(workerMiscExpenses)
      .leftJoin(projects, eq(workerMiscExpenses.projectId, projects.id))
      .where(projectId && projectId !== 'all' ? eq(workerMiscExpenses.projectId, projectId as string) : undefined)
      .orderBy(desc(workerMiscExpenses.createdAt))
      .limit(limit);

    activities.push(...workerExpenses.map(e => ({
      ...e,
      actionType: 'worker_expense',
      actionLabel: 'مصروف عامل',
      userName: 'النظام'
    })));

    // 4. مشتريات المواد
    const materialsList = await db
      .select({
        id: materialPurchases.id,
        amount: materialPurchases.totalAmount,
        description: materialPurchases.materialName,
        createdAt: materialPurchases.createdAt,
        projectId: materialPurchases.projectId,
        projectName: projects.name,
      })
      .from(materialPurchases)
      .leftJoin(projects, eq(materialPurchases.projectId, projects.id))
      .where(projectId && projectId !== 'all' ? eq(materialPurchases.projectId, projectId as string) : undefined)
      .orderBy(desc(materialPurchases.createdAt))
      .limit(limit);

    activities.push(...materialsList.map(m => ({
      ...m,
      actionType: 'material',
      actionLabel: 'شراء مواد',
      userName: 'النظام'
    })));

    // 5. تحويلات العمال
    const workerTransfersList = await db
      .select({
        id: workerTransfers.id,
        amount: workerTransfers.amount,
        createdAt: workerTransfers.createdAt,
        projectId: workerTransfers.projectId,
        projectName: projects.name,
      })
      .from(workerTransfers)
      .leftJoin(projects, eq(workerTransfers.projectId, projects.id))
      .where(projectId && projectId !== 'all' ? eq(workerTransfers.projectId, projectId as string) : undefined)
      .orderBy(desc(workerTransfers.createdAt))
      .limit(limit);

    activities.push(...workerTransfersList.map(t => ({
      ...t,
      actionType: 'worker_transfer',
      actionLabel: 'تحويل لعامل',
      userName: 'النظام',
      description: 'تحويل مالي لعامل'
    })));

    // ترتيب حسب التاريخ
    activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // تجهيز النتيجة النهائية
    const result = activities.slice(0, limit);

    console.log(`✅ [API] تم جلب ${result.length} إجراء بنظام Join المباشر`);

    res.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error('❌ [API] خطأ في جلب آخر الإجراءات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب آخر الإجراءات',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

export default router;
