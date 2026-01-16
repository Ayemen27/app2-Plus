/**
 * Database Actions - تنفيذ أوامر قاعدة البيانات
 * يحول أوامر الوكيل الذكي إلى استعلامات قاعدة البيانات
 * صلاحيات كاملة: قراءة، إضافة، تعديل، حذف
 */

import { db } from "../../db";
import { eq, and, sql, desc, like, gte, lte } from "drizzle-orm";
import {
  projects,
  workers,
  workerAttendance,
  fundTransfers,
  materialPurchases,
  transportationExpenses,
  workerTransfers,
  workerMiscExpenses,
  dailyExpenseSummaries,
  suppliers,
} from "@shared/schema";

export interface ActionResult {
  success: boolean;
  data?: any;
  message: string;
  action: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export class DatabaseActions {
  
  // ==================== عمليات القراءة ====================

  async findWorkerByName(name: string): Promise<ActionResult> {
    try {
      const result = await db
        .select()
        .from(workers)
        .where(like(workers.name, `%${name}%`));

      return {
        success: true,
        data: result,
        message: `تم العثور على ${result.length} عامل`,
        action: "find_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في البحث: ${error.message}`,
        action: "find_worker",
      };
    }
  }

  async getProjectInfo(projectIdOrName: string): Promise<ActionResult> {
    try {
      const result = await db
        .select()
        .from(projects)
        .where(
          sql`${projects.id} = ${projectIdOrName} OR ${projects.name} ILIKE ${'%' + projectIdOrName + '%'}`
        );

      if (result.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
          action: "get_project",
        };
      }

      return {
        success: true,
        data: result[0],
        message: "تم العثور على المشروع",
        action: "get_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_project",
      };
    }
  }

  async getAllProjects(): Promise<ActionResult> {
    try {
      const result = await db.select().from(projects);
      return {
        success: true,
        data: result,
        message: `تم العثور على ${result.length} مشروع`,
        action: "get_all_projects",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_all_projects",
      };
    }
  }

  async getAllWorkers(): Promise<ActionResult> {
    try {
      const result = await db.select().from(workers);
      return {
        success: true,
        data: result,
        message: `تم العثور على ${result.length} عامل`,
        action: "get_all_workers",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_all_workers",
      };
    }
  }

  async getProjectExpensesSummary(projectId: string): Promise<ActionResult> {
    try {
      const fundsResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${fundTransfers.amount}), 0)` })
        .from(fundTransfers)
        .where(eq(fundTransfers.projectId, projectId));

      const wagesResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${workerAttendance.paidAmount}), 0)` })
        .from(workerAttendance)
        .where(eq(workerAttendance.projectId, projectId));

      const materialsResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${materialPurchases.paidAmount}), 0)` })
        .from(materialPurchases)
        .where(eq(materialPurchases.projectId, projectId));

      const transportResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${transportationExpenses.amount}), 0)` })
        .from(transportationExpenses)
        .where(eq(transportationExpenses.projectId, projectId));

      const miscResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${workerMiscExpenses.amount}), 0)` })
        .from(workerMiscExpenses)
        .where(eq(workerMiscExpenses.projectId, projectId));

      const summary = {
        totalFunds: parseFloat(fundsResult[0]?.total || "0"),
        totalWages: parseFloat(wagesResult[0]?.total || "0"),
        totalMaterials: parseFloat(materialsResult[0]?.total || "0"),
        totalTransport: parseFloat(transportResult[0]?.total || "0"),
        totalMisc: parseFloat(miscResult[0]?.total || "0"),
      };

      const totalExpenses = 
        summary.totalWages + 
        summary.totalMaterials + 
        summary.totalTransport + 
        summary.totalMisc;

      const balance = summary.totalFunds - totalExpenses;

      return {
        success: true,
        data: { ...summary, totalExpenses, balance },
        message: "تم جلب ملخص المصروفات",
        action: "get_expenses_summary",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_expenses_summary",
      };
    }
  }

  async getWorkerAttendance(workerId: string, projectId?: string): Promise<ActionResult> {
    try {
      let result = await db
        .select()
        .from(workerAttendance)
        .where(eq(workerAttendance.workerId, workerId))
        .orderBy(desc(workerAttendance.attendanceDate));

      if (projectId) {
        result = result.filter((r) => r.projectId === projectId);
      }

      const totalDays = result.reduce((sum, r) => sum + parseFloat(r.workDays || "0"), 0);
      const totalEarned = result.reduce((sum, r) => sum + parseFloat(r.totalPay || "0"), 0);
      const totalPaid = result.reduce((sum, r) => sum + parseFloat(r.paidAmount || "0"), 0);

      return {
        success: true,
        data: {
          records: result,
          summary: { totalDays, totalEarned, totalPaid, balance: totalEarned - totalPaid },
        },
        message: `تم العثور على ${result.length} سجل حضور`,
        action: "get_worker_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_worker_attendance",
      };
    }
  }

  async getWorkerTransfers(workerId: string): Promise<ActionResult> {
    try {
      const result = await db
        .select()
        .from(workerTransfers)
        .where(eq(workerTransfers.workerId, workerId))
        .orderBy(desc(workerTransfers.transferDate));

      const total = result.reduce((sum, r) => sum + parseFloat(r.amount), 0);

      return {
        success: true,
        data: { transfers: result, totalTransferred: total },
        message: `تم العثور على ${result.length} حوالة`,
        action: "get_worker_transfers",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_worker_transfers",
      };
    }
  }

  async getWorkerStatement(workerId: string): Promise<ActionResult> {
    try {
      const workerResult = await db
        .select()
        .from(workers)
        .where(eq(workers.id, workerId));

      if (workerResult.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "get_worker_statement",
        };
      }

      const worker = workerResult[0];
      const attendance = await this.getWorkerAttendance(workerId);
      const transfers = await this.getWorkerTransfers(workerId);

      const totalEarned = attendance.data?.summary?.totalEarned || 0;
      const totalPaid = attendance.data?.summary?.totalPaid || 0;
      const totalTransferred = transfers.data?.totalTransferred || 0;
      const finalBalance = totalEarned - totalPaid - totalTransferred;

      return {
        success: true,
        data: {
          worker,
          attendance: attendance.data,
          transfers: transfers.data,
          statement: { totalEarned, totalPaid, totalTransferred, finalBalance },
        },
        message: "تم إنشاء تصفية حساب العامل",
        action: "get_worker_statement",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_worker_statement",
      };
    }
  }

  async getDailyExpenses(projectId: string, date: string): Promise<ActionResult> {
    try {
      console.log(`🗄️ [DatabaseActions] Fetching expenses for Project: ${projectId}, Date: ${date}`);
      
      const wages = await db
        .select()
        .from(workerAttendance)
        .where(and(
          eq(workerAttendance.projectId, projectId),
          sql`CAST(attendance_date AS DATE) = ${date}`
        ));

      const purchases = await db
        .select()
        .from(materialPurchases)
        .where(and(
          eq(materialPurchases.projectId, projectId),
          sql`CAST(purchase_date AS DATE) = ${date}`
        ));

      const transport = await db
        .select()
        .from(transportationExpenses)
        .where(and(
          eq(transportationExpenses.projectId, projectId),
          sql`CAST(date AS DATE) = ${date}`
        ));

      const misc = await db
        .select()
        .from(workerMiscExpenses)
        .where(and(
          eq(workerMiscExpenses.projectId, projectId),
          sql`CAST(date AS DATE) = ${date}`
        ));

      const totalItems = (wages.length || 0) + (purchases.length || 0) + (transport.length || 0) + (misc.length || 0);
      console.log(`📊 [DatabaseActions] Found ${totalItems} items for date ${date}`);

      return {
        success: true,
        data: { date, wages, purchases, transport, misc },
        message: totalItems > 0 ? "تم جلب مصروفات اليوم" : `لا توجد أي مصروفات مسجلة بتاريخ ${date}`,
        action: "get_daily_expenses",
      };
    } catch (error: any) {
      console.error(`❌ [DatabaseActions] Error in getDailyExpenses:`, error);
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_daily_expenses",
      };
    }
  }

  // ==================== عمليات الإضافة ====================

  async createProject(data: { name: string; status?: string; engineerId?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.insert(projects).values({
        name: data.name,
        status: data.status || "active",
        engineerId: data.engineerId,
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم إنشاء المشروع "${data.name}" بنجاح`,
        action: "create_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء المشروع: ${error.message}`,
        action: "create_project",
      };
    }
  }

  async createWorker(data: { name: string; type: string; dailyWage: string; phone?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.insert(workers).values({
        name: data.name,
        type: data.type,
        dailyWage: data.dailyWage,
        phone: data.phone,
        isActive: true,
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم إضافة العامل "${data.name}" بنجاح`,
        action: "create_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إضافة العامل: ${error.message}`,
        action: "create_worker",
      };
    }
  }

  async addAttendance(data: { 
    projectId: string; 
    workerId: string; 
    attendanceDate: string; 
    workDays: string;
    dailyWage: string;
    paidAmount?: string;
  }): Promise<ActionResult> {
    try {
      const totalPay = (parseFloat(data.workDays) * parseFloat(data.dailyWage)).toString();
      
      const [result] = await db.insert(workerAttendance).values({
        projectId: data.projectId,
        workerId: data.workerId,
        attendanceDate: data.attendanceDate,
        workDays: data.workDays,
        dailyWage: data.dailyWage,
        totalPay,
        paidAmount: data.paidAmount || "0",
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم تسجيل حضور بنجاح`,
        action: "add_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تسجيل الحضور: ${error.message}`,
        action: "add_attendance",
      };
    }
  }

  async addFundTransfer(data: {
    projectId: string;
    amount: string;
    senderName?: string;
    transferType: string;
    transferDate: Date;
    notes?: string;
  }): Promise<ActionResult> {
    try {
      const [result] = await db.insert(fundTransfers).values({
        projectId: data.projectId,
        amount: data.amount,
        senderName: data.senderName,
        transferType: data.transferType,
        transferDate: data.transferDate,
        notes: data.notes,
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم إضافة تحويل عهدة بمبلغ ${data.amount} ريال`,
        action: "add_fund_transfer",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إضافة التحويل: ${error.message}`,
        action: "add_fund_transfer",
      };
    }
  }

  // ==================== عمليات التعديل ====================

  async updateWorker(workerId: string, data: { name?: string; type?: string; dailyWage?: string; phone?: string; isActive?: boolean }): Promise<ActionResult> {
    try {
      const [result] = await db.update(workers)
        .set(data)
        .where(eq(workers.id, workerId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "update_worker",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم تحديث بيانات العامل "${result.name}" بنجاح`,
        action: "update_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تحديث العامل: ${error.message}`,
        action: "update_worker",
      };
    }
  }

  async updateProject(projectId: string, data: { name?: string; status?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.update(projects)
        .set(data)
        .where(eq(projects.id, projectId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
          action: "update_project",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم تحديث المشروع "${result.name}" بنجاح`,
        action: "update_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تحديث المشروع: ${error.message}`,
        action: "update_project",
      };
    }
  }

  async updateAttendance(attendanceId: string, data: { workDays?: string; paidAmount?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.update(workerAttendance)
        .set(data)
        .where(eq(workerAttendance.id, attendanceId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على سجل الحضور",
          action: "update_attendance",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم تحديث سجل الحضور بنجاح`,
        action: "update_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تحديث الحضور: ${error.message}`,
        action: "update_attendance",
      };
    }
  }

  // ==================== عمليات الحذف (تحتاج تأكيد) ====================

  async deleteWorker(workerId: string, confirmed: boolean = false): Promise<ActionResult> {
    if (!confirmed) {
      const worker = await db.select().from(workers).where(eq(workers.id, workerId));
      if (worker.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "delete_worker",
        };
      }
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `هل أنت متأكد من حذف العامل "${worker[0].name}"؟ هذا الإجراء لا يمكن التراجع عنه. اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "delete_worker",
      };
    }

    try {
      const [result] = await db.delete(workers)
        .where(eq(workers.id, workerId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "delete_worker",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم حذف العامل "${result.name}" بنجاح`,
        action: "delete_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في حذف العامل: ${error.message}`,
        action: "delete_worker",
      };
    }
  }

  async deleteProject(projectId: string, confirmed: boolean = false): Promise<ActionResult> {
    if (!confirmed) {
      const project = await db.select().from(projects).where(eq(projects.id, projectId));
      if (project.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
          action: "delete_project",
        };
      }
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `هل أنت متأكد من حذف المشروع "${project[0].name}"؟ سيتم حذف جميع البيانات المرتبطة. اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "delete_project",
      };
    }

    try {
      const [result] = await db.delete(projects)
        .where(eq(projects.id, projectId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
          action: "delete_project",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم حذف المشروع "${result.name}" بنجاح`,
        action: "delete_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في حذف المشروع: ${error.message}`,
        action: "delete_project",
      };
    }
  }

  async deleteAttendance(attendanceId: string, confirmed: boolean = false): Promise<ActionResult> {
    if (!confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `هل أنت متأكد من حذف سجل الحضور؟ اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "delete_attendance",
      };
    }

    try {
      const [result] = await db.delete(workerAttendance)
        .where(eq(workerAttendance.id, attendanceId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على سجل الحضور",
          action: "delete_attendance",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم حذف سجل الحضور بنجاح`,
        action: "delete_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في حذف سجل الحضور: ${error.message}`,
        action: "delete_attendance",
      };
    }
  }

  // ==================== استعلام SQL مخصص (للمسؤول فقط) ====================

  async executeCustomQuery(query: string, confirmed: boolean = false): Promise<ActionResult> {
    const lowerQuery = query.toLowerCase().trim();
    const isDestructive = lowerQuery.startsWith("delete") || 
                          lowerQuery.startsWith("drop") || 
                          lowerQuery.startsWith("truncate") ||
                          lowerQuery.startsWith("update");

    if (isDestructive && !confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `⚠️ هذا استعلام تعديلي! الاستعلام: "${query}"\nهل أنت متأكد؟ اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "execute_sql",
      };
    }

    try {
      const result = await db.execute(sql.raw(query));
      return {
        success: true,
        data: result,
        message: `تم تنفيذ الاستعلام بنجاح`,
        action: "execute_sql",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تنفيذ الاستعلام: ${error.message}`,
        action: "execute_sql",
      };
    }
  }
}

let dbActionsInstance: DatabaseActions | null = null;

export function getDatabaseActions(): DatabaseActions {
  if (!dbActionsInstance) {
    dbActionsInstance = new DatabaseActions();
  }
  return dbActionsInstance;
}
