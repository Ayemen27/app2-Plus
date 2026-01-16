/**
 * خدمة مصاريف الآبار (Well Expenses Service)
 * خدمة ربط المصاريف بالآبار وحساب التكاليف الشاملة
 */

import { db } from '../db';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import {
  wellExpenses, wells, workerAttendance, materialPurchases,
  transportationExpenses, workers, materials
} from '../../shared/schema';

export interface WellExpenseDTO {
  wellId: number;
  expenseType: 'labor' | 'operational_material' | 'consumable_material' | 'transport' | 'service';
  description: string;
  category: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalAmount: number;
  expenseDate: string;
  notes?: string;
}

export interface ExpenseFilters {
  wellId?: number;
  expenseType?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export class WellExpenseService {
  /**
   * إضافة مصروف مباشر للبئر
   */
  static async addExpense(data: WellExpenseDTO, userId: string) {
    try {
      // التحقق من وجود البئر
      const well = await db.select()
        .from(wells)
        .where(eq(wells.id, data.wellId))
        .limit(1);

      if (!well.length) {
        throw new Error('البئر غير موجود');
      }

      // إنشاء المصروف
      const newExpense = await db.insert(wellExpenses).values({
        wellId: data.wellId,
        expenseType: data.expenseType,
        referenceType: null,
        referenceId: null,
        description: data.description,
        category: data.category,
        quantity: data.quantity ? String(data.quantity) : null,
        unit: data.unit || null,
        unitPrice: data.unitPrice ? String(data.unitPrice) : null,
        totalAmount: String(data.totalAmount),
        expenseDate: new Date(data.expenseDate),
        createdBy: userId,
        notes: data.notes || null
      }).returning();

      console.log('✅ تم إضافة مصروف للبئر:', newExpense[0].id);
      return newExpense[0];
    } catch (error) {
      console.error('❌ خطأ في إضافة المصروف:', error);
      throw error;
    }
  }

  /**
   * ربط مصروف موجود من جدول آخر ببئر
   */
  static async linkExistingExpense(
    wellId: number,
    referenceType: 'worker_attendance' | 'material_purchase' | 'transportation',
    referenceId: number
  ) {
    try {
      // التحقق من وجود البئر
      const well = await db.select()
        .from(wells)
        .where(eq(wells.id, wellId))
        .limit(1);

      if (!well.length) {
        throw new Error('البئر غير موجود');
      }

      // جلب بيانات المصروف حسب النوع
      let expenseData: any = null;
      let expenseType: string = '';

      if (referenceType === 'worker_attendance') {
        const attendance = await db.select()
          .from(workerAttendance)
          .where(eq(workerAttendance.id, String(referenceId)))
          .limit(1);

        if (!attendance.length) throw new Error('سجل الحضور غير موجود');
        
        expenseData = attendance[0];
        expenseType = 'labor';

        // إنشاء مصروف مرتبط
        const linkedExpense = await db.insert(wellExpenses).values({
          wellId,
          expenseType,
          referenceType: 'worker_attendance',
          referenceId: Number(referenceId),
          description: `أجور عامل - ${expenseData.workDescription || 'عمل'}`,
          category: 'أجور عمالة',
          quantity: String(expenseData.workDays || 1),
          unit: 'يوم',
          unitPrice: expenseData.dailyWage ? String(expenseData.dailyWage) : null,
          totalAmount: expenseData.totalPay ? String(expenseData.totalPay) : '0',
          expenseDate: new Date(expenseData.attendanceDate),
          createdBy: 'system',
          notes: `مرتبط بسجل حضور ${referenceId}`
        }).returning();

        return linkedExpense[0];
      } else if (referenceType === 'material_purchase') {
        const purchase = await db.select()
          .from(materialPurchases)
          .where(eq(materialPurchases.id, String(referenceId)))
          .limit(1);

        if (!purchase.length) throw new Error('فاتورة المادة غير موجودة');

        expenseData = purchase[0];
        
        // تحديد نوع المادة
        const materialType = expenseData.materialCategory?.toLowerCase().includes('أسمنت') || 
                             expenseData.materialCategory?.toLowerCase().includes('حديد')
          ? 'consumable_material'
          : 'operational_material';
        expenseType = materialType;

        const linkedExpense = await db.insert(wellExpenses).values({
          wellId,
          expenseType,
          referenceType: 'material_purchase',
          referenceId: Number(referenceId),
          description: `مادة - ${expenseData.materialName}`,
          category: expenseData.materialCategory || 'مواد',
          quantity: expenseData.quantity ? String(expenseData.quantity) : null,
          unit: expenseData.unit || 'وحدة',
          unitPrice: expenseData.unitPrice ? String(expenseData.unitPrice) : null,
          totalAmount: expenseData.totalAmount ? String(expenseData.totalAmount) : '0',
          expenseDate: new Date(expenseData.purchaseDate),
          createdBy: 'system',
          notes: `مرتبط بفاتورة ${referenceId}`
        }).returning();

        return linkedExpense[0];
      } else if (referenceType === 'transportation') {
        const transport = await db.select()
          .from(transportationExpenses)
          .where(eq(transportationExpenses.id, String(referenceId)))
          .limit(1);

        if (!transport.length) throw new Error('مصروف النقل غير موجود');

        expenseData = transport[0];
        expenseType = 'transport';

        const linkedExpense = await db.insert(wellExpenses).values({
          wellId,
          expenseType,
          referenceType: 'transportation',
          referenceId: Number(referenceId),
          description: `نقل - ${expenseData.description}`,
          category: 'نقل ومواصلات',
          quantity: null,
          unit: null,
          unitPrice: null,
          totalAmount: expenseData.amount ? String(expenseData.amount) : '0',
          expenseDate: new Date(expenseData.date),
          createdBy: 'system',
          notes: `مرتبط بمصروف نقل ${referenceId}`
        }).returning();

        return linkedExpense[0];
      }

      throw new Error('نوع مرجع غير معروف');
    } catch (error) {
      console.error('❌ خطأ في ربط المصروف:', error);
      throw error;
    }
  }

  /**
   * إلغاء ربط مصروف
   */
  static async unlinkExpense(expenseId: number) {
    try {
      await db.delete(wellExpenses).where(eq(wellExpenses.id, expenseId));
      console.log('✅ تم إلغاء ربط المصروف:', expenseId);
    } catch (error) {
      console.error('❌ خطأ في إلغاء الربط:', error);
      throw error;
    }
  }

  /**
   * جلب مصاريف البئر
   */
  static async getWellExpenses(wellId: number, filters?: ExpenseFilters) {
    try {
      let query = db.select()
        .from(wellExpenses)
        .where(eq(wellExpenses.wellId, wellId));

      if (filters?.expenseType) {
        query = query.where(eq(wellExpenses.expenseType, filters.expenseType)) as any;
      }

      if (filters?.startDate) {
        query = query.where(gte(wellExpenses.expenseDate, new Date(filters.startDate))) as any;
      }

      if (filters?.endDate) {
        query = query.where(lte(wellExpenses.expenseDate, new Date(filters.endDate))) as any;
      }

      const expenses = await query.orderBy(desc(wellExpenses.expenseDate));
      return expenses;
    } catch (error) {
      console.error('❌ خطأ في جلب المصاريف:', error);
      throw error;
    }
  }

  /**
   * حساب تقرير تكلفة البئر الشامل
   */
  static async getWellCostReport(wellId: number) {
    try {
      const expenses = await this.getWellExpenses(wellId);

      const report = {
        wellId,
        summary: {
          totalCost: 0,
          laborCost: 0,
          operationalMaterialCost: 0,
          consumableMaterialCost: 0,
          transportCost: 0,
          serviceCost: 0
        },
        details: {
          labor: [] as any[],
          operationalMaterial: [] as any[],
          consumableMaterial: [] as any[],
          transport: [] as any[],
          service: [] as any[]
        },
        breakdown: {} as any
      };

      // تجميع المصاريف
      expenses.forEach(expense => {
        const amount = parseFloat(expense.totalAmount as string) || 0;
        
        switch (expense.expenseType) {
          case 'labor':
            report.summary.laborCost += amount;
            report.details.labor.push(expense);
            break;
          case 'operational_material':
            report.summary.operationalMaterialCost += amount;
            report.details.operationalMaterial.push(expense);
            break;
          case 'consumable_material':
            report.summary.consumableMaterialCost += amount;
            report.details.consumableMaterial.push(expense);
            break;
          case 'transport':
            report.summary.transportCost += amount;
            report.details.transport.push(expense);
            break;
          case 'service':
            report.summary.serviceCost += amount;
            report.details.service.push(expense);
            break;
        }
        
        report.summary.totalCost += amount;
      });

      // حساب النسب المئوية
      if (report.summary.totalCost > 0) {
        report.breakdown = {
          labor: {
            amount: report.summary.laborCost,
            percentage: Math.round((report.summary.laborCost / report.summary.totalCost) * 100)
          },
          operationalMaterial: {
            amount: report.summary.operationalMaterialCost,
            percentage: Math.round((report.summary.operationalMaterialCost / report.summary.totalCost) * 100)
          },
          consumableMaterial: {
            amount: report.summary.consumableMaterialCost,
            percentage: Math.round((report.summary.consumableMaterialCost / report.summary.totalCost) * 100)
          },
          transport: {
            amount: report.summary.transportCost,
            percentage: Math.round((report.summary.transportCost / report.summary.totalCost) * 100)
          },
          service: {
            amount: report.summary.serviceCost,
            percentage: Math.round((report.summary.serviceCost / report.summary.totalCost) * 100)
          }
        };
      }

      console.log('✅ تم حساب تقرير التكاليف للبئر:', wellId);
      return report;
    } catch (error) {
      console.error('❌ خطأ في حساب التقرير:', error);
      throw error;
    }
  }

  /**
   * ملخص تكاليف المشروع
   */
  static async getProjectCostSummary(projectId: string) {
    try {
      // جلب جميع آبار المشروع
      const projectWells = await db.select()
        .from(wells)
        .where(eq(wells.projectId, projectId));

      const summary = {
        projectId,
        totalWells: projectWells.length,
        totalProjectCost: 0,
        costPerWell: {} as any,
        averageCostPerWell: 0
      };

      // حساب التكاليف لكل بئر
      for (const well of projectWells) {
        const report = await this.getWellCostReport(well.id);
        summary.costPerWell[well.id] = report.summary;
        summary.totalProjectCost += report.summary.totalCost;
      }

      if (projectWells.length > 0) {
        summary.averageCostPerWell = Math.round(summary.totalProjectCost / projectWells.length);
      }

      console.log('✅ تم حساب ملخص تكاليف المشروع:', projectId);
      return summary;
    } catch (error) {
      console.error('❌ خطأ في حساب ملخص المشروع:', error);
      throw error;
    }
  }
}

export default WellExpenseService;
