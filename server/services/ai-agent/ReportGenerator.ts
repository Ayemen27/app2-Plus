/**
 * Report Generator - مولد التقارير
 * يُنشئ تقارير Excel و Word و PDF
 */

import * as fs from "fs";
import * as path from "path";
import * as ExcelJS from "exceljs";
import { getDatabaseActions, ActionResult } from "./DatabaseActions";

export interface ReportOptions {
  type: "worker_statement" | "project_expenses" | "daily_summary" | "attendance";
  format: "excel" | "word" | "pdf" | "json";
  workerId?: string;
  projectId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ReportResult {
  success: boolean;
  filePath?: string;
  data?: any;
  message: string;
}

export class ReportGenerator {
  private dbActions = getDatabaseActions();
  private reportsDir = path.join(process.cwd(), "reports");

  constructor() {
    // إنشاء مجلد التقارير إذا لم يكن موجوداً
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * إنشاء تقرير تصفية حساب عامل بتنسيق Excel
   */
  async generateWorkerStatementExcel(workerId: string): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getWorkerStatement(workerId);
      if (!result.success) return { success: false, message: result.message };

      const data = result.data;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('تصفية حساب عامل');

      worksheet.views = [{ rightToLeft: true }];

      // تنسيق العناوين
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `تقرير تصفية حساب: ${data.worker.name}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      // معلومات أساسية
      worksheet.addRow(['اسم العامل', data.worker.name, '', 'التاريخ', new Date().toLocaleDateString('ar-SA')]);
      worksheet.addRow(['الأجر اليومي', data.worker.dailyWage, '', 'الرصيد النهائي', data.statement.finalBalance]);

      worksheet.addRow([]); // سطر فارغ

      // جدول العمليات
      const headerRow = worksheet.addRow(['التاريخ', 'البيان', 'مكتسب (له)', 'مدفوع (عليه)', 'الرصيد']);
      headerRow.font = { bold: true };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // إضافة البيانات
      // هنا يجب إضافة تفاصيل الحضور والتحويلات... (تبسيط للمثال)
      worksheet.addRow([new Date().toLocaleDateString('ar-SA'), 'إجمالي المستحقات', data.statement.totalEarned, 0, data.statement.totalEarned]);
      worksheet.addRow([new Date().toLocaleDateString('ar-SA'), 'إجمالي المدفوعات والتحويلات', 0, data.statement.totalPaid + data.statement.totalTransferred, data.statement.finalBalance]);

      const fileName = `worker_statement_${workerId}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath: `/reports/${fileName}`,
        message: "تم إنشاء تقرير Excel بنجاح",
      };
    } catch (error: any) {
      console.error("Excel Generation Error:", error);
      return { success: false, message: `خطأ في إنشاء Excel: ${error.message}` };
    }
  }

  /**
   * إنشاء تقرير شامل للمشروع (مصروفات، عمال، مواد)
   */
  async generateProjectFullExcel(projectId: string): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getProjectExpensesSummary(projectId);
      if (!result.success) return { success: false, message: result.message };

      const data = result.data;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('تقرير المشروع الشامل');

      worksheet.views = [{ rightToLeft: true }];

      // تنسيق العناوين
      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `تقرير مصروفات مشروع: ${data.project?.name || projectId}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      worksheet.addRow(['التاريخ', new Date().toLocaleDateString('ar-SA')]);
      worksheet.addRow([]);

      // جدول المصروفات
      const headerRow = worksheet.addRow(['البند', 'القيمة الإجمالية']);
      headerRow.font = { bold: true };

      const summary = data.summary;
      worksheet.addRow(['إجمالي العهدة المستلمة', summary.totalFunds]);
      worksheet.addRow(['أجور العمال', summary.totalWages]);
      worksheet.addRow(['المواد والمشتريات', summary.totalMaterials]);
      worksheet.addRow(['النقل والشحن', summary.totalTransport]);
      worksheet.addRow(['النثريات', summary.totalMisc]);
      worksheet.addRow(['إجمالي المصروفات', summary.totalExpenses]);
      
      const balanceRow = worksheet.addRow(['الرصيد المتبقي', summary.balance]);
      balanceRow.font = { bold: true };
      if (summary.balance < 0) {
        balanceRow.getCell(2).font = { color: { argb: 'FFFF0000' } };
      }

      const fileName = `project_full_${projectId}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath: `/reports/${fileName}`,
        message: "تم إنشاء تقرير المشروع الشامل بنجاح",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ في إنشاء Excel: ${error.message}` };
    }
  }

  /**
   * إنشاء تقرير تصفية حساب عامل
   */
  async generateWorkerStatement(
    workerId: string,
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      if (format === "excel") {
        return await this.generateWorkerStatementExcel(workerId);
      }
      
      const result = await this.dbActions.getWorkerStatement(workerId);

      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }

      if (format === "json") {
        return {
          success: true,
          data: result.data,
          message: "تم إنشاء تقرير تصفية الحساب",
        };
      }

      return {
        success: true,
        data: result.data,
        message: "تم إنشاء تقرير تصفية الحساب (JSON)",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * إنشاء تقرير ملخص مصروفات مشروع
   */
  async generateProjectExpensesSummary(
    projectId: string,
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getProjectExpensesSummary(projectId);

      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }

      if (format === "json") {
        return {
          success: true,
          data: result.data,
          message: "تم إنشاء تقرير ملخص المصروفات",
        };
      }

      return {
        success: true,
        data: result.data,
        message: "تم إنشاء تقرير ملخص المصروفات (JSON)",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * إنشاء تقرير مصروفات يومية
   */
  async generateDailyExpensesReport(
    projectId: string,
    date: string,
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getDailyExpenses(projectId, date);

      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message || "لا توجد بيانات لهذا التاريخ",
        };
      }

      // حساب الإجماليات
      const data = result.data;
      const totalWages = (data.wages || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.paidAmount || "0"),
        0
      );
      const totalPurchases = (data.purchases || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.paidAmount || "0"),
        0
      );
      const totalTransport = (data.transport || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.amount || "0"),
        0
      );
      const totalMisc = (data.misc || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.amount || "0"),
        0
      );

      const grandTotal = totalWages + totalPurchases + totalTransport + totalMisc;

      if (grandTotal === 0 && (!data.wages?.length && !data.purchases?.length && !data.transport?.length && !data.misc?.length)) {
        return {
          success: true,
          data: { ...data, summary: { totalWages: 0, totalPurchases: 0, totalTransport: 0, totalMisc: 0, grandTotal: 0 } },
          message: `لا توجد أي مصروفات مسجلة بتاريخ ${date}`,
        };
      }

      const report = {
        date,
        projectId,
        details: data,
        summary: {
          totalWages,
          totalPurchases,
          totalTransport,
          totalMisc,
          grandTotal: totalWages + totalPurchases + totalTransport + totalMisc,
        },
      };

      return {
        success: true,
        data: report,
        message: `تم إنشاء تقرير مصروفات ${date}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * إنشاء تقرير حضور
   */
  async generateAttendanceReport(
    projectId: string,
    fromDate: string,
    toDate: string,
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      // TODO: تنفيذ تقرير الحضور
      return {
        success: true,
        data: {
          projectId,
          fromDate,
          toDate,
          message: "سيتم تنفيذ تقرير الحضور قريباً",
        },
        message: "تم إنشاء تقرير الحضور",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * تنسيق البيانات كنص للعرض
   */
  formatAsText(data: any, title: string): string {
    if (!data) return "لا توجد بيانات متاحة لهذا التقرير.";

    let text = `📊 **${title}**\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (title === "تصفية حساب العامل" || data.worker) {
      const w = data.worker || {};
      const s = data.statement || {};
      text += `👤 **العامل:** ${w.name || "غير معروف"}\n`;
      text += `💰 **الإجمالي المستحق:** ${s.totalEarned || 0} ريال\n`;
      text += `💸 **إجمالي المدفوع:** ${s.totalPaid || 0} ريال\n`;
      text += `🏦 **إجمالي المحول:** ${s.totalTransferred || 0} ريال\n`;
      text += `📉 **الرصيد المتبقي:** ${s.finalBalance || 0} ريال\n`;
    } else if (title === "ملخص مصروفات المشروع" || data.totalExpenses !== undefined) {
      const summary = data.summary || data;
      text += `🏗️ **إجمالي العهد المستلمة:** ${summary.totalFunds || 0} ريال\n`;
      text += `👷 **إجمالي الأجور:** ${summary.totalWages || 0} ريال\n`;
      text += `📦 **إجمالي المواد:** ${summary.totalMaterials || 0} ريال\n`;
      text += `🚚 **إجمالي النقل:** ${summary.totalTransport || 0} ريال\n`;
      text += `📝 **إجمالي متنوعة:** ${summary.totalMisc || 0} ريال\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📉 **إجمالي المصروفات:** ${summary.totalExpenses || 0} ريال\n`;
      text += `💰 **الرصيد المتبقي:** ${summary.balance || 0} ريال\n`;
    } else if (title === "تقرير المصروفات اليومية" || data.date) {
      text += `📅 **التاريخ:** ${data.date}\n`;
      const s = data.summary || {};
      text += `👷 **الأجور اليومية:** ${s.totalWages || 0} ريال\n`;
      text += `📦 **المشتريات:** ${s.totalPurchases || 0} ريال\n`;
      text += `🚚 **النقل:** ${s.totalTransport || 0} ريال\n`;
      text += `📝 **متنوعة:** ${s.totalMisc || 0} ريال\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 **الإجمالي اليومي:** ${s.grandTotal || 0} ريال\n`;
      
      if ((s.grandTotal || 0) === 0) {
        text += `\n⚠️ لا توجد أي مصروفات مسجلة في هذا التاريخ.`;
      }
    }

    return text;
  }

  private translateKey(key: string): string {
    const translations: Record<string, string> = {
      totalFunds: "إجمالي العهدة",
      totalWages: "أجور العمال",
      totalMaterials: "المواد",
      totalTransport: "النقل",
      totalMisc: "النثريات",
      totalExpenses: "إجمالي المصروفات",
      balance: "الرصيد",
      totalEarned: "المكتسب",
      totalPaid: "المدفوع",
      totalTransferred: "المحول",
      finalBalance: "الرصيد النهائي",
      grandTotal: "الإجمالي الكلي",
      totalPurchases: "المشتريات",
    };
    return translations[key] || key;
  }
}

// Singleton instance
let reportGeneratorInstance: ReportGenerator | null = null;

export function getReportGenerator(): ReportGenerator {
  if (!reportGeneratorInstance) {
    reportGeneratorInstance = new ReportGenerator();
  }
  return reportGeneratorInstance;
}
