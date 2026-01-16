import { cn } from '@/lib/utils';
import type { ResultsSummaryConfig } from './types';

interface ResultsSummaryProps {
  config: ResultsSummaryConfig;
  className?: string;
}

export function ResultsSummary({ config, className }: ResultsSummaryProps) {
  const {
    totalCount,
    filteredCount,
    totalLabel = 'النتائج',
    filteredLabel = 'من',
    totalValue,
    totalValueLabel = 'الإجمالي',
    unit = 'ر.ي',
    categoryBreakdown,
    showBreakdown = false,
  } = config;

  const formatValue = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return '0';
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return '0';
      return value.toLocaleString('en-US');
    }
    return String(value);
  };

  return (
    <div className={cn(
      'border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden',
      className
    )}>
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-gradient-to-l from-blue-50/80 to-slate-50/80 dark:from-blue-900/30 dark:to-slate-900/30">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {totalLabel}:
          </span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 arabic-numbers">
            {filteredCount}
          </span>
          <span className="text-xs text-gray-500">
            {filteredLabel}
          </span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 arabic-numbers">
            {totalCount}
          </span>
        </div>

        {totalValue !== undefined && !showBreakdown && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {totalValueLabel}:
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 arabic-numbers">
              {formatValue(totalValue)}
            </span>
            {unit && (
              <span className="text-xs text-gray-500">{unit}</span>
            )}
          </div>
        )}
      </div>

      {showBreakdown && categoryBreakdown && categoryBreakdown.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {categoryBreakdown.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.label}:
              </span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 arabic-numbers">
                {formatValue(item.value)} {item.unit || unit}
              </span>
            </div>
          ))}

          {totalValue !== undefined && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50/50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                {totalValueLabel}:
              </span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400 arabic-numbers">
                {formatValue(totalValue)} {unit}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResultsSummary;
