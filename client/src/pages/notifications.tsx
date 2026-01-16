import { apiRequest } from '@/lib/queryClient';
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, BellOff, CheckCircle, AlertCircle, Info, AlertTriangle, Clock,
  Trash2, CheckCheck, Filter, Search, Calendar, ChevronDown, ChevronRight,
  Shield, Wrench, Package, Users, MessageSquare, Zap, RefreshCw, X,
  Eye, EyeOff, SlidersHorizontal, MoreVertical
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { UnifiedSearchFilter, useUnifiedFilter, FilterConfig } from '@/components/ui/unified-search-filter';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  body?: string;
  priority: number | string;
  createdAt: string;
  status?: 'read' | 'unread';
  isRead?: boolean;
  actionRequired?: boolean;
  projectId?: string;
  payload?: any;
}

const notificationTypeConfig: Record<string, { 
  icon: any; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  label: string;
}> = {
  system: { 
    icon: Shield, 
    color: 'text-slate-600', 
    bgColor: 'bg-slate-100 dark:bg-slate-800', 
    borderColor: 'border-slate-200 dark:border-slate-700',
    label: 'نظام'
  },
  security: { 
    icon: Shield, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 dark:bg-red-900/20', 
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'أمان'
  },
  maintenance: { 
    icon: Wrench, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 dark:bg-orange-900/20', 
    borderColor: 'border-orange-200 dark:border-orange-800',
    label: 'صيانة'
  },
  warranty: { 
    icon: Package, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 dark:bg-purple-900/20', 
    borderColor: 'border-purple-200 dark:border-purple-800',
    label: 'ضمان'
  },
  damaged: { 
    icon: AlertTriangle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 dark:bg-red-900/20', 
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'تلف'
  },
  'user-welcome': { 
    icon: Users, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 dark:bg-green-900/20', 
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'ترحيب'
  },
  task: { 
    icon: CheckCircle, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'مهمة'
  },
  payroll: { 
    icon: MessageSquare, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', 
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    label: 'رواتب'
  },
  announcement: { 
    icon: Info, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', 
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    label: 'إعلان'
  },
  safety: { 
    icon: AlertCircle, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 dark:bg-amber-900/20', 
    borderColor: 'border-amber-200 dark:border-amber-800',
    label: 'سلامة'
  },
};

const priorityConfig: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: 'حرج', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  2: { label: 'عالي', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  3: { label: 'متوسط', color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  4: { label: 'منخفض', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  5: { label: 'معلومات', color: 'text-slate-700', bgColor: 'bg-slate-100 dark:bg-slate-800' },
};

const getPriorityNumber = (priority: number | string): number => {
  if (typeof priority === 'number') return priority;
  const map: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4, info: 5 };
  return map[priority] || 3;
};

const groupNotificationsByDate = (notifications: Notification[]): Record<string, Notification[]> => {
  const groups: Record<string, Notification[]> = {};
  
  notifications.forEach(notification => {
    if (!notification.createdAt) {
      if (!groups['older']) {
        groups['older'] = [];
      }
      groups['older'].push(notification);
      return;
    }
    
    const date = parseISO(notification.createdAt);
    let groupKey: string;
    
    if (isToday(date)) {
      groupKey = 'today';
    } else if (isYesterday(date)) {
      groupKey = 'yesterday';
    } else if (isThisWeek(date)) {
      groupKey = 'thisWeek';
    } else if (isThisMonth(date)) {
      groupKey = 'thisMonth';
    } else {
      groupKey = 'older';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
  });
  
  return groups;
};

const groupLabels: Record<string, string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  thisWeek: 'هذا الأسبوع',
  thisMonth: 'هذا الشهر',
  older: 'أقدم',
};

const groupOrder = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older'];

export default function NotificationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today', 'yesterday', 'thisWeek']));
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const userId = user?.id || '';
  const isAdmin = user?.role === 'admin' || user?.role === 'مدير';

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      placeholder: 'اختر الحالة',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'unread', label: 'غير مقروء' },
        { value: 'read', label: 'مقروء' },
      ],
    },
    {
      key: 'type',
      label: 'النوع',
      type: 'select',
      placeholder: 'اختر النوع',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        { value: 'system', label: 'نظام' },
        { value: 'security', label: 'أمان' },
        { value: 'maintenance', label: 'صيانة' },
        { value: 'task', label: 'مهام' },
        { value: 'announcement', label: 'إعلانات' },
        { value: 'payroll', label: 'رواتب' },
        { value: 'safety', label: 'سلامة' },
      ],
    },
    {
      key: 'priority',
      label: 'الأولوية',
      type: 'select',
      placeholder: 'اختر الأولوية',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الأولويات' },
        { value: '1', label: 'حرج' },
        { value: '2', label: 'عالي' },
        { value: '3', label: 'متوسط' },
        { value: '4', label: 'منخفض' },
        { value: '5', label: 'معلومات' },
      ],
    },
    {
      key: 'dateRange',
      label: 'نطاق التاريخ',
      type: 'date-range',
    },
  ];

  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset,
  } = useUnifiedFilter({
    status: 'all',
    type: 'all',
    priority: 'all',
    dateRange: undefined,
  });

  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/notifications', userId],
    queryFn: async () => {
      try {
        const result = await apiRequest(`/api/notifications?userId=${userId}&limit=100`);
        return result.data || result || { notifications: [], unreadCount: 0, total: 0 };
      } catch (error) {
        return { notifications: [], unreadCount: 0, total: 0 };
      }
    },
    refetchInterval: 30000,
    enabled: !!user,
  });

  const notifications = useMemo(() => {
    let result = notificationsData?.notifications || [];
    
    result = result.map(n => ({
      ...n,
      priority: getPriorityNumber(n.priority),
      status: n.status || (n.isRead ? 'read' : 'unread'),
    }));
    
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(search) ||
        (n.body || n.message || '').toLowerCase().includes(search)
      );
    }
    
    if (filterValues.status && filterValues.status !== 'all') {
      result = result.filter(n => n.status === filterValues.status);
    }
    
    if (filterValues.type && filterValues.type !== 'all') {
      result = result.filter(n => n.type === filterValues.type);
    }
    
    if (filterValues.priority && filterValues.priority !== 'all') {
      result = result.filter(n => n.priority === parseInt(filterValues.priority));
    }
    
    const dateRange = filterValues.dateRange as { from?: Date; to?: Date } | undefined;
    if (dateRange?.from) {
      const from = dateRange.from;
      const to = dateRange.to || new Date();
      result = result.filter(n => {
        if (!n.createdAt) return false;
        const date = parseISO(n.createdAt);
        return date >= from && date <= to;
      });
    }
    
    return result;
  }, [notificationsData, searchValue, filterValues]);

  const groupedNotifications = useMemo(() => 
    groupNotificationsByDate(notifications), [notifications]
  );

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => n.status === 'unread').length,
    critical: notifications.filter(n => n.priority === 1).length,
    high: notifications.filter(n => n.priority === 2).length,
  }), [notifications]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/notifications/${notificationId}/mark-read`, 'POST');
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['/api/notifications', userId] });
      const previousData = queryClient.getQueryData(['/api/notifications', userId]);
      queryClient.setQueryData(['/api/notifications', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) =>
            n.id === notificationId ? { ...n, isRead: true, status: 'read' } : n
          ),
          unreadCount: Math.max(0, (old.unreadCount || 0) - 1),
        };
      });
      return { previousData };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/notifications', userId], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['/api/notifications'], exact: false });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/notifications/mark-all-read', 'POST');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/notifications', userId] });
      const previousData = queryClient.getQueryData(['/api/notifications', userId]);
      queryClient.setQueryData(['/api/notifications', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) => ({ ...n, isRead: true, status: 'read' })),
          unreadCount: 0,
        };
      });
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/notifications', userId], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['/api/notifications'], exact: false });
      toast({ title: 'تم بنجاح', description: 'تم تعليم جميع الإشعارات كمقروءة' });
      setSelectedIds(new Set());
    },
  });

  const markSelectedAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id =>
        fetch(`/api/notifications/${id}/mark-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        })
      ));
      return ids;
    },
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['/api/notifications', userId] });
      const previousData = queryClient.getQueryData(['/api/notifications', userId]);
      queryClient.setQueryData(['/api/notifications', userId], (old: any) => {
        if (!old) return old;
        const idsSet = new Set(ids);
        return {
          ...old,
          notifications: old.notifications.map((n: any) =>
            idsSet.has(n.id) ? { ...n, isRead: true, status: 'read' } : n
          ),
          unreadCount: Math.max(0, (old.unreadCount || 0) - ids.length),
        };
      });
      return { previousData };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/notifications', userId], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['/api/notifications'], exact: false });
      toast({ title: 'تم بنجاح', description: `تم تعليم ${selectedIds.size} إشعار كمقروء` });
      setSelectedIds(new Set());
    },
  });

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  }, [notifications, selectedIds.size]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const formatNotificationTime = (dateString: string) => {
    if (!dateString) {
      return 'غير محدد';
    }
    const date = parseISO(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ar });
    }
    return format(date, 'dd MMM، HH:mm', { locale: ar });
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
    const priority = priorityConfig[notification.priority as number] || priorityConfig[3];
    const Icon = config.icon;
    const isUnread = notification.status === 'unread';
    const isSelected = selectedIds.has(notification.id);

    return (
      <div
        className={cn(
          "group relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-200",
          "hover:shadow-md active:scale-[0.99]",
          isUnread 
            ? "bg-gradient-to-l from-blue-50/80 to-white dark:from-blue-900/10 dark:to-slate-900 border-blue-200 dark:border-blue-800" 
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
          isSelected && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900"
        )}
      >
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelection(notification.id)}
            className="mt-1"
          />
          
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
            config.bgColor
          )}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "text-sm font-semibold leading-tight",
                isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
              )}>
                {notification.title}
              </h3>
              {isUnread && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className={cn("text-xs h-5 px-1.5", priority.bgColor, priority.color)}>
                {priority.label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs h-5 px-1.5", config.bgColor, config.color)}>
                {config.label}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {notification.body || notification.message || 'لا يوجد محتوى'}
          </p>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatNotificationTime(notification.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUnread && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => markAsReadMutation.mutate(notification.id)}
                  disabled={markAsReadMutation.isPending}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">مقروء</span>
                </Button>
              )}
              
              {notification.actionRequired && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  <Zap className="h-3 w-3 ml-1" />
                  إجراء مطلوب
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NotificationGroup = ({ groupKey, notifications: groupNotifs }: { groupKey: string; notifications: Notification[] }) => {
    const isExpanded = expandedGroups.has(groupKey);
    const unreadCount = groupNotifs.filter(n => n.status === 'unread').length;

    return (
      <div className="space-y-2">
        <button
          onClick={() => toggleGroup(groupKey)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {groupLabels[groupKey]}
            </span>
            <Badge variant="secondary" className="text-xs h-5">
              {groupNotifs.length}
            </Badge>
            {unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white text-xs h-5">
                {unreadCount} جديد
              </Badge>
            )}
          </div>
        </button>
        
        {isExpanded && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
            {groupNotifs.map(notification => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Bell className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
        لا توجد إشعارات
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
        {searchValue || Object.values(filterValues).some(v => v && v !== 'all')
          ? 'لا توجد نتائج تطابق معايير البحث أو الفلترة'
          : 'ستظهر إشعاراتك الجديدة هنا عندما تصل'}
      </p>
      {(searchValue || Object.values(filterValues).some(v => v && v !== 'all')) && (
        <Button variant="outline" className="mt-4" onClick={onReset}>
          <X className="h-4 w-4 ml-2" />
          مسح الفلاتر
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900" dir="rtl">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                الإشعارات
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.unread > 0 ? `${stats.unread} إشعار جديد` : 'جميع الإشعارات مقروءة'}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <Bell className="h-5 w-5 text-blue-500" />
              <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">إجمالي</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <EyeOff className="h-5 w-5 text-orange-500" />
              <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{stats.unread}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">غير مقروء</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{stats.critical}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">حرج</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{stats.high}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">عالي الأهمية</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
          <UnifiedSearchFilter
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder="ابحث في الإشعارات..."
            filters={filterConfigs}
            filterValues={filterValues}
            onFilterChange={onFilterChange}
            onReset={onReset}
            showActiveFilters={true}
            className="p-2"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === notifications.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                تم تحديد {selectedIds.size} إشعار
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8"
                onClick={() => markSelectedAsReadMutation.mutate(Array.from(selectedIds))}
                disabled={markSelectedAsReadMutation.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                تعليم كمقروء
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs h-8"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-3.5 w-3.5" />
                إلغاء التحديد
              </Button>
            </div>
          </div>
        )}

        {stats.unread > 0 && selectedIds.size === 0 && (
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              تعليم الكل كمقروء
            </Button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <ScrollArea className="h-[calc(100vh-420px)] sm:h-[calc(100vh-380px)]">
            <div className="p-3 sm:p-4 space-y-4">
              {isLoading ? (
                <LoadingSkeleton />
              ) : notifications.length === 0 ? (
                <EmptyState />
              ) : (
                groupOrder
                  .filter(key => groupedNotifications[key]?.length > 0)
                  .map(groupKey => (
                    <NotificationGroup
                      key={groupKey}
                      groupKey={groupKey}
                      notifications={groupedNotifications[groupKey]}
                    />
                  ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          آخر تحديث: {format(new Date(), 'HH:mm:ss', { locale: ar })}
        </div>
      </div>
    </div>
  );
}
