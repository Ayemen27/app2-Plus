import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { apiRequest } from "@/lib/queryClient";
import { performLocalOperation, getListLocal } from "@/offline/db";
import { formatCurrency } from "@/lib/utils";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { Plus, CheckCircle2, Clock, AlertCircle, MapPin, TrendingUp, Wrench, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

const WELL_STATUS_OPTIONS = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'pending', label: 'لم يبدأ' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'منجز' }
];


export default function WellAccounting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedProjectId } = useSelectedProject();
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    description: '',
    amount: '',
    status: 'pending'
  });

  // إدارة المناطق
  const [regions] = useState<string[]>(REGIONS);

  // استخدام UnifiedFilter للبحث
  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset,
  } = useUnifiedFilter({
    status: 'all',
    region: 'all'
  });


  // جلب الآبار
  const { data: wells = [] } = useQuery({
    queryKey: ['wells', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      // محاولة الجلب المحلي أولاً لسرعة الاستجابة
      try {
        const localWells = await getListLocal('wells');
        if (localWells && localWells.length > 0) {
          return localWells.filter((w: any) => w.projectId === selectedProjectId);
        }
      } catch (e) {
        console.warn('Local wells fetch failed', e);
      }
      const response = await apiRequest(`/wells?projectId=${selectedProjectId}`);
      return response.data || [];
    },
    enabled: !!selectedProjectId
  });

  // جلب وصف المهام للإكمال التلقائي
  const { data: taskDescriptions = [] } = useQuery({
    queryKey: ['autocomplete/taskDescriptions', selectedProjectId],
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=workerMiscDescriptions');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000
  });

  // جلب مهام البئر
  const { data: tasks = [] } = useQuery({
    queryKey: ['well-tasks', selectedWellId],
    queryFn: async () => {
      if (!selectedWellId) return [];
      try {
        const localTasks = await getListLocal('wellTasks');
        if (localTasks && localTasks.length > 0) {
          return localTasks.filter((t: any) => t.wellId === selectedWellId);
        }
      } catch (e) {
        console.warn('Local tasks fetch failed', e);
      }
      const response = await apiRequest(`/api/wells/${selectedWellId}/tasks`);
      return response.data || [];
    },
    enabled: !!selectedWellId
  });

  // إنشاء مهمة جديدة
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedWellId) throw new Error('البئر غير محددة');
      return performLocalOperation('wellTasks', 'create', {
        ...data,
        wellId: selectedWellId,
        projectId: selectedProjectId,
        paidAmount: 0,
        expectedAmount: parseFloat(data.amount) || 0,
        createdAt: new Date().toISOString()
      }, `/api/wells/${selectedWellId}/tasks`);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إنشاء المهمة بنجاح (محلياً)" });
      setTaskForm({ description: '', amount: '', status: 'pending' });
      setShowTaskDialog(false);
      queryClient.invalidateQueries({ queryKey: ['well-tasks', selectedWellId] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // تحديث حالة المهمة
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: any) => {
      return performLocalOperation('wellTasks', 'update', {
        id: taskId,
        status
      }, `/api/wells/tasks/${taskId}/status`);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تحديث حالة المهمة (محلياً)" });
      queryClient.invalidateQueries({ queryKey: ['well-tasks', selectedWellId] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // محاسبة المهمة
  const accountTaskMutation = useMutation({
    mutationFn: async ({ taskId, amount }: any) => {
      return performLocalOperation('wellTaskAccounts', 'create', {
        taskId,
        amount: parseFloat(amount) || 0,
        projectId: selectedProjectId,
        createdAt: new Date().toISOString()
      }, `/wells/tasks/${taskId}/account`);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم محاسبة المهمة (محلياً)" });
      queryClient.invalidateQueries({ queryKey: ['well-tasks', selectedWellId] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();

  const pendingTasks = useMemo(() => tasks.filter((t: any) => t.status === 'pending'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t: any) => t.status === 'completed'), [tasks]);

  // فلترة الآبار
  const filteredWells = useMemo(() => {
    return wells.filter((well: any) => {
      const matchesSearch = 
        well.ownerName.toLowerCase().includes(searchValue.toLowerCase()) ||
        well.wellNumber.toString().includes(searchValue);
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      
      return matchesSearch && matchesStatus && matchesRegion;
    });
  }, [wells, searchValue, filterValues]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* شريط البحث والفلترة الموحد */}
          <div>
            <UnifiedSearchFilter
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder="ابحث باسم المالك أو رقم البئر..."
              showSearch={true}
              filters={[
                {
                  key: 'region',
                  label: 'المنطقة',
                  type: 'select',
                  placeholder: 'اختر المنطقة',
                  options: [{ value: 'all', label: 'جميع المناطق' }, ...regions.map(r => ({ value: r, label: r }))],
                  defaultValue: 'all'
                },
                {
                  key: 'status',
                  label: 'الحالة',
                  type: 'select',
                  placeholder: 'اختر الحالة',
                  options: WELL_STATUS_OPTIONS,
                  defaultValue: 'all'
                }
              ]}
              filterValues={filterValues}
              onFilterChange={onFilterChange}
              onReset={onReset}
              showResetButton={true}
              showActiveFilters={true}
              compact={false}
            />
          </div>

          {/* قائمة الآبار */}
          <div>
            <div className="text-lg font-semibold mb-3">اختر البئر ({filteredWells.length})</div>
            <UnifiedCardGrid columns={selectedWellId ? 2 : 4}>
              {filteredWells.map((well: any) => (
                <UnifiedCard
                  key={well.id}
                  title={`بئر #${well.wellNumber}`}
                  subtitle={well.ownerName}
                  titleIcon={MapPin}
                  badges={[
                    {
                      label: well.status === 'pending' ? 'لم يبدأ' : well.status === 'in_progress' ? 'قيد التنفيذ' : 'منجز',
                      variant: well.status === 'completed' ? 'success' : well.status === 'in_progress' ? 'warning' : 'outline'
                    }
                  ]}
                  fields={[
                    { label: 'المنطقة', value: well.region, icon: MapPin, color: 'info' as const },
                    { label: 'الألواح', value: well.numberOfPanels, icon: Wrench, color: 'success' as const },
                    { label: 'المواسير', value: well.numberOfPipes, icon: Wrench, color: 'success' as const },
                    { label: 'العمق', value: `${well.wellDepth}م`, icon: TrendingUp, color: 'warning' as const },
                    { label: 'التقدم', value: `${well.completionPercentage}%`, emphasis: true, color: 'info' as const, icon: TrendingUp }
                  ]}
                  onClick={() => setSelectedWellId(well.id)}
                  className={selectedWellId === well.id ? 'ring-2 ring-primary' : ''}
                  compact
                />
              ))}
            </UnifiedCardGrid>
          </div>

          {selectedWellId && (
            <>
              {/* شريط الإحصائيات الموحد */}
              <UnifiedStats
                title="إحصائيات المهام"
                hideHeader={false}
                stats={[
                  {
                    title: 'إجمالي التكاليف',
                    value: formatCurrency(summary?.totalBalance || 0),
                    icon: DollarSign,
                    color: 'blue'
                  },
                  {
                    title: 'إجمالي المهام',
                    value: tasks.length,
                    icon: Clock,
                    color: 'blue'
                  },
                  {
                    title: 'مهام معلقة',
                    value: pendingTasks.length,
                    icon: Clock,
                    color: 'amber',
                    status: pendingTasks.length > 0 ? 'warning' : undefined
                  },
                  {
                    title: 'مهام منجزة',
                    value: completedTasks.length,
                    icon: CheckCircle2,
                    color: 'green'
                  }
                ]}
                columns={3}
                showStatus={true}
              />

              {/* بطاقات الإحصائيات الإضافية */}
              <UnifiedCardGrid columns={4}>
                <UnifiedCard
                  title='إجمالي المهام'
                  titleIcon={Clock}
                  fields={[{ label: 'العدد', value: tasks.length, emphasis: true, color: 'info' }]}
                  compact
                />
                <UnifiedCard
                  title='مهام معلقة'
                  titleIcon={Clock}
                  fields={[{ label: 'العدد', value: pendingTasks.length, emphasis: true, color: 'warning' }]}
                  compact
                />
                <UnifiedCard
                  title='مهام منجزة'
                  titleIcon={CheckCircle2}
                  fields={[{ label: 'العدد', value: completedTasks.length, emphasis: true, color: 'success' }]}
                  compact
                />
                <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                  <DialogTrigger asChild>
                    <div className="relative rounded-xl border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md hover:border-primary/20 cursor-pointer">
                      <Button className="w-full h-20" variant="outline">
                        <Plus className="h-5 w-5 ml-2" />
                        مهمة جديدة
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>إضافة مهمة جديدة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>وصف المهمة</Label>
                        <Input
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          placeholder="مثال: إنشاء القاعدة"
                        />
                      </div>
                      <div>
                        <Label>المبلغ المتوقع</Label>
                        <Input
                          type="number"
                          value={taskForm.amount}
                          onChange={(e) => setTaskForm({ ...taskForm, amount: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <Button
                        onClick={() => createTaskMutation.mutate(taskForm)}
                        disabled={createTaskMutation.isPending}
                        className="w-full"
                      >
                        {createTaskMutation.isPending ? "جاري..." : "إضافة المهمة"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </UnifiedCardGrid>

              {/* المهام المعلقة */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    المهام المعلقة ({pendingTasks.length})
                  </h3>
                  <UnifiedCardGrid columns={1}>
                    {pendingTasks.map((task: any) => (
                      <UnifiedCard
                        key={task.id}
                        title={task.description}
                        subtitle={`المبلغ: ${formatCurrency(task.expectedAmount || 0)}`}
                        titleIcon={Clock}
                        badges={[{ label: 'معلقة', variant: 'warning' }]}
                        fields={[
                          { label: 'الحالة', value: 'معلقة', icon: Clock, color: 'warning' as const },
                          { label: 'المبلغ المتوقع', value: formatCurrency(task.expectedAmount || 0), emphasis: true, icon: DollarSign, color: 'info' as const },
                          { label: 'المبلغ المدفوع', value: formatCurrency(task.paidAmount || 0), icon: DollarSign, color: 'success' as const }
                        ]}
                        actions={[{
                          icon: CheckCircle2,
                          label: 'انتهت',
                          onClick: () => updateTaskStatusMutation.mutate({ taskId: task.id, status: 'completed' }),
                          color: 'green' as const
                        }]}
                        compact
                      />
                    ))}
                  </UnifiedCardGrid>
                </div>
              )}

              {/* المهام المنجزة */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    المهام المنجزة ({completedTasks.length})
                  </h3>
                  <UnifiedCardGrid columns={1}>
                    {completedTasks.map((task: any) => (
                      <UnifiedCard
                        key={task.id}
                        title={task.description}
                        subtitle={`المبلغ: ${formatCurrency(task.expectedAmount || 0)}`}
                        titleIcon={CheckCircle2}
                        badges={[{ label: 'منجزة', variant: 'success' }]}
                        fields={[
                          { label: 'الحالة', value: 'منجزة', icon: CheckCircle2, color: 'success' as const },
                          { label: 'المبلغ المتوقع', value: formatCurrency(task.expectedAmount || 0), emphasis: true, icon: DollarSign, color: 'info' as const },
                          { label: 'المبلغ المدفوع', value: formatCurrency(task.paidAmount || 0), icon: DollarSign, color: 'success' as const }
                        ]}
                        compact
                      />
                    ))}
                  </UnifiedCardGrid>
                </div>
              )}

              {tasks.length === 0 && (
                <UnifiedCard
                  title='لا توجد مهام'
                  subtitle='البئر بدون مهام'
                  titleIcon={AlertCircle}
                  fields={[{ label: 'الحالة', value: 'في انتظار إضافة مهام' }]}
                />
              )}
            </>
          )}
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card p-4 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-2">نظام المراقبة</h3>
            <p className="text-sm text-muted-foreground mb-4">تم دمج نظام المراقبة في الصفحة الرئيسية للإدارة.</p>
            <Button onClick={() => setLocation("/unified-monitoring")} className="w-full">
              فتح منصة المراقبة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
