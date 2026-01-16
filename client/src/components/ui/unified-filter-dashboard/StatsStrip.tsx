import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StatsRowConfig, StatItem } from './types';
import { colorVariants } from './types';

interface StatsStripProps {
  rows: StatsRowConfig[];
  className?: string;
}

function formatCurrencyValue(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  if (Math.abs(value) > 100000000000) return '0';
  return value.toLocaleString('en-US');
}

function SplitStatCard({ item }: { item: StatItem }) {
  const splitValue = (item as any).splitValue;
  if (!splitValue) return null;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border transition-all overflow-hidden h-[80px]',
        'bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/30',
        'border-slate-200 dark:border-slate-700',
        'hover:shadow-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <item.icon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {item.label}
        </span>
      </div>
      
      {/* Split Content - وارد وصادر */}
      <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 rtl:divide-x-reverse">
        {/* وارد */}
        <div className="flex flex-col items-center justify-center p-2 bg-teal-50/50 dark:bg-teal-900/20">
          <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400 mb-0.5">وارد</span>
          <span className="text-sm font-extrabold text-teal-700 dark:text-teal-300 arabic-numbers">
            {formatCurrencyValue(splitValue.incoming)}
          </span>
        </div>
        
        {/* صادر */}
        <div className="flex flex-col items-center justify-center p-2 bg-rose-50/50 dark:bg-rose-900/20">
          <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 mb-0.5">صادر</span>
          <span className="text-sm font-extrabold text-rose-700 dark:text-rose-300 arabic-numbers">
            {formatCurrencyValue(splitValue.outgoing)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ item }: { item: StatItem }) {
  if ((item as any).isSplitCard) {
    return <SplitStatCard item={item} />;
  }

  const colors = colorVariants[item.color] || colorVariants.blue;
  const Icon = item.icon;

  const cleanValue = (value: string | number): string => {
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return '0';
      if (Math.abs(value) > 100000000000) return '0';
      return item.formatter ? item.formatter(value) : value.toLocaleString('en-US');
    }
    return String(value);
  };

  const formattedValue = cleanValue(item.value);

  const getValueFontSize = (text: string) => {
    const len = text.length;
    if (len <= 4) return '1.25rem';
    if (len <= 7) return '1.1rem';
    if (len <= 10) return '0.95rem';
    if (len <= 13) return '0.85rem';
    return '0.75rem';
  };

  return (
    <div
      className={cn(
        'relative flex flex-col p-2 rounded-xl border transition-all h-[80px]',
        colors.bg,
        colors.border,
        'hover:shadow-sm',
        item.onClick && 'cursor-pointer'
      )}
      onClick={item.onClick}
    >
      {/* Header: Title + Icon in same row */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-xs font-bold text-muted-foreground truncate flex-1">
          {item.label}
        </span>
        <div className={cn('p-1 rounded-md flex-shrink-0', colors.bg)}>
          <Icon className={cn('h-3.5 w-3.5', colors.icon)} />
        </div>
      </div>

      {item.showDot && (
        <div className={cn(
          'absolute top-2 right-10 h-2.5 w-2.5 rounded-full',
          item.dotColor || 'bg-green-500'
        )} />
      )}

      {/* Value section */}
      <div className="flex flex-col items-center justify-center text-center">
        <span 
          className={cn('font-bold arabic-numbers leading-none whitespace-nowrap', colors.text)}
          style={{ fontSize: getValueFontSize(formattedValue) }}
        >
          {formattedValue}
        </span>

        {item.unit && (
          <span className="text-[10px] text-muted-foreground mt-0.5">{item.unit}</span>
        )}

        {item.subLabel && (
          <span className="text-[10px] text-muted-foreground/70 truncate w-full mt-1">
            {item.subLabel}
          </span>
        )}

        {item.trend && (
          <span className={cn(
            'text-[10px] flex items-center gap-0.5 mt-1',
            item.trend.isPositive ? 'text-green-500' : 'text-red-500'
          )}>
            {item.trend.isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {item.trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

export function StatsStrip({ rows, className }: StatsStripProps) {
  if (!rows || rows.length === 0) return null;

  const getGridCols = (cols: number = 3) => {
    switch (cols) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      default: return 'grid-cols-3';
    }
  };

  const getGapClass = (gap: 'sm' | 'md' | 'lg' = 'sm') => {
    switch (gap) {
      case 'sm': return 'gap-2';
      case 'md': return 'gap-3';
      case 'lg': return 'gap-4';
      default: return 'gap-2';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            'grid',
            getGridCols(row.columns),
            getGapClass(row.gap)
          )}
        >
          {row.items.map((item) => (
            <StatCard key={item.key} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default StatsStrip;
