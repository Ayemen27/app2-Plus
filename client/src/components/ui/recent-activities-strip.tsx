import { memo, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  User, 
  Building2, 
  Calendar, 
  Clock, 
  DollarSign,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Package,
  Truck,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { exportActivitiesToExcel } from "./export-activities-excel";

interface ActivityItem {
  id?: number;
  actionType: string;
  actionLabel?: string;
  userName?: string;
  projectName?: string;
  amount?: number;
  description?: string;
  createdAt: string;
}

interface RecentActivitiesStripProps {
  activities: ActivityItem[];
  formatCurrency: (amount: number) => string;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'transfer':
      return ArrowRightLeft;
    case 'expense':
      return TrendingDown;
    case 'income':
      return TrendingUp;
    case 'attendance':
      return Users;
    case 'material':
      return Package;
    case 'transport':
      return Truck;
    case 'payment':
      return Wallet;
    default:
      return Activity;
  }
};

const getActionBadgeVariant = (actionType: string): "default" | "destructive" | "secondary" | "outline" => {
  switch (actionType) {
    case 'transfer':
      return 'default';
    case 'expense':
      return 'destructive';
    case 'income':
      return 'default';
    default:
      return 'secondary';
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case 'transfer':
      return 'bg-purple-500';
    case 'expense':
      return 'bg-red-500';
    case 'income':
      return 'bg-green-500';
    case 'attendance':
      return 'bg-blue-500';
    case 'material':
      return 'bg-amber-500';
    case 'transport':
      return 'bg-cyan-500';
    case 'payment':
      return 'bg-emerald-500';
    default:
      return 'bg-slate-500';
  }
};

const ActivityChip = memo(({ 
  activity, 
  formatCurrency 
}: { 
  activity: ActivityItem; 
  formatCurrency: (amount: number) => string;
}) => {
  const ActionIcon = getActionIcon(activity.actionType);
  const actionColor = getActionColor(activity.actionType);
  
  return (
    <div 
      className="flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 min-w-[200px] max-w-[240px] hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer group"
      title={activity.description || ''}
    >
      <div className="flex items-start gap-2">
        <div className={`${actionColor} p-1.5 rounded-lg flex-shrink-0`}>
          <ActionIcon className="h-3.5 w-3.5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <Badge 
              variant={getActionBadgeVariant(activity.actionType)}
              className="text-[9px] px-1.5 py-0 h-4 font-medium"
            >
              {activity.actionLabel || activity.actionType}
            </Badge>
            {activity.amount && activity.amount > 0 && (
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 mr-auto">
                {formatCurrency(activity.amount)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <div className="flex items-center gap-0.5 truncate max-w-[70px]">
              <User className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" />
              <span className="truncate">{activity.userName || 'النظام'}</span>
            </div>
            <div className="flex items-center gap-0.5 truncate max-w-[70px]">
              <Building2 className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">{activity.projectName || 'الكل'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <div className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5 text-orange-500 flex-shrink-0" />
              <span>{formatDate(activity.createdAt)}</span>
            </div>
            <div className="flex items-center gap-0.5" dir="ltr">
              <Clock className="h-2.5 w-2.5 text-rose-500 flex-shrink-0" />
              <span>
                {new Date(activity.createdAt).toLocaleTimeString('ar-SA', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ActivityChip.displayName = 'ActivityChip';

export const RecentActivitiesStrip = memo(({ 
  activities, 
  formatCurrency 
}: RecentActivitiesStripProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting || !activities || activities.length === 0) return;
    setIsExporting(true);
    try {
      await exportActivitiesToExcel(activities, formatCurrency);
    } catch (error) {
      console.error('خطأ في التصدير:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-l from-blue-50/90 via-indigo-50/80 to-purple-50/90 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-purple-950/30 rounded-xl border border-blue-200/60 dark:border-blue-800/40 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="bg-blue-500 p-1 rounded-lg">
          <Activity className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">آخر الإجراءات</h3>
        <Badge variant="secondary" className="h-5 text-[10px] px-2 font-medium">
          {activities.length}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
          className="h-6 px-2 text-[10px] gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-400 dark:border-green-700"
        >
          {isExporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-3 w-3" />
          )}
          تصدير Excel
        </Button>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">← مرر للمزيد</span>
      </div>
      
      <ScrollArea className="w-full" dir="rtl">
        <div className="flex gap-2 pb-2" style={{ direction: 'rtl' }}>
          {activities.slice(0, 15).map((activity, index) => (
            <ActivityChip 
              key={activity.id || index} 
              activity={activity} 
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
});

RecentActivitiesStrip.displayName = 'RecentActivitiesStrip';

export default RecentActivitiesStrip;
