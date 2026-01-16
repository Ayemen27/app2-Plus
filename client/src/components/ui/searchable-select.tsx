import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Check, ChevronDown, Search, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  showSearch?: boolean;
  maxHeight?: number;
  allowCustom?: boolean;
  onCustomAdd?: (value: string) => void;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'اختر...',
  searchPlaceholder = 'بحث...',
  emptyText = 'لا توجد نتائج',
  disabled = false,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  showSearch = true,
  maxHeight = 300,
  allowCustom = false,
  onCustomAdd,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(option =>
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term) ||
      option.description?.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value);
  }, [options, value]);

  const handleSelect = useCallback((selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearchTerm('');
  }, [onValueChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
  }, [onValueChange]);

  useEffect(() => {
    if (open && showSearch && searchInputRef.current) {
      // استخدام تركيز فوري بدلاً من setTimeout لضمان ظهور لوحة المفاتيح بسرعة
      searchInputRef.current.focus();
      // إبقاء setTimeout كخيار احتياطي لبعض المتصفحات
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    if (!open) {
      setSearchTerm('');
    }
  }, [open, showSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between h-10 font-normal',
              !value && 'text-muted-foreground',
              triggerClassName
            )}
          >
            <span className="truncate text-right flex-1">
              {selectedOption?.label || placeholder}
            </span>
            <div className="flex items-center gap-1 mr-2">
              {value && !disabled && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn('w-[var(--radix-popover-trigger-width)] p-0', contentClassName)}
          align="start"
          onKeyDown={handleKeyDown}
        >
          {showSearch && (
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-8 h-9"
                />
              </div>
            </div>
          )}
          <ScrollArea className="w-full" style={{ maxHeight: `${maxHeight}px` }}>
            <div className="p-1 min-w-[var(--radix-popover-trigger-width)]">
              {filteredOptions.length === 0 ? (
                <div>
                  {allowCustom && searchTerm.trim() ? (
                    <button
                      onClick={() => {
                        handleSelect(searchTerm.trim());
                        onCustomAdd?.(searchTerm.trim());
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm text-right',
                        'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        'transition-colors duration-150 bg-blue-50'
                      )}
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <div className="flex-1 text-right">
                        <div>+ إضافة "{searchTerm.trim()}"</div>
                      </div>
                    </button>
                  ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      {emptyText}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => !option.disabled && handleSelect(option.value)}
                      disabled={option.disabled}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm text-right',
                        'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        'transition-colors duration-150',
                        value === option.value && 'bg-accent/50',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1 text-right">
                        <div>{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                  {allowCustom && searchTerm.trim() && !filteredOptions.some(o => o.value === searchTerm.trim()) && (
                    <button
                      onClick={() => {
                        handleSelect(searchTerm.trim());
                        onCustomAdd?.(searchTerm.trim());
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm text-right mt-1',
                        'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        'transition-colors duration-150 bg-blue-50'
                      )}
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <div className="flex-1 text-right">
                        <div>+ إضافة "{searchTerm.trim()}"</div>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function WorkerSelect({
  value,
  onValueChange,
  workers,
  placeholder = 'اختر العامل',
  showAllOption = false,
  allOptionLabel = 'جميع العمال',
  showInactiveWorkers = true,
  disabled = false,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  workers: Array<{ id: string; name: string; type?: string; isActive?: boolean }>;
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  showInactiveWorkers?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const options: SelectOption[] = useMemo(() => {
    const filteredWorkers = showInactiveWorkers 
      ? workers 
      : workers.filter(w => w.isActive !== false);
    const workerOptions = filteredWorkers.map(w => ({
      value: w.id,
      label: w.name,
      description: w.type ? `${w.type}${w.isActive === false ? ' (غير نشط)' : ''}` : (w.isActive === false ? '(غير نشط)' : undefined),
    }));
    
    if (showAllOption) {
      return [{ value: 'all', label: allOptionLabel }, ...workerOptions];
    }
    return workerOptions;
  }, [workers, showAllOption, allOptionLabel, showInactiveWorkers]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="ابحث عن عامل..."
      emptyText="لم يتم العثور على عمال"
      disabled={disabled}
      className={className}
    />
  );
}

export function ProjectSelect({
  value,
  onValueChange,
  projects,
  placeholder = 'اختر المشروع',
  showAllOption = false,
  allOptionLabel = 'جميع المشاريع',
  disabled = false,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  projects: Array<{ id: string; name: string; status?: string }>;
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options: SelectOption[] = useMemo(() => {
    const projectOptions = projects.map(p => ({
      value: p.id,
      label: p.name,
      description: p.status || undefined,
    }));
    
    if (showAllOption) {
      return [{ value: 'all', label: allOptionLabel }, ...projectOptions];
    }
    return projectOptions;
  }, [projects, showAllOption, allOptionLabel]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="ابحث عن مشروع..."
      emptyText="لم يتم العثور على مشاريع"
      disabled={disabled}
      className={className}
    />
  );
}

export function SupplierSelect({
  value,
  onValueChange,
  suppliers,
  placeholder = 'اختر المورد',
  showAllOption = false,
  allOptionLabel = 'جميع الموردين',
  disabled = false,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  suppliers: Array<{ id: string; name: string; phone?: string }>;
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options: SelectOption[] = useMemo(() => {
    const supplierOptions = suppliers.map(s => ({
      value: s.id,
      label: s.name,
      description: s.phone || undefined,
    }));
    
    if (showAllOption) {
      return [{ value: 'all', label: allOptionLabel }, ...supplierOptions];
    }
    return supplierOptions;
  }, [suppliers, showAllOption, allOptionLabel]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="ابحث عن مورد..."
      emptyText="لم يتم العثور على موردين"
      disabled={disabled}
      className={className}
    />
  );
}

export function UserSelect({
  value,
  onValueChange,
  users,
  placeholder = 'اختر المستخدم',
  showAllOption = false,
  allOptionLabel = 'جميع المستخدمين',
  disabled = false,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  users: Array<{ id: string; fullName?: string; username?: string; email?: string }>;
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options: SelectOption[] = useMemo(() => {
    const userOptions = users.map(u => ({
      value: u.id,
      label: u.fullName || u.username || u.email || u.id,
      description: u.email || undefined,
    }));
    
    if (showAllOption) {
      return [{ value: 'all', label: allOptionLabel }, ...userOptions];
    }
    return userOptions;
  }, [users, showAllOption, allOptionLabel]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="ابحث عن مستخدم..."
      emptyText="لم يتم العثور على مستخدمين"
      disabled={disabled}
      className={className}
    />
  );
}

export function ProjectTypeSelect({
  value,
  onValueChange,
  projectTypes,
  placeholder = 'اختر نوع المشروع',
  showNoneOption = true,
  noneOptionLabel = 'بدون نوع',
  disabled = false,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  projectTypes: Array<{ id: number; name: string; description?: string | null }>;
  placeholder?: string;
  showNoneOption?: boolean;
  noneOptionLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options: SelectOption[] = useMemo(() => {
    const typeOptions = projectTypes.map(t => ({
      value: t.id.toString(),
      label: t.name,
      description: t.description || undefined,
    }));
    
    if (showNoneOption) {
      return [{ value: '', label: noneOptionLabel }, ...typeOptions];
    }
    return typeOptions;
  }, [projectTypes, showNoneOption, noneOptionLabel]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="ابحث عن نوع مشروع..."
      emptyText="لم يتم العثور على أنواع"
      disabled={disabled}
      className={className}
    />
  );
}

export function RegionSelect({
  value,
  onValueChange,
  regions,
  placeholder = 'اختر المنطقة',
  showAllOption = false,
  allOptionLabel = 'جميع المناطق',
  disabled = false,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  regions: string[];
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options: SelectOption[] = useMemo(() => {
    const regionOptions = regions.map(r => ({
      value: r,
      label: r,
    }));
    
    if (showAllOption) {
      return [{ value: 'all', label: allOptionLabel }, ...regionOptions];
    }
    return regionOptions;
  }, [regions, showAllOption, allOptionLabel]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="ابحث عن منطقة..."
      emptyText="لم يتم العثور على مناطق"
      disabled={disabled}
      className={className}
    />
  );
}
