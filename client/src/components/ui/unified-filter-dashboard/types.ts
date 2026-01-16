import type { LucideIcon } from 'lucide-react';

export type ColorVariant = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal' | 'indigo' | 'emerald' | 'amber' | 'gray' | 'cyan' | 'rose' | 'yellow';

export interface StatItem {
  key: string;
  label: string;
  subLabel?: string;
  value: string | number;
  icon: LucideIcon;
  color: ColorVariant;
  unit?: string;
  showDot?: boolean;
  dotColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  formatter?: (value: number) => string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export interface StatsRowConfig {
  items: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

export interface FilterOption {
  value: string;
  label: string;
}

export type FilterType = 'select' | 'date' | 'date-range' | 'async-select' | 'multi-select';

export interface FilterConfig {
  key: string;
  label: string;
  type?: FilterType;
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: string;
  asyncOptions?: () => Promise<FilterOption[]>;
  loadingText?: string;
  showAsChip?: boolean;
}

export interface ActionButton {
  key: string;
  icon: LucideIcon;
  label?: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

export interface CategoryBreakdownItem {
  label: string;
  value: number;
  unit?: string;
}

export interface ResultsSummaryConfig {
  totalCount: number;
  filteredCount: number;
  totalLabel?: string;
  filteredLabel?: string;
  totalValue?: string | number;
  totalValueLabel?: string;
  unit?: string;
  categoryBreakdown?: CategoryBreakdownItem[];
  showBreakdown?: boolean;
}

export interface UnifiedFilterDashboardProps {
  statsRows?: StatsRowConfig[];
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
  actions?: ActionButton[];
  resultsSummary?: ResultsSummaryConfig;
  showAllFiltersButton?: boolean;
  onShowAllFilters?: () => void;
  className?: string;
  compact?: boolean;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
}

export const colorVariants: Record<ColorVariant, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  gradient: string;
}> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/20',
    border: 'border-blue-100 dark:border-blue-800/50',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500',
    gradient: 'from-blue-500 to-sky-500'
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20',
    border: 'border-green-100 dark:border-green-800/50',
    text: 'text-green-600 dark:text-green-400',
    icon: 'text-green-500',
    gradient: 'from-green-500 to-emerald-500'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20',
    border: 'border-orange-100 dark:border-orange-800/50',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'text-orange-500',
    gradient: 'from-orange-500 to-amber-500'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/20',
    border: 'border-red-100 dark:border-red-800/50',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500',
    gradient: 'from-red-500 to-rose-500'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/20',
    border: 'border-purple-100 dark:border-purple-800/50',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-500',
    gradient: 'from-purple-500 to-violet-500'
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/20',
    border: 'border-teal-100 dark:border-teal-800/50',
    text: 'text-teal-600 dark:text-teal-400',
    icon: 'text-teal-500',
    gradient: 'from-teal-500 to-cyan-500'
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/20',
    border: 'border-indigo-100 dark:border-indigo-800/50',
    text: 'text-indigo-600 dark:text-indigo-400',
    icon: 'text-indigo-500',
    gradient: 'from-indigo-500 to-blue-500'
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20',
    border: 'border-emerald-100 dark:border-emerald-800/50',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-500',
    gradient: 'from-emerald-500 to-green-500'
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20',
    border: 'border-amber-100 dark:border-amber-800/50',
    text: 'text-amber-600 dark:text-amber-400',
    icon: 'text-amber-500',
    gradient: 'from-amber-500 to-yellow-500'
  },
  gray: {
    bg: 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/30 dark:to-slate-900/20',
    border: 'border-gray-100 dark:border-gray-800/50',
    text: 'text-gray-600 dark:text-gray-400',
    icon: 'text-gray-500',
    gradient: 'from-gray-500 to-slate-500'
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/30 dark:to-sky-900/20',
    border: 'border-cyan-100 dark:border-cyan-800/50',
    text: 'text-cyan-600 dark:text-cyan-400',
    icon: 'text-cyan-500',
    gradient: 'from-cyan-500 to-sky-500'
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/20',
    border: 'border-rose-100 dark:border-rose-800/50',
    text: 'text-rose-600 dark:text-rose-400',
    icon: 'text-rose-500',
    gradient: 'from-rose-500 to-pink-500'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/20',
    border: 'border-yellow-100 dark:border-yellow-800/50',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: 'text-yellow-500',
    gradient: 'from-yellow-500 to-amber-500'
  }
};
