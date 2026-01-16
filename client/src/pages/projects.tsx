import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSelect, SearchableSelect, ProjectTypeSelect, type SelectOption } from "@/components/ui/searchable-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { 
  Edit, 
  Trash2, 
  Plus, 
  Users, 
  DollarSign, 
  Package, 
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  BarChart3,
  Building2,
  Camera,
  Upload,
  X,
  ImageIcon,
  Eye,
  Calendar,
  Activity,
  Wallet,
  UserCog,
  ArrowUpCircle,
  ArrowDownCircle,
  Power
} from "lucide-react";
import type { Project, InsertProject, ProjectType } from "@shared/schema";
import { insertProjectSchema } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { useAuth } from "@/components/AuthProvider";
import { ProjectsPageSkeleton } from "@/components/ui/project-skeleton";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { triggerSync } from "@/offline/sync";

interface ProjectStats {
  totalWorkers: number;
  totalExpenses: number;
  totalIncome: number;
  currentBalance: number;
  activeWorkers: number;
  completedDays: number;
  materialPurchases: number;
  lastActivity: string;
}

interface ProjectWithStats extends Project {
  stats: ProjectStats;
}

// Helper functions for cleaning and parsing numbers - محسنة
const cleanInteger = (value: any): number => {
  if (value === undefined || value === null || value === '') return 0;
  
  // التعامل مع الأرقام المباشرة
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : Math.max(0, Math.floor(value));
  }
  
  // التعامل مع النصوص
  const stringValue = String(value).trim();
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') return 0;
  
  // تنظيف النص من الرموز غير الرقمية (عدا الأرقام والنقطة والناقص)
  const cleanValue = stringValue.replace(/[^\d.-]/g, '');
  const num = parseInt(cleanValue, 10);
  
  return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num);
};

const cleanNumber = (value: any): number => {
  if (value === undefined || value === null || value === '') return 0;
  
  // التعامل مع الأرقام المباشرة
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : value;
  }
  
  // التعامل مع النصوص
  const stringValue = String(value).trim();
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') return 0;
  
  // تنظيف النص من الرموز غير الرقمية (عدا الأرقام والنقطة والناقص)
  const cleanValue = stringValue.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleanValue);
  
  return isNaN(num) || !isFinite(num) ? 0 : num;
};

const ProjectFinancialStatsFooter = ({ 
  income,
  expenses,
  balance,
  formatCurrencyFn
}: { 
  income: number;
  expenses: number;
  balance: number;
  formatCurrencyFn: (amount: number) => string;
}) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
          <ArrowUpCircle className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">الدخل</p>
        </div>
        <p className="text-xs font-bold text-green-600 dark:text-green-400">
          {formatCurrencyFn(income)}
        </p>
      </div>
      
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 mb-1">
          <ArrowDownCircle className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المصروفات</p>
        </div>
        <p className="text-xs font-bold text-red-600 dark:text-red-400">
          {formatCurrencyFn(expenses)}
        </p>
      </div>
      
      <div className={`${balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'} rounded-lg p-2 text-center`}>
        <div className={`flex items-center justify-center gap-1 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} mb-1`}>
          <Wallet className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المتبقي</p>
        </div>
        <p className={`text-xs font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
          {formatCurrencyFn(balance)}
        </p>
      </div>
    </div>
  );
};

export default function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { setFloatingAction } = useFloatingButton();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
    engineerId: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingProjectId, setTogglingProjectId] = useState<string | null>(null);
  
  // حالة نافذة تأكيد الحذف
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithStats | null>(null);
  const [deletionStats, setDeletionStats] = useState<{
    stats: Record<string, number>;
    totalLinkedRecords: number;
    canDelete: boolean;
    deleteBlockReason: string;
  } | null>(null);
  const [isLoadingDeletionStats, setIsLoadingDeletionStats] = useState(false);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", engineerId: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر",
    });
  }, [toast]);



  // تعيين إجراء الزر العائم لإضافة مشروع جديد
  useEffect(() => {
    const handleAddProject = () => setIsCreateDialogOpen(true);
    setFloatingAction(handleAddProject, "إضافة مشروع جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // ✅ Fetch projects with statistics - استخدام default fetcher مع Authorization headers
  const { data: fetchedProjectsRaw = [], isLoading, refetch: refetchProjects, error } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects/with-stats"],
    queryFn: async () => {
      try {
        console.log('📊 [Projects] جلب المشاريع مع الإحصائيات...');
        // استخدام apiRequest مباشرة بدلاً من تمرير headers يدوياً لأن apiRequest يتعامل مع التوثيق داخلياً
        const response = await apiRequest("/api/projects/with-stats", "GET");
        
        let fetchedData = [];
        if (response && typeof response === 'object') {
          if (response.success !== undefined && response.data !== undefined) {
            fetchedData = Array.isArray(response.data) ? response.data : [];
          } else if (Array.isArray(response)) {
            fetchedData = response;
          } else if (response.id) {
            fetchedData = [response];
          } else if (response.data) {
            fetchedData = Array.isArray(response.data) ? response.data : [];
          }
        }
        return fetchedData as ProjectWithStats[];
      } catch (error) {
        console.error('❌ [Projects] خطأ في جلب المشاريع:', error);
        return [] as ProjectWithStats[];
      }
    },
    refetchInterval: 60000,
  });

  const projects = Array.isArray(fetchedProjectsRaw) ? fetchedProjectsRaw : [];
  const projectsData = projects;

  // استخدام الملخص المالي الموحد من ExpenseLedgerService للإجماليات والمشاريع الفردية
  const { totals: financialTotals, allProjects: financialData, isLoading: financialLoading, refetch: refetchFinancial } = useFinancialSummary({
    projectId: 'all',
    enabled: true
  });

  // إنشاء map للوصول السريع لبيانات المشاريع المالية من ExpenseLedgerService
  const financialProjectsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (financialData?.projects) {
      financialData.projects.forEach((p: any) => {
        map.set(p.projectId, p);
      });
    }
    return map;
  }, [financialData?.projects]);

  // دالة للحصول على إحصائيات المشروع من ExpenseLedgerService (مصدر موحد للحقيقة)
  const getProjectStats = useCallback((projectId: string) => {
    const financialProject = financialProjectsMap.get(projectId);
    if (financialProject) {
      return {
        totalIncome: financialProject.income?.totalIncome || 0,
        totalExpenses: financialProject.expenses?.totalAllExpenses || 0,
        cashExpenses: financialProject.expenses?.totalCashExpenses || 0,
        currentBalance: financialProject.totalBalance || 0,
        totalWorkers: financialProject.workers?.totalWorkers || 0,
        activeWorkers: financialProject.workers?.activeWorkers || 0,
        completedDays: financialProject.workers?.completedDays || 0,
        materialPurchases: financialProject.expenses?.materialExpenses || 0,
        materialExpensesCredit: financialProject.expenses?.materialExpensesCredit || 0,
        totalTransportation: financialProject.expenses?.transportExpenses || 0,
        totalMiscExpenses: financialProject.expenses?.miscExpenses || 0,
        totalWorkerWages: financialProject.expenses?.workerWages || 0,
        totalFundTransfers: financialProject.income?.fundTransfers || 0,
        totalWorkerTransfers: financialProject.expenses?.workerTransfers || 0,
        incomingProjectTransfers: financialProject.income?.incomingProjectTransfers || 0,
        outgoingProjectTransfers: financialProject.expenses?.outgoingProjectTransfers || 0
      };
    }
    return null;
  }, [financialProjectsMap]);

  // دالة التحديث مع إشعار
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchProjects(),
        refetchFinancial()
      ]);
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
  }, [refetchProjects, toast]);

  // جلب قائمة المستخدمين (للاستخدام في اختيار المهندس)
  const { data: usersResponse = { users: [] } } = useQuery<any>({
    queryKey: ["/api/users/list"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/users/list", "GET");
        return response || { users: [] };
      } catch (error) {
        console.error('❌ [Projects] خطأ في جلب المستخدمين:', error);
        return { users: [] };
      }
    },
    staleTime: 60000,
  });

  const usersData = useMemo(() => {
    return Array.isArray(usersResponse?.users) ? usersResponse.users : [];
  }, [usersResponse]);

  // جلب قائمة أنواع المشاريع
  const { data: projectTypes = [], isLoading: typesLoading } = useQuery<ProjectType[]>({
    queryKey: ["/api/project-types"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/project-types", "GET");
        if (response?.success && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.error('❌ [Projects] خطأ في جلب أنواع المشاريع:', error);
        return [];
      }
    },
    staleTime: 60000,
  });

  // Create project form
  const createForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      status: "active",
      engineerId: null,
      projectTypeId: null,
    },
  });

  // Edit project form
  const editForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      status: "active",
      engineerId: null,
      projectTypeId: null,
    },
  });

  // دالة مساعدة لحفظ القيم في autocomplete_data
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      // تجاهل الأخطاء لأن هذه عملية مساعدة
      console.log(`Failed to save autocomplete value for ${category}:`, error);
    }
  };


  const handleImageCapture = (useCamera: boolean) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      if (useCamera) {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    createForm.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleEditImageCapture = (useCamera: boolean) => {
    if (editFileInputRef.current) {
      editFileInputRef.current.accept = "image/*";
      if (useCamera) {
        editFileInputRef.current.setAttribute('capture', 'environment');
      } else {
        editFileInputRef.current.removeAttribute('capture');
      }
      editFileInputRef.current.click();
    }
  };

  const handleEditRemoveImage = () => {
    editForm.setValue('imageUrl', '');
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) =>
      apiRequest("/api/projects", "POST", data),
    onSuccess: async (data, variables) => {
      // حفظ اسم المشروع في autocomplete_data
      await saveAutocompleteValue('projectNames', variables.name);

      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      triggerSync(); // 🚀 تفعيل المزامنة الفورية
      toast({ title: "تم إنشاء المشروع بنجاح" });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء المشروع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertProject }) =>
      apiRequest(`/api/projects/${id}`, "PATCH", data),
    onSuccess: async (result, variables) => {
      // حفظ اسم المشروع في autocomplete_data
      await saveAutocompleteValue('projectNames', variables.data.name);

      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      triggerSync(); // 🚀 تفعيل المزامنة الفورية
      toast({ title: "تم تحديث المشروع بنجاح" });
      setIsEditDialogOpen(false);
      setEditingProject(null);
      editForm.reset();
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديث المشروع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: ({ id, confirmDeletion }: { id: string; confirmDeletion?: boolean }) =>
      apiRequest(`/api/projects/${id}`, "DELETE", { confirmDeletion }),
    onSuccess: () => {
      triggerSync(); // 🚀 تفعيل المزامنة الفورية
      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({ title: "تم حذف المشروع بنجاح" });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      setDeletionStats(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حذف المشروع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // جلب إحصائيات الحذف للمشروع
  const fetchDeletionStats = async (projectId: string) => {
    setIsLoadingDeletionStats(true);
    try {
      const response = await apiRequest(`/api/projects/${projectId}/deletion-stats`, "GET");
      if (response.success && response.data) {
        setDeletionStats({
          stats: response.data.stats,
          totalLinkedRecords: response.data.totalLinkedRecords,
          canDelete: response.data.canDelete,
          deleteBlockReason: response.data.deleteBlockReason || '',
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في جلب بيانات المشروع",
        description: error.message,
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
    } finally {
      setIsLoadingDeletionStats(false);
    }
  };

  // فتح نافذة تأكيد الحذف
  const openDeleteDialog = (project: ProjectWithStats) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
    fetchDeletionStats(project.id);
  };

  // Toggle project status mutation with Optimistic Updates
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string } }) =>
      apiRequest(`/api/projects/${id}`, "PATCH", data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects/with-stats"] });
      const previousData = queryClient.getQueryData<ProjectWithStats[]>(["/api/projects/with-stats"]);
      
      if (Array.isArray(previousData)) {
        queryClient.setQueryData<ProjectWithStats[]>(["/api/projects/with-stats"], 
          previousData.map(project => 
            project.id === id ? { ...project, status: data.status } : project
          )
        );
      }
      
      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم تحديث حالة المشروع بنجاح",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/projects/with-stats"], context.previousData);
      }
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تحديث حالة المشروع",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingProjectId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const handleToggleProjectStatus = (project: Project) => {
    setTogglingProjectId(project.id);
    const newStatus = project.status === 'active' ? 'paused' : 'active';
    toggleStatusMutation.mutate({ id: project.id, data: { status: newStatus } });
  };

  const handleCreateProject = (data: InsertProject) => {
    createProjectMutation.mutate(data);
  };

  const handleEditProject = (data: InsertProject) => {
    if (!editingProject) {
      toast({
        title: "خطأ",
        description: "لم يتم تحديد المشروع للتعديل",
        variant: "destructive",
      });
      return;
    }
    
    console.log('🔄 [Projects] تحديث المشروع:', {
      id: editingProject.id,
      name: editingProject.name,
      newData: data
    });
    
    updateProjectMutation.mutate({ id: editingProject.id, data });
  };

  const handleDeleteProject = (id: string, confirmDeletion: boolean = false) => {
    deleteProjectMutation.mutate({ id, confirmDeletion });
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    editForm.reset({
      name: project.name,
      status: project.status,
      engineerId: project.engineerId || null,
      projectTypeId: project.projectTypeId || null,
    });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "نشط";
      case "completed":
        return "مكتمل";
      case "paused":
        return "متوقف";
      default:
        return status;
    }
  };

  // تعيين إجراء الزر العائم
  useEffect(() => {
    setFloatingAction(() => setIsCreateDialogOpen(true), "إضافة مشروع جديد");

    // تنظيف الزر عند مغادرة الصفحة
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // Helper function محسنة لتنظيف القيم النصية وتحويلها إلى أرقام
  const safeParseNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    if (typeof value === 'number') {
      return isNaN(value) || !isFinite(value) ? defaultValue : value;
    }
    
    if (typeof value === 'string') {
      const cleanValue = value.trim();
      if (cleanValue === '' || cleanValue === 'null' || cleanValue === 'undefined') return defaultValue;
      
      // تنظيف القيم المتكررة المشبوهة مثل 162162162
      if (cleanValue.match(/^(\d{1,3})\1{2,}$/)) return defaultValue;
      
      // إزالة الفواصل والرموز غير الرقمية
      const numericValue = cleanValue.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(numericValue);
      return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
    }
    
    return defaultValue;
  };

  // الإحصائيات العامة من ExpenseLedgerService الموحد (Single Source of Truth)
  const overallStats = useMemo(() => {
    console.log('📊 [Projects] استخدام الإحصائيات من ExpenseLedgerService الموحد');
    
    // استخدام البيانات من الـ Hook الموحد
    if (financialTotals) {
      const activeProjectsCount = projectsData.filter(p => p.status === 'active').length;
      return {
        totalProjects: projectsData.length,
        activeProjects: activeProjectsCount,
        totalIncome: financialTotals.totalIncome || 0,
        totalExpenses: financialTotals.totalAllExpenses || financialTotals.totalExpenses || 0,
        totalWorkers: financialTotals.totalWorkers || 0,
        materialPurchases: 0, // سيتم حسابه من counts إذا لزم
      };
    }
    
    // قيم افتراضية إذا لم تتوفر البيانات
    return {
      totalProjects: projectsData.length,
      activeProjects: projectsData.filter(p => p.status === 'active').length,
      totalIncome: 0,
      totalExpenses: 0,
      totalWorkers: 0,
      materialPurchases: 0,
    };
  }, [financialTotals, projectsData]);

  const currentBalance = financialTotals?.totalBalance ?? (overallStats.totalIncome - overallStats.totalExpenses);

  // استخدام دالة formatCurrency من utils.ts لضمان التوحيد
  const formatCurrencyLocal = formatCurrency;

  const filteredProjects = useMemo(() => {
    return projectsData.filter(project => {
      if (searchValue && !project.name.toLowerCase().includes(searchValue.toLowerCase())) {
        return false;
      }
      if (filterValues.status && filterValues.status !== "all" && project.status !== filterValues.status) {
        return false;
      }
      if (filterValues.engineerId && filterValues.engineerId !== "all") {
        if (filterValues.engineerId === "none") {
          if (project.engineerId) return false;
        } else {
          if (project.engineerId !== filterValues.engineerId) return false;
        }
      }
      return true;
    });
  }, [projectsData, searchValue, filterValues]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalProjects',
          label: 'جميع المشاريع',
          value: overallStats.totalProjects,
          icon: Building2,
          color: 'blue',
        },
        {
          key: 'activeProjects',
          label: 'مشاريع نشطة',
          value: overallStats.activeProjects,
          icon: Activity,
          color: 'blue',
          showDot: true,
          dotColor: 'bg-green-500',
        },
        {
          key: 'currentBalance',
          label: 'الرصيد الحالي',
          value: formatCurrency(currentBalance),
          icon: Wallet,
          color: currentBalance >= 0 ? 'blue' : 'red',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalIncome',
          label: 'إجمالي الدخل',
          value: formatCurrency(overallStats.totalIncome),
          icon: TrendingUp,
          color: 'green',
        },
        {
          key: 'totalWorkers',
          label: 'إجمالي العمال',
          subLabel: 'في جميع المشاريع',
          value: overallStats.totalWorkers,
          icon: Users,
          color: 'amber',
        },
        {
          key: 'materialPurchases',
          label: 'عمليات الشراء',
          subLabel: 'مواد ومعدات',
          value: overallStats.materialPurchases,
          icon: Package,
          color: 'gray',
        },
      ]
    }
  ], [overallStats, currentBalance]);

  const filtersConfig: FilterConfig[] = useMemo(() => {
    const baseFilters: FilterConfig[] = [
      {
        key: 'status',
        label: 'حالة المشروع',
        type: 'select',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'جميع الحالات' },
          { value: 'active', label: 'نشط' },
          { value: 'paused', label: 'متوقف' },
          { value: 'completed', label: 'مكتمل' },
        ],
      },
    ];
    
    if (isAdmin) {
      baseFilters.push({
        key: 'engineerId',
        label: 'المهندس المسؤول',
        type: 'select',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'جميع المهندسين' },
          { value: 'none', label: 'بدون مهندس' },
          ...usersData.map(u => ({ value: u.id, label: u.name })),
        ],
      });
    }
    
    return baseFilters;
  }, [usersData, isAdmin]);


  // معالجة حالة التحميل - عرض هيكل تحميل جمالي
  if (isLoading) {
    return <ProjectsPageSkeleton />;
  }

  // معالجة الأخطاء
  if (error) {
    console.error('❌ [Projects] خطأ في تحميل المشاريع:', error);
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-1">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            خطأ في تحميل المشاريع
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى.
          </p>
          <Button onClick={() => refetchProjects()} className="gap-2">
            <Plus className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 p-2">
        <UnifiedFilterDashboard
          statsRows={statsRowsConfig}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="البحث في المشاريع..."
          filters={filtersConfig}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          resultsSummary={(searchValue || filterValues.status !== 'all') ? {
            totalCount: projects.length,
            filteredCount: filteredProjects.length,
            totalLabel: 'النتائج',
            filteredLabel: 'من',
            totalValue: filteredProjects.reduce((acc, p) => {
              const stats = getProjectStats(p.id);
              return acc + (stats?.currentBalance || 0);
            }, 0),
            totalValueLabel: 'الإجمالي',
            unit: 'ر.ي',
          } : undefined}
        />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء مشروع جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل المشروع الجديد
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateProject)} className="space-y-1">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المشروع</FormLabel>
                      <FormControl>
                        <AutocompleteInput 
                          value={field.value}
                          onChange={field.onChange}
                          category="projectNames"
                          placeholder="اسم المشروع"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isAdmin && (
                  <FormField
                    control={createForm.control}
                    name="engineerId"
                    render={({ field }) => {
                      const engineerOptions: SelectOption[] = [
                        { value: "none", label: "بدون مهندس" },
                        ...usersData.map((u) => ({
                          value: u.id,
                          label: `${u.name} (${u.role})`,
                        }))
                      ];
                      return (
                        <FormItem>
                          <FormLabel>المهندس / المشرف</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value || "none"}
                              onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                              options={engineerOptions}
                              placeholder="اختر المهندس المسؤول"
                              searchPlaceholder="ابحث عن مهندس..."
                              emptyText="لا يوجد مهندسون"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}
                <FormField
                  control={createForm.control}
                  name="projectTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع المشروع</FormLabel>
                      <FormControl>
                        <ProjectTypeSelect
                          value={field.value?.toString() || ""}
                          onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                          projectTypes={projectTypes}
                          placeholder={typesLoading ? "جاري التحميل..." : "اختر نوع المشروع..."}
                          disabled={typesLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>حالة المشروع</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر حالة المشروع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">نشط</SelectItem>
                          <SelectItem value="paused">متوقف</SelectItem>
                          <SelectItem value="completed">مكتمل</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? "جاري الإنشاء..." : "إنشاء المشروع"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المشروع</DialogTitle>
            <DialogDescription>
              عدّل تفاصيل المشروع
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditProject)} className="space-y-1">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المشروع</FormLabel>
                    <FormControl>
                      <AutocompleteInput 
                        value={field.value}
                        onChange={field.onChange}
                        category="projectNames"
                        placeholder="اسم المشروع"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isAdmin && (
                <FormField
                  control={editForm.control}
                  name="engineerId"
                  render={({ field }) => {
                    const engineerOptions: SelectOption[] = [
                      { value: "none", label: "بدون مهندس" },
                      ...usersData.map((u) => ({
                        value: u.id,
                        label: `${u.name} (${u.role})`,
                      }))
                    ];
                    return (
                      <FormItem>
                        <FormLabel>المهندس / المشرف</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value || "none"}
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                            options={engineerOptions}
                            placeholder="اختر المهندس المسؤول"
                            searchPlaceholder="ابحث عن مهندس..."
                            emptyText="لا يوجد مهندسون"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
              <FormField
                control={editForm.control}
                name="projectTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المشروع</FormLabel>
                    <FormControl>
                      <ProjectTypeSelect
                        value={field.value?.toString() || ""}
                        onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                        projectTypes={projectTypes}
                        placeholder={typesLoading ? "جاري التحميل..." : "اختر نوع المشروع..."}
                        disabled={typesLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة المشروع</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة المشروع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="paused">متوقف</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateProjectMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProjectMutation.isPending || !editingProject}
                  className="gap-2"
                >
                  {updateProjectMutation.isPending ? "⏳ جاري التحديث..." : "✅ تحديث المشروع"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Projects Grid - Using UnifiedCard */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">
            {projects.length === 0 ? "لا توجد مشاريع" : "لا توجد نتائج"}
          </h3>
          <p className="text-muted-foreground">
            {projects.length === 0 ? "ابدأ بإنشاء مشروعك الأول" : "جرب تغيير معايير البحث أو الفلاتر"}
          </p>
          {projects.length === 0 && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء مشروع جديد
            </Button>
          )}
        </Card>
      ) : (
        <UnifiedCardGrid columns={4}>
          {filteredProjects.map((project) => {
            // استخدام بيانات ExpenseLedgerService للإحصائيات المالية (مصدر موحد للحقيقة)
            const projectStats = getProjectStats(project.id);
            const income = projectStats?.totalIncome || 0;
            const expenses = projectStats?.totalExpenses || 0;
            const balance = projectStats?.currentBalance || 0;
            const totalWorkers = projectStats?.totalWorkers || 0;
            const materialPurchases = projectStats?.materialPurchases || 0;
            const completedDays = projectStats?.completedDays || 0;
            
            const statusBadgeVariant = project.status === 'active' ? 'success' : 
                                       project.status === 'completed' ? 'default' : 'destructive';
            
            return (
              <UnifiedCard
                key={project.id}
                title={project.name}
                subtitle={formatDate(project.createdAt)}
                titleIcon={Building2}
                headerColor={project.status === 'active' ? '#22c55e' : 
                            project.status === 'completed' ? '#3b82f6' : '#ef4444'}
                badges={[
                  {
                    label: getStatusText(project.status),
                    variant: statusBadgeVariant,
                  }
                ]}
                fields={[
                  {
                    label: "المشتريات",
                    value: formatCurrency(projectStats?.materialPurchases || 0),
                    icon: Package,
                    color: "warning",
                  },
                  {
                    label: "المواصلات",
                    value: formatCurrency(projectStats?.totalTransportation || 0),
                    icon: MapPin,
                    color: "info",
                  },
                  {
                    label: "نثريات",
                    value: formatCurrency(projectStats?.totalMiscExpenses || 0),
                    icon: Wallet,
                    color: "default",
                  },
                  {
                    label: "أجور العمال",
                    value: formatCurrency(projectStats?.totalWorkerWages || 0),
                    icon: Users,
                    color: "success",
                  },
                  {
                    label: "الترحيل (صادر)",
                    value: formatCurrency(projectStats?.outgoingProjectTransfers || 0),
                    icon: ArrowUpCircle,
                    color: "red",
                  },
                  {
                    label: "الترحيل (وارد)",
                    value: formatCurrency(projectStats?.incomingProjectTransfers || 0),
                    icon: ArrowDownCircle,
                    color: "success",
                  },
                  {
                    label: "حوالات العمال",
                    value: formatCurrency(projectStats?.totalWorkerTransfers || 0),
                    icon: DollarSign,
                    color: "orange",
                  },
                  {
                    label: "المهندس",
                    value: project.engineerId 
                      ? usersData.find(u => u.id === project.engineerId)?.name || "غير معروف"
                      : "بدون مهندس",
                    icon: UserCog,
                    color: project.engineerId ? "info" : "muted",
                  },
                ]}
                actions={[
                  {
                    icon: Edit,
                    label: "تعديل",
                    onClick: () => openEditDialog(project),
                    color: "blue",
                  },
                  {
                    icon: Power,
                    label: project.status === 'active' ? "إيقاف" : "تفعيل",
                    onClick: () => handleToggleProjectStatus(project),
                    disabled: togglingProjectId === project.id,
                    color: project.status === 'active' ? "yellow" : "green",
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    onClick: () => openDeleteDialog(project),
                    color: "red",
                  },
                ]}
                footer={
                  <ProjectFinancialStatsFooter 
                    income={income}
                    expenses={expenses}
                    balance={balance}
                    formatCurrencyFn={formatCurrency}
                  />
                }
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}
      </div>

      {/* نافذة تأكيد حذف المشروع */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              تأكيد حذف المشروع
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-3">
              {isLoadingDeletionStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : deletionStats ? (
                <>
                  <p className="font-medium text-base">
                    هل أنت متأكد من حذف المشروع "{projectToDelete?.name}"؟
                  </p>
                  
                  {!deletionStats.canDelete ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300">
                      {deletionStats.deleteBlockReason}
                    </div>
                  ) : deletionStats.totalLinkedRecords > 0 ? (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-2">
                      <p className="text-orange-700 dark:text-orange-300 font-medium">
                        سيتم حذف {deletionStats.totalLinkedRecords} سجل مرتبط:
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-sm text-orange-600 dark:text-orange-400">
                        {deletionStats.stats.fundTransfers > 0 && (
                          <div>تحويلات عهدة: {deletionStats.stats.fundTransfers}</div>
                        )}
                        {deletionStats.stats.workerAttendance > 0 && (
                          <div>حضور عمال: {deletionStats.stats.workerAttendance}</div>
                        )}
                        {deletionStats.stats.materialPurchases > 0 && (
                          <div>مشتريات مواد: {deletionStats.stats.materialPurchases}</div>
                        )}
                        {deletionStats.stats.transportationExpenses > 0 && (
                          <div>مصاريف نقل: {deletionStats.stats.transportationExpenses}</div>
                        )}
                        {deletionStats.stats.workerTransfers > 0 && (
                          <div>حوالات عمال: {deletionStats.stats.workerTransfers}</div>
                        )}
                        {deletionStats.stats.workerMiscExpenses > 0 && (
                          <div>نثريات: {deletionStats.stats.workerMiscExpenses}</div>
                        )}
                        {deletionStats.stats.dailySummaries > 0 && (
                          <div>ملخصات يومية: {deletionStats.stats.dailySummaries}</div>
                        )}
                        {(deletionStats.stats.projectTransfersFrom > 0 || deletionStats.stats.projectTransfersTo > 0) && (
                          <div>تحويلات بين مشاريع: {(deletionStats.stats.projectTransfersFrom || 0) + (deletionStats.stats.projectTransfersTo || 0)}</div>
                        )}
                        {deletionStats.stats.workerBalances > 0 && (
                          <div>أرصدة عمال: {deletionStats.stats.workerBalances}</div>
                        )}
                        {deletionStats.stats.supplierPayments > 0 && (
                          <div>مدفوعات موردين: {deletionStats.stats.supplierPayments}</div>
                        )}
                      </div>
                      <p className="text-red-600 dark:text-red-400 font-bold text-sm pt-1">
                        هذا الإجراء لا يمكن التراجع عنه!
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300">
                      لا توجد بيانات مرتبطة بهذا المشروع. يمكنك حذفه بأمان.
                    </div>
                  )}
                </>
              ) : (
                <p>جاري تحميل البيانات...</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            {deletionStats?.canDelete && (
              <AlertDialogAction
                onClick={() => {
                  if (projectToDelete) {
                    handleDeleteProject(projectToDelete.id, true);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteProjectMutation.isPending}
              >
                {deleteProjectMutation.isPending ? "جاري الحذف..." : "تأكيد الحذف"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
