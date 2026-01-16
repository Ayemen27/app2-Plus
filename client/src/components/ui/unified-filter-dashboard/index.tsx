import { cn } from '@/lib/utils';
import { StatsStrip } from './StatsStrip';
import { SearchToolbar } from './SearchToolbar';
import { FilterChips } from './FilterChips';
import { ResultsSummary } from './ResultsSummary';
import type { UnifiedFilterDashboardProps } from './types';

export function UnifiedFilterDashboard({
  statsRows,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  onRefresh,
  isRefreshing,
  actions,
  resultsSummary,
  showAllFiltersButton = true,
  onShowAllFilters,
  className,
  compact = false,
  viewMode,
  onViewModeChange,
}: UnifiedFilterDashboardProps) {
  const hasActiveFilters = filters.some(filter => {
    const value = filterValues[filter.key];
    if (filter.type === 'date') return value instanceof Date;
    if (filter.type === 'date-range') return value?.from || value?.to;
    return value && value !== 'all' && value !== filter.defaultValue;
  }) || Boolean(searchValue && searchValue.length > 0);

  return (
    <div className={cn('space-y-2', className)}>
      {statsRows && statsRows.length > 0 && (
        <StatsStrip rows={statsRows} />
      )}

      <SearchToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        showSearch={showSearch}
        actions={actions}
        onReset={onReset}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        hasActiveFilters={hasActiveFilters}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        showViewToggle={!!onViewModeChange}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
      />

      {filters.length > 0 && onFilterChange && (
        <FilterChips
          filters={filters}
          filterValues={filterValues}
          onFilterChange={onFilterChange}
          onReset={onReset}
          showAllFiltersButton={false}
        />
      )}

      {resultsSummary && (
        <ResultsSummary config={resultsSummary} />
      )}
    </div>
  );
}

export { StatsStrip } from './StatsStrip';
export { SearchToolbar } from './SearchToolbar';
export { FilterChips } from './FilterChips';
export { ResultsSummary } from './ResultsSummary';
export * from './types';

export default UnifiedFilterDashboard;
