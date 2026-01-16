import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Trash2, Users, Clock, DollarSign, Calendar, User, Activity, Briefcase, Phone, Building, Power, CheckCircle, XCircle, Wallet, ArrowDownCircle, TrendingDown } from 'lucide-react';
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { apiRequest } from '@/lib/queryClient';
import AddWorkerForm from '@/components/forms/add-worker-form';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { useSelectedProject, ALL_PROJECTS_ID } from '@/hooks/use-selected-project';

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  phone?: string | null;
  hireDate?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface WorkerType {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

interface WorkerStats {
  totalWorkDays: number;
  totalTransfers: number;
  totalEarnings: number;
  projectsWorked: number;
  lastAttendanceDate: string | null;
  monthlyAttendanceRate: number;
}

const WorkerDialog = ({ worker, onClose, isOpen }: {
  worker?: Worker;
  onClose: () => void;
  isOpen: boolean;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{worker ? 'تعديل العامل' : 'إضافة عامل جديد'}</DialogTitle>
          <DialogDescription>
            {worker ? 'قم بتعديل بيانات العامل المحدد' : 'أدخل بيانات العامل الجديد'}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <AddWorkerForm
            worker={worker}
            onSuccess={onClose}
            onCancel={onClose}
            submitLabel={worker ? 'حفظ التعديلات' : 'إضافة العامل'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FinancialStatsFooter = ({ 
  stats,
  formatCurrency,
  isLoading
}: { 
  stats: WorkerStats | undefined;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
}) => {
  const totalBalance = stats?.totalEarnings ?? 0;
  const totalWithdrawals = stats?.totalTransfers ?? 0;
  const remaining = totalBalance - totalWithdrawals;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
          <Wallet className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المستحقات</p>
        </div>
        <p className="text-xs font-bold text-green-600 dark:text-green-400">
          {isLoading ? '...' : formatCurrency(totalBalance)}
        </p>
      </div>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400 mb-1">
          <ArrowDownCircle className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">السحبيات</p>
        </div>
        <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
          {isLoading ? '...' : formatCurrency(totalWithdrawals)}
        </p>
      </div>
      
      <div className={`${remaining >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-2 text-center`}>
        <div className={`flex items-center justify-center gap-1 ${remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} mb-1`}>
          <TrendingDown className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المتبقي</p>
        </div>
        <p className={`text-xs font-bold ${remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
          {isLoading ? '...' : formatCurrency(remaining)}
        </p>
      </div>
    </div>
  );
};

const WorkerCardWrapper = ({ 
  worker, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  formatCurrency,
  isToggling,
  selectedProjectId
}: { 
  worker: Worker; 
  onEdit: () => void; 
  onDelete: () => void;
  onToggleStatus: () => void;
  formatCurrency: (amount: number) => string;
  isToggling: boolean;
  selectedProjectId: string | null;
}) => {
  const projectIdForApi = selectedProjectId === ALL_PROJECTS_ID ? undefined : selectedProjectId;
  
  const { data: statsData, isLoading: statsLoading } = useQuery<{ success: boolean; data: WorkerStats }>({
    queryKey: ['/api/workers', worker.id, 'stats', selectedProjectId],
    queryFn: async () => {
      const url = projectIdForApi 
        ? `/api/workers/${worker.id}/stats?projectId=${projectIdForApi}`
        : `/api/workers/${worker.id}/stats`;
      return apiRequest(url, 'GET');
    },
    staleTime: 3600000, // ساعة كاملة
    gcTime: 7200000,    // ساعتان
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    enabled: worker.isActive, // عدم جلب إحصائيات العمال غير النشطين تلقائياً
  });

  const stats = statsData?.data;
  const projectsCount = stats?.projectsWorked ?? 0;

  return (
    <UnifiedCard
      title={worker.name}
      subtitle={worker.hireDate ? new Date(worker.hireDate).toLocaleDateString('en-GB') : undefined}
      titleIcon={User}
      headerColor={worker.isActive ? '#22c55e' : '#ef4444'}
      badges={[
        {
          label: worker.type,
          variant: 'secondary',
        },
        {
          label: worker.isActive ? 'نشط' : 'غير نشط',
          variant: worker.isActive ? 'success' : 'destructive',
        }
      ]}
      fields={[
        {
          label: "الأجر اليومي",
          value: formatCurrency(parseFloat(worker.dailyWage)),
          icon: DollarSign,
          emphasis: true,
          color: "success",
        },
        {
          label: "الهاتف",
          value: worker.phone || 'غير محدد',
          icon: Phone,
          color: worker.phone ? "success" : "muted",
        },
        {
          label: "المشاريع",
          value: statsLoading ? '...' : projectsCount > 0 ? `${projectsCount} مشروع` : 'لا يوجد',
          icon: Building,
          color: projectsCount > 0 ? "info" : "muted",
        },
        {
          label: "أيام العمل",
          value: statsLoading ? '...' : `${stats?.totalWorkDays ?? 0} يوم`,
          icon: Calendar,
          color: "warning",
        },
      ]}
      actions={[
        {
          icon: Edit2,
          label: "تعديل",
          onClick: onEdit,
          color: "blue",
        },
        {
          icon: Power,
          label: worker.isActive ? "إيقاف" : "تفعيل",
          onClick: onToggleStatus,
          disabled: isToggling,
          color: worker.isActive ? "yellow" : "green",
        },
        {
          icon: Trash2,
          label: "حذف",
          onClick: onDelete,
          color: "red",
        },
      ]}
      footer={
        <FinancialStatsFooter 
          stats={stats} 
          formatCurrency={formatCurrency} 
          isLoading={statsLoading}
        />
      }
      compact
    />
  );
};

export default function WorkersPage() {
  const [editingWorker, setEditingWorker] = useState<Worker | undefined>();
  const [showDialog, setShowDialog] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
    type: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingWorkerId, setTogglingWorkerId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId } = useSelectedProject();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", type: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر",
    });
  }, [toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  const { data: workers = [], isLoading, refetch: refetchWorkers } = useQuery<Worker[]>({
    queryKey: ['/api/workers'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/workers', 'GET');
        
        let workers = [];
        if (data && typeof data === 'object') {
          if (data.success !== undefined && data.data !== undefined) {
            workers = Array.isArray(data.data) ? data.data : [];
          } else if (Array.isArray(data)) {
            workers = data;
          } else if (data.id) {
            workers = [data];
          }
        }
        
        if (!Array.isArray(workers)) {
          workers = [];
        }
        
        return workers as Worker[];
      } catch (error) {
        return [] as Worker[];
      }
    },
    staleTime: 600000, // 10 minutes
    gcTime: 1200000,  // 20 minutes
    retry: 2,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const { data: workerTypes = [] } = useQuery<WorkerType[]>({
    queryKey: ['/api/worker-types'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/worker-types');
        
        if (!response.ok) {
          return [] as WorkerType[];
        }
        
        const data = await response.json();
        
        let workerTypes = [];
        if (data && typeof data === 'object') {
          if (data.success !== undefined && data.data !== undefined) {
            workerTypes = Array.isArray(data.data) ? data.data : [];
          } else if (Array.isArray(data)) {
            workerTypes = data;
          }
        }
        
        if (!Array.isArray(workerTypes)) {
          workerTypes = [];
        }
        
        return workerTypes as WorkerType[];
      } catch (error) {
        return [] as WorkerType[];
      }
    },
    staleTime: 900000, // 15 minutes
    gcTime: 1800000,  // 30 minutes
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchWorkers();
      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchWorkers, toast]);

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/workers/${id}`, "DELETE"),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['/api/workers'] });
      const previousData = queryClient.getQueryData<Worker[]>(['/api/workers']);
      
      if (Array.isArray(previousData)) {
        queryClient.setQueryData<Worker[]>(['/api/workers'], 
          previousData.filter(worker => worker.id !== id)
        );
      }
      
      return { previousData };
    },
    onSuccess: (data) => {
      toast({
        title: "تم حذف العامل بنجاح",
        description: (data as any)?.message || "تم حذف العامل من النظام بنجاح.",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
    },
    onError: (error: any, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/workers'], context.previousData);
      }
      
      let title = "لا يمكن حذف العامل";
      let description = error?.message || "حدث خطأ في حذف العامل";
      
      if (error?.relatedRecordsType?.includes('سجلات حضور')) {
        title = "يجب حذف سجلات الحضور أولاً";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/with-stats'] });
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/workers/${id}`, "PATCH", data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/workers'] });
      const previousData = queryClient.getQueryData<Worker[]>(['/api/workers']);
      
      if (Array.isArray(previousData)) {
        queryClient.setQueryData<Worker[]>(['/api/workers'], 
          previousData.map(worker => 
            worker.id === id ? { ...worker, ...data } : worker
          )
        );
      }
      
      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم تحديث حالة العامل بنجاح",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/workers'], context.previousData);
      }
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تحديث العامل",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingWorkerId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/with-stats'] });
    },
  });

  const filteredWorkers = useMemo(() => {
    return (Array.isArray(workers) ? workers : []).filter(worker => {
      const matchesSearch = worker.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                           worker.type.toLowerCase().includes(searchValue.toLowerCase()) ||
                           (worker.phone && worker.phone.includes(searchValue));
      const matchesStatus = filterValues.status === 'all' || 
                           (filterValues.status === 'active' && worker.isActive) ||
                           (filterValues.status === 'inactive' && !worker.isActive);
      const matchesType = filterValues.type === 'all' || worker.type === filterValues.type;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [workers, searchValue, filterValues]);

  const stats = useMemo(() => ({
    total: Array.isArray(workers) ? workers.length : 0,
    active: Array.isArray(workers) ? workers.filter(w => w.isActive).length : 0,
    inactive: Array.isArray(workers) ? workers.filter(w => !w.isActive).length : 0,
    avgWage: Array.isArray(workers) && workers.length > 0 
      ? workers.reduce((sum, w) => sum + parseFloat(w.dailyWage), 0) / workers.length 
      : 0
  }), [workers]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي العمال',
          value: stats.total,
          icon: Users,
          color: 'blue',
        },
        {
          key: 'active',
          label: 'العمال النشطون',
          value: stats.active,
          icon: Activity,
          color: 'green',
          showDot: true,
          dotColor: 'bg-green-500',
        },
        {
          key: 'inactive',
          label: 'غير النشطين',
          value: stats.inactive,
          icon: Clock,
          color: 'orange',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'avgWage',
          label: 'متوسط الأجر',
          value: formatCurrency(stats.avgWage),
          icon: DollarSign,
          color: 'purple',
        },
        {
          key: 'totalTypes',
          label: 'أنواع العمال',
          value: workerTypes.length,
          icon: Briefcase,
          color: 'teal',
        },
        {
          key: 'totalWorkDays',
          label: 'مجموع أيام العمل',
          value: '-',
          icon: Calendar,
          color: 'indigo',
        },
      ]
    }
  ], [stats, workerTypes]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
      ],
    },
    {
      key: 'type',
      label: 'نوع العامل',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        ...(Array.isArray(workerTypes) ? workerTypes.map(type => ({
          value: type.name,
          label: type.name,
        })) : []),
      ],
    },
  ], [workerTypes]);

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setShowDialog(true);
  };

  const handleDeleteWorker = (worker: Worker) => {
    if (confirm(`هل أنت متأكد من حذف العامل "${worker.name}"؟`)) {
      deleteWorkerMutation.mutate(worker.id);
    }
  };

  const handleToggleStatus = (worker: Worker) => {
    setTogglingWorkerId(worker.id);
    updateWorkerMutation.mutate({ id: worker.id, data: { isActive: !worker.isActive } });
  };

  const handleNewWorker = () => {
    setEditingWorker(undefined);
    setShowDialog(true);
  };

  useEffect(() => {
    setFloatingAction(handleNewWorker, "إضافة عامل جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-1.5 bg-gray-300 dark:bg-gray-700 rounded-t-lg" />
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث عن عامل (الاسم، النوع، الهاتف)..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        resultsSummary={(searchValue || filterValues.status !== 'all' || filterValues.type !== 'all') ? {
          totalCount: workers.length,
          filteredCount: filteredWorkers.length,
          totalLabel: 'النتائج',
          filteredLabel: 'من',
        } : undefined}
      />

      {filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">
              لا توجد عمال
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {workers.length === 0 ? 'لم يتم إضافة أي عمال بعد' : 'لا توجد عمال تطابق معايير البحث'}
            </p>
            {workers.length === 0 && (
              <Button onClick={handleNewWorker} className="mt-4">
                إضافة أول عامل
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <UnifiedCardGrid columns={4}>
          {filteredWorkers.map((worker) => (
            <WorkerCardWrapper
              key={worker.id}
              worker={worker}
              onEdit={() => handleEditWorker(worker)}
              onDelete={() => handleDeleteWorker(worker)}
              onToggleStatus={() => handleToggleStatus(worker)}
              formatCurrency={formatCurrency}
              isToggling={togglingWorkerId === worker.id}
              selectedProjectId={selectedProjectId}
            />
          ))}
        </UnifiedCardGrid>
      )}

      <WorkerDialog
        worker={editingWorker}
        onClose={() => {
          setShowDialog(false);
          setEditingWorker(undefined);
        }}
        isOpen={showDialog}
      />
    </div>
  );
}
