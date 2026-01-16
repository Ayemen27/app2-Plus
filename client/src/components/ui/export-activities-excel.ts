/**
 * تصدير سجل العمليات إلى Excel بتنسيق احترافي
 * Export Activities Log to Professional Excel Format
 */

import { downloadExcelFile } from '@/utils/webview-download';
import { 
  COMPANY_INFO, 
  EXCEL_STYLES, 
  addReportHeader 
} from '@/utils/professional-export';

interface ActivityItem {
  id?: number;
  actionType: string;
  actionLabel?: string;
  userName?: string;
  projectName?: string;
  amount?: number;
  description?: string;
  createdAt: string;
}

const getActionLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    'transfer': 'تحويل',
    'expense': 'مصروف',
    'income': 'دخل',
    'attendance': 'حضور',
    'material': 'مواد',
    'transport': 'نقل',
    'payment': 'دفعة'
  };
  return labels[actionType] || actionType;
};

export async function exportActivitiesToExcel(
  activities: ActivityItem[],
  formatCurrency: (amount: number) => string
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('سجل العمليات', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  const totalColumns = 7;

  let currentRow = 1;
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = COMPANY_INFO.name;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5A96' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const subtitleCell = worksheet.getCell(`A${currentRow}`);
  subtitleCell.value = COMPANY_INFO.subtitle;
  subtitleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 25;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const reportTitleCell = worksheet.getCell(`A${currentRow}`);
  reportTitleCell.value = `سجل العمليات - ${new Date().toLocaleDateString('ar-SA')}`;
  reportTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1F5A96' } };
  reportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  currentRow++;

  const headers = ['#', 'نوع العملية', 'المستخدم', 'المشروع', 'المبلغ', 'الوصف', 'التاريخ والوقت'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = EXCEL_STYLES.tableHeader.font;
    cell.fill = EXCEL_STYLES.tableHeader.fill;
    cell.alignment = EXCEL_STYLES.tableHeader.alignment;
    cell.border = EXCEL_STYLES.tableHeader.border;
  });
  headerRow.height = 28;
  currentRow++;

  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 15;
  worksheet.getColumn(3).width = 18;
  worksheet.getColumn(4).width = 20;
  worksheet.getColumn(5).width = 18;
  worksheet.getColumn(6).width = 30;
  worksheet.getColumn(7).width = 22;

  let totalAmount = 0;
  activities.forEach((activity, idx) => {
    const row = worksheet.getRow(currentRow);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    
    const dateTime = new Date(activity.createdAt);
    const formattedDate = dateTime.toLocaleDateString('ar-SA');
    const formattedTime = dateTime.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    const rowData = [
      idx + 1,
      activity.actionLabel || getActionLabel(activity.actionType),
      activity.userName || 'النظام',
      activity.projectName || 'الكل',
      activity.amount ? formatCurrency(activity.amount) : '-',
      activity.description || '-',
      `${formattedDate} ${formattedTime}`
    ];

    rowData.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = value;
      cell.font = style.font;
      if ((style as any).fill) cell.fill = (style as any).fill;
      cell.alignment = style.alignment;
      cell.border = style.border;
    });
    
    row.height = 24;
    if (activity.amount) totalAmount += activity.amount;
    currentRow++;
  });

  currentRow++;
  const summaryRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const summaryLabelCell = summaryRow.getCell(1);
  summaryLabelCell.value = `إجمالي العمليات: ${activities.length}`;
  summaryLabelCell.font = EXCEL_STYLES.summaryRow.font;
  summaryLabelCell.fill = EXCEL_STYLES.summaryRow.fill;
  summaryLabelCell.alignment = EXCEL_STYLES.summaryRow.alignment;
  summaryLabelCell.border = EXCEL_STYLES.summaryRow.border;

  const summaryAmountCell = summaryRow.getCell(5);
  summaryAmountCell.value = formatCurrency(totalAmount);
  summaryAmountCell.font = EXCEL_STYLES.greenRow.font;
  summaryAmountCell.fill = EXCEL_STYLES.greenRow.fill;
  summaryAmountCell.alignment = EXCEL_STYLES.greenRow.alignment;
  summaryAmountCell.border = EXCEL_STYLES.greenRow.border;

  worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
  const dateCell = summaryRow.getCell(6);
  dateCell.value = `تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.height = 26;
  currentRow += 2;

  const signatureRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const sig1 = signatureRow.getCell(1);
  sig1.value = 'توقيع المدير المالي: ________________';
  sig1.font = EXCEL_STYLES.signatureBox.font;
  sig1.alignment = EXCEL_STYLES.signatureBox.alignment;
  sig1.border = EXCEL_STYLES.signatureBox.border;

  worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
  const sig2 = signatureRow.getCell(5);
  sig2.value = 'توقيع المدير العام: ________________';
  sig2.font = EXCEL_STYLES.signatureBox.font;
  sig2.alignment = EXCEL_STYLES.signatureBox.alignment;
  sig2.border = EXCEL_STYLES.signatureBox.border;
  signatureRow.height = 35;
  currentRow += 2;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const footerCell = worksheet.getCell(`A${currentRow}`);
  footerCell.value = `${COMPANY_INFO.name} | ${COMPANY_INFO.address} | تم إنشاء هذا التقرير آلياً`;
  footerCell.font = EXCEL_STYLES.footer.font;
  footerCell.alignment = EXCEL_STYLES.footer.alignment;

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `سجل_العمليات_${new Date().toISOString().split('T')[0]}.xlsx`;
  await downloadExcelFile(buffer as ArrayBuffer, fileName);
}
