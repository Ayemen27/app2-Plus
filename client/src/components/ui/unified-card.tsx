import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { Edit, Trash2, Eye, MoreVertical, LucideIcon } from "lucide-react";

export interface UnifiedCardField {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  emphasis?: boolean;
  color?: "default" | "success" | "warning" | "danger" | "info" | "muted";
  hidden?: boolean;
  iconClassName?: string;
}

export interface UnifiedCardAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
  hidden?: boolean;
  color?: "default" | "blue" | "green" | "yellow" | "red" | "orange";
}

export interface UnifiedCardBadge {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  className?: string;
}

export interface UnifiedCardProps {
  title: string;
  subtitle?: string;
  titleIcon?: LucideIcon;
  badges?: UnifiedCardBadge[];
  fields: UnifiedCardField[];
  actions?: UnifiedCardAction[];
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
  compact?: boolean;
  headerColor?: string;
}

const fieldColorClasses = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
  muted: "text-muted-foreground",
};

const fieldIconColorClasses = {
  default: "text-primary",
  success: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
  muted: "text-gray-400 dark:text-gray-500",
};

const badgeVariantClasses = {
  default: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  outline: "border-border",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const actionColorClasses = {
  default: "text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800",
  blue: "text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900/30",
  green: "text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-200 dark:hover:bg-green-900/30",
  yellow: "text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:text-yellow-200 dark:hover:bg-yellow-900/30",
  red: "text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-200 dark:hover:bg-red-900/30",
  orange: "text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-200 dark:hover:bg-orange-900/30",
};

function getAdaptiveFontSize(value: React.ReactNode): string {
  const textValue = String(value || '');
  const len = textValue.length;
  
  if (len <= 4) return 'text-sm font-bold';
  if (len <= 7) return 'text-xs font-bold';
  if (len <= 12) return 'text-[11px] font-semibold';
  if (len <= 18) return 'text-[10px] font-semibold';
  if (len <= 25) return 'text-[9px] font-medium';
  return 'text-[8px] font-medium';
}

function UnifiedCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn(
      "relative rounded-xl border bg-card shadow-sm overflow-hidden",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function UnifiedCard({
  title,
  subtitle,
  titleIcon: TitleIcon,
  badges = [],
  fields,
  actions = [],
  footer,
  className,
  onClick,
  isLoading,
  compact = false,
  headerColor,
}: UnifiedCardProps) {
  if (isLoading) {
    return <UnifiedCardSkeleton compact={compact} />;
  }

  const visibleFields = fields.filter((f) => !f.hidden);
  const visibleActions = actions.filter((a) => !a.hidden);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        onClick && "cursor-pointer",
        compact ? "p-3" : "p-4",
        className
      )}
      onClick={onClick}
    >
      {headerColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-1.5 shadow-sm" 
          style={{ backgroundColor: headerColor }}
        />
      )}

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {TitleIcon && (
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TitleIcon className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "font-extrabold text-foreground truncate",
                compact ? "text-lg" : "text-xl"
              )}>
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {badges.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {badges.map((badge, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-5 font-medium",
                      badgeVariantClasses[badge.variant || "default"],
                      badge.className
                    )}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className={cn(
        "flex items-start",
        compact ? "mt-2" : "mt-3"
      )}>
        <div className={cn(
          "grid gap-x-2 grid-cols-2 flex-1",
          compact ? "gap-y-1" : "gap-y-1.5"
        )}>
          {visibleFields.map((field, idx) => {
            const FieldIcon = field.icon;
            return (
              <div 
                key={idx} 
                className={cn(
                  "flex items-center gap-1 min-w-0",
                  compact ? "py-0" : "py-0.5"
                )}
              >
                {FieldIcon && (
                  <FieldIcon className={cn("h-3 w-3 shrink-0", field.iconClassName || fieldIconColorClasses[field.color || "default"])} />
                )}
                <div className="min-w-0 flex-1 flex items-baseline gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                    {field.label}:
                  </span>
                  <span className={cn(
                    "arabic-numbers break-words leading-tight",
                    field.emphasis 
                      ? "text-sm font-bold" 
                      : getAdaptiveFontSize(field.value),
                    fieldColorClasses[field.color || "default"]
                  )}>
                    {field.value || "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {visibleActions.length > 0 && (
          <div className="shrink-0 flex flex-col gap-0.5 mr-[-8px] mt-[-4px]">
            {visibleActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={idx}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-6 w-6 rounded-md",
                    actionColorClasses[action.color || "default"]
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  disabled={action.disabled}
                  title={action.label}
                >
                  <ActionIcon className="h-3.5 w-3.5" />
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {footer && (
        <div className={cn(
          "border-t mt-3 pt-2",
          compact && "mt-2 pt-1.5"
        )}>
          {footer}
        </div>
      )}
    </div>
  );
}

export interface UnifiedCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function UnifiedCardGrid({
  children,
  columns = 2,
  className,
}: UnifiedCardGridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={cn(
      "grid gap-3",
      colClasses[columns],
      className
    )}>
      {children}
    </div>
  );
}

export { UnifiedCardSkeleton };
