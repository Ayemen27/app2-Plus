import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export async function exportMaterialPurchasesToExcel(purchases: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('مشتريات المواد');

  // تعيين اتجاه الصفحة من اليمين لليسار
  worksheet.views = [{ rightToLeft: true }];

  // تعريف الأعمدة
  worksheet.columns = [
    { header: 'التاريخ', key: 'purchaseDate', width: 15 },
    { header: 'اسم المادة', key: 'materialName', width: 20 },
    { header: 'الفئة', key: 'materialCategory', width: 15 },
    { header: 'الكمية', key: 'quantity', width: 10 },
    { header: 'الوحدة', key: 'unit', width: 10 },
    { header: 'سعر الوحدة', key: 'unitPrice', width: 12 },
    { header: 'المبلغ الإجمالي', key: 'totalAmount', width: 15 },
    { header: 'نوع الدفع', key: 'purchaseType', width: 12 },
    { header: 'المورد', key: 'supplierName', width: 20 },
    { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 15 },
    { header: 'المشروع', key: 'projectName', width: 20 },
    { header: 'ملاحظات', key: 'notes', width: 30 },
  ];

  // تنسيق الصف العلوي (العناوين)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' } // Blue-600
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // إضافة البيانات
  purchases.forEach(purchase => {
    const row = worksheet.addRow({
      purchaseDate: purchase.purchaseDate ? format(new Date(purchase.purchaseDate), 'yyyy-MM-dd') : '',
      materialName: purchase.materialName || purchase.material?.name || '',
      materialCategory: purchase.materialCategory || purchase.material?.category || '',
      quantity: purchase.quantity,
      unit: purchase.materialUnit || purchase.unit || purchase.material?.unit || '',
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      purchaseType: purchase.purchaseType || 'نقد',
      supplierName: purchase.supplierName || '',
      invoiceNumber: purchase.invoiceNumber || '',
      projectName: purchase.projectName || purchase.project?.name || 'غير محدد',
      notes: purchase.notes || '',
    });

    // تنسيق محاذاة الخلايا
    row.alignment = { vertical: 'middle', horizontal: 'right' };
  });

  // إضافة صف الإجمالي
  const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);
  const totalRow = worksheet.addRow({
    purchaseDate: 'الإجمالي',
    totalAmount: totalAmount
  });
  totalRow.font = { bold: true };
  totalRow.getCell('totalAmount').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDBEAFE' } // Blue-100
  };

  // توليد وحفظ الملف
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `مشتريات_المواد_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
}
