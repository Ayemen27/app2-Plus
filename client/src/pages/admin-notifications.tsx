
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { CreateNotificationDialog } from '@/components/notifications/CreateNotificationDialog';
import { 
  Bell, Users, Zap, BarChart3, AlertCircle, CheckCircle2,
  RefreshCw, MoreVertical, Download, Upload, Settings,
  AlertTriangle, MessageSquare, ShieldCheck, Mail, Smartphone,
  TrendingUp, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import { UnifiedStats } from '@/components/ui/unified-stats';
import UnifiedFilterDashboard from '@/components/ui/unified-filter-dashboard';
import { useUnifiedFilter } from '@/components/ui/unified-search-filter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const { isAuthenticated, getAccessToken, isLoading: isAuthLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const filterConfigs = [
    {
      key: 'type',
      label: 'النوع',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'safety', label: 'تنبيه أمني' },
        { value: 'task', label: 'إشعار مهمة' },
        { value: 'payroll', label: 'إشعار راتب' },
        { value: 'announcement', label: 'إعلان عام' },
        { value: 'system', label: 'إشعار نظام' },
      ]
    },
    {
      key: 'priority',
      label: 'الأولوية',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'الكل' },
        { value: '1', label: 'حرج جداً' },
        { value: '2', label: 'عاجل' },
        { value: '3', label: 'متوسط' },
        { value: '4', label: 'منخفض' },
        { value: '5', label: 'معلومة' },
      ]
    }
  ];

  const { searchValue, filterValues, onSearchChange, onFilterChange, onReset } = useUnifiedFilter(
    { type: 'all', priority: 'all' },
    ''
  );

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAccessToken() ? `Bearer ${getAccessToken()}` : '',
  });

  const { data: notificationsData, isLoading: isLoadingNotifications, refetch } = useQuery({
    queryKey: ['admin-notifications', filterValues, searchValue],
    queryFn: async () => {
      const params = new URLSearchParams({
        requesterId: 'admin',
        limit: '50',
        ...(filterValues.type !== 'all' && { type: filterValues.type }),
        ...(filterValues.priority !== 'all' && { priority: filterValues.priority }),
        ...(searchValue && { search: searchValue })
      });
      const response = await fetch(`/api/admin/notifications/all?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب البيانات');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['user-activity'],
    queryFn: async () => {
      const response = await fetch('/api/admin/notifications/user-activity?requesterId=admin', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب النشاط');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/notifications/${id}?requesterId=admin`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل الحذف');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف الإشعار بنجاح' });
      refetch();
    }
  });

  const notifications = notificationsData?.notifications || [];
  const stats = useMemo(() => {
    const total = notificationsData?.total || 0;
    const unread = notifications.filter((n: any) => !n.isRead).length;
    const critical = notifications.filter((n: any) => n.priority === 1 || n.priority === 'critical').length;
    const readRate = total > 0 ? Math.round(((total - unread) / total) * 100) : 0;
    
    return [
      {
        title: "إجمالي الإشعارات",
        value: total,
        icon: Bell,
        color: "blue" as const
      },
      {
        title: "إشعارات حرجة",
        value: critical,
        icon: AlertCircle,
        color: "red" as const,
        status: critical > 0 ? "critical" as const : "normal" as const
      },
      {
        title: "معدل القراءة",
        value: `${readRate}%`,
        icon: CheckCircle2,
        color: "green" as const,
        trend: { value: 5, isPositive: true }
      },
      {
        title: "نشاط المستخدمين",
        value: activityData?.userStats?.length || 0,
        icon: Users,
        color: "purple" as const
      }
    ];
  }, [notificationsData, notifications, activityData]);

  const priorityMap: Record<string, { label: string, color: any }> = {
    '1': { label: 'حرج', color: 'destructive' },
    'critical': { label: 'حرج', color: 'destructive' },
    '2': { label: 'عاجل', color: 'warning' },
    'high': { label: 'عاجل', color: 'warning' },
    '3': { label: 'متوسط', color: 'default' },
    'medium': { label: 'متوسط', color: 'default' },
    '4': { label: 'منخفض', color: 'secondary' },
    'low': { label: 'منخفض', color: 'secondary' },
    '5': { label: 'معلومة', color: 'outline' },
    'info': { label: 'معلومة', color: 'outline' },
  };

  const typeIcons: Record<string, any> = {
    safety: ShieldCheck,
    task: CheckCircle2,
    payroll: Zap,
    announcement: MessageSquare,
    system: Settings,
  };

  return (
    <div className="min-h-screen bg-background pb-10" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">إشعارات النظام</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">إدارة التواصل والتنبيهات الأمنية</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoadingNotifications}>
              <RefreshCw className={cn("h-4 w-4 ml-2", isLoadingNotifications && "animate-spin")} />
              تحديث
            </Button>
            <CreateNotificationDialog onUpdate={() => refetch()} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2"><Download className="h-4 w-4" /> تصدير</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Upload className="h-4 w-4" /> استيراد</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> مسح السجل</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <main className="container px-4 py-6 sm:px-8 space-y-6">
        {/* Stats Dashboard */}
        <UnifiedStats 
          stats={stats} 
          columns={4}
          title="نظرة عامة على الإشعارات"
          subtitle="مؤشرات أداء نظام التنبيهات خلال آخر 30 يوم"
        />

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:flex gap-2">
              <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> الإحصائيات</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> السجل</TabsTrigger>
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> المستخدمين</TabsTrigger>
            </TabsList>
            
            <UnifiedFilterDashboard
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              filters={filterConfigs}
              filterValues={filterValues}
              onFilterChange={onFilterChange}
              onReset={onReset}
              compact={true}
              className="w-full lg:w-auto"
            />
          </div>

          <TabsContent value="overview" className="mt-0">
            <UnifiedCardGrid columns={2}>
              <UnifiedCard
                title="أكثر المستخدمين تفاعلاً"
                titleIcon={TrendingUp}
                fields={activityData?.userStats?.slice(0, 5).map((u: any, i: number) => ({
                  label: `${i + 1}. ${u.userName}`,
                  value: `${u.readNotifications} / ${u.totalNotifications}`,
                  emphasis: i === 0,
                  color: i === 0 ? "success" : "default"
                })) || []}
                footer={<Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setSelectedTab('users')}>عرض التفاصيل الكاملة</Button>}
              />
              <UnifiedCard
                title="توزيع القنوات"
                titleIcon={Zap}
                fields={[
                  { label: "إشعارات التطبيق", value: notifications.length, icon: Smartphone, color: "info" },
                  { label: "البريد الإلكتروني", value: "مفعل", icon: Mail, color: "success" },
                  { label: "الرسائل النصية", value: "متوقف", icon: MessageSquare, color: "muted" },
                  { label: "تنبيهات فورية", value: "نشط", icon: Zap, color: "warning" }
                ]}
              />
            </UnifiedCardGrid>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <UnifiedCardGrid columns={3}>
              {isLoadingNotifications ? (
                Array.from({ length: 6 }).map((_, i) => <UnifiedCard key={i} title="" fields={[]} isLoading={true} />)
              ) : notifications.length > 0 ? (
                notifications.map((notif: any) => (
                  <UnifiedCard
                    key={notif.id}
                    title={notif.title}
                    subtitle={format(new Date(notif.createdAt), 'PPp', { locale: ar })}
                    titleIcon={typeIcons[notif.type] || Bell}
                    badges={[
                      { 
                        label: priorityMap[notif.priority]?.label || 'عادي', 
                        variant: priorityMap[notif.priority]?.color || 'outline' 
                      },
                      {
                        label: notif.isRead ? 'مقروء' : 'جديد',
                        variant: notif.isRead ? 'secondary' : 'default'
                      }
                    ]}
                    fields={[
                      { label: "المحتوى", value: notif.message, emphasis: true },
                      { label: "المستهدف", value: notif.recipientType === 'all' ? 'الجميع' : 'محدد', color: "info" }
                    ]}
                    actions={[
                      { 
                        icon: Trash2, 
                        label: "حذف", 
                        onClick: () => deleteMutation.mutate(notif.id),
                        color: "red"
                      }
                    ]}
                    compact={true}
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground/20" />
                  <h3 className="mt-4 text-lg font-semibold">لا توجد إشعارات</h3>
                  <p className="text-muted-foreground">لم يتم العثور على إشعارات تطابق معايير البحث.</p>
                </div>
              )}
            </UnifiedCardGrid>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <UnifiedCardGrid columns={3}>
              {activityData?.userStats?.map((user: any) => (
                <UnifiedCard
                  key={user.userId}
                  title={user.userName}
                  subtitle={user.userEmail}
                  titleIcon={Users}
                  fields={[
                    { label: "إشعارات مستلمة", value: user.totalNotifications, color: "info" },
                    { label: "إشعارات مقروءة", value: user.readNotifications, color: "success" },
                    { label: "آخر نشاط", value: user.lastReadAt ? format(new Date(user.lastReadAt), 'PP', { locale: ar }) : 'أبداً', color: "muted" }
                  ]}
                  compact={true}
                />
              ))}
            </UnifiedCardGrid>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
