/**
 * مسارات دفتر المصروفات الموحد
 * Unified Financial Ledger Routes
 * 
 * API موحد للإحصائيات المالية - المصدر الوحيد للحقيقة
 */

import express from 'express';
import { Request, Response } from 'express';
import { ExpenseLedgerService } from '../../services/ExpenseLedgerService';
import { requireAuth } from '../../middleware/auth';

export const financialLedgerRouter = express.Router();

financialLedgerRouter.use(requireAuth);

/**
 * جلب الملخص المالي لمشروع معين
 * GET /api/financials/projects/:projectId/summary
 */
financialLedgerRouter.get('/projects/:projectId/summary', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    console.log(`📊 [FinancialLedger] طلب ملخص مالي للمشروع ${projectId}`, { date });

    const summary = date 
      ? await ExpenseLedgerService.getDailyFinancialSummary(projectId, date as string)
      : await ExpenseLedgerService.getProjectFinancialSummary(projectId);

    console.log(`✅ [FinancialLedger] تم جلب الملخص المالي للمشروع ${projectId}`);

    res.json({
      success: true,
      data: summary,
      message: 'تم جلب الملخص المالي بنجاح'
    });
  } catch (error: any) {
    console.error('❌ [FinancialLedger] خطأ في جلب الملخص المالي:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب الملخص المالي'
    });
  }
});

/**
 * جلب إحصائيات جميع المشاريع
 * GET /api/financials/projects/stats
 */
financialLedgerRouter.get('/projects/stats', async (req: Request, res: Response) => {
  try {
    console.log('📊 [FinancialLedger] طلب إحصائيات جميع المشاريع');

    const summaries = await ExpenseLedgerService.getAllProjectsStats();

    console.log(`✅ [FinancialLedger] تم جلب إحصائيات ${summaries.length} مشروع`);

    res.json({
      success: true,
      data: summaries,
      message: `تم جلب إحصائيات ${summaries.length} مشروع بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [FinancialLedger] خطأ في جلب إحصائيات المشاريع:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب إحصائيات المشاريع'
    });
  }
});

/**
 * جلب الملخص المالي اليومي لمشروع
 * GET /api/financials/projects/:projectId/daily/:date
 */
financialLedgerRouter.get('/projects/:projectId/daily/:date', async (req: Request, res: Response) => {
  try {
    const { projectId, date } = req.params;

    console.log(`📊 [FinancialLedger] طلب ملخص يومي للمشروع ${projectId} بتاريخ ${date}`);

    const summary = await ExpenseLedgerService.getDailyFinancialSummary(projectId, date);

    console.log(`✅ [FinancialLedger] تم جلب الملخص اليومي للمشروع ${projectId}`);

    res.json({
      success: true,
      data: summary,
      message: 'تم جلب الملخص اليومي بنجاح'
    });
  } catch (error: any) {
    console.error('❌ [FinancialLedger] خطأ في جلب الملخص اليومي:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب الملخص اليومي'
    });
  }
});

export default financialLedgerRouter;
