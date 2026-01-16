import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StatsCard } from "./stats-card";
import type { LucideIcon } from "lucide-react";

interface UnifiedStatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "green" | "orange" | "red" | "purple" | "teal" | "indigo" | "emerald" | "amber" | "gray";
  formatter?: (value: number) => string;
  trend?: { value: number; isPositive: boolean };
  status?: "normal" | "warning" | "critical";
}

interface UnifiedStatsProps {
  title?: string;
  subtitle?: string;
  stats: UnifiedStatItem[];
  columns?: 2 | 3 | 4;
  showStatus?: boolean;
  compact?: boolean;
  hideHeader?: boolean;
}

export function UnifiedStats({
  title,
  subtitle,
  stats,
  columns = 2,
  showStatus = true,
  compact = false,
  hideHeader = false
}: UnifiedStatsProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4"
  };

  // إذا كان hideHeader = true، نعرض البطائق فقط بدون أي شيء آخر
  if (hideHeader) {
    return (
      <div className={`grid ${gridCols[columns]} gap-2 sm:gap-3`}>
        {stats.map((stat, index) => (
          <div key={index} className="relative">
            {stat.status === "critical" && (
              <div className="absolute -top-2 -right-2 h-3 w-3 bg-red-500 rounded-full animate-pulse z-10" />
            )}
            {stat.status === "warning" && (
              <div className="absolute -top-2 -right-2 h-3 w-3 bg-amber-500 rounded-full animate-pulse z-10" />
            )}

            <StatsCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              formatter={stat.formatter}
            />

            {stat.trend && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {stat.trend.isPositive ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      +{stat.trend.value}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">
                      {stat.trend.value}%
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // الشكل العادي مع العنوان
  const criticalStats = stats.filter(s => s.status === "critical");
  const warningStats = stats.filter(s => s.status === "warning");

  const getOverallStatus = () => {
    if (criticalStats.length > 0) return { label: "حرج", color: "destructive" };
    if (warningStats.length > 0) return { label: "تحذير", color: "warning" };
    return { label: "جيد", color: "default" };
  };

  const status = getOverallStatus();

  return (
    <div className="space-y-3">
      {title && (
        <div className="px-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {showStatus && (
              <Badge variant={status.color === "default" ? "secondary" : status.color as any} className="text-xs">
                {status.label}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className={`grid ${gridCols[columns]} gap-2 sm:gap-3`}>
        {stats.map((stat, index) => (
          <div key={index} className="relative">
            {stat.status === "critical" && (
              <div className="absolute -top-2 -right-2 h-3 w-3 bg-red-500 rounded-full animate-pulse z-10" />
            )}
            {stat.status === "warning" && (
              <div className="absolute -top-2 -right-2 h-3 w-3 bg-amber-500 rounded-full animate-pulse z-10" />
            )}

            <StatsCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              formatter={stat.formatter}
            />

            {stat.trend && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {stat.trend.isPositive ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{stat.trend.value}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">{stat.trend.value}%</span>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {(criticalStats.length > 0 || warningStats.length > 0) && (
        <div className="mt-2 p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
          {criticalStats.length > 0 && <p className="truncate">⚠️ {criticalStats.length} عنصر حرج</p>}
          {warningStats.length > 0 && <p className="mt-1 truncate">⚡ {warningStats.length} تحذير</p>}
        </div>
      )}
    </div>
  );
}

// مكون عام للإحصائيات المتعددة
export function MultiUnifiedStats({
  groups
}: {
  groups: (Omit<UnifiedStatsProps, "stats"> & { stats: UnifiedStatItem[] })[]
}) {
  return (
    <div className="space-y-4">
      {groups.map((group, index) => (
        <UnifiedStats
          key={index}
          title={group.title}
          subtitle={group.subtitle}
          stats={group.stats}
          columns={group.columns}
          showStatus={group.showStatus}
          compact={group.compact}
          hideHeader={group.hideHeader}
        />
      ))}
    </div>
  );
}