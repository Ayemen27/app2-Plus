/**
 * خدمة الآبار (Wells Service)
 * خدمة شاملة لإدارة الآبار والمهام والمحاسبة
 */

import { db } from '../db';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import {
  wells, wellTasks, wellTaskAccounts, wellExpenses, wellAuditLogs,
  projects, users, workerAttendance, materialPurchases, transportationExpenses
} from '../../shared/schema';

export interface CreateWellDTO {
  projectId: string;
  wellNumber: number;
  ownerName: string;
  region: string;
  numberOfBases: number;
  numberOfPanels: number;
  wellDepth: number;
  waterLevel?: number;
  numberOfPipes: number;
  fanType?: string;
  pumpPower?: number;
  startDate?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateWellDTO {
  ownerName?: string;
  region?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completionPercentage?: number;
  completionDate?: string;
  notes?: string;
}

export interface CreateTaskDTO {
  taskType: string;
  description: string;
  assignedTo?: string;
  estimatedCost?: number;
}

export interface AccountTaskDTO {
  amount: number;
  paymentType: 'نقدي' | 'تحويل' | 'شيك';
  description?: string;
}

export class WellService {
  /**
   * الآبار - العمليات الأساسية
   */

  static async getAllWells(projectId?: string, filters?: any) {
    try {
      let query = db.select().from(wells);

      if (projectId) {
        query = query.where(eq(wells.projectId, projectId)) as any;
      }

      const wellsList = await query.orderBy(wells.wellNumber);
      return wellsList;
    } catch (error) {
      console.error('❌ [WellService] خطأ في جلب الآبار:', error);
      throw error;
    }
  }

  static async getWellById(wellId: number) {
    try {
      const well = await db.select()
        .from(wells)
        .where(eq(wells.id, wellId))
        .limit(1);

      if (!well.length) {
        throw new Error('البئر غير موجود');
      }

      return well[0];
    } catch (error) {
      console.error('❌ [WellService] خطأ في جلب البئر:', error);
      throw error;
    }
  }

  static async createWell(data: CreateWellDTO) {
    try {
      const newWell = await db.insert(wells).values({
        projectId: data.projectId,
        wellNumber: data.wellNumber,
        ownerName: data.ownerName,
        region: data.region,
        numberOfBases: data.numberOfBases,
        numberOfPanels: data.numberOfPanels,
        wellDepth: data.wellDepth,
        waterLevel: data.waterLevel || null,
        numberOfPipes: data.numberOfPipes,
        fanType: data.fanType || null,
        pumpPower: data.pumpPower || null,
        status: 'pending',
        completionPercentage: '0',
        startDate: data.startDate ? new Date(data.startDate) : null,
        createdBy: data.createdBy,
      }).returning();

      console.log('✅ تم إنشاء بئر جديد:', newWell[0].id);
      return newWell[0];
    } catch (error) {
      console.error('❌ [WellService] خطأ في إنشاء البئر:', error);
      throw error;
    }
  }

  static async updateWell(wellId: number, data: UpdateWellDTO) {
    try {
      const updateData: any = {};
      
      // Handle each field explicitly to avoid spreading undefined values
      if (data.ownerName !== undefined) updateData.ownerName = data.ownerName;
      if (data.region !== undefined) updateData.region = data.region;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.completionPercentage !== undefined) updateData.completionPercentage = String(data.completionPercentage);
      if (data.completionDate !== undefined) updateData.completionDate = data.completionDate ? new Date(data.completionDate) : null;
      if (data.notes !== undefined) updateData.notes = data.notes;
      
      updateData.updatedAt = new Date();
      
      const updated = await db.update(wells)
        .set(updateData)
        .where(eq(wells.id, wellId))
        .returning();

      console.log('✅ تم تحديث البئر:', wellId);
      return updated[0];
    } catch (error) {
      console.error('❌ [WellService] خطأ في تحديث البئر:', error);
      throw error;
    }
  }

  static async deleteWell(wellId: number) {
    try {
      await db.delete(wells).where(eq(wells.id, wellId));
      console.log('✅ تم حذف البئر:', wellId);
    } catch (error) {
      console.error('❌ [WellService] خطأ في حذف البئر:', error);
      throw error;
    }
  }

  /**
   * المهام (Tasks)
   */

  static async getWellTasks(wellId: number) {
    try {
      const tasks = await db.select()
        .from(wellTasks)
        .where(eq(wellTasks.wellId, wellId))
        .orderBy(wellTasks.createdAt);

      return tasks;
    } catch (error) {
      console.error('❌ [WellService] خطأ في جلب مهام البئر:', error);
      throw error;
    }
  }

  static async createTask(wellId: number, data: CreateTaskDTO, userId: string) {
    try {
      const newTask = await db.insert(wellTasks).values({
        wellId,
        taskType: data.taskType,
        description: data.description,
        assignedTo: data.assignedTo || null,
        status: 'pending',
        estimatedCost: data.estimatedCost ? String(data.estimatedCost) : null,
        isAccounted: false,
        createdBy: userId,
      }).returning();

      console.log('✅ تم إنشاء مهمة جديدة:', newTask[0].id);
      return newTask[0];
    } catch (error) {
      console.error('❌ [WellService] خطأ في إنشاء المهمة:', error);
      throw error;
    }
  }

  static async updateTaskStatus(taskId: number, status: string, userId: string) {
    try {
      const updated = await db.update(wellTasks)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(wellTasks.id, taskId))
        .returning();

      // تسجيل في سجل التدقيق
      if (updated.length > 0) {
        await db.insert(wellAuditLogs).values({
          wellId: updated[0].wellId,
          wellTaskId: taskId,
          action: 'STATUS_CHANGED',
          previousValue: { status: 'unknown' },
          newValue: { status },
          userId,
        });
      }

      console.log('✅ تم تحديث حالة المهمة:', taskId);
      return updated[0];
    } catch (error) {
      console.error('❌ [WellService] خطأ في تحديث حالة المهمة:', error);
      throw error;
    }
  }

  /**
   * المحاسبة (Accounting)
   */

  static async accountTask(taskId: number, data: AccountTaskDTO, accountantId: string) {
    try {
      // التحقق من المهمة
      const task = await db.select()
        .from(wellTasks)
        .where(eq(wellTasks.id, taskId))
        .limit(1);

      if (!task.length) {
        throw new Error('المهمة غير موجودة');
      }

      const taskData = task[0];

      if (taskData.status !== 'completed') {
        throw new Error('لا يمكن محاسبة مهمة غير منجزة');
      }

      if (taskData.isAccounted) {
        throw new Error('تمت محاسبة هذه المهمة مسبقاً');
      }

      // إنشاء سجل المحاسبة
      const account = await db.insert(wellTaskAccounts).values({
        wellTaskId: taskId,
        amount: String(data.amount),
        paymentType: data.paymentType,
        accountantId,
        description: data.description || null,
        paidDate: new Date(),
      }).returning();

      // تحديث حالة المهمة
      await db.update(wellTasks)
        .set({
          isAccounted: true,
          updatedAt: new Date()
        })
        .where(eq(wellTasks.id, taskId));

      // تسجيل في سجل التدقيق
      await db.insert(wellAuditLogs).values({
        wellId: taskData.wellId,
        wellTaskId: taskId,
        action: 'ACCOUNTED',
        newValue: data,
        userId: accountantId,
      });

      console.log('✅ تمت محاسبة المهمة:', taskId);
      return account[0];
    } catch (error) {
      console.error('❌ [WellService] خطأ في محاسبة المهمة:', error);
      throw error;
    }
  }

  static async getPendingAccountingTasks(projectId?: string) {
    try {
      let query = db.select()
        .from(wellTasks)
        .where(
          and(
            eq(wellTasks.status, 'completed'),
            eq(wellTasks.isAccounted, false)
          )
        );

      if (projectId) {
        query = query.innerJoin(wells, eq(wellTasks.wellId, wells.id))
          .where(eq(wells.projectId, projectId)) as any;
      }

      const tasks = await query.orderBy(asc(wellTasks.createdAt));
      return tasks;
    } catch (error) {
      console.error('❌ [WellService] خطأ في جلب المهام المعلقة:', error);
      throw error;
    }
  }

  /**
   * التقارير (Reports)
   */

  static async getWellProgress(wellId: number) {
    try {
      const well = await this.getWellById(wellId);
      const tasks = await this.getWellTasks(wellId);

      const completedTasks = tasks.filter(t => t.status === 'completed');
      const accountedTasks = tasks.filter(t => t.isAccounted);

      return {
        well,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        accountedTasks: accountedTasks.length,
        completionPercentage: tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100)
          : 0
      };
    } catch (error) {
      console.error('❌ [WellService] خطأ في حساب تقدم البئر:', error);
      throw error;
    }
  }

  static async getProjectWellsSummary(projectId: string) {
    try {
      const projectWells = await this.getAllWells(projectId);

      const summary = {
        totalWells: projectWells.length,
        pendingWells: projectWells.filter(w => w.status === 'pending').length,
        inProgressWells: projectWells.filter(w => w.status === 'in_progress').length,
        completedWells: projectWells.filter(w => w.status === 'completed').length,
        averageCompletion: projectWells.length > 0
          ? Math.round(
              projectWells.reduce((sum, w) => sum + (parseFloat(String(w.completionPercentage)) || 0), 0) / projectWells.length
            )
          : 0
      };

      return summary;
    } catch (error) {
      console.error('❌ [WellService] خطأ في حساب ملخص المشروع:', error);
      throw error;
    }
  }
}

export default WellService;
