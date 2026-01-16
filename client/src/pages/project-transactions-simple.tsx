import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, TrendingUp, TrendingDown, DollarSign, Building, Clock, ArrowRightLeft, Edit, Trash2, User, Calendar, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { formatArabicNumber, formatEnglishNumber } from '@/lib/arabic-utils';
import { StatsGrid } from '@/components/ui/stats-grid';
import { useSelectedProject, ALL_PROJECTS_ID } from '@/hooks/use-selected-project';
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@shared/schema";
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { 
  DollarSign as UnifiedDollarSign, 
  TrendingUp as UnifiedTrendingUp, 
  TrendingDown as UnifiedTrendingDown, 
  Calendar as UnifiedCalendar,
  ArrowUpRight,
  ArrowDownRight,
  Building2 as UnifiedBuilding2,
  FileText as UnifiedFileText,
  AlertCircle as UnifiedAlertCircle
} from "lucide-react";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { exportTransactionsToExcel } from "@/components/ui/export-transactions-excel";


interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
  workDays?: number;
  dailyWage?: number;
  workerName?: string;
  transferMethod?: string;
  recipientName?: string;
  quantity?: number;
  unitPrice?: number;
  paymentType?: string;
  supplierName?: string;
  materialName?: string;
  payableAmount?: number;
}

export default function ProjectTransactionsSimple() {
  const { selectedProjectId, getProjectIdForApi, isAllProjects } = useSelectedProject();
  const selectedProject = getProjectIdForApi() || '';
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin' || user?.role === 'مدير';

  // استخدام الملخص المالي الموحد من ExpenseLedgerService
  const { totals: financialTotals, isLoading: financialLoading } = useFinancialSummary({
    projectId: selectedProject || 'all',
    enabled: true
  });

    // الحسابات المالية (إجمالي التوريد والمنصرف والرصيد) - من المصدر الموحد للحقيقة
    const stats = useMemo(() => {
      return {
        totalIncome: financialTotals?.totalIncome ?? 0,
        totalExpenses: financialTotals?.totalCashExpenses ?? 0, // استخدام الكاش فقط كمصروفات فعلية
        currentBalance: financialTotals?.totalBalance ?? 0,
        deferredExpenses: financialTotals?.materialExpensesCredit ?? 0
      };
    }, [financialTotals]);

    const statsRow: StatsRowConfig[] = [
      { 
        title: "التوريد", 
        value: stats.totalIncome, 
        icon: UnifiedTrendingUp, 
        color: "green",
        formatter: (val: number) => formatCurrency(val)
      },
      { 
        title: "المنصرف (نقدي)", 
        value: stats.totalExpenses, 
        icon: UnifiedTrendingDown, 
        color: "red",
        formatter: (val: number) => formatCurrency(val)
      },
      { 
        title: "الرصيد المتبقي", 
        value: stats.currentBalance, 
        icon: UnifiedDollarSign, 
        color: stats.currentBalance >= 0 ? "blue" : "red",
        formatter: (val: number) => formatCurrency(val)
      },
      { 
        title: "المواد الآجلة", 
        value: stats.deferredExpenses, 
        icon: Clock, 
        color: "orange",
        formatter: (val: number) => formatCurrency(val)
      }
    ];

  // تحسين عرض شبكة الإحصائيات لتصبح 3*2 مع تصغير الخط
  const customStatsGrid = (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
      {statsRow.map((stat, idx) => (
        <Card key={idx} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                <stat.icon className={`h-3.5 w-3.5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground leading-none">
                  {stat.title}
                </p>
                <p className={`text-xs font-bold arabic-numbers leading-none ${stat.color === 'red' ? 'text-red-600' : stat.color === 'green' ? 'text-green-600' : ''}`}>
                  {stat.formatter(stat.value)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // تحسين جلب البيانات باستخدام Cache و StaleTime
  const queryOptions = {
    staleTime: 1000 * 60 * 5, // 5 دقائق
    gcTime: 1000 * 60 * 30, // 30 دقيقة
    retry: 1,
    refetchOnWindowFocus: false,
  };

  // جلب المشاريع
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    ...queryOptions
  });

  // جلب تحويلات العهدة العادية للمشروع
  const { data: fundTransfers = [], isLoading: fundTransfersLoading, error: fundTransfersError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'fund-transfers', isAllProjects],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب تحويلات العهدة للمشروع: ${selectedProject}, جميع المشاريع: ${isAllProjects}`);
        
        if (isAllProjects) {
          // جلب من جميع المشاريع
          const allRecords: any[] = [];
          // تحسين: جلب البيانات بالتوازي لجميع المشاريع لزيادة السرعة
          await Promise.all(projects.map(async (project) => {
            try {
              const data = await apiRequest(`/api/projects/${project.id}/fund-transfers`);
              const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
              allRecords.push(...records.map((r: any) => ({ ...r, projectId: project.id, projectName: project.name })));
            } catch (e) {
              console.error(`❌ خطأ في جلب تحويلات عهدة المشروع ${project.id}:`, e);
            }
          }));
          console.log(`✅ تم جلب ${allRecords.length} تحويل عهدة من جميع المشاريع`);
          return allRecords;
        } else {
          const data = await apiRequest(`/api/projects/${selectedProject}/fund-transfers`);
          console.log(`✅ تم جلب ${Array.isArray(data?.data) ? data.data.length : 0} تحويل عهدة`);
          return Array.isArray(data?.data) ? data.data : [];
        }
      } catch (error) {
        console.error('❌ خطأ في جلب تحويلات العهدة:', error);
        return [];
      }
    },
    enabled: (!!selectedProject || isAllProjects) && projects.length > 0,
    retry: 1,
    staleTime: 30000,
  });

  // جلب التحويلات بين المشاريع (الواردة) - فقط إذا كانت موجودة فعلياً
  const { data: incomingProjectTransfers = [], isLoading: incomingTransfersLoading, error: incomingTransfersError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'fund-transfers', 'incoming', isAllProjects],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب التحويلات الواردة للمشروع: ${selectedProject}, جميع المشاريع: ${isAllProjects}`);
        const endpoint = isAllProjects 
          ? '/api/project-fund-transfers'
          : `/api/projects/fund-transfers/incoming/${selectedProject}`;
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب التحويلات الواردة: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const transfers = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        console.log(`✅ تم جلب ${transfers.length} تحويل وارد فعلي`);

        if (transfers.length > 0) {
          console.log('🔍 التحويلات الواردة:', transfers.map((t: any) => ({
            من: t.fromProjectName,
            إلى: t.toProjectName,
            المبلغ: t.amount,
            التاريخ: t.transferDate
          })));
        }

        return transfers;
      } catch (error) {
        console.error('❌ خطأ في جلب التحويلات الواردة:', error);
        return [];
      }
    },
    enabled: true, // Always enabled, logic inside handles empty selection
    retry: 1,
    staleTime: 30000,
  });

  // جلب التحويلات بين المشاريع (الصادرة)
  const { data: outgoingProjectTransfers = [], isLoading: outgoingTransfersLoading, error: outgoingTransfersError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'fund-transfers', 'outgoing', isAllProjects],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب التحويلات الصادرة للمشروع: ${selectedProject}, جميع المشاريع: ${isAllProjects}`);
        const endpoint = isAllProjects 
          ? '/api/project-fund-transfers'
          : `/api/projects/fund-transfers/outgoing/${selectedProject}`;
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب التحويلات الصادرة: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const transfers = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        console.log(`✅ تم جلب ${transfers.length} تحويل صادر فعلي`);

        if (transfers.length > 0) {
          console.log('🔍 التحويلات الصادرة:', transfers.map((t: any) => ({
            من: t.fromProjectName,
            إلى: t.toProjectName,
            المبلغ: t.amount,
            التاريخ: t.transferDate
          })));
        }

        return transfers;
      } catch (error) {
        console.error('❌ خطأ في جلب التحويلات الصادرة:', error);
        return [];
      }
    },
    enabled: true, // Always enabled, logic inside handles empty selection
    retry: 1,
    staleTime: 30000,
  });

  // جلب حضور العمال للمشروع
  const { data: workerAttendance = [], isLoading: attendanceLoading, error: attendanceError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'worker-attendance', isAllProjects],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب حضور العمال للمشروع: ${selectedProject}, جميع المشاريع: ${isAllProjects}`);
        
        if (isAllProjects) {
          // جلب من جميع المشاريع
          const allRecords: any[] = [];
          for (const project of projects) {
            try {
              const data = await apiRequest(`/api/projects/${project.id}/worker-attendance`);
              const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
              allRecords.push(...records.map((r: any) => ({ ...r, projectId: project.id, projectName: project.name })));
            } catch (e) {
              console.error(`❌ خطأ في جلب حضور المشروع ${project.id}:`, e);
            }
          }
          console.log(`✅ تم جلب ${allRecords.length} سجل حضور من جميع المشاريع`);
          return allRecords;
        } else {
          const data = await apiRequest(`/api/projects/${selectedProject}/worker-attendance`);
          const attendanceData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          console.log(`✅ تم جلب ${attendanceData.length} سجل حضور عمال`);
          return attendanceData;
        }
      } catch (error) {
        console.error('❌ خطأ في جلب حضور العمال:', error);
        return [];
      }
    },
    enabled: (!!selectedProject || isAllProjects) && projects.length > 0,
    retry: 1,
    staleTime: 30000,
  });

  // جلب مشتريات المواد للمشروع
  const { data: materialPurchases = [], isLoading: materialsLoading, error: materialsError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'material-purchases', isAllProjects],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب مشتريات المواد للمشروع: ${selectedProject}, جميع المشاريع: ${isAllProjects}`);
        
        if (isAllProjects) {
          // جلب من جميع المشاريع
          const allRecords: any[] = [];
          for (const project of projects) {
            try {
              const response = await fetch(`/api/projects/${project.id}/material-purchases`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                  'Content-Type': 'application/json',
                }
              });
              if (response.ok) {
                const data = await response.json();
                const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                allRecords.push(...records.map((r: any) => ({ ...r, projectId: project.id, projectName: project.name })));
              }
            } catch (e) {
              console.error(`❌ خطأ في جلب مشتريات المشروع ${project.id}:`, e);
            }
          }
          console.log(`✅ تم جلب ${allRecords.length} مشترية مواد من جميع المشاريع`);
          return allRecords;
        } else {
          const response = await fetch(`/api/projects/${selectedProject}/material-purchases`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json',
            }
          });
          if (!response.ok) {
            if (response.status === 401) {
              console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
              return [];
            }
            console.error(`❌ خطأ في جلب مشتريات المواد: ${response.status}`);
            return [];
          }
          const data = await response.json();
          const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          console.log(`✅ تم جلب ${records.length} مشترية مواد`);
          return records;
        }
      } catch (error) {
        console.error('❌ خطأ في جلب مشتريات المواد:', error);
        return [];
      }
    },
    enabled: (!!selectedProject || isAllProjects) && projects.length > 0,
    retry: 1,
    staleTime: 30000,
  });

  // جلب مصاريف النقل للمشروع
  const { data: transportExpenses = [], isLoading: transportExpensesLoading } = useQuery<any[]>({
    queryKey: ['/api/transportation-expenses', isAllProjects, selectedProject],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب مصاريف النقل - جميع المشاريع: ${isAllProjects}, المشروع: ${selectedProject}`);
        
        if (isAllProjects) {
          // جلب من جميع المشاريع
          const allRecords: any[] = [];
          for (const project of projects) {
            try {
              const data = await apiRequest(`/api/transportation-expenses?projectId=${project.id}`);
              const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
              allRecords.push(...records.map((r: any) => ({ ...r, projectId: project.id, projectName: project.name })));
            } catch (e) {
              console.error(`❌ خطأ في جلب مصاريف نقل المشروع ${project.id}:`, e);
            }
          }
          console.log(`✅ تم جلب ${allRecords.length} مصروف نقل من جميع المشاريع`);
          return allRecords;
        } else {
          let endpoint = '/api/transportation-expenses';
          if (selectedProject) {
            endpoint = `/api/transportation-expenses?projectId=${selectedProject}`;
          }
          const data = await apiRequest(endpoint);
          const expensesData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          console.log(`✅ تم جلب ${expensesData.length} مصروف نقل`);
          return expensesData;
        }
      } catch (error) {
        console.error('❌ خطأ في جلب مصاريف النقل:', error);
        return [];
      }
    },
    enabled: (!!selectedProject || isAllProjects) && projects.length > 0,
    retry: 1,
    staleTime: 30000,
  });

  // جلب المصاريف المتنوعة للمشروع
  const { data: miscExpenses = [], isLoading: miscExpensesLoading } = useQuery<any[]>({
    queryKey: ['/api/worker-misc-expenses', isAllProjects, selectedProject],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب المصاريف المتنوعة - جميع المشاريع: ${isAllProjects}, المشروع: ${selectedProject}`);
        
        if (isAllProjects) {
          // جلب من جميع المشاريع
          const allRecords: any[] = [];
          for (const project of projects) {
            try {
              const data = await apiRequest(`/api/worker-misc-expenses?projectId=${project.id}`);
              const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
              allRecords.push(...records.map((r: any) => ({ ...r, projectId: project.id, projectName: project.name })));
            } catch (e) {
              console.error(`❌ خطأ في جلب مصاريف المشروع ${project.id}:`, e);
            }
          }
          console.log(`✅ تم جلب ${allRecords.length} مصروف متنوع من جميع المشاريع`);
          return allRecords;
        } else {
          let endpoint = '/api/worker-misc-expenses';
          if (selectedProject) {
            endpoint = `/api/worker-misc-expenses?projectId=${selectedProject}`;
          }
          const data = await apiRequest(endpoint);
          const expensesData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          console.log(`✅ تم جلب ${expensesData.length} مصروف متنوع`);
          return expensesData;
        }
      } catch (error) {
        console.error('❌ خطأ في جلب المصاريف المتنوعة:', error);
        return [];
      }
    },
    enabled: (!!selectedProject || isAllProjects) && projects.length > 0,
    retry: 1,
    staleTime: 30000,
  });

  // جلب حوالات العمال للمشروع
  const { data: workerTransfers = [], isLoading: workerTransfersLoading, error: workerTransfersError } = useQuery<any[]>({
    queryKey: ['/api/worker-transfers', selectedProject, isAllProjects],
    queryFn: async () => {
      try {
        console.log(`🔄 جلب حوالات العمال للمشروع: ${selectedProject}, جميع المشاريع: ${isAllProjects}`);
        
        if (isAllProjects) {
          // جلب من جميع المشاريع
          const allRecords: any[] = [];
          for (const project of projects) {
            try {
              const data = await apiRequest(`/api/worker-transfers?projectId=${project.id}`);
              const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
              allRecords.push(...records.map((r: any) => ({ ...r, projectId: project.id, projectName: r.projectName || project.name })));
            } catch (e) {
              console.error(`❌ خطأ في جلب حوالات المشروع ${project.id}:`, e);
            }
          }
          console.log(`✅ تم جلب ${allRecords.length} حوالة عمال من جميع المشاريع`);
          return allRecords;
        } else {
          const endpoint = !selectedProject
            ? '/api/worker-transfers'
            : `/api/worker-transfers?projectId=${selectedProject}`;
          const data = await apiRequest(endpoint);
          const transfersData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          console.log(`✅ تم جلب ${transfersData.length} حوالة عمال`);
          return transfersData;
        }
      } catch (error) {
        console.error('❌ خطأ في جلب حوالات العمال:', error);
        return [];
      }
    },
    enabled: projects.length > 0,
    retry: 1,
    staleTime: 30000,
  });

  // جلب بيانات العمال لعرض أسمائهم
  const { data: workers = [] } = useQuery({
    queryKey: ['/api/workers'],
  });

  // Helper function to filter by project
  const filterByProject = (item: any) => {
    if (isAllProjects) {
      return true; // Show all if 'all projects' is selected
    }
    // Assuming items have a 'projectId' or similar field, adjust if structure differs
    return item.projectId === selectedProject;
  };

  // تحويل البيانات إلى قائمة معاملات موحدة
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];

    // تشخيص البيانات للمساعدة في حل المشكلة
    const fundTransfersArray = Array.isArray(fundTransfers) ? fundTransfers : [];
    const incomingProjectTransfersArray = Array.isArray(incomingProjectTransfers) ? incomingProjectTransfers : [];
    const outgoingProjectTransfersArray = Array.isArray(outgoingProjectTransfers) ? outgoingProjectTransfers : [];
    const workerAttendanceArray = Array.isArray(workerAttendance) ? workerAttendance : [];
    const materialPurchasesArray = Array.isArray(materialPurchases) ? materialPurchases : [];
    const transportExpensesArray = Array.isArray(transportExpenses) ? transportExpenses : [];
    const miscExpensesArray = Array.isArray(miscExpenses) ? miscExpenses : [];
    const workerTransfersArray = Array.isArray(workerTransfers) ? workerTransfers : [];
    const workersArray = Array.isArray(workers) ? workers : [];

    console.log(`🎯 بدء معالجة البيانات للمشروع ${selectedProject}`);
    console.log('📊 البيانات المتاحة:', {
      fundTransfers: fundTransfersArray?.length || 0,
      incomingProjectTransfers: incomingProjectTransfersArray?.length || 0,
      outgoingProjectTransfers: outgoingProjectTransfersArray?.length || 0,
      workerAttendance: workerAttendanceArray?.length || 0,
      materialPurchases: materialPurchasesArray?.length || 0,
      transportExpenses: transportExpensesArray?.length || 0,
      miscExpenses: miscExpensesArray?.length || 0,
      workerTransfers: workerTransfersArray?.length || 0
    });

    // Helper function to get project name by id
    const getProjectName = (projectId: string | number | undefined): string => {
      if (!projectId) return 'غير محدد';
      const project = (projects as Project[]).find(p => String(p.id) === String(projectId));
      return project?.name || 'غير محدد';
    };

    // ✅ إضافة تحويلات العهدة العادية (دخل)
    console.log('💰 إضافة تحويلات العهدة:', fundTransfersArray.length);
    fundTransfersArray.forEach((transfer: any) => {
      const date = transfer.transferDate;
      const amount = parseFloat(transfer.amount);

      if (date && !isNaN(amount) && amount > 0) {
        allTransactions.push({
          id: `fund-${transfer.id}`,
          date: date,
          type: 'income',
          category: 'تحويل عهدة',
          amount: amount,
          description: `من: ${transfer.senderName || 'غير محدد'}`,
          projectId: transfer.projectId,
          projectName: transfer.projectName || getProjectName(transfer.projectId)
        });
      }
    });

    // إضافة التحويلات الواردة من مشاريع أخرى (دخل) - مع تحديد واضح
    if (incomingProjectTransfersArray.length > 0) {
      console.log(`📥 معالجة ${incomingProjectTransfersArray.length} تحويل وارد`);
      incomingProjectTransfersArray.forEach((transfer: any) => {
        const date = transfer.transferDate;
        const amount = parseFloat(transfer.amount);

        if (date && !isNaN(amount) && amount > 0) {
          console.log(`💰 إضافة تحويل وارد: ${amount} من ${transfer.fromProjectName}`);
          allTransactions.push({
            id: `project-in-${transfer.id}`,
            date: date,
            type: 'transfer_from_project',
            category: '🔄 ترحيل وارد من مشروع',
            amount: amount,
            description: `📥 من مشروع: ${transfer.fromProjectName || 'مشروع آخر'}${transfer.description ? ` - ${transfer.description}` : ''}`,
            projectId: transfer.toProjectId,
            projectName: transfer.toProjectName || getProjectName(transfer.toProjectId)
          });
        }
      });
    } else {
      console.log(`📥 لا توجد تحويلات واردة للمشروع ${selectedProject}`);
    }

    // إضافة التحويلات الصادرة إلى مشاريع أخرى (مصروف) - مع تحديد واضح
    if (outgoingProjectTransfersArray.length > 0) {
      console.log(`📤 معالجة ${outgoingProjectTransfersArray.length} تحويل صادر`);
      outgoingProjectTransfersArray.forEach((transfer: any) => {
        const date = transfer.transferDate;
        const amount = parseFloat(transfer.amount);

        if (date && !isNaN(amount) && amount > 0) {
          console.log(`💸 إضافة تحويل صادر: ${amount} إلى ${transfer.toProjectName}`);
          allTransactions.push({
            id: `project-out-${transfer.id}`,
            date: date,
            type: 'expense',
            category: '🔄 ترحيل صادر إلى مشروع',
            amount: amount,
            description: `📤 إلى مشروع: ${transfer.toProjectName || 'مشروع آخر'}${transfer.description ? ` - ${transfer.description}` : ''}`,
            projectId: transfer.fromProjectId,
            projectName: transfer.fromProjectName || getProjectName(transfer.fromProjectId)
          });
        }
      });
    } else {
      console.log(`📤 لا توجد تحويلات صادرة للمشروع ${selectedProject}`);
    }

    // ✅ إضافة أجور العمال (مصروف) - شاملة المدفوعة وغير المدفوعة
    console.log('👷 إضافة أجور العمال:', workerAttendanceArray.length);

    workerAttendanceArray.forEach((attendance: any, index: number) => {
      const date = attendance.date || attendance.attendanceDate || attendance.created_at;

      // حساب المبلغ المدفوع فعلياً
      let paidAmount = 0;
      if (attendance.paidAmount !== undefined && attendance.paidAmount !== null && attendance.paidAmount !== '') {
        const parsed = parseFloat(attendance.paidAmount);
        if (!isNaN(parsed) && parsed > 0) {
          paidAmount = parsed;
        }
      } else if (attendance.actualWage !== undefined && attendance.actualWage !== null && attendance.actualWage !== '') {
        const parsed = parseFloat(attendance.actualWage);
        if (!isNaN(parsed) && parsed > 0) {
          paidAmount = parsed;
        }
      }

      // حساب المستحقات (عدد الأيام × الأجر اليومي)
      let payableAmount = 0;
      const dailyWage = attendance.dailyWage ? parseFloat(attendance.dailyWage) : 0;
      const workDaysNum = attendance.workDays ? parseFloat(attendance.workDays) : 0;
      if (!isNaN(dailyWage) && !isNaN(workDaysNum) && dailyWage > 0 && workDaysNum > 0) {
        payableAmount = dailyWage * workDaysNum;
      }

      // إذا لم يكن هناك مبلغ مدفوع ولكن هناك مستحقات، استخدم 0 للمبلغ المدفوع
      const amount = paidAmount > 0 ? paidAmount : 0;

      // عرض السجلات التي لها أيام عمل (سواء مدفوعة أو غير مدفوعة)
      if (date && (payableAmount > 0 || amount > 0)) {
        // البحث عن العامل باستخدام workerId
        const worker = Array.isArray(workersArray) ? workersArray.find((w: any) => w.id === attendance.workerId) : undefined;
        const workerName = worker?.name || attendance.workerName || attendance.worker?.name || attendance.name || 'غير محدد';
        const workDaysLabel = attendance.workDays ? ` (${attendance.workDays} يوم)` : '';
        const unpaidLabel = payableAmount > 0 && paidAmount === 0 ? ' - غير مدفوع' : '';

        const newTransaction = {
          id: `wage-${attendance.id}`,
          date: date,
          type: 'expense' as const,
          category: payableAmount > 0 && paidAmount === 0 ? 'أجور العمال (غير مدفوع)' : 'أجور العمال',
          amount: amount,
          description: `${workerName}${workDaysLabel}${unpaidLabel}`,
          workerName: workerName,
          workDays: workDaysNum > 0 ? workDaysNum : undefined,
          dailyWage: dailyWage > 0 ? dailyWage : undefined,
          payableAmount: payableAmount > 0 ? payableAmount : undefined,
          projectId: attendance.projectId,
          projectName: attendance.projectName || getProjectName(attendance.projectId)
        };

        allTransactions.push(newTransaction);
      }
    });

    // ✅ إضافة مشتريات المواد (مصروف أو آجل)
    const filteredMaterialPurchases = materialPurchasesArray.filter(filterByProject);
    console.log('🛒 إضافة مشتريات المواد:', filteredMaterialPurchases.length);
    filteredMaterialPurchases.forEach((purchase: any) => {
      const date = purchase.purchaseDate || purchase.date;
      let amount = 0;

      if (purchase.totalAmount && !isNaN(parseFloat(purchase.totalAmount))) {
        amount = parseFloat(purchase.totalAmount);
      } else if (purchase.amount && !isNaN(parseFloat(purchase.amount))) {
        amount = parseFloat(purchase.amount);
      } else if (purchase.cost && !isNaN(parseFloat(purchase.cost))) {
        amount = parseFloat(purchase.cost);
      }

      if (date && amount > 0) {
        // تحديد نوع المشترية - المشتريات النقدية فقط تُحسب كمصروفات
        const isDeferred = purchase.purchaseType === 'آجل' || purchase.paymentType === 'deferred' || purchase.isDeferred || purchase.deferred;

        allTransactions.push({
          id: `material-${purchase.id}`,
          date: date,
          type: isDeferred ? 'deferred' : 'expense',
          category: isDeferred ? 'مشتريات آجلة' : 'مشتريات المواد',
          amount: amount,
          description: `مادة: ${purchase.materialName || purchase.name || 'غير محدد'}${isDeferred ? ' (آجل)' : ''}`,
          materialName: purchase.materialName || purchase.name || 'غير محدد',
          quantity: purchase.quantity ? parseFloat(purchase.quantity) : undefined,
          unitPrice: purchase.unitPrice ? parseFloat(purchase.unitPrice) : undefined,
          paymentType: isDeferred ? 'آجل' : 'نقد',
          supplierName: purchase.supplierName || purchase.supplier?.name || '',
          projectId: purchase.projectId,
          projectName: purchase.projectName || getProjectName(purchase.projectId)
        });
      }
    });

    // ✅ إضافة مصاريف النقل (مصروف)
    const filteredTransportExpenses = transportExpensesArray.filter(filterByProject);
    console.log('🚚 إضافة مصاريف النقل:', filteredTransportExpenses.length);
    filteredTransportExpenses.forEach((expense: any) => {
      const date = expense.date;
      const amount = parseFloat(expense.amount);

      if (date && !isNaN(amount) && amount > 0) {
        allTransactions.push({
          id: `transport-${expense.id}`,
          date: date,
          type: 'expense',
          category: 'مواصلات',
          amount: amount,
          description: `نقل: ${expense.description || 'غير محدد'}`,
          projectId: expense.projectId,
          projectName: expense.projectName || getProjectName(expense.projectId)
        });
      }
    });

    // ✅ إضافة المصاريف المتنوعة (مصروف)
    const filteredMiscExpenses = miscExpensesArray.filter(filterByProject);
    console.log('💸 إضافة المصاريف المتنوعة:', filteredMiscExpenses.length);
    filteredMiscExpenses.forEach((expense: any) => {
      const date = expense.date;
      const amount = parseFloat(expense.amount);

      if (date && !isNaN(amount) && amount > 0) {
        allTransactions.push({
          id: `misc-${expense.id}`,
          date: date,
          type: 'expense',
          category: 'نثريات',
          amount: amount,
          description: `متنوع: ${expense.description || expense.workerName || 'غير محدد'}`,
          projectId: expense.projectId,
          projectName: expense.projectName || getProjectName(expense.projectId)
        });
      }
    });

    // ✅ إضافة حوالات العمال (مصروف)
    console.log('💵 إضافة حوالات العمال:', workerTransfersArray.length);
    workerTransfersArray.forEach((transfer: any) => {
      const date = transfer.transferDate || transfer.date;
      const amount = parseFloat(transfer.amount);

      if (date && !isNaN(amount) && amount > 0) {
        // البحث عن العامل باستخدام workerId
        const worker = Array.isArray(workersArray) ? workersArray.find((w: any) => w.id === transfer.workerId) : undefined;
        const workerName = worker?.name || transfer.workerName || 'عامل غير معروف';
        const recipientName = transfer.recipientName ? ` → ${transfer.recipientName}` : '';
        const transferMethod = transfer.transferMethod === 'hawaleh' ? '(حولة)' : 
                              transfer.transferMethod === 'bank' ? '(تحويل بنكي)' : '(نقداً)';

        allTransactions.push({
          id: `worker-transfer-${transfer.id}`,
          date: date,
          type: 'expense',
          category: 'حوالات العمال',
          amount: amount,
          description: `${workerName}${recipientName} ${transferMethod}`,
          workerName: workerName,
          recipientName: transfer.recipientName || '',
          transferMethod: transfer.transferMethod === 'hawaleh' ? 'حولة' : transfer.transferMethod === 'bank' ? 'بنكي' : 'نقداً',
          projectId: transfer.projectId,
          projectName: transfer.projectName || getProjectName(transfer.projectId)
        });
      }
    });

    // ترتيب حسب التاريخ (الأحدث أولاً) مع التأكد من صحة التواريخ
    const finalTransactions = allTransactions
      .filter(t => t.date && !isNaN(new Date(t.date).getTime()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`✅ معاملات نهائية: ${finalTransactions.length} من أصل ${allTransactions.length}`);
    console.log('📊 تفاصيل المعاملات النهائية:', {
      تحويلات_عهدة: finalTransactions.filter(t => t.category === 'تحويل عهدة').length,
      ترحيلات_واردة: finalTransactions.filter(t => t.type === 'transfer_from_project').length,
      ترحيلات_صادرة: finalTransactions.filter(t => t.category === '🔄 ترحيل صادر إلى مشروع').length,
      أجور_عمال: finalTransactions.filter(t => t.category === 'أجور العمال').length,
      حوالات_عمال: finalTransactions.filter(t => t.category === 'حوالات العمال').length,
      مشتريات_مواد: finalTransactions.filter(t => t.category === 'مشتريات المواد').length,
      مشتريات_آجلة: finalTransactions.filter(t => t.type === 'deferred').length,
      مواصلات: finalTransactions.filter(t => t.category === 'مواصلات').length,
      نثريات: finalTransactions.filter(t => t.category === 'نثريات').length,
      إجمالي: finalTransactions.length
    });

    return finalTransactions;
  }, [selectedProject, isAllProjects, fundTransfers, incomingProjectTransfers, outgoingProjectTransfers, workerAttendance, materialPurchases, transportExpenses, miscExpenses, workerTransfers, workers, projects]);

  // تطبيق الفلاتر
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // فلترة حسب التاريخ
    if (dateRange.from) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= dateRange.from!;
      });
    }

    if (dateRange.to) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate <= dateRange.to!;
      });
    }

    return filtered;
  }, [transactions, filterType, searchTerm, dateRange]);

  // حساب الإجماليات مع تشخيص مفصل
    const totals = useMemo(() => {
    // استخدم transactions الكاملة (غير المفلترة بالبحث) لحساب الإجماليات للمشروع
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const transferFromProject = transactions.filter(t => t.type === 'transfer_from_project').reduce((sum, t) => sum + (t.amount || 0), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const deferredExpenses = transactions.filter(t => t.type === 'deferred').reduce((sum, t) => sum + (t.amount || 0), 0);

    // التحويلات الصادرة إلى مشاريع أخرى تُحسب كمصروفات
    const transferToProjectExpenses = transactions.filter(t => t.category === '🔄 ترحيل صادر إلى مشروع').reduce((sum, t) => sum + (t.amount || 0), 0);

    // المصروفات الأخرى (بدون التحويلات)
    const otherExpenses = expenses - transferToProjectExpenses;

    const totalIncome = income + transferFromProject;
    const totalExpenses = expenses + deferredExpenses;

    console.log('💰 تفاصيل الحسابات:', {
      income,
      transferFromProject,
      expenses,
      deferredExpenses,
      otherExpenses,
      transferToProjectExpenses,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses
    });

    return { 
      income,
      transferFromProject,
      otherExpenses,
      transferToProjectExpenses,
      deferredExpenses,
      totalIncome,
      expenses: totalExpenses,
      totalExpenses,
      balance: totalIncome - totalExpenses
    };
  }, [transactions]);

  const selectedProjectName = Array.isArray(projects) ? projects.find(p => p.id === selectedProject)?.name || '' : '';

  // --- Unified Components Logic ---

  const formatCurrencyUnified = (amount: number) => {
    return formatCurrency(amount);
  };

  const getProjectNameUnified = () => {
    return projects.find(p => p.id === selectedProject)?.name || 'المشروع';
  };

  const handleExportToExcel = async () => {
    if (isExporting || filteredTransactions.length === 0) return;
    setIsExporting(true);
    try {
      await exportTransactionsToExcel(
        filteredTransactions,
        { totalIncome: totals.totalIncome, totalExpenses: totals.totalExpenses, balance: totals.balance },
        formatCurrency,
        isAllProjects ? 'جميع المشاريع' : getProjectNameUnified()
      );
      toast({
        title: 'تم التصدير بنجاح',
        description: `تم تصدير ${filteredTransactions.length} عملية إلى ملف Excel`,
      });
    } catch (error) {
      console.error('خطأ في التصدير:', error);
      toast({
        title: 'خطأ في التصدير',
        description: 'حدث خطأ أثناء تصدير البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAction: ActionButton = {
    key: 'export',
    icon: isExporting ? Loader2 : FileSpreadsheet,
    label: 'تصدير Excel',
    onClick: handleExportToExcel,
    variant: 'outline',
    disabled: isExporting || filteredTransactions.length === 0,
    loading: isExporting,
    tooltip: 'تصدير سجل العمليات إلى ملف Excel'
  };

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalIncome',
          label: "التوريد",
          value: totals.totalIncome,
          icon: UnifiedTrendingUp,
          color: "green",
          formatter: formatCurrencyUnified
        },
        {
          key: 'totalExpenses',
          label: "المنصرف (نقدي)",
          value: totals.totalExpenses,
          icon: UnifiedTrendingDown,
          color: "red",
          formatter: formatCurrencyUnified
        },
        {
          key: 'balance',
          label: "الرصيد المتبقي",
          value: totals.balance,
          icon: UnifiedDollarSign,
          color: totals.balance >= 0 ? "blue" : "red",
          formatter: formatCurrencyUnified
        },
        {
          key: 'deferred',
          label: "المواد الآجلة",
          value: totals.deferredExpenses,
          icon: Clock,
          color: "orange",
          formatter: formatCurrencyUnified
        }
      ]
    }
  ], [totals]);

  const { data: transactionCategoriesResponse } = useQuery({
    queryKey: ["/api/autocomplete/transaction-categories"],
    queryFn: async () => apiRequest("/api/autocomplete/transaction-categories", "GET")
  });

  const transactionCategories = useMemo(() => {
    const base = [
      { value: 'all', label: 'جميع الأنواع' },
      { value: 'income', label: 'دخل' },
      { value: 'expense', label: 'مصروف' },
      { value: 'deferred', label: 'آجل' },
      { value: 'transfer_from_project', label: '🔄 ترحيل وارد من مشروع' }
    ];
    if (!transactionCategoriesResponse?.data) return base;
    const existingValues = new Set(base.map(b => b.value));
    const dynamic = transactionCategoriesResponse.data
      .map((cat: any) => ({ value: cat.value, label: cat.label }))
      .filter((cat: any) => !existingValues.has(cat.value));
    return [...base, ...dynamic];
  }, [transactionCategoriesResponse]);

  // تكوين الفلاتر
  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'نوع العملية',
      type: 'select',
      placeholder: 'جميع الأنواع',
      options: transactionCategories
    },
    {
      key: 'dateRange',
      label: 'الفترة الزمنية',
      type: 'date-range',
      placeholder: 'اختر الفترة'
    }
  ];

  const isLoading = fundTransfersLoading || incomingTransfersLoading || outgoingTransfersLoading || attendanceLoading || materialsLoading || workerTransfersLoading || transportExpensesLoading || miscExpensesLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col" dir="rtl">
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3 md:px-6 md:py-6 w-full space-y-4 md:space-y-8 pb-24 md:pb-20">
          {/* شريط الفلترة والإحصائيات الموحد */}
          <UnifiedFilterDashboard
            statsRows={statsRowsConfig}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="ابحث في الوصف أو الفئة..."
            showSearch={true}
            filters={filterConfigs}
            actions={[exportAction]}
            filterValues={{ type: filterType, dateRange: dateRange }}
            onFilterChange={(key, value) => {
              if (key === 'type') {
                setFilterType(value);
              } else if (key === 'dateRange') {
                setDateRange(value || {});
              }
            }}
            onReset={() => {
              setSearchTerm('');
              setFilterType('all');
              setDateRange({});
            }}
          />

          {/* عرض الأخطاء إن وجدت */}
          {(fundTransfersError || attendanceError || materialsError || workerTransfersError || incomingTransfersError || outgoingTransfersError) && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="text-red-800">
                  <h3 className="font-semibold">⚠️ تحذيرات في جلب البيانات:</h3>
                  {fundTransfersError && <p>• خطأ في جلب تحويلات العهدة</p>}
                  {attendanceError && <p>• خطأ في جلب حضور العمال</p>}
                  {materialsError && <p>• خطأ في جلب مشتريات المواد</p>}
                  {workerTransfersError && <p>• خطأ في جلب حوالات العمال</p>}
                  {incomingTransfersError && <p>• خطأ في جلب التحويلات الواردة</p>}
                  {outgoingTransfersError && <p>• خطأ في جلب التحويلات الصادرة</p>}
                  <p className="text-sm mt-2 text-red-600">يرجى التحقق من اتصالك بالإنترنت أو تسجيل الدخول مرة أخرى.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* قائمة العمليات */}
          <div className="space-y-4 md:space-y-6">
            {isLoading ? (
              <div className="space-y-4 md:space-y-6">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="bg-white dark:bg-slate-900">
                    <CardContent className="p-4 md:p-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <UnifiedFileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">لا توجد عمليات</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">لا توجد عمليات مالية لهذا المشروع</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <UnifiedCardGrid columns={2}>
                {filteredTransactions.map(transaction => {
                  const isIncome = transaction.type === 'income' || transaction.type === 'transfer_from_project';
                  const isDeferred = transaction.type === 'deferred';
                  const typeLabel = isIncome ? 'دخل' : isDeferred ? 'آجل' : 'مصروف';

                  // تحديد صفحة التحرير بناءً على نوع العملية
                  const getEditRoute = () => {
                    if (transaction.category === 'تحويل عهدة') return '/daily-expenses';
                    if (transaction.category === 'أجور العمال') return '/worker-attendance';
                    if (transaction.category === 'حوالات العمال') return '/worker-accounts';
                    if (transaction.category === 'مشتريات المواد' || transaction.type === 'deferred') return '/material-purchase';
                    if (transaction.category === 'مواصلات') return '/daily-expenses';
                    if (transaction.category === 'نثريات') return '/worker-misc-expenses';
                    if (transaction.category.includes('ترحيل')) return '/project-transfers';
                    return '/daily-expenses';
                  };

                  return (
                    <UnifiedCard
                      key={transaction.id}
                      title={formatCurrencyUnified(transaction.amount)}
                      subtitle={format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ar })}
                      titleIcon={isIncome ? ArrowUpRight : ArrowDownRight}
                      headerColor={isIncome ? "#10b981" : isDeferred ? "#f59e0b" : "#ef4444"}
                      badges={[
                        { 
                          label: transaction.category,
                          variant: isIncome ? 'default' : isDeferred ? 'warning' : 'destructive'
                        },
                        { 
                          label: typeLabel,
                          variant: isIncome ? 'success' : isDeferred ? 'warning' : 'destructive'
                        }
                      ]}
                      fields={[
                        {
                          label: "المشروع",
                          value: transaction.projectName || 'غير محدد',
                          icon: UnifiedBuilding2,
                          color: "info"
                        },
                        {
                          label: "النوع",
                          value: typeLabel,
                          icon: isIncome ? UnifiedTrendingUp : UnifiedTrendingDown,
                          color: isIncome ? "success" : isDeferred ? "warning" : "danger",
                          emphasis: true
                        },
                        {
                          label: "الفئة",
                          value: transaction.category,
                          icon: UnifiedFileText,
                          color: "default"
                        },
                        {
                          label: "المبلغ",
                          value: formatCurrencyUnified(transaction.amount),
                          icon: UnifiedDollarSign,
                          color: isIncome ? "success" : isDeferred ? "warning" : "danger",
                          emphasis: true
                        },
                        {
                          label: "التفاصيل",
                          value: transaction.description,
                          icon: UnifiedFileText,
                          color: "default"
                        }
                      ]}
                      actions={[
                        {
                          icon: Edit,
                          label: "تعديل",
                          onClick: () => {
                            const route = getEditRoute();
                            window.location.href = route;
                          },
                          color: "blue"
                        },
                        ...(isAdmin ? [{
                          icon: Trash2,
                          label: "حذف",
                          onClick: () => {
                            if (confirm(`هل أنت متأكد من حذف هذه العملية؟\n${transaction.category} - ${formatCurrencyUnified(transaction.amount)}`)) {
                              toast({
                                title: "حذف",
                                description: "جاري حذف العملية...",
                                variant: "destructive" as const
                              });
                              // هنا يمكن إضافة استدعاء API للحذف
                            }
                          },
                          color: "red" as const
                        }] : [])
                      ]}
                      compact
                    />
                  );
                })}
              </UnifiedCardGrid>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}