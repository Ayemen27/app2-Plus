import { useState, useCallback, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  SlidersHorizontal, 
  Calendar, 
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface FilterOption {
  value: string;
  label: string;
}

export type FilterType = 'select' | 'date' | 'date-range' | 'async-select';

export interface FilterConfig {
  key: string;
  label: string;
  type?: FilterType;
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: string;
  asyncOptions?: () => Promise<FilterOption[]>;
  loadingText?: string;
}

export interface MetricConfig {
  key: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal' | 'indigo' | 'emerald' | 'amber' | 'gray';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  formatter?: (value: number) => string;
  column?: 'left' | 'right';
}

export interface ActionButton {
  key: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  disabled?: boolean;
}

export interface FilterStatsBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onReset?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  metrics?: MetricConfig[];
  actions?: ActionButton[];
  showResetButton?: boolean;
  showRefreshButton?: boolean;
  className?: string;
  compact?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  title?: string;
  metricsLayout?: 'grid' | 'two-columns';
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
    icon: 'text-green-500'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'text-orange-500'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-500'
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-600 dark:text-teal-400',
    icon: 'text-teal-500'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-600 dark:text-indigo-400',
    icon: 'text-indigo-500'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-500'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
    icon: 'text-amber-500'
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    icon: 'text-gray-500'
  }
};

function MetricCard({ metric }: { metric: MetricConfig }) {
  const colors = colorVariants[metric.color || 'blue'];
  const Icon = metric.icon;
  
  const cleanValue = (value: string | number): string => {
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return '0';
      if (Math.abs(value) > 100000000000) return '0';
      return metric.formatter ? metric.formatter(value) : value.toLocaleString('en-US');
    }
    return String(value);
  };

  const formattedValue = cleanValue(metric.value);
  
  // حساب حجم الخط بناءً على طول القيمة
  const getTextSizeClass = (text: string) => {
    const len = text.length;
    if (len <= 3) return 'text-base';
    if (len <= 5) return 'text-sm';
    if (len <= 7) return 'text-xs';
    return 'text-[10px]';
  };

  return (
    <div className={cn(
      'relative flex flex-col gap-2 px-3 py-3 pr-7 rounded-lg border transition-all h-[80px]',
      colors.bg,
      colors.border,
      'hover:shadow-sm'
    )}>
      {/* الأيقونة الصغيرة في الزاوية العلوية */}
      <div className={cn('absolute top-1.5 right-1.5 p-0.5 rounded', colors.bg)}>
        <Icon className={cn('h-3 w-3', colors.icon)} />
      </div>
      
      {/* العنوان */}
      <span className="text-xs text-muted-foreground line-clamp-2">{metric.label}</span>
      
      {/* المبلغ أو العدد في الأسفل */}
      <div className="flex items-center justify-center gap-1">
        <span className={cn('font-bold arabic-numbers whitespace-nowrap', getTextSizeClass(formattedValue), colors.text)}>
          {formattedValue}
        </span>
        {metric.trend && (
          <span className={cn(
            'text-xs flex items-center gap-0.5',
            metric.trend.isPositive ? 'text-green-500' : 'text-red-500'
          )}>
            {metric.trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {metric.trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

function DatePickerFilter({
  value,
  onChange,
  placeholder = 'اختر التاريخ',
}: {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-right h-9 font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          {value ? format(value, 'yyyy/MM/dd', { locale: ar }) : placeholder}
          <Calendar className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100] pointer-events-auto overflow-visible" align="start">
        <CalendarComponent
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          initialFocus
          locale={ar}
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value?: { from?: Date; to?: Date };
  onChange: (range: { from?: Date; to?: Date }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-right h-9 font-normal',
            !value?.from && 'text-muted-foreground'
          )}
        >
          {value?.from ? (
            value.to ? (
              `${format(value.from, 'MM/dd', { locale: ar })} - ${format(value.to, 'MM/dd', { locale: ar })}`
            ) : (
              format(value.from, 'yyyy/MM/dd', { locale: ar })
            )
          ) : (
            'اختر نطاق التاريخ'
          )}
          <Calendar className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100] pointer-events-auto overflow-visible" align="start">
        <CalendarComponent
          mode="range"
          selected={value?.from ? { from: value.from, to: value.to } : undefined}
          onSelect={(range: any) => {
            onChange(range || { from: undefined, to: undefined });
            if (range?.to) setOpen(false);
          }}
          numberOfMonths={2}
          initialFocus
          locale={ar}
        />
      </PopoverContent>
    </Popover>
  );
}

export function FilterStatsBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث...',
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  onRefresh,
  isRefreshing = false,
  metrics = [],
  actions = [],
  showResetButton = true,
  showRefreshButton = true,
  className,
  compact = false,
  collapsible = false,
  defaultExpanded = true,
  title,
  metricsLayout = 'grid',
}: FilterStatsBarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const hasActiveFilters = Object.entries(filterValues).some(([key, value]) => {
    const filter = filters.find(f => f.key === key);
    if (!filter) return false;
    if (filter.type === 'date') return value instanceof Date;
    if (filter.type === 'date-range') return value?.from || value?.to;
    return value && value !== 'all' && value !== filter?.defaultValue;
  });

  const activeFilterCount = Object.entries(filterValues).filter(([key, value]) => {
    const filter = filters.find(f => f.key === key);
    if (!filter) return false;
    if (filter.type === 'date') return value instanceof Date;
    if (filter.type === 'date-range') return value?.from || value?.to;
    return value && value !== 'all' && value !== filter?.defaultValue;
  }).length;

  const renderFilterControl = (filter: FilterConfig) => {
    const value = filterValues[filter.key];

    switch (filter.type) {
      case 'date':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DatePickerFilter
              value={value}
              onChange={(date) => onFilterChange?.(filter.key, date)}
              placeholder={filter.placeholder}
            />
          </div>
        );
      case 'date-range':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DateRangeFilter
              value={value}
              onChange={(range) => onFilterChange?.(filter.key, range)}
            />
          </div>
        );
      default:
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select 
              value={value || filter.defaultValue || 'all'} 
              onValueChange={(v) => onFilterChange?.(filter.key, v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={filter.placeholder || filter.label} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
    }
  };

  return (
    <Card className={cn('border-border/50 overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* الصف الرئيسي - البحث والفلاتر والإجراءات */}
        <div className="p-4 space-y-4">
          {/* العنوان وزر التوسيع */}
          {(title || collapsible) && (
            <div className="flex items-center justify-between">
              {title && (
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  {title}
                </h3>
              )}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-muted-foreground"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          )}

          {/* شريط البحث والفلاتر الرئيسي - صف واحد */}
          <div className="flex items-center gap-2 w-full">
            {/* البحث */}
            {showSearch && (
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pr-10 h-10"
                />
                {searchValue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => onSearchChange?.('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {/* زر عرض الفلاتر */}
            {filters.length > 0 && (
              <Sheet open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 flex-shrink-0">
                    <Filter className="h-4 w-4" />
                    <span>الفلاتر</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
            <SheetContent 
              side="bottom"
              className="h-[50vh] sm:h-[45vh] sm:max-w-xl rounded-t-[2rem] p-0 overflow-hidden border-t-0 bg-white dark:bg-gray-950 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]"
              dir="rtl"
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-muted/30 rounded-full z-50" />
              
              <div className="flex flex-col h-full relative">
                <SheetHeader className="px-6 pt-6 pb-3 text-right border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={onReset}
                      className="text-sm font-medium text-destructive hover:underline transition-all"
                    >
                      إعادة ضبط
                    </button>
                    <SheetTitle className="text-lg font-bold tracking-tight">
                      الفلاتر
                    </SheetTitle>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted transition-all">
                        <X className="h-4 w-4" />
                      </Button>
                    </SheetClose>
                  </div>
                </SheetHeader>
                
                <div className="flex-1 px-6 py-4 space-y-5 overflow-y-auto custom-scrollbar pb-24 bg-white dark:bg-gray-950">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                        {filters.map((filter) => (
                          <div key={filter.key} className="space-y-4 group">
                            <label className="text-sm font-bold text-foreground/70 group-hover:text-primary transition-colors flex items-center gap-2.5 px-1">
                              <span className="w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary group-hover:scale-125 transition-all shadow-sm" />
                              {filter.label}
                            </label>
                            <div className="pt-1 relative transform transition-all focus-within:scale-[1.01]">
                              {renderFilterControl(filter)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-gray-950 border-t border-border/50 z-40">
                      <div className="max-w-2xl mx-auto">
                        <Button 
                          className="w-full h-11 text-base font-bold rounded-xl shadow-md bg-primary text-primary-foreground"
                          onClick={() => setIsFilterPanelOpen(false)}
                        >
                          تطبيق ({activeFilterCount})
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* أزرار الإجراءات */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {showRefreshButton && onRefresh && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </Button>
              )}
              {actions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={action.key}
                    variant={action.variant || 'default'}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="h-10 gap-2"
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* عرض الفلاتر النشطة */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filterValues)
                .filter(([key, value]) => {
                  const filter = filters.find(f => f.key === key);
                  if (!filter) return false;
                  if (filter.type === 'date') return value instanceof Date;
                  if (filter.type === 'date-range') return value?.from || value?.to;
                  return value && value !== 'all' && value !== filter?.defaultValue;
                })
                .map(([key, value]) => {
                  const filter = filters.find(f => f.key === key);
                  let displayValue = '';
                  
                  if (filter?.type === 'date' && value instanceof Date) {
                    displayValue = format(value, 'yyyy/MM/dd', { locale: ar });
                  } else if (filter?.type === 'date-range') {
                    if (value?.from && value?.to) {
                      displayValue = `${format(value.from, 'MM/dd')} - ${format(value.to, 'MM/dd')}`;
                    } else if (value?.from) {
                      displayValue = `من ${format(value.from, 'MM/dd')}`;
                    }
                  } else {
                    const option = filter?.options?.find(o => o.value === value);
                    displayValue = option?.label || value;
                  }

                  return (
                    <Badge 
                      key={key} 
                      variant="secondary" 
                      className="gap-1 pl-1 pr-2 py-1 text-xs"
                    >
                      <span className="text-muted-foreground">{filter?.label}:</span>
                      <span>{displayValue}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                        onClick={() => onFilterChange?.(key, filter?.defaultValue || 'all')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
            </div>
          )}
        </div>

        {/* قسم الإحصائيات */}
        {metrics.length > 0 && (!collapsible || isExpanded) && (
          <div className="border-t border-border/50 bg-muted/30 p-4">
            {metricsLayout === 'two-columns' ? (
              <div className="grid gap-3 grid-cols-3">
                {metrics.map((metric) => (
                  <MetricCard key={metric.key} metric={metric} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-3">
                {metrics.map((metric) => (
                  <MetricCard key={metric.key} metric={metric} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FilterStatsBar;
