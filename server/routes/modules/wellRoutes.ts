/**
 * مسارات الآبار (Wells Routes)
 * REST API endpoints لإدارة الآبار والمهام والمحاسبة
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import WellService from '../../services/WellService';

export const wellRouter = express.Router();

// تطبيق المصادقة على جميع المسارات
wellRouter.use(requireAuth);

/**
 * GET /api/wells - جلب قائمة الآبار
 * يدعم ?projectId= query parameter (يشمل 'all' لجميع الآبار)
 */
wellRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    // إذا كان projectId=all أو undefined، أرجع جميع الآبار
    const filteredProjectId = projectId === 'all' || !projectId ? undefined : (projectId as string);
    const wells = await WellService.getAllWells(filteredProjectId);

    res.json({
      success: true,
      data: wells,
      message: `تم جلب ${wells.length} بئر بنجاح`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب الآبار:', error);
    res.status(500).json({
      success: false,
      error: 'WELLS_FETCH_ERROR',
      message: error.message || 'فشل في جلب الآبار'
    });
  }
});

/**
 * GET /api/wells/:id - جلب بئر محدد
 */
wellRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.id);
    const well = await WellService.getWellById(wellId);

    res.json({
      success: true,
      data: well,
      message: 'تم جلب البئر بنجاح'
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: 'WELL_NOT_FOUND',
      message: error.message || 'البئر غير موجود'
    });
  }
});

/**
 * POST /api/wells - إنشاء بئر جديد
 */
wellRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const well = await WellService.createWell({
      ...req.body,
      createdBy: user.id
    });

    res.status(201).json({
      success: true,
      data: well,
      message: 'تم إنشاء البئر بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'WELL_CREATE_ERROR',
      message: error.message || 'فشل في إنشاء البئر'
    });
  }
});

/**
 * PUT /api/wells/:id - تحديث بئر
 */
wellRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.id);
    const well = await WellService.updateWell(wellId, req.body);

    res.json({
      success: true,
      data: well,
      message: 'تم تحديث البئر بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'WELL_UPDATE_ERROR',
      message: error.message || 'فشل في تحديث البئر'
    });
  }
});

/**
 * DELETE /api/wells/:id - حذف بئر
 */
wellRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.id);
    await WellService.deleteWell(wellId);

    res.json({
      success: true,
      message: 'تم حذف البئر بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'WELL_DELETE_ERROR',
      message: error.message || 'فشل في حذف البئر'
    });
  }
});

/**
 * GET /api/wells/:id/tasks - جلب مهام البئر
 */
wellRouter.get('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.id);
    const tasks = await WellService.getWellTasks(wellId);

    res.json({
      success: true,
      data: tasks,
      message: `تم جلب ${tasks.length} مهمة بنجاح`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'TASKS_FETCH_ERROR',
      message: error.message || 'فشل في جلب المهام'
    });
  }
});

/**
 * POST /api/wells/:id/tasks - إنشاء مهمة جديدة
 */
wellRouter.post('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const wellId = parseInt(req.params.id);

    const task = await WellService.createTask(wellId, req.body, user.id);

    res.status(201).json({
      success: true,
      data: task,
      message: 'تم إنشاء المهمة بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'TASK_CREATE_ERROR',
      message: error.message || 'فشل في إنشاء المهمة'
    });
  }
});

/**
 * PATCH /api/well-tasks/:taskId/status - تحديث حالة المهمة
 */
wellRouter.patch('/tasks/:taskId/status', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const taskId = parseInt(req.params.taskId);
    const { status } = req.body;

    const task = await WellService.updateTaskStatus(taskId, status, user.id);

    res.json({
      success: true,
      data: task,
      message: 'تم تحديث حالة المهمة بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'TASK_UPDATE_ERROR',
      message: error.message || 'فشل في تحديث حالة المهمة'
    });
  }
});

/**
 * POST /api/well-tasks/:taskId/account - محاسبة المهمة
 */
wellRouter.post('/tasks/:taskId/account', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const taskId = parseInt(req.params.taskId);

    const account = await WellService.accountTask(taskId, req.body, user.id);

    res.status(201).json({
      success: true,
      data: account,
      message: 'تمت محاسبة المهمة بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'TASK_ACCOUNT_ERROR',
      message: error.message || 'فشل في محاسبة المهمة'
    });
  }
});

/**
 * GET /api/wells/pending-accounting - جلب المهام المعلقة
 */
wellRouter.get('/accounting/pending', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const tasks = await WellService.getPendingAccountingTasks(projectId as string);

    res.json({
      success: true,
      data: tasks,
      message: `تم جلب ${tasks.length} مهمة معلقة`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'PENDING_TASKS_ERROR',
      message: error.message || 'فشل في جلب المهام المعلقة'
    });
  }
});

/**
 * GET /api/wells/:id/progress - تقدم البئر
 */
wellRouter.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.id);
    const progress = await WellService.getWellProgress(wellId);

    res.json({
      success: true,
      data: progress,
      message: 'تم حساب التقدم بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'PROGRESS_ERROR',
      message: error.message || 'فشل في حساب التقدم'
    });
  }
});

/**
 * GET /api/wells/summary/:projectId - ملخص المشروع
 */
wellRouter.get('/summary/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const summary = await WellService.getProjectWellsSummary(projectId);

    res.json({
      success: true,
      data: summary,
      message: 'تم حساب الملخص بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SUMMARY_ERROR',
      message: error.message || 'فشل في حساب الملخص'
    });
  }
});

export default wellRouter;
