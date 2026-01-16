import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface FilterState {
  searchValue: string;
  filterValues: Record<string, any>;
}

export interface UseFilterStatsOptions {
  initialSearch?: string;
  initialFilters?: Record<string, any>;
  queryKeys?: string[];
  onFiltersChange?: (filters: Record<string, any>) => void;
  onSearchChange?: (search: string) => void;
}

export interface UseFilterStatsReturn {
  searchValue: string;
  filterValues: Record<string, any>;
  setSearchValue: (value: string) => void;
  setFilterValue: (key: string, value: any) => void;
  setFilterValues: (values: Record<string, any>) => void;
  resetFilters: () => void;
  resetAll: () => void;
  isFiltersActive: boolean;
  activeFilterCount: number;
  refresh: () => void;
  isRefreshing: boolean;
}

export function useFilterStats({
  initialSearch = '',
  initialFilters = {},
  queryKeys = [],
  onFiltersChange,
  onSearchChange,
}: UseFilterStatsOptions = {}): UseFilterStatsReturn {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValueState] = useState(initialSearch);
  const [filterValues, setFilterValuesState] = useState<Record<string, any>>(initialFilters);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setSearchValue = useCallback((value: string) => {
    setSearchValueState(value);
    onSearchChange?.(value);
  }, [onSearchChange]);

  const setFilterValue = useCallback((key: string, value: any) => {
    setFilterValuesState(prev => {
      const newFilters = { ...prev, [key]: value };
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  }, [onFiltersChange]);

  const setFilterValues = useCallback((values: Record<string, any>) => {
    setFilterValuesState(values);
    onFiltersChange?.(values);
  }, [onFiltersChange]);

  const resetFilters = useCallback(() => {
    setFilterValuesState(initialFilters);
    onFiltersChange?.(initialFilters);
  }, [initialFilters, onFiltersChange]);

  const resetAll = useCallback(() => {
    setSearchValueState(initialSearch);
    setFilterValuesState(initialFilters);
    onSearchChange?.(initialSearch);
    onFiltersChange?.(initialFilters);
  }, [initialSearch, initialFilters, onSearchChange, onFiltersChange]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (queryKeys.length > 0) {
        await Promise.all(
          queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
        );
      } else {
        await queryClient.invalidateQueries();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [queryClient, queryKeys]);

  const { isFiltersActive, activeFilterCount } = useMemo(() => {
    let count = 0;
    let hasActive = false;

    Object.entries(filterValues).forEach(([key, value]) => {
      const isActive = (() => {
        if (value === null || value === undefined) return false;
        if (value === 'all' || value === '') return false;
        if (value instanceof Date) return true;
        if (typeof value === 'object' && (value.from || value.to)) return true;
        if (value === initialFilters[key]) return false;
        return true;
      })();

      if (isActive) {
        count++;
        hasActive = true;
      }
    });

    return { isFiltersActive: hasActive, activeFilterCount: count };
  }, [filterValues, initialFilters]);

  return {
    searchValue,
    filterValues,
    setSearchValue,
    setFilterValue,
    setFilterValues,
    resetFilters,
    resetAll,
    isFiltersActive,
    activeFilterCount,
    refresh,
    isRefreshing,
  };
}

export default useFilterStats;
