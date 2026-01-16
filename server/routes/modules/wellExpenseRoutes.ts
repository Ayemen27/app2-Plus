/**
 * مسارات مصاريف الآبار (Well Expenses Routes)
 * REST API endpoints لربط المصاريف بالآبار
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import WellExpenseService from '../../services/WellExpenseService';

export const wellExpenseRouter = express.Router();

// تطبيق المصادقة على جميع المسارات
wellExpenseRouter.use(requireAuth);

/**
 * GET /api/well-expenses/:wellId - جلب مصاريف البئر
 */
wellExpenseRouter.get('/:wellId', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.wellId);
    const { type, startDate, endDate } = req.query;

    const expenses = await WellExpenseService.getWellExpenses(wellId, {
      wellId,
      expenseType: type as string,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json({
      success: true,
      data: expenses,
      message: `تم جلب ${expenses.length} مصروف`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'EXPENSES_FETCH_ERROR',
      message: error.message || 'فشل في جلب المصاريف'
    });
  }
});

/**
 * POST /api/well-expenses - إضافة مصروف مباشر للبئر
 */
wellExpenseRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const expense = await WellExpenseService.addExpense(req.body, user.id);

    res.status(201).json({
      success: true,
      data: expense,
      message: 'تم إضافة المصروف بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'EXPENSE_CREATE_ERROR',
      message: error.message || 'فشل في إضافة المصروف'
    });
  }
});

/**
 * POST /api/well-expenses/link - ربط مصروف موجود ببئر
 */
wellExpenseRouter.post('/link', async (req: Request, res: Response) => {
  try {
    const { wellId, referenceType, referenceId } = req.body;

    if (!wellId || !referenceType || !referenceId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'معاملات مفقودة: wellId, referenceType, referenceId'
      });
    }

    const expense = await WellExpenseService.linkExistingExpense(
      wellId,
      referenceType,
      referenceId
    );

    res.status(201).json({
      success: true,
      data: expense,
      message: 'تم ربط المصروف بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'EXPENSE_LINK_ERROR',
      message: error.message || 'فشل في ربط المصروف'
    });
  }
});

/**
 * DELETE /api/well-expenses/:expenseId - حذف/إلغاء ربط مصروف
 */
wellExpenseRouter.delete('/:expenseId', async (req: Request, res: Response) => {
  try {
    const expenseId = parseInt(req.params.expenseId);
    await WellExpenseService.unlinkExpense(expenseId);

    res.json({
      success: true,
      message: 'تم إلغاء الربط بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'EXPENSE_DELETE_ERROR',
      message: error.message || 'فشل في حذف المصروف'
    });
  }
});

/**
 * GET /api/well-expenses/cost-report/:wellId - تقرير تكلفة البئر
 */
wellExpenseRouter.get('/cost-report/:wellId', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.wellId);
    const report = await WellExpenseService.getWellCostReport(wellId);

    res.json({
      success: true,
      data: report,
      message: 'تم حساب التقرير بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'REPORT_ERROR',
      message: error.message || 'فشل في حساب التقرير'
    });
  }
});

/**
 * GET /api/well-expenses/project-costs/:projectId - ملخص تكاليف المشروع
 */
wellExpenseRouter.get('/project-costs/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const summary = await WellExpenseService.getProjectCostSummary(projectId);

    res.json({
      success: true,
      data: summary,
      message: 'تم حساب ملخص التكاليف بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SUMMARY_ERROR',
      message: error.message || 'فشل في حساب الملخص'
    });
  }
});

export default wellExpenseRouter;
