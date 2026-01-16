/**
 * أدوات تصدير Excel - شركة الفتيني للمقاولات والاستشارات الهندسية
 * Excel Export Utilities - Al-Fatihi Contracting & Engineering Consultancy
 * هذا الملف يستخدم الأنماط المشتركة من professional-export.ts
 */

export { 
  COMPANY_INFO, 
  ALFATIHI_COLORS, 
  EXCEL_STYLES,
  addReportHeader
} from '@/utils/professional-export';

import { downloadExcelFile } from '@/utils/webview-download';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0) + ' ر.ي.';
}

export function applyStyle(cell: any, style: any): void {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
}

export function applyRowStyle(row: any, style: any, startCol: number, endCol: number): void {
  for (let i = startCol; i <= endCol; i++) {
    applyStyle(row.getCell(i), style);
  }
}

export async function exportToExcel(
  data: any[],
  fileName: string,
  sheetName: string,
  columns: Array<{ key: string; header: string; width?: number }>
): Promise<void> {
  const { COMPANY_INFO, EXCEL_STYLES } = await import('@/utils/professional-export');
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = columns.map(col => ({
    key: col.key,
    header: col.header,
    width: col.width || 15
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell: any) => {
    applyStyle(cell, EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 25;

  data.forEach((item, idx) => {
    const row = worksheet.addRow(item);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    row.eachCell((cell: any) => {
      applyStyle(cell, style);
    });
    row.height = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelFile(buffer as ArrayBuffer, `${fileName}.xlsx`);
}
