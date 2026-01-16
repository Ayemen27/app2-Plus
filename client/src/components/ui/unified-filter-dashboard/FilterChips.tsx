import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, Filter, Calendar } from 'lucide-react';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { FilterConfig } from './types';

interface FilterChipsProps {
  filters: FilterConfig[];
  filterValues: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onReset?: () => void;
  showAllFiltersButton?: boolean;
  onShowAllFilters?: () => void;
  className?: string;
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
  return (
    <DatePickerField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full"
    />
  );
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value?: { from?: Date; to?: Date };
  onChange: (range: { from?: Date; to?: Date }) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <DatePickerField
        value={value?.from}
        onChange={(date) => onChange({ ...value, from: date })}
        placeholder="من تاريخ"
      />
      <DatePickerField
        value={value?.to}
        onChange={(date) => onChange({ ...value, to: date })}
        placeholder="إلى تاريخ"
      />
    </div>
  );
}

export function FilterChips({
  filters,
  filterValues,
  onFilterChange,
  onReset,
  showAllFiltersButton = true,
  className,
}: FilterChipsProps) {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const getActiveFilters = () => {
    return filters.filter(filter => {
      const value = filterValues[filter.key];
      if (filter.type === 'date') return value instanceof Date;
      if (filter.type === 'date-range') return value?.from || value?.to;
      return value && value !== 'all' && value !== filter.defaultValue;
    });
  };

  const activeFilters = getActiveFilters();

  const getFilterDisplayValue = (filter: FilterConfig): string => {
    const value = filterValues[filter.key];
    if (filter.type === 'date' && value instanceof Date) {
      return format(value, 'dd MMMM yyyy', { locale: ar });
    }
    if (filter.type === 'date-range') {
      if (value?.from && value?.to) {
        return `${format(value.from, 'dd MMM', { locale: ar })} - ${format(value.to, 'dd MMM', { locale: ar })}`;
      }
      if (value?.from) {
        return `من ${format(value.from, 'dd MMM', { locale: ar })}`;
      }
    }
    const option = filter.options?.find(o => o.value === value);
    return option?.label || value;
  };

  const handleRemoveFilter = (filter: FilterConfig) => {
    if (filter.type === 'date' || filter.type === 'date-range') {
      onFilterChange(filter.key, undefined);
    } else {
      onFilterChange(filter.key, filter.defaultValue || 'all');
    }
  };

  const renderFilterInput = (filter: FilterConfig) => {
    const value = filterValues[filter.key];

    switch (filter.type) {
      case 'date':
        return (
          <DatePickerFilter
            value={value}
            onChange={(date) => onFilterChange(filter.key, date)}
            placeholder={filter.placeholder}
          />
        );
      case 'date-range':
        return (
          <DateRangeFilter
            value={value}
            onChange={(range) => onFilterChange(filter.key, range)}
          />
        );
      default:
        return (
          <Select
            value={value || filter.defaultValue || 'all'}
            onValueChange={(v) => onFilterChange(filter.key, v)}
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
        );
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1.5 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-full cursor-default transition-colors"
            >
              <span className="font-medium">
                {getFilterDisplayValue(filter)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFilter(filter);
                }}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors mr-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

    </div>
  );
}

export default FilterChips;
