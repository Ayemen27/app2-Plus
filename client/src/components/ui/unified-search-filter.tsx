import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Search, Filter, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FilterDatePicker, FilterDateRangePicker, formatDateForDisplay, formatDateRangeForDisplay } from '@/components/ui/filter-date-pickers';
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

export interface UnifiedSearchFilterProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onReset?: () => void;
  showResetButton?: boolean;
  className?: string;
  compact?: boolean;
  showActiveFilters?: boolean;
}

function AsyncSelectFilter({
  config,
  value,
  onChange,
}: {
  config: FilterConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const [options, setOptions] = useState<FilterOption[]>(config.options || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config.asyncOptions && options.length === 0) {
      setLoading(true);
      config.asyncOptions()
        .then(setOptions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [config.asyncOptions]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={loading ? (config.loadingText || 'جاري التحميل...') : config.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UnifiedSearchFilter({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث...',
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  showResetButton = true,
  className,
  compact = false,
  showActiveFilters = true,
}: UnifiedSearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const getActiveFilters = () => {
    return Object.entries(filterValues)
      .filter(([key, value]) => {
        const filter = filters.find(f => f.key === key);
        if (!filter) return false;
        
        if (filter.type === 'date') {
          return value instanceof Date;
        }
        if (filter.type === 'date-range') {
          return value?.from || value?.to;
        }
        return value && value !== 'all' && value !== filter?.defaultValue;
      })
      .map(([key, value]) => {
        const filter = filters.find(f => f.key === key);
        let valueLabel = '';
        
        if (filter?.type === 'date' && value instanceof Date) {
          valueLabel = format(value, 'yyyy/MM/dd', { locale: ar });
        } else if (filter?.type === 'date-range') {
          if (value?.from && value?.to) {
            valueLabel = `${format(value.from, 'MM/dd')} - ${format(value.to, 'MM/dd')}`;
          } else if (value?.from) {
            valueLabel = `من ${format(value.from, 'MM/dd')}`;
          }
        } else {
          const option = filter?.options?.find(o => o.value === value);
          valueLabel = option?.label || value;
        }
        
        return {
          key,
          filterLabel: filter?.label || key,
          valueLabel,
        };
      });
  };

  const activeFilters = getActiveFilters();
  const activeFiltersCount = activeFilters.length;
  const hasActiveFilters = searchValue.length > 0 || activeFiltersCount > 0;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    onFilterChange?.(key, value);
    // Keep the drawer open for better multi-selection experience in the popup
    // Users can close it using the "Apply" button or clicking outside
  }, [onFilterChange]);

  const handleReset = useCallback(() => {
    onReset?.();
    setIsFilterOpen(false);
  }, [onReset]);

  const handleClearSearch = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  const handleRemoveFilter = useCallback((key: string) => {
    const filter = filters.find(f => f.key === key);
    if (filter?.type === 'date' || filter?.type === 'date-range') {
      onFilterChange?.(key, undefined);
    } else {
      onFilterChange?.(key, filter?.defaultValue || 'all');
    }
  }, [filters, onFilterChange]);

  const renderFilterInput = (filter: FilterConfig) => {
    const value = filterValues[filter.key];
    
    switch (filter.type) {
      case 'date':
        return (
          <div onClick={(e) => e.stopPropagation()} className="relative">
            <FilterDatePicker
              value={value}
              onChange={(date) => handleFilterChange(filter.key, date)}
              placeholder={filter.placeholder}
              showClearButton={true}
              className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium w-full"
            />
          </div>
        );
      
      case 'date-range':
        const fromValue = value?.from instanceof Date ? value.from : (value?.from ? new Date(value.from) : undefined);
        const toValue = value?.to instanceof Date ? value.to : (value?.to ? new Date(value.to) : undefined);
        return (
          <div onClick={(e) => e.stopPropagation()} className="space-y-6">
            <div className="relative group">
              <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-xs font-medium text-muted-foreground z-10 transition-colors group-focus-within:text-primary">
                من تاريخ
              </Label>
              <div className="relative border-2 border-muted/50 rounded-2xl overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
                <FilterDatePicker
                  value={fromValue}
                  onChange={(date) => handleFilterChange(filter.key, { ...value, from: date })}
                  placeholder="اختر التاريخ"
                  showClearButton={true}
                  className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium w-full"
                />
              </div>
            </div>
            <div className="relative group">
              <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-xs font-medium text-muted-foreground z-10 transition-colors group-focus-within:text-primary">
                إلى تاريخ
              </Label>
              <div className="relative border-2 border-muted/50 rounded-2xl overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
                <FilterDatePicker
                  value={toValue}
                  onChange={(date) => handleFilterChange(filter.key, { ...value, to: date })}
                  placeholder="اختر التاريخ"
                  showClearButton={true}
                  className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium w-full"
                />
              </div>
            </div>
          </div>
        );
      
      case 'async-select':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <AsyncSelectFilter
              config={filter}
              value={value || filter.defaultValue || 'all'}
              onChange={(val) => handleFilterChange(filter.key, val)}
            />
          </div>
        );
      
      default:
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select 
              value={String(value || filter.defaultValue || 'all')}
              onValueChange={(val) => handleFilterChange(filter.key, val)}
            >
              <SelectTrigger className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium">
                <SelectValue placeholder={filter.placeholder || `اختر ${filter.label}`} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-2xl border-2">
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)} className="rounded-xl my-1 py-3 text-right">
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
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 p-2 bg-card border border-border/50 rounded-lg shadow-sm">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              className="pr-10 pl-8 h-9 bg-background"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute left-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {filters.length > 0 && (
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-1.5 px-3 relative',
                  activeFiltersCount > 0 && 'border-primary text-primary'
                )}
                data-testid="button-open-filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">فلترة</span>
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full absolute -top-1.5 -left-1.5"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="bottom"
              className="h-[80vh] sm:h-[75vh] sm:max-w-2xl rounded-t-[2.5rem] p-0 overflow-hidden border-t-0 bg-white dark:bg-gray-950 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]"
              dir="rtl"
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="flex flex-col h-full relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted transition-all">
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                  <SheetTitle className="text-lg font-bold text-center flex-1 mr-8">
                    اختر الفلتر
                  </SheetTitle>
                </div>
                
                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pb-32">
                  <div className="space-y-6 max-w-xl mx-auto">
                    {filters.map((filter) => (
                      <div key={filter.key} className={cn(
                        "relative group",
                        filter.type === 'date-range' ? "pt-2" : ""
                      )}>
                        {filter.type !== 'date-range' && (
                          <Label 
                            htmlFor={filter.key} 
                            className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-xs font-medium text-muted-foreground z-10 transition-colors group-focus-within:text-primary"
                          >
                            {filter.label}
                          </Label>
                        )}
                        <div className={cn(
                          filter.type !== 'date-range' && "relative border-2 border-muted/50 rounded-2xl overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5"
                        )}>
                          {renderFilterInput(filter)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {filters.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <SlidersHorizontal className="w-12 h-12 mb-4 opacity-20" />
                      <p>لا توجد فلاتر متاحة حالياً</p>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-6 left-6 right-6 z-40">
                  <div className="max-w-xl mx-auto">
                    <Button 
                      className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-red-500/20 bg-[#e31e33] hover:bg-[#c41a2c] text-white transition-all active:scale-[0.98]"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      استمرار
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {showResetButton && hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            title="إعادة تعيين"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showActiveFilters && (activeFilters.length > 0 || searchValue) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">الفلاتر النشطة:</span>
          
          {searchValue && (
            <Badge 
              variant="secondary" 
              className="gap-1 px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/20"
              onClick={handleClearSearch}
            >
              بحث: "{searchValue.length > 15 ? searchValue.substring(0, 15) + '...' : searchValue}"
              <X className="h-3 w-3" />
            </Badge>
          )}
          
          {activeFilters.map((filter) => (
            <Badge 
              key={filter.key}
              variant="secondary" 
              className="gap-1 px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/20"
              onClick={() => handleRemoveFilter(filter.key)}
            >
              {filter.filterLabel}: {filter.valueLabel}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          
          {(activeFilters.length > 1 || (activeFilters.length > 0 && searchValue)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              مسح الكل
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function useUnifiedFilter<T extends Record<string, any>>(
  initialFilters: T,
  initialSearch: string = ''
) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [filterValues, setFilterValues] = useState<T>(initialFilters);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue('');
    setFilterValues(initialFilters);
  }, [initialFilters]);

  return {
    searchValue,
    filterValues,
    setSearchValue: handleSearchChange,
    setFilterValue: handleFilterChange,
    reset: handleReset,
    onSearchChange: handleSearchChange,
    onFilterChange: handleFilterChange,
    onReset: handleReset,
  };
}

export const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
];

export const EQUIPMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'out_of_service', label: 'خارج الخدمة' },
  { value: 'inactive', label: 'غير نشط' },
];

export const READ_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'الكل' },
  { value: 'unread', label: 'غير مقروء' },
  { value: 'read', label: 'مقروء' },
];

export const PAYMENT_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع أنواع الدفع' },
  { value: 'cash', label: 'نقدي' },
  { value: 'credit', label: 'آجل' },
  { value: 'transfer', label: 'تحويل' },
];

export const TRANSFER_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'incoming', label: 'وارد' },
  { value: 'outgoing', label: 'صادر' },
];

export const NOTIFICATION_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'info', label: 'معلومات' },
  { value: 'warning', label: 'تحذير' },
  { value: 'error', label: 'خطأ' },
  { value: 'success', label: 'نجاح' },
];

export const PRIORITY_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الأولويات' },
  { value: 'high', label: 'عالية' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'low', label: 'منخفضة' },
];

export const PROJECT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'paused', label: 'متوقف' },
];

export default UnifiedSearchFilter;
