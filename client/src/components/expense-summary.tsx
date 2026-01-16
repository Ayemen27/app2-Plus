/**
 * الوصف: مكون ملخص المصاريف اليومية محسّن
 * المدخلات: الدخل والمنصرفات والرصيد
 * المخرجات: عرض ملخص مالي مصمم مع مؤشرات بصرية محسّنة
 * المالك: عمار
 * آخر تعديل: 2025-11-27
 * الحالة: نشط - مكون أساسي للتقارير المالية
 */

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Gauge, Users, Package, Truck, AlertCircle, Clock, Send } from "lucide-react";

interface ExpenseSummaryProps {
  totalIncome?: number | string;
  totalExpenses?: number | string;
  remainingBalance?: number | string;
  materialExpensesCredit?: number | string;
  details?: {
    workerWages?: number;
    materialCosts?: number;
    transportation?: number;
    miscExpenses?: number;
    workerTransfers?: number;
    outgoingProjectTransfers?: number;
  };
}

export default function ExpenseSummary({ 
  totalIncome, 
  totalExpenses, 
  remainingBalance, 
  materialExpensesCredit,
  details 
}: ExpenseSummaryProps) {
  // معالجة آمنة للقيم - تحويل إلى أرقام والتعامل مع القيم المفقودة
  const safeIncome = typeof totalIncome === 'number' ? totalIncome : parseFloat(String(totalIncome || '0')) || 0;
  const safeExpenses = typeof totalExpenses === 'number' ? totalExpenses : parseFloat(String(totalExpenses || '0')) || 0;
  const safeBalance = typeof remainingBalance === 'number' ? remainingBalance : parseFloat(String(remainingBalance || '0')) || 0;
  const safeDeferred = typeof materialExpensesCredit === 'number' ? materialExpensesCredit : parseFloat(String(materialExpensesCredit || '0')) || 0;

  // المصاريف التفصيلية من المصدر الموحد (إذا توفرت)
  const workerWages = details?.workerWages ?? 0;
  const materialCosts = details?.materialCosts ?? 0;
  const transportation = details?.transportation ?? 0;
  const miscExpenses = details?.miscExpenses ?? 0;
  const workerTransfers = (details as any)?.workerTransfers ?? 0;
  const outgoingProjectTransfers = (details as any)?.outgoingProjectTransfers ?? 0;

  // إجمالي المصروفات النقدية الفعلية (باستثناء الآجل) لضمان مطابقة سجل العمليات
  const totalCashExpenses = workerWages + materialCosts + transportation + miscExpenses + workerTransfers + outgoingProjectTransfers;

  // حساب النسب المئوية بناءً على المصاريف الفعلية
  const totalAmount = safeIncome;
  const incomePercentage = 100;
  const expensesPercentage = totalAmount > 0 ? (safeExpenses / totalAmount) * 100 : 0;

  // تحديد لون الرصيد بناءً على القيمة
  const balanceColor = safeBalance > 0 ? 'text-green-400' : safeBalance < 0 ? 'text-red-400' : 'text-yellow-400';
  const balanceIndicator = safeBalance > 0 ? '↑' : safeBalance < 0 ? '↓' : '→';

  return (
    <div className="mt-4 space-y-3">
      {/* البطاقة الرئيسية */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            ملخص اليوم
          </h4>
          <div className={`text-2xl font-bold ${balanceColor}`}>
            {balanceIndicator}
          </div>
        </div>

        {/* الإجماليات */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* الدخل */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">الدخل</span>
            </div>
            <div className="text-lg font-bold text-green-900 dark:text-green-100 arabic-numbers">
              {formatCurrency(safeIncome)}
            </div>
            {totalAmount > 0 && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {incomePercentage.toFixed(1)}% من الإجمالي
              </div>
            )}
          </div>

          {/* المنصرفات */}
          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">المنصرفات</span>
            </div>
            <div className="text-lg font-bold text-red-900 dark:text-red-100 arabic-numbers">
              {formatCurrency(safeExpenses)}
            </div>
            {totalAmount > 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                {expensesPercentage.toFixed(1)}% من الإجمالي
              </div>
            )}
          </div>
        </div>

        {/* تفاصيل المنصرفات الإضافية */}
        {details && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
            <div className="bg-white/50 dark:bg-black/20 p-2 rounded border border-border/50">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Users className="h-3 w-3" />
                أجور
              </div>
              <div className="text-xs font-bold">{formatCurrency(details.workerWages || 0)}</div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-2 rounded border border-border/50">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Package className="h-3 w-3" />
                مواد
              </div>
              <div className="text-xs font-bold">{formatCurrency(details.materialCosts || 0)}</div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-2 rounded border border-border/50">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Truck className="h-3 w-3" />
                نقل
              </div>
              <div className="text-xs font-bold">{formatCurrency(details.transportation || 0)}</div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-2 rounded border border-border/50">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                تحويلات عمال
              </div>
              <div className="text-xs font-bold">{formatCurrency((details as any).workerTransfers || 0)}</div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-2 rounded border border-border/50">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Send className="h-3 w-3" />
                تحويلات مشاريع
              </div>
              <div className="text-xs font-bold">{formatCurrency((details as any).outgoingProjectTransfers || 0)}</div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-2 rounded border border-border/50">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <AlertCircle className="h-3 w-3" />
                متنوع
              </div>
              <div className="text-xs font-bold">{formatCurrency(details.miscExpenses || 0)}</div>
            </div>
          </div>
        )}

        {/* شريط التوزيع */}
        {totalAmount > 0 && (
          <div className="mb-4">
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <div 
                className="bg-green-500"
                style={{ width: `${incomePercentage}%` }}
              />
              <div 
                className="bg-red-500"
                style={{ width: `${expensesPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* الرصيد المتبقي */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg p-3 border border-primary/30 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm text-muted-foreground">الرصيد المتبقي</span>
            </div>
            <div className={`text-2xl font-bold arabic-numbers ${balanceColor}`}>
              {formatCurrency(safeBalance)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {safeBalance > 0 
              ? '✅ رصيد إيجابي' 
              : safeBalance < 0 
                ? '⚠️ رصيد سالب' 
                : '➖ رصيد متوازن'}
          </div>
        </div>

        {/* المواد الآجلة - عرض منفصل - يظهر فقط إذا كانت القيمة أكبر من صفر */}
        {safeDeferred > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-sm text-orange-700 dark:text-orange-300">مواد آجلة (لا تُخصم من الرصيد)</span>
              </div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400 arabic-numbers">
                {formatCurrency(safeDeferred)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
