/**
 * تصدير سجل العمليات إلى Excel بتنسيق احترافي
 * Export Transactions Log to Professional Excel Format
 */

import { downloadExcelFile } from '@/utils/webview-download';
import { 
  COMPANY_INFO, 
  EXCEL_STYLES
} from '@/utils/professional-export';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
  workDays?: number;
  dailyWage?: number;
  workerName?: string;
  transferMethod?: string;
  recipientName?: string;
  quantity?: number;
  unitPrice?: number;
  paymentType?: string;
  supplierName?: string;
  materialName?: string;
  payableAmount?: number;
}

interface Totals {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'income': 'دخل',
    'expense': 'مصروف',
    'deferred': 'آجل',
    'transfer_from_project': 'ترحيل وارد'
  };
  return labels[type] || type;
};

export async function exportTransactionsToExcel(
  transactions: Transaction[],
  totals: Totals,
  formatCurrency: (amount: number) => string,
  projectName?: string
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
        left: 0.2,
        right: 0.2,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2
      }
    }
  });

  const totalColumns = 15;
  let currentRow = 1;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = COMPANY_INFO.name;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5A96' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const subtitleCell = worksheet.getCell(`A${currentRow}`);
  subtitleCell.value = COMPANY_INFO.subtitle;
  subtitleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 25;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const reportTitleCell = worksheet.getCell(`A${currentRow}`);
  const reportTitle = projectName 
    ? `سجل العمليات - ${projectName} - ${new Date().toLocaleDateString('ar-SA')}`
    : `سجل العمليات - ${new Date().toLocaleDateString('ar-SA')}`;
  reportTitleCell.value = reportTitle;
  reportTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1F5A96' } };
  reportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  currentRow++;

  const summaryData = [
    ['إجمالي الدخل', formatCurrency(totals.totalIncome)],
    ['إجمالي المصروفات', formatCurrency(totals.totalExpenses)],
    ['الرصيد الصافي', formatCurrency(totals.balance)]
  ];

  summaryData.forEach(([label, value]) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const labelCell = row.getCell(1);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 11 };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
    const valueCell = row.getCell(5);
    valueCell.value = value;
    valueCell.font = { bold: true, size: 11, color: { argb: label === 'الرصيد الصافي' ? (totals.balance >= 0 ? 'FF008000' : 'FFFF0000') : 'FF000000' } };
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    row.height = 22;
    currentRow++;
  });

  currentRow++;

  const headers = [
    '#',           // 1
    'التاريخ',      // 2
    'النوع',        // 3
    'الفئة',        // 4
    'المشروع',      // 5
    'اسم العامل/المادة', // 6
    'عدد الأيام',    // 7
    'الأجر اليومي',  // 8
    'المستحقات',    // 9 - عمود جديد
    'الكمية',       // 10
    'سعر الوحدة',   // 11
    'نوع الدفع',    // 12
    'المورد/المستلم', // 13
    'طريقة التحويل', // 14
    'المبلغ المدفوع' // 15
  ];
  
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

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 12;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 14;
  worksheet.getColumn(5).width = 14;
  worksheet.getColumn(6).width = 16;
  worksheet.getColumn(7).width = 10;
  worksheet.getColumn(8).width = 11;
  worksheet.getColumn(9).width = 13;  // المستحقات
  worksheet.getColumn(10).width = 8;
  worksheet.getColumn(11).width = 10;
  worksheet.getColumn(12).width = 9;
  worksheet.getColumn(13).width = 14;
  worksheet.getColumn(14).width = 11;
  worksheet.getColumn(15).width = 13;

  transactions.forEach((transaction, idx) => {
    const row = worksheet.getRow(currentRow);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    
    const dateObj = new Date(transaction.date);
    const formattedDate = dateObj.toLocaleDateString('ar-SA');

    const getNameField = (): string => {
      if (transaction.workerName) return transaction.workerName;
      if (transaction.materialName) return transaction.materialName;
      // إضافة الوصف للمواصلات والنثريات وغيرها
      if (transaction.description && transaction.description !== '-') return transaction.description;
      return '-';
    };

    const getRecipientOrSupplier = (): string => {
      if (transaction.supplierName) return transaction.supplierName;
      if (transaction.recipientName) return transaction.recipientName;
      return '-';
    };

    const rowData = [
      idx + 1,
      formattedDate,
      getTypeLabel(transaction.type),
      transaction.category,
      transaction.projectName || 'غير محدد',
      getNameField(),
      transaction.workDays ?? '-',
      transaction.dailyWage ? formatCurrency(transaction.dailyWage) : '-',
      transaction.payableAmount ? formatCurrency(transaction.payableAmount) : '-',
      transaction.quantity ?? '-',
      transaction.unitPrice ? formatCurrency(transaction.unitPrice) : '-',
      transaction.paymentType || '-',
      getRecipientOrSupplier(),
      transaction.transferMethod || '-',
      formatCurrency(transaction.amount)
    ];

    rowData.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = value;
      cell.font = style.font;
      if ((style as any).fill) cell.fill = (style as any).fill;
      cell.alignment = style.alignment;
      cell.border = style.border;

      if (colIdx === 2) {
        if (transaction.type === 'income' || transaction.type === 'transfer_from_project') {
          cell.font = { ...style.font, color: { argb: 'FF008000' } };
        } else if (transaction.type === 'expense') {
          cell.font = { ...style.font, color: { argb: 'FFFF0000' } };
        } else if (transaction.type === 'deferred') {
          cell.font = { ...style.font, color: { argb: 'FFFF8C00' } };
        }
      }

      // تلوين عمود المستحقات للعمال غير المدفوعين
      if (colIdx === 8 && transaction.payableAmount && transaction.amount === 0) {
        cell.font = { ...style.font, bold: true, color: { argb: 'FFFF6600' } };
      }

      if (colIdx === 14) {
        if (transaction.type === 'income' || transaction.type === 'transfer_from_project') {
          cell.font = { ...style.font, bold: true, color: { argb: 'FF008000' } };
        } else if (transaction.type === 'expense') {
          cell.font = { ...style.font, bold: true, color: { argb: 'FFFF0000' } };
        } else if (transaction.type === 'deferred') {
          cell.font = { ...style.font, bold: true, color: { argb: 'FFFF8C00' } };
        }
      }
    });
    
    row.height = 24;
    currentRow++;
  });

  currentRow++;
  const summaryRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const summaryLabelCell = summaryRow.getCell(1);
  summaryLabelCell.value = `إجمالي العمليات: ${transactions.length}`;
  summaryLabelCell.font = EXCEL_STYLES.summaryRow.font;
  summaryLabelCell.fill = EXCEL_STYLES.summaryRow.fill;
  summaryLabelCell.alignment = EXCEL_STYLES.summaryRow.alignment;
  summaryLabelCell.border = EXCEL_STYLES.summaryRow.border;

  worksheet.mergeCells(`H${currentRow}:O${currentRow}`);
  const dateCell = summaryRow.getCell(8);
  dateCell.value = `تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.height = 26;
  currentRow += 2;

  const signatureRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
  const sig1 = signatureRow.getCell(1);
  sig1.value = 'توقيع المدير المالي: ________________';
  sig1.font = EXCEL_STYLES.signatureBox.font;
  sig1.alignment = EXCEL_STYLES.signatureBox.alignment;
  sig1.border = EXCEL_STYLES.signatureBox.border;

  worksheet.mergeCells(`K${currentRow}:O${currentRow}`);
  const sig2 = signatureRow.getCell(11);
  sig2.value = 'توقيع المدير العام: ________________';
  sig2.font = EXCEL_STYLES.signatureBox.font;
  sig2.alignment = EXCEL_STYLES.signatureBox.alignment;
  sig2.border = EXCEL_STYLES.signatureBox.border;
  signatureRow.height = 35;
  currentRow += 2;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const footerCell = worksheet.getCell(`A${currentRow}`);
  footerCell.value = `${COMPANY_INFO.name} | ${COMPANY_INFO.address} | تم إنشاء هذا التقرير آلياً`;
  footerCell.font = EXCEL_STYLES.footer.font;
  footerCell.alignment = EXCEL_STYLES.footer.alignment;

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `سجل_العمليات_${projectName ? projectName + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
  await downloadExcelFile(buffer as ArrayBuffer, fileName);
}
