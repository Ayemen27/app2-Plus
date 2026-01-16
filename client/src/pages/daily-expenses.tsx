/**
 * الوصف: صفحة إدارة المصاريف اليومية والتحويلات المالية
 * المدخلات: تاريخ محدد ومعرف المشروع
 * المخرجات: عرض وإدارة جميع المصاريف والتحويلات اليومية
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - الصفحة الأساسية لإدارة المصاريف
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowRight, Save, Users, Car, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeftRight, RefreshCw, Wallet, Banknote, Package, Truck, Receipt, Building2, Send, TrendingDown, Calculator, FileSpreadsheet, ChevronRight, ChevronLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { UnifiedCard, UnifiedCardField } from "@/components/ui/unified-card";
import { DollarSign, Calendar, Building, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { WellSelector } from "@/components/well-selector";
import ExpenseSummary from "@/components/expense-summary";
import WorkerMiscExpenses from "./worker-misc-expenses";
import { getCurrentDate, formatCurrency, formatDate, cleanNumber } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { exportTransactionsToExcel } from "@/components/ui/export-transactions-excel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { queueForSync } from "@/offline/offline";
import type { 
  WorkerAttendance, 
  TransportationExpense, 
  FundTransfer,
  MaterialPurchase,
  WorkerTransfer,
  Worker,
  Project,
  InsertFundTransfer,
  InsertTransportationExpense,
  InsertDailyExpenseSummary,
  ProjectFundTransfer 
} from "@shared/schema";

// إزالة تعريف ErrorBoundary المحلي لتجنب التكرار - يتم استيراده من components/ErrorBoundary

function DailyExpensesContent() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects } = useSelectedProject();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [carriedForward, setCarriedForward] = useState<string>("0");
  const [showProjectTransfers, setShowProjectTransfers] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: undefined,
    type: 'all',
    transportCategory: 'all',
    miscCategory: 'all'
  });

  // دوال معالجة الفلاتر
  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'date') {
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
      } else {
        setSelectedDate(null);
      }
    } else if (key === 'dateRange') {
      setFilterValues(prev => ({ ...prev, [key]: value }));
      if (value?.from) {
        setSelectedDate(null);
      }
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({
      dateRange: undefined,
      type: 'all'
    });
    setSelectedDate(getCurrentDate());
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر وتعيين تاريخ اليوم",
    });
  }, [toast]);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isFundTransfersExpanded, setIsFundTransfersExpanded] = useState(false);
  const [isTransportationExpanded, setIsTransportationExpanded] = useState(false);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [isMaterialsExpanded, setIsMaterialsExpanded] = useState(false);
  const [isWorkerTransfersExpanded, setIsWorkerTransfersExpanded] = useState(false);
  const [isProjectTransfersExpanded, setIsProjectTransfersExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isMiscExpanded, setIsMiscExpanded] = useState(false);

  const { 
    data: workerMiscExpenses = [], 
    isLoading: miscLoading 
  } = useQuery({
    queryKey: ["/api/worker-misc-expenses", selectedProjectId, selectedDate],
    queryFn: async () => {
      if ((!selectedProjectId && !isAllProjects) || !selectedDate) return [];
      const projectId = isAllProjects ? "all" : selectedProjectId;
      const response = await apiRequest(`/api/worker-misc-expenses?projectId=${projectId}&date=${selectedDate}`, "GET");
      return Array.isArray(response) ? response : (response?.data || []);
    },
    enabled: (!!selectedProjectId || isAllProjects) && !!selectedDate
  });

  useEffect(() => {
    if (!miscLoading && workerMiscExpenses.length > 0) {
      setIsMiscExpanded(true);
    } else {
      setIsMiscExpanded(false);
    }
  }, [workerMiscExpenses.length, miscLoading, selectedDate]);

  // Fund transfer form
  const [fundAmount, setFundAmount] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [transferNumber, setTransferNumber] = useState<string>("");
  const [transferType, setTransferType] = useState<string>("");
  const [editingFundTransferId, setEditingFundTransferId] = useState<string | null>(null);
  const [fundTransferWellId, setFundTransferWellId] = useState<number | undefined>();
  const [transportDescription, setTransportDescription] = useState<string>("");
  const [transportAmount, setTransportAmount] = useState<string>("");
  const [transportNotes, setTransportNotes] = useState<string>("");
  const [editingTransportationId, setEditingTransportationId] = useState<string | null>(null);
  const [transportCategory, setTransportCategory] = useState<string>("worker_transport");

  // Worker attendance form
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [workerDays, setWorkerDays] = useState<string>("");
  const [workerAmount, setWorkerAmount] = useState<string>("");
  const [workerNotes, setWorkerNotes] = useState<string>("");
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editWorkerDays, setEditWorkerDays] = useState<string>("");
  const [editWorkerAmount, setEditWorkerAmount] = useState<string>("");
  const [editWorkerNotes, setEditWorkerNotes] = useState<string>("");

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const nextDate = () => {
    if (!selectedDate) return;
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const prevDate = () => {
    if (!selectedDate) return;
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };
  // دالة مساعدة لحفظ قيم الإكمال التلقائي
  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;

    try {
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
      console.log(`✅ تم حفظ قيمة الإكمال التلقائي: ${field} = ${value.trim()}`);
    } catch (error) {
      console.warn(`Failed to save autocomplete value for ${field}:`, error);
    }
  };

  // تعيين تاريخ اليوم تلقائياً عند فتح الصفحة
  useEffect(() => {
    setSelectedDate(getCurrentDate());
  }, []);

  // تعيين إجراء الزر العائم لحفظ المصاريف
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة لحفظ جميع قيم الإكمال التلقائي للحولة
  const saveAllFundTransferAutocompleteValues = async () => {
    const promises = [];

    if (senderName && senderName.trim().length >= 2) {
      promises.push(saveAutocompleteValue('senderNames', senderName));
    }

    if (transferNumber && transferNumber.trim().length >= 1) {
      promises.push(saveAutocompleteValue('transferNumbers', transferNumber));
    }

    if (transferType && transferType.trim().length >= 2) {
      promises.push(saveAutocompleteValue('transferTypes', transferType));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };

  const queryOptions = {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData: any) => previousData,
  };

  const { data: workers = [], error: workersError } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/workers", "GET");
        // ... (rest of the logic remains same)
        return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      } catch (error) {
        return [];
      }
    },
    ...queryOptions
  });

  const { data: projects = [], error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects", "GET");
        return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      } catch (error) {
        return [];
      }
    },
    ...queryOptions
  });

  // سيتم تعريف المتغيرات الآمنة بعد جلب البيانات من dailyExpensesData

  const addWorkerAttendanceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/worker-attendance", "POST", data),
    onSuccess: () => {
      refreshAllData();
      setWorkerDays("");
      setWorkerAmount("");
      setWorkerNotes("");
      setSelectedWorkerId("");
      toast({ title: "تم إضافة الحضور", description: "تم تسجيل أجر العامل بنجاح" });
    },
    onError: async (error: any) => {
      // ✅ حفظ محلي في قائمة الانتظار عند الفشل
      try {
        const attendanceData = {
          workerId: selectedWorkerId,
          days: workerDays ? parseFloat(workerDays) : 0,
          amount: workerAmount ? parseFloat(workerAmount) : 0,
          notes: workerNotes,
          selectedDate,
          projectId: selectedProjectId
        };
        await queueForSync('create', '/api/worker-attendance', attendanceData);
        toast({
          title: "تم الحفظ محليًا",
          description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال",
          variant: "default",
        });
      } catch (queueError) {
        toast({ 
          title: "خطأ", 
          description: error?.message || "حدث خطأ أثناء إضافة الحضور", 
          variant: "destructive" 
        });
      }
    }
  });

  const updateWorkerAttendanceMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/worker-attendance/${data.id}`, "PATCH", data),
    onSuccess: () => {
      refreshAllData();
      setEditingAttendanceId(null);
      setEditWorkerDays("");
      setEditWorkerAmount("");
      setEditWorkerNotes("");
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الحضور بنجاح" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ", 
        description: error?.message || "حدث خطأ أثناء تحديث الحضور", 
        variant: "destructive" 
      });
    }
  });

  const handleQuickAddAttendance = () => {
    if (!selectedProjectId || selectedProjectId === "all" || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة حضور عند اختيار 'جميع المشاريع'. يرجى اختيار مشروع محدد أولاً.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedWorkerId || (!workerDays && !workerAmount)) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار العامل وتحديد الأيام أو المبلغ على الأقل",
        variant: "destructive",
      });
      return;
    }

    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على بيانات العامل",
        variant: "destructive",
      });
      return;
    }

    const dailyWageNum = parseFloat(String(worker.dailyWage || "0"));
    const workDaysNum = parseFloat(workerDays || "0");
    const paidAmountNum = parseFloat(workerAmount || "0");
    const actualWage = dailyWageNum * workDaysNum;

    const attendanceData = {
      workerId: selectedWorkerId,
      projectId: selectedProjectId,
      attendanceDate: selectedDate || getCurrentDate(),
      workDays: workDaysNum,
      dailyWage: dailyWageNum.toString(),
      actualWage: actualWage.toString(),
      totalPay: actualWage.toString(),
      paidAmount: workerAmount || "0",
      remainingAmount: (actualWage - paidAmountNum).toString(),
      workDescription: workerNotes || (workDaysNum > 0 ? "أيام عمل" : "مصروف بدون عمل"),
      notes: workerNotes,
      wellId: selectedWellId || null,
      paymentType: paidAmountNum > 0 ? (paidAmountNum >= actualWage && actualWage > 0 ? "full" : "partial") : "credit",
    };

    console.log('📝 [DailyExpenses] إرسال بيانات الحضور:', attendanceData);
    addWorkerAttendanceMutation.mutate(attendanceData);
  };

  // جلب معلومات المواد مع معالجة آمنة للأخطاء
  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/materials", "GET");
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.warn('⚠️ لم يتمكن من جلب المواد:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 دقيقة
    gcTime: 1000 * 60 * 60, // ساعة كاملة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // سيتم تعريف المتغيرات الآمنة بعد جلب البيانات من dailyExpensesData

  // جلب عمليات ترحيل الأموال بين المشاريع مع أسماء المشاريع - استعلام منفصل للصفحة اليومية
  const { data: projectTransfers = [], refetch: refetchProjectTransfers } = useQuery<(ProjectFundTransfer & { fromProjectName?: string; toProjectName?: string })[]>({
    queryKey: ["/api/daily-project-transfers", isAllProjects ? "all" : selectedProjectId, selectedDate],
    queryFn: async () => {
      try {
        const projectId = isAllProjects ? "all" : selectedProjectId;
        const response = await apiRequest(`/api/daily-project-transfers?projectId=${projectId}&date=${selectedDate || ""}`, "GET");
        console.log('📊 [ProjectTransfers] استجابة API للصفحة اليومية:', response);

        let transferData = [];
        if (response && response.data && Array.isArray(response.data)) {
          transferData = response.data;
        } else if (Array.isArray(response)) {
          transferData = response;
        }

        if (!Array.isArray(transferData)) return [];

        console.log(`✅ [ProjectTransfers] تم جلب ${transferData.length} ترحيل لليوم ${selectedDate} في الصفحة اليومية`);
        
        return transferData;
      } catch (error) {
        console.error("Error fetching daily project transfers:", error);
        return [];
      }
    },
    enabled: !!selectedProjectId && !!selectedDate && showProjectTransfers,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: undefined,
  });

  // معالجة آمنة لترحيل المشاريع
  const safeProjectTransfers = Array.isArray(projectTransfers) ? projectTransfers : [];

  // استخدام useFinancialSummary الموحد لتحسين الأداء وتجنب اختلاف البيانات
  const { 
    summary: financialSummary, 
    allProjects,
    totals,
    isLoading: summaryLoading, 
    refetch: refetchFinancial 
  } = useFinancialSummary({
    projectId: selectedProjectId === 'all' ? 'all' : selectedProjectId,
    date: selectedDate && selectedDate !== "null" ? selectedDate : undefined,
    dateFrom: filterValues.dateRange?.from ? formatDate(filterValues.dateRange.from) : undefined,
    dateTo: filterValues.dateRange?.to ? formatDate(filterValues.dateRange.to) : undefined,
    enabled: isAllProjects || !!selectedProjectId
  });

  const totalsValue = useMemo(() => {
    if (isAllProjects) {
      return totals;
    }
    
    // حساب totals للمشروع الفردي بناءً على financialSummary
    return {
      totalIncome: financialSummary?.income?.totalIncome || 0,
      totalCashExpenses: financialSummary?.expenses?.totalCashExpenses || 0,
      totalAllExpenses: financialSummary?.expenses?.totalAllExpenses || 0,
      totalExpenses: financialSummary?.expenses?.totalAllExpenses || 0,
      cashBalance: financialSummary?.cashBalance || 0,
      totalBalance: financialSummary?.totalBalance || 0,
      currentBalance: financialSummary?.totalBalance || 0,
      totalWorkers: financialSummary?.workers?.totalWorkers || 0,
      activeWorkers: financialSummary?.workers?.activeWorkers || 0,
      materialExpensesCredit: financialSummary?.expenses?.materialExpensesCredit || 0,
      carriedForwardBalance: financialSummary?.income?.carriedForwardBalance || 0,
      
      // الحقول الإضافية التي يحتاجها المكون
      totalWorkerWages: financialSummary?.expenses?.workerWages || 0,
      totalTransportation: financialSummary?.expenses?.transportExpenses || 0,
      totalMaterialCosts: financialSummary?.expenses?.materialExpenses || 0,
      totalWorkerTransfers: financialSummary?.expenses?.workerTransfers || 0,
      totalMiscExpenses: financialSummary?.expenses?.miscExpenses || 0,
      totalFundTransfers: financialSummary?.income?.fundTransfers || 0,
      incomingProjectTransfers: financialSummary?.income?.incomingProjectTransfers || 0,
      outgoingProjectTransfers: financialSummary?.expenses?.outgoingProjectTransfers || 0,
      remainingBalance: financialSummary?.totalBalance || 0
    };
  }, [isAllProjects, totals, financialSummary]);

  const displayIncome = useMemo(() => {
    return totalsValue.totalIncome;
  }, [totalsValue]);

  const displayAvailableBalance = useMemo(() => {
    // المتبقي من سابق يجمع إذا كان موجباً ويطرح إذا كان سالباً
    return totalsValue.totalIncome + (parseFloat(String(totalsValue.carriedForwardBalance || 0)));
  }, [totalsValue]);

  const displayExpenses = useMemo(() => {
    return totalsValue.totalCashExpenses;
  }, [totalsValue]);

  const displayBalance = useMemo(() => {
    // الرصيد المتبقي = (الدخل المتاح) - المصروفات النقدية
    return displayAvailableBalance - totalsValue.totalCashExpenses;
  }, [displayAvailableBalance, totalsValue.totalCashExpenses]);

  const { 
    data: dailyExpensesData, 
    isLoading: dailyExpensesLoading, 
    error: dailyExpensesError,
    refetch: refetchDailyExpenses 
  } = useQuery<any>({
    queryKey: ["/api/projects", isAllProjects ? "all-projects" : selectedProjectId, selectedDate ? "daily-expenses" : "all-expenses", selectedDate],
    queryFn: async () => {
      try {
        if (isAllProjects) {
          // جلب بيانات الإجمالي لجميع المشاريع بما في ذلك الرصيد المرحل
          const totalUrl = selectedDate && selectedDate !== "null"
            ? `/api/projects/all-projects-total?date=${selectedDate}`
            : `/api/projects/all-projects-total`;
            
          const totalResponse = await apiRequest(totalUrl, "GET");
          
          const url = selectedDate && selectedDate !== "null"
            ? `/api/projects/all-projects-expenses?date=${selectedDate}`
            : `/api/projects/all-projects-expenses`;
          const response = await apiRequest(url, "GET");
          
          if (response && response.success && response.data) {
            // دمج بيانات الرصيد المرحل من الاستجابة الجديدة
            if (totalResponse && totalResponse.success && totalResponse.data) {
              return {
                ...response.data,
                carriedForwardBalance: totalResponse.data.carriedForwardBalance
              };
            }
            return response.data;
          }
          return null;
        }

        if (!selectedProjectId) {
          return null;
        }

        if (!selectedDate || selectedDate === "null") {
          const response = await apiRequest(`/api/projects/${selectedProjectId}/all-expenses`, "GET");
          if (response && response.success && response.data) {
            return response.data;
          }
          return null;
        }

        const response = await apiRequest(`/api/projects/${selectedProjectId}/daily-expenses/${selectedDate}`, "GET");
        if (response && response.success && response.data) {
          return response.data;
        }

        return null;
      } catch (error) {
        console.error("خطأ في جلب المصروفات:", error);
        throw error;
      }
    },
    enabled: isAllProjects || !!selectedProjectId,
    retry: 1,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData: any) => previousData,
  });

  const carriedForwardDisplay = useMemo(() => {
    // الأولوية لبيانات dailyExpensesData إذا كانت متوفرة (لجميع المشاريع)
    if (dailyExpensesData?.carriedForwardBalance !== undefined) {
      return dailyExpensesData.carriedForwardBalance;
    }
    // وإلا نستخدم القيمة من totalsValue (للمشروع الفردي)
    return totalsValue.carriedForwardBalance || 0;
  }, [totalsValue.carriedForwardBalance, dailyExpensesData]);

  const totalRemainingWithCarried = useMemo(() => {
    const carried = dailyExpensesData?.carriedForwardBalance !== undefined 
      ? dailyExpensesData.carriedForwardBalance 
      : (totalsValue.carriedForwardBalance || 0);
    return (totalsValue.totalIncome + carried) - totalsValue.totalCashExpenses;
  }, [totalsValue.totalIncome, totalsValue.totalCashExpenses, totalsValue.carriedForwardBalance, dailyExpensesData]);

  // إعداد البيانات لملخص المصاريف
  const summaryData = useMemo(() => ({
    totalIncome: totalsValue.totalIncome,
    totalExpenses: totalsValue.totalCashExpenses,
    remainingBalance: totalRemainingWithCarried,
    materialExpensesCredit: totalsValue.materialExpensesCredit,
    carriedForward: carriedForwardDisplay,
    details: {
      workerWages: totalsValue.totalWorkerWages,
      materialCosts: totalsValue.totalMaterialCosts,
      transportation: totalsValue.totalTransportation,
      miscExpenses: totalsValue.totalMiscExpenses,
      workerTransfers: totalsValue.totalWorkerTransfers,
      outgoingProjectTransfers: totalsValue.outgoingProjectTransfers
    }
  }), [totalsValue, totalRemainingWithCarried, carriedForwardDisplay]);

  // تحديث البيانات عند الحفظ أو الحذف
  const refreshAllData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    refetchDailyExpenses();
    refetchProjectTransfers();
    refetchFinancial();
  }, [queryClient, refetchDailyExpenses, refetchProjectTransfers, refetchFinancial]);

  // استخراج البيانات من الاستجابة الموحدة
  const todayFundTransfers = dailyExpensesData?.fundTransfers || [];
  const todayWorkerAttendance = dailyExpensesData?.workerAttendance || [];
  const todayTransportation = dailyExpensesData?.transportationExpenses || [];
  const todayMaterialPurchases = dailyExpensesData?.materialPurchases || [];
  const todayWorkerTransfers = dailyExpensesData?.workerTransfers || [];
  const todayMiscExpenses = dailyExpensesData?.miscExpenses || [];

  // معالجة آمنة للبيانات - التأكد من أن البيانات مصفوفات
  const safeAttendance = Array.isArray(todayWorkerAttendance) ? todayWorkerAttendance : [];
  const safeTransportation = Array.isArray(todayTransportation) ? todayTransportation : [];
  const safeMaterialPurchases = Array.isArray(todayMaterialPurchases) ? todayMaterialPurchases : [];
  const safeWorkerTransfers = Array.isArray(todayWorkerTransfers) ? todayWorkerTransfers : [];
  const safeMiscExpenses = Array.isArray(todayMiscExpenses) ? todayMiscExpenses : [];
  const safeFundTransfers = Array.isArray(todayFundTransfers) ? todayFundTransfers : [];

  // تصفير البئر عند تغيير المشروع
  useEffect(() => {
    setSelectedWellId(undefined);
    setFundTransferWellId(undefined);
  }, [selectedProjectId]);

  // تحديث حالة توسع الفئات عند تغير البيانات
  useEffect(() => {
    // نجعلها مطوية تلقائياً (false) عندما لا توجد بيانات، ومفتوحة (true) عندما توجد بيانات
    setIsFundTransfersExpanded(safeFundTransfers.length > 0);
    setIsTransportationExpanded(safeTransportation.length > 0);
    setIsAttendanceExpanded(safeAttendance.length > 0);
    setIsMaterialsExpanded(safeMaterialPurchases.length > 0);
    setIsWorkerTransfersExpanded(safeWorkerTransfers.length > 0);
    setIsProjectTransfersExpanded(safeProjectTransfers.length > 0);
    setIsMiscExpanded(safeMiscExpenses.length > 0);
  }, [
    safeFundTransfers.length, 
    safeTransportation.length, 
    safeAttendance.length,
    safeMaterialPurchases.length,
    safeWorkerTransfers.length,
    safeProjectTransfers.length,
    safeMiscExpenses.length
  ]);

  // فلترة البيانات حسب نص البحث
  const filteredFundTransfers = useMemo(() => {
    if (!searchValue.trim()) return safeFundTransfers;
    const searchLower = searchValue.toLowerCase().trim();
    return safeFundTransfers.filter((transfer: any) => 
      transfer.senderName?.toLowerCase().includes(searchLower) ||
      transfer.transferType?.toLowerCase().includes(searchLower) ||
      transfer.transferNumber?.toLowerCase().includes(searchLower) ||
      transfer.amount?.toString().includes(searchLower)
    );
  }, [safeFundTransfers, searchValue]);

  const filteredAttendance = useMemo(() => {
    if (!searchValue.trim()) return safeAttendance;
    const searchLower = searchValue.toLowerCase().trim();
    return safeAttendance.filter((record: any) => {
      const worker = workers.find((w: any) => w.id === record.workerId);
      return (
        worker?.name?.toLowerCase().includes(searchLower) ||
        record.workDescription?.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower)
      );
    });
  }, [safeAttendance, workers, searchValue]);

  const filteredTransportation = useMemo(() => {
    if (!searchValue.trim()) return safeTransportation;
    const searchLower = searchValue.toLowerCase().trim();
    return safeTransportation.filter((expense: any) => 
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.notes?.toLowerCase().includes(searchLower) ||
      expense.amount?.toString().includes(searchLower)
    );
  }, [safeTransportation, searchValue]);

  const filteredMaterialPurchases = useMemo(() => {
    if (!searchValue.trim()) return safeMaterialPurchases;
    const searchLower = searchValue.toLowerCase().trim();
    return safeMaterialPurchases.filter((purchase: any) => {
      const material = materials.find((m: any) => m.id === purchase.materialId);
      return (
        material?.name?.toLowerCase().includes(searchLower) ||
        purchase.supplier?.toLowerCase().includes(searchLower) ||
        purchase.notes?.toLowerCase().includes(searchLower) ||
        purchase.totalAmount?.toString().includes(searchLower)
      );
    });
  }, [safeMaterialPurchases, materials, searchValue]);

  const filteredWorkerTransfers = useMemo(() => {
    if (!searchValue.trim()) return safeWorkerTransfers;
    const searchLower = searchValue.toLowerCase().trim();
    return safeWorkerTransfers.filter((transfer: any) => {
      const worker = workers.find((w: any) => w.id === transfer.workerId);
      return (
        worker?.name?.toLowerCase().includes(searchLower) ||
        transfer.notes?.toLowerCase().includes(searchLower) ||
        transfer.amount?.toString().includes(searchLower)
      );
    });
  }, [safeWorkerTransfers, workers, searchValue]);

  const filteredMiscExpenses = useMemo(() => {
    if (!searchValue.trim()) return safeMiscExpenses;
    const searchLower = searchValue.toLowerCase().trim();
    return safeMiscExpenses.filter((expense: any) => 
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.notes?.toLowerCase().includes(searchLower) ||
      expense.amount?.toString().includes(searchLower)
    );
  }, [safeMiscExpenses, searchValue]);

  // جلب الرصيد المتبقي من اليوم السابق - فقط للمشاريع المحددة
  const { data: previousBalance } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "previous-balance", selectedDate],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/previous-balance/${selectedDate}`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && response.data.balance !== undefined) {
          return response.data.balance || "0";
        }
        return response?.balance || "0";
      } catch (error) {
        console.error("Error fetching previous balance:", error);
        return "0";
      }
    },
    enabled: !!selectedProjectId && !!selectedDate && !isAllProjects,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    placeholderData: undefined,
  });

  // تحديث المبلغ المرحل تلقائياً عند جلب الرصيد السابق
  useEffect(() => {
    if (previousBalance !== null && previousBalance !== undefined) {
      console.log('🔄 تحديث carriedForward:', { previousBalance, type: typeof previousBalance });
      setCarriedForward(previousBalance);
    }
  }, [previousBalance]);

  // ⚡ تحديث ذكي عند تغيير التاريخ أو المشروع
  useEffect(() => {
    // فقط إبطال الكاش دون إعادة جلب فورية - سيتم الجلب عند الحاجة
    if (selectedProjectId || isAllProjects) {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects"],
        refetchType: 'none' // لا تعيد الجلب تلقائياً
      });
    }
  }, [selectedProjectId, selectedDate, isAllProjects, queryClient]);

  // تهيئة قيم الإكمال التلقائي الافتراضية لنوع التحويل
  useEffect(() => {
    const initializeDefaultTransferTypes = async () => {
      const defaultTypes = ['حولة بنكية', 'تسليم يدوي', 'صراف آلي', 'تحويل داخلي', 'شيك', 'نقدية'];

      for (const type of defaultTypes) {
        try {
          await saveAutocompleteValue('transferTypes', type);
        } catch (error) {
          // تجاهل الأخطاء بهدوء
          console.log(`Type ${type} initialization skipped:`, error);
        }
      }
    };

    // تهيئة القيم مرة واحدة فقط عند تحميل المكون
    initializeDefaultTransferTypes();
  }, []);

  const addFundTransferMutation = useMutation({
    mutationFn: async (data: InsertFundTransfer) => {
      await saveAllFundTransferAutocompleteValues();
      // أضف wellId إلى البيانات
      const dataWithWell = { ...data, wellId: fundTransferWellId || null };
      return apiRequest("/api/fund-transfers", "POST", dataWithWell);
    },
    onSuccess: async (newTransfer) => {
      refreshAllData();
      
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم إضافة العهدة",
        description: "تم إضافة تحويل العهدة بنجاح",
      });

      setFundAmount("");
      setSenderName("");
      setTransferNumber("");
      setTransferType("");
    },
    onError: async (error: any) => {
      // حفظ جميع قيم الإكمال التلقائي حتى في حالة الخطأ
      await saveAllFundTransferAutocompleteValues();

      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      console.error("خطأ في إضافة الحولة:", error);

      let errorMessage = "حدث خطأ أثناء إضافة الحولة";

      // معالجة أنواع مختلفة من الأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // ✅ حفظ محلي في قائمة الانتظار عند الفشل
      try {
        const dataWithWell = { 
          fundAmount: fundAmount ? parseFloat(fundAmount) : 0, 
          senderName,
          transferNumber,
          transferType,
          selectedDate,
          projectId: selectedProjectId,
          wellId: fundTransferWellId || null 
        };
        await queueForSync('create', '/api/fund-transfers', dataWithWell);
        toast({
          title: "تم الحفظ محليًا",
          description: `${errorMessage} - سيتم المزامنة عند الاتصال`,
          variant: "default",
        });
      } catch (queueError) {
        toast({
          title: "فشل في إضافة الحولة",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const addTransportationMutation = useMutation({
    mutationFn: async (data: InsertTransportationExpense) => {
      await Promise.all([
        saveAutocompleteValue('transportDescriptions', transportDescription),
        saveAutocompleteValue('notes', transportNotes)
      ]);
      // أضف wellId إلى البيانات
      const dataWithWell = { ...data, wellId: selectedWellId || null };
      return apiRequest("/api/transportation-expenses", "POST", dataWithWell);
    },
    onSuccess: async (newExpense) => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم إضافة المواصلات",
        description: "تم إضافة مصروف المواصلات بنجاح",
      });

      setTransportDescription("");
      setTransportAmount("");
      setTransportNotes("");
    },
    onError: async (error) => {
      await Promise.all([
        saveAutocompleteValue('transportDescriptions', transportDescription),
        saveAutocompleteValue('notes', transportNotes)
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      // ✅ حفظ محلي في قائمة الانتظار عند الفشل
      try {
        const dataWithWell = {
          description: transportDescription,
          amount: transportAmount ? parseFloat(transportAmount) : 0,
          notes: transportNotes,
          selectedDate,
          projectId: selectedProjectId,
          wellId: selectedWellId || null
        };
        await queueForSync('create', '/api/transportation-expenses', dataWithWell);
        toast({
          title: "تم الحفظ محليًا",
          description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال",
          variant: "default",
        });
      } catch (queueError) {
        toast({
          title: "خطأ في إضافة المواصلات",
          description: error?.message || "حدث خطأ أثناء إضافة مصروف المواصلات",
          variant: "destructive",
        });
      }
    },
  });

  const saveDailySummaryMutation = useMutation({
    mutationFn: (data: InsertDailyExpenseSummary) => apiRequest("/api/daily-expense-summaries", "POST", data),
    onSuccess: () => {
      refreshAllData();
      toast({
        title: "تم الحفظ",
        description: "تم حفظ ملخص المصروفات اليومية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الملخص",
        variant: "destructive",
      });
    },
  });

  const deleteFundTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/fund-transfers/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["/api/projects", selectedProjectId, "daily-expenses", selectedDate], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          fundTransfers: oldData.fundTransfers?.filter((transfer: any) => transfer.id !== id) || []
        };
      });
      
      refreshAllData();
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف العهدة بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف الحولة:", error);
      let errorMessage = "حدث خطأ أثناء حذف الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({ 
        title: "فشل في حذف الحولة", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteTransportationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/transportation-expenses/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["/api/projects", selectedProjectId, "daily-expenses", selectedDate], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          transportationExpenses: oldData.transportationExpenses?.filter((expense: any) => expense.id !== id) || []
        };
      });
      
      refreshAllData();
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف مصروف المواصلات بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف مصروف المواصلات:", error);

      let errorMessage = "حدث خطأ أثناء حذف مصروف المواصلات";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف مصروف المواصلات", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteMaterialPurchaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-purchases/${id}`, "DELETE"),
    onMutate: () => {
      // حفظ القيم الحالية لتجنب Race Condition
      return {
        projectId: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { projectId, date } = context || { projectId: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(["/api/projects", projectId, "daily-expenses", date], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          materialPurchases: oldData.materialPurchases?.filter((purchase: any) => purchase.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "daily-expenses", date] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "material-purchases"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "previous-balance"] 
      });
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف شراء المواد بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف شراء المواد:", error);

      let errorMessage = "حدث خطأ أثناء حذف شراء المواد";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف شراء المواد", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteProjectTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/project-fund-transfers/${id}`, "DELETE"),
    onSuccess: () => {
      refreshAllData();
      refetchProjectTransfers();
      toast({ title: "تم الحذف", description: "تم حذف ترحيل الأموال بنجاح" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ", 
        description: error?.message || "حدث خطأ أثناء حذف الترحيل", 
        variant: "destructive" 
      });
    }
  });

  const [editingProjectTransferId, setEditingProjectTransferId] = useState<string | null>(null);

  const handleEditProjectTransfer = (transfer: any) => {
    setLocation(`/project-transfers?edit=${transfer.id}`);
  };

  const deleteWorkerAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onMutate: () => {
      // حفظ القيم الحالية لتجنب Race Condition
      return {
        projectId: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { projectId, date } = context || { projectId: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(["/api/projects", projectId, "daily-expenses", date], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          workerAttendance: oldData.workerAttendance?.filter((attendance: any) => attendance.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "daily-expenses", date] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "attendance"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "previous-balance"] 
      });
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف حضور العامل بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف حضور العامل:", error);

      let errorMessage = "حدث خطأ أثناء حذف حضور العامل";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف حضور العامل", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteWorkerTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-transfers/${id}`, "DELETE"),
    onMutate: () => {
      // حفظ القيم الحالية لتجنب Race Condition
      return {
        projectId: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { projectId, date } = context || { projectId: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(["/api/projects", projectId, "daily-expenses", date], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          workerTransfers: oldData.workerTransfers?.filter((transfer: any) => transfer.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "daily-expenses", date] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "previous-balance"] 
      });
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف حوالة العامل بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف حوالة العامل:", error);

      let errorMessage = "حدث خطأ أثناء حذف حوالة العامل";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف حوالة العامل", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  // Fund Transfer Update Mutation
  const updateFundTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/fund-transfers/${id}`, "PATCH", data),
    onSuccess: async (updatedTransfer, { id }) => {
      // تحديث daily-expenses query حيث تأتي بيانات fund transfers
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "daily-expenses", selectedDate] });
      // تحديث previous-balance للأيام التالية لأن التعديل يؤثر على الرصيد
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "previous-balance"] });

      // حفظ قيم الإكمال التلقائي
      if (senderName) await saveAutocompleteValue('senderNames', senderName);
      if (transferNumber) await saveAutocompleteValue('transferNumbers', transferNumber);

      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      resetFundTransferForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث العهدة بنجاح",
      });
    },
    onError: (error: any) => {
      console.error("خطأ في تحديث الحولة:", error);

      let errorMessage = "حدث خطأ أثناء تحديث الحولة";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "فشل في تحديث الحولة",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const resetFundTransferForm = () => {
    setFundAmount("");
    setSenderName("");
    setTransferNumber("");
    setTransferType("");
    setEditingFundTransferId(null);
  };

  const handleEditFundTransfer = (transfer: FundTransfer) => {
    setFundAmount(transfer.amount);
    setSenderName(transfer.senderName || "");
    setTransferNumber(transfer.transferNumber || "");
    setTransferType(transfer.transferType);
    setEditingFundTransferId(transfer.id);
  };

  const handleAddFundTransfer = () => {
    // التحقق من البيانات المطلوبة
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة تحويل عهدة على جميع المشاريع. يرجى اختيار مشروع محدد من الشريط العلوي أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!fundAmount || fundAmount.trim() === "" || parseFloat(fundAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!transferType || transferType.trim() === "") {
      toast({
        title: "خطأ",
        description: "يرجى اختيار نوع التحويل",
        variant: "destructive",
      });
      return;
    }

    const fundTransferData = {
      projectId: selectedProjectId,
      amount: fundAmount.toString(),
      senderName: senderName.trim() || "غير محدد",
      transferNumber: transferNumber.trim() || null,
      transferType: transferType,
      transferDate: new Date(selectedDate + 'T12:00:00.000Z'),
      notes: "",
      wellId: fundTransferWellId || null,
    };

    if (editingFundTransferId) {
      updateFundTransferMutation.mutate({
        id: editingFundTransferId,
        data: fundTransferData
      });
    } else {
      addFundTransferMutation.mutate(fundTransferData);
    }
  };

  // Transportation Update Mutation
  const updateTransportationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/transportation-expenses/${id}`, "PATCH", data),
    onSuccess: async (updatedExpense, { id }) => {
      // تحديث daily-expenses query حيث تأتي بيانات transportation expenses
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "daily-expenses", selectedDate] });
      // تحديث previous-balance للأيام التالية لأن التعديل يؤثر على الرصيد
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "previous-balance"] });

      // حفظ قيم الإكمال التلقائي
      if (transportDescription) await saveAutocompleteValue('transportDescriptions', transportDescription);
      if (transportNotes) await saveAutocompleteValue('notes', transportNotes);

      resetTransportationForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث مصروف المواصلات بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المصروف",
        variant: "destructive",
      });
    }
  });

  const resetTransportationForm = () => {
    setTransportDescription("");
    setTransportAmount("");
    setTransportNotes("");
    setTransportCategory("worker_transport");
    setEditingTransportationId(null);
  };

  const handleEditTransportation = (expense: TransportationExpense) => {
    setTransportDescription(expense.description);
    setTransportAmount(expense.amount);
    setTransportNotes(expense.notes || "");
    setTransportCategory(expense.category || "worker_transport");
    setEditingTransportationId(expense.id);
  };

  const handleAddTransportation = () => {
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة مصروف مواصلات على جميع المشاريع. يرجى اختيار مشروع محدد من الشريط العلوي أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!transportDescription || !transportAmount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const transportData = {
      projectId: selectedProjectId,
      description: transportDescription,
      amount: transportAmount,
      date: selectedDate || new Date().toISOString().split('T')[0],
      category: transportCategory,
      notes: transportNotes,
      wellId: selectedWellId || null,
    };

    if (editingTransportationId) {
      updateTransportationMutation.mutate({
        id: editingTransportationId,
        data: transportData
      });
    } else {
      addTransportationMutation.mutate(transportData);
    }
  };

  const calculateTotals = () => {
    try {
      // إنشاء متغيرات آمنة لجميع البيانات مع فحص إضافي
      const safeAttendance = Array.isArray(todayWorkerAttendance) ? 
        todayWorkerAttendance.filter(item => item && typeof item === 'object') : [];
      const safeTransportation = Array.isArray(todayTransportation) ? 
        todayTransportation.filter(item => item && typeof item === 'object') : [];
      const safeMaterialPurchases = Array.isArray(todayMaterialPurchases) ? 
        todayMaterialPurchases.filter(item => item && typeof item === 'object') : [];
      const safeWorkerTransfers = Array.isArray(todayWorkerTransfers) ? 
        todayWorkerTransfers.filter(item => item && typeof item === 'object') : [];
      const safeMiscExpenses = Array.isArray(todayMiscExpenses) ? 
        todayMiscExpenses.filter(item => item && typeof item === 'object') : [];
      const safeFundTransfers = Array.isArray(todayFundTransfers) ? 
        todayFundTransfers.filter(item => item && typeof item === 'object') : [];
      const safeProjectTransfers = Array.isArray(projectTransfers) ? 
        projectTransfers.filter(item => item && typeof item === 'object') : [];

      // تسجيل مبسط للحسابات المالية
      if (process.env.NODE_ENV === 'development') {
        console.log('🧮 [DailyExpenses] إجمالي البيانات المنظفة:', {
          حضور: safeAttendance.length,
          نقل: safeTransportation.length,
          مشتريات: safeMaterialPurchases.length,
          تحويلات_عمال: safeWorkerTransfers.length,
          مصاريف_أخرى: safeMiscExpenses.length,
          تحويلات_أموال: safeFundTransfers.length,
          تحويلات_مشاريع: safeProjectTransfers.length
        });
      }

      // استخدام دالة cleanNumber المحسنة
      const totalWorkerWages = safeAttendance.reduce(
        (sum, attendance) => {
          const amount = cleanNumber(attendance.paidAmount);
          return sum + amount;
        }, 
        0
      );

      const totalTransportation = safeTransportation.reduce(
        (sum, expense) => {
          const amount = cleanNumber(expense.amount);
          return sum + amount;
        }, 
        0
      );

      // حساب المشتريات النقدية فقط - استخدام البيانات الآمنة
      const totalMaterialCosts = safeMaterialPurchases
        .filter(purchase => purchase.purchaseType === "نقد")
        .reduce((sum, purchase) => {
          const amount = cleanNumber(purchase.totalAmount);
          return sum + amount;
        }, 0);

      const totalWorkerTransfers = safeWorkerTransfers.reduce(
        (sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      const totalMiscExpenses = safeMiscExpenses.reduce(
        (sum, expense) => {
          const amount = cleanNumber(expense.amount);
          return sum + amount;
        }, 0);

      const totalFundTransfers = safeFundTransfers.reduce(
        (sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      // حساب الأموال الواردة والصادرة من ترحيل المشاريع
      const incomingProjectTransfers = safeProjectTransfers
        .filter(transfer => transfer.toProjectId === selectedProjectId)
        .reduce((sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      const outgoingProjectTransfers = safeProjectTransfers
        .filter(transfer => transfer.fromProjectId === selectedProjectId)
        .reduce((sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      // تطبيق المنطق الصحيح من النسخة الاحتياطية - استخدام cleanNumber للاتساق
      const carriedAmount = cleanNumber(carriedForward);
      
      console.log('🧮 [calculateTotals] تفاصيل الحساب:', {
        carriedForward,
        carriedAmount,
        totalFundTransfers,
        incomingProjectTransfers,
        calculation: `${carriedAmount} + ${totalFundTransfers} + ${incomingProjectTransfers}`,
      });
      
      // استخدام البيانات الموحدة من financialSummary إذا كانت متاحة
      const totalExpenses = financialSummary?.expenses?.totalAllExpenses || 
                           (totalWorkerWages + totalTransportation + totalMaterialCosts + 
                            totalWorkerTransfers + totalMiscExpenses + outgoingProjectTransfers);
      
      const totalIncome = financialSummary?.income?.totalIncome || 
                         (carriedAmount + totalFundTransfers + incomingProjectTransfers);
      
      const remainingBalance = financialSummary?.totalBalance ?? (totalIncome - totalExpenses);
      
      console.log('✅ [calculateTotals] النتيجة النهائية:', {
        totalIncome,
        totalExpenses,
        remainingBalance
      });

      // تسجيل تفصيلي للحسابات
      if (process.env.NODE_ENV === 'development') {
        console.log('💰 تفاصيل الحسابات:', {
          carriedForward: carriedForward,
          carriedAmount: carriedAmount,
          totalFundTransfers: totalFundTransfers,
          incomingProjectTransfers: incomingProjectTransfers,
          totalIncome: totalIncome,
          totalExpenses: totalExpenses,
          remainingBalance: remainingBalance
        });
      }

      const result = {
        totalWorkerWages: totalWorkerWages,
        totalTransportation: totalTransportation,
        totalMaterialCosts: totalMaterialCosts,
        totalWorkerTransfers: totalWorkerTransfers,
        totalMiscExpenses: totalMiscExpenses,
        totalFundTransfers: totalFundTransfers,
        incomingProjectTransfers: incomingProjectTransfers,
        outgoingProjectTransfers: outgoingProjectTransfers,
        totalIncome: totalIncome, // يمكن أن يكون سالباً حسب المبلغ المرحل
        totalExpenses: totalExpenses,
        remainingBalance: remainingBalance, // يمكن أن يكون سالباً
      };

      // فحص النتائج للتأكد من عدم وجود قيم غير منطقية
      const maxReasonableAmount = 100000000; // 100 مليون
      Object.keys(result).forEach(key => {
        const value = (result as any)[key];
        if (typeof value === 'number' && Math.abs(value) > maxReasonableAmount) {
          console.warn(`⚠️ [DailyExpenses] قيمة غير منطقية في ${key}:`, value);
          if (key !== 'remainingBalance') {
            (result as any)[key] = 0; // إعادة تعيين القيم غير المنطقية إلى الصفر
          }
        }
      });

      // تسجيل النتائج في بيئة التطوير فقط
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ الملخص المالي النهائي:', {
          إجمالي_الدخل: formatCurrency(result.totalIncome),
          إجمالي_المصاريف: formatCurrency(result.totalExpenses),
          الرصيد_المتبقي: formatCurrency(result.remainingBalance)
        });
      }
      return result;

    } catch (error) {
      console.error('❌ [DailyExpenses] خطأ في calculateTotals:', error);
      // إرجاع قيم افتراضية آمنة في حالة حدوث خطأ
      return {
        totalWorkerWages: 0,
        totalTransportation: 0,
        totalMaterialCosts: 0,
        totalWorkerTransfers: 0,
        totalMiscExpenses: 0,
        totalFundTransfers: 0,
        incomingProjectTransfers: 0,
        outgoingProjectTransfers: 0,
        totalIncome: 0,
        totalExpenses: 0,
        remainingBalance: 0,
      };
    }
  };

  const handleSaveSummary = () => {
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    const totalsResult = calculateTotals();

    saveDailySummaryMutation.mutate({
      projectId: selectedProjectId,
      date: selectedDate || new Date().toISOString().split('T')[0],
      carriedForwardAmount: carriedForward,
      totalFundTransfers: totalsResult.totalFundTransfers.toString(),
      totalWorkerWages: totalsResult.totalWorkerWages.toString(),
      totalMaterialCosts: totalsResult.totalMaterialCosts.toString(),
      totalTransportationCosts: totalsResult.totalTransportation.toString(),

      totalIncome: totalsResult.totalIncome.toString(),
      totalExpenses: totalsResult.totalExpenses.toString(),
      remainingBalance: totalsResult.remainingBalance.toString(),
    });
  };

  // حساب المجاميع مع معالجة آمنة للأخطاء
  const computedTotalsFromCalculate = useMemo(() => {
    try {
      const result = calculateTotals();
      if (!result || typeof result !== 'object') {
        console.warn('⚠️ [DailyExpenses] calculateTotals returned invalid result:', result);
        throw new Error('Invalid result from calculateTotals');
      }
      return result;
    } catch (error) {
      console.error('❌ [DailyExpenses] خطأ في حساب المجاميع:', error);
      return {
        totalWorkerWages: 0,
        totalTransportation: 0,
        totalMaterialCosts: 0,
        totalWorkerTransfers: 0,
        totalMiscExpenses: 0,
        totalFundTransfers: 0,
        incomingProjectTransfers: 0,
        outgoingProjectTransfers: 0,
        totalIncome: 0,
        totalExpenses: 0,
        remainingBalance: 0,
      };
    }
  }, [
    todayWorkerAttendance,
    todayTransportation,
    todayMaterialPurchases,
    todayWorkerTransfers,
    todayMiscExpenses,
    todayFundTransfers,
    projectTransfers,
    carriedForward,
    selectedProjectId
  ]);

  // تكوين صفوف الإحصائيات الموحدة (3x3)
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'workerWages',
          label: 'أجور العمال',
          value: formatCurrency(totalsValue.totalWorkerWages),
          icon: Users,
          color: 'blue',
        },
        {
          key: 'fundTransfers',
          label: 'تحويلات العهدة',
          value: formatCurrency(totalsValue.totalFundTransfers),
          icon: Banknote,
          color: 'green',
        },
        {
          key: 'materials',
          label: 'المواد',
          value: formatCurrency(totalsValue.totalMaterialCosts),
          icon: Package,
          color: 'purple',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'transportation',
          label: 'المواصلات',
          value: formatCurrency(totalsValue.totalTransportation),
          icon: Truck,
          color: 'orange',
        },
        {
          key: 'miscExpenses',
          label: 'النثريات',
          value: formatCurrency(totalsValue.totalMiscExpenses),
          icon: Receipt,
          color: 'amber',
        },
        {
          key: 'projectTransfers',
          label: 'الترحيل',
          splitValue: {
            incoming: totalsValue.incomingProjectTransfers,
            outgoing: totalsValue.outgoingProjectTransfers
          },
          value: formatCurrency(totalsValue.incomingProjectTransfers - totalsValue.outgoingProjectTransfers),
          icon: Building2,
          color: 'teal',
          isSplitCard: true,
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'workerTransfers',
          label: 'الحوالات',
          value: formatCurrency(totalsValue.totalWorkerTransfers),
          icon: Send,
          color: 'indigo',
        },
        {
          key: 'totalExpenses',
          label: 'المنصرف',
          value: formatCurrency(totalsValue.totalExpenses),
          icon: TrendingDown,
          color: 'red',
        },
        {
          key: 'remainingBalance',
          label: 'المتبقي',
          value: formatCurrency(totalsValue.totalBalance),
          icon: Calculator,
          color: totalsValue.totalBalance >= 0 ? 'emerald' : 'rose',
        },
      ]
    }
  ], [totalsValue]);

  // فئات المواصلات (يمكن جعلها من قاعدة البيانات لاحقاً)
  const transportCategories = ["عام", "خاص", "بترول", "ديزل", "صيانة", "إيجار"];
  
  // فئات النثريات (يمكن جعلها من قاعدة البيانات لاحقاً)
  const miscCategories = ["قرطاسية", "ضيافة", "اتصالات", "صيانة مكتب", "أخرى"];

  // تكوين الفلاتر للوحة الإحصائيات
  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'date',
      label: 'التاريخ',
      type: 'date',
      placeholder: 'اختر التاريخ',
    },
    {
      key: 'dateRange',
      label: 'نطاق التاريخ',
      type: 'date-range',
      placeholder: 'اختر نطاق التاريخ',
    },
    {
      key: 'type',
      label: 'نوع العملية',
      type: 'select',
      placeholder: 'جميع العمليات',
      options: [
        { value: 'all', label: 'جميع العمليات' },
        { value: 'wages', label: 'أجور عمال' },
        { value: 'transport', label: 'مواصلات' },
        { value: 'materials', label: 'مواد' },
        { value: 'misc', label: 'نثريات' },
        { value: 'fund', label: 'عهد' }
      ]
    },
    {
      key: 'transportCategory',
      label: 'فئة المواصلات',
      type: 'select',
      placeholder: 'جميع الفئات',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        { value: "worker_transport", label: "نقل عمال" },
        { value: "material_delivery", label: "توريد مواد" },
        { value: "concrete_transport", label: "نقل خرسانة" },
        { value: "iron_platforms", label: "نقل حديد ومنصات" },
        { value: "fuel_shas", label: "بترول شاص" },
        { value: "fuel_hilux", label: "بترول هيلكس" },
        { value: "loading_unloading", label: "تحميل وتنزيل" },
        { value: "maintenance", label: "صيانة وإصلاح" },
        { value: "water_supply", label: "توريد مياه" },
        { value: "other", label: "أخرى" }
      ]
    },
    {
      key: 'miscCategory',
      label: 'فئة النثريات',
      type: 'select',
      placeholder: 'جميع الفئات',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        ...miscCategories.map(cat => ({ value: cat, label: cat }))
      ]
    }
  ], []);

  // دوال معالجة الفلاتر
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", selectedProjectId, "daily-expenses", selectedDate] 
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // دالة تصدير البيانات المعروضة إلى Excel
  const handleExportToExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      // تحويل البيانات المفلترة إلى شكل Transaction
      const transactions: any[] = [];
      
      console.log('📊 [Excel Export] بدء التصدير:', {
        fundTransfers: filteredFundTransfers.length,
        attendance: filteredAttendance.length,
        transportation: filteredTransportation.length,
        materials: filteredMaterialPurchases.length,
        workerTransfers: filteredWorkerTransfers.length,
        miscExpenses: filteredMiscExpenses.length
      });
      
      // إضافة الرصيد المتبقي السابق (دخل)
      const carriedAmount = cleanNumber(carriedForward);
      if (carriedAmount !== 0) {
        transactions.push({
          id: 'previous-balance',
          date: selectedDate || new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'رصيد سابق',
          amount: Math.abs(carriedAmount),
          description: carriedAmount > 0 ? 'رصيد مرحل (موجب)' : 'عجز مرحل (سالب)',
          projectName: projects.find(p => p.id === selectedProjectId)?.name || 'غير محدد',
        });
      }

      // إضافة تحويلات العهدة (دخل)
      filteredFundTransfers.forEach((transfer: any) => {
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'عهدة',
          amount: cleanNumber(transfer.amount),
          description: `عهدة من ${transfer.senderName || 'غير محدد'}`,
          projectId: transfer.projectId,
          projectName: projects.find(p => p.id === transfer.projectId)?.name || 'غير محدد',
          transferMethod: transfer.transferType,
          recipientName: transfer.senderName,
        });
      });

      // إضافة ترحيل الأموال بين المشاريع (واردة وصادرة)
      safeProjectTransfers.forEach((transfer: any) => {
        const isIncoming = transfer.toProjectId === selectedProjectId;
        const fromProject = projects.find(p => p.id === transfer.fromProjectId);
        const toProject = projects.find(p => p.id === transfer.toProjectId);
        
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isIncoming ? 'transfer_from_project' : 'expense',
          category: isIncoming ? 'ترحيل وارد' : 'ترحيل صادر',
          amount: cleanNumber(transfer.amount),
          description: isIncoming 
            ? `ترحيل من ${fromProject?.name || 'مشروع آخر'}`
            : `ترحيل إلى ${toProject?.name || 'مشروع آخر'}`,
          projectId: isIncoming ? transfer.fromProjectId : transfer.toProjectId,
          projectName: isIncoming ? fromProject?.name : toProject?.name,
        });
      });

      // إضافة حضور العمال (مصروف أو مؤجل)
      filteredAttendance.forEach((record: any) => {
        const worker = workers.find((w: any) => w.id === record.workerId);
        const paidAmount = cleanNumber(record.paidAmount);
        const payableAmount = cleanNumber(record.payableAmount);
        const isDeferred = paidAmount === 0 && payableAmount > 0;
        
        transactions.push({
          id: record.id,
          date: record.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isDeferred ? 'deferred' : 'expense',
          category: 'أجور عمال',
          amount: paidAmount,
          description: record.workDescription || 'أجر يومي',
          projectId: record.projectId,
          projectName: projects.find(p => p.id === record.projectId)?.name || 'غير محدد',
          workerName: worker?.name || 'غير محدد',
          workDays: cleanNumber(record.workDays) || undefined,
          dailyWage: cleanNumber(record.dailyWage) || undefined,
          payableAmount: payableAmount || undefined,
        });
      });

      // إضافة مصاريف المواصلات (مصروف)
      filteredTransportation.forEach((expense: any) => {
        transactions.push({
          id: expense.id,
          date: expense.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense',
          category: 'مواصلات',
          amount: cleanNumber(expense.amount),
          description: expense.description || 'مصروف مواصلات',
          projectId: expense.projectId,
          projectName: projects.find(p => p.id === expense.projectId)?.name || 'غير محدد',
        });
      });

      // إضافة مشتريات المواد (مصروف نقدي أو مؤجل)
      filteredMaterialPurchases.forEach((purchase: any) => {
        const material = materials.find((m: any) => m.id === purchase.materialId);
        const isCash = purchase.purchaseType === 'نقد';
        
        transactions.push({
          id: purchase.id,
          date: purchase.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isCash ? 'expense' : 'deferred',
          category: 'مشتريات مواد',
          amount: isCash ? cleanNumber(purchase.totalAmount) : 0,
          description: `شراء ${material?.name || 'مادة'}`,
          projectId: purchase.projectId,
          projectName: projects.find(p => p.id === purchase.projectId)?.name || 'غير محدد',
          materialName: material?.name || purchase.materialName,
          quantity: cleanNumber(purchase.quantity) || undefined,
          unitPrice: cleanNumber(purchase.unitPrice) || undefined,
          paymentType: purchase.purchaseType,
          supplierName: purchase.supplier || purchase.supplierName,
        });
      });

      // إضافة تحويلات العمال (مصروف)
      filteredWorkerTransfers.forEach((transfer: any) => {
        const worker = workers.find((w: any) => w.id === transfer.workerId);
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense',
          category: 'حوالات عمال',
          amount: cleanNumber(transfer.amount),
          description: transfer.notes || 'حوالة للعامل',
          projectId: transfer.projectId,
          projectName: projects.find(p => p.id === transfer.projectId)?.name || 'غير محدد',
          workerName: worker?.name || 'غير محدد',
          recipientName: worker?.name,
        });
      });

      // إضافة المصاريف المتنوعة (مصروف)
      filteredMiscExpenses.forEach((expense: any) => {
        transactions.push({
          id: expense.id,
          date: expense.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense',
          category: 'نثريات',
          amount: cleanNumber(expense.amount),
          description: expense.description || 'مصروف متنوع',
          projectId: expense.projectId,
          projectName: projects.find(p => p.id === expense.projectId)?.name || 'غير محدد',
        });
      });

      const totals = calculateTotals();
      
      const exportTotals = {
        totalIncome: totals.totalIncome,
        totalExpenses: totals.totalExpenses,
        balance: totals.remainingBalance
      };

      // الحصول على اسم المشروع
      const currentProjectName = isAllProjects 
        ? 'جميع المشاريع' 
        : projects.find(p => p.id === selectedProjectId)?.name || 'المشروع';

      // تصدير إلى Excel
      await exportTransactionsToExcel(
        transactions,
        exportTotals,
        formatCurrency,
        `${currentProjectName}${selectedDate ? ` - ${selectedDate}` : ''}`
      );

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${transactions.length} عملية إلى ملف Excel`,
      });
    } catch (error) {
      console.error('خطأ في التصدير:', error);
      toast({
        title: "فشل التصدير",
        description: "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    filteredFundTransfers,
    filteredAttendance,
    filteredTransportation,
    filteredMaterialPurchases,
    filteredWorkerTransfers,
    filteredMiscExpenses,
    safeProjectTransfers,
    workers,
    materials,
    projects,
    selectedProjectId,
    selectedDate,
    isAllProjects,
    toast
  ]);

  // تكوين أزرار الإجراءات
  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'export',
      icon: FileSpreadsheet,
      label: 'تصدير Excel',
      onClick: handleExportToExcel,
      variant: 'outline',
      loading: isExporting,
      tooltip: 'تصدير البيانات المعروضة إلى ملف Excel',
    }
  ], [isExporting, handleExportToExcel]);

  // حساب مؤشرات البيانات المتوفرة مع معالجة آمنة
  const dataIndicators = {
    fundTransfers: Array.isArray(todayFundTransfers) && todayFundTransfers.length > 0,
    attendance: Array.isArray(todayWorkerAttendance) && todayWorkerAttendance.length > 0,
    transportation: Array.isArray(todayTransportation) && todayTransportation.length > 0,
    materials: Array.isArray(todayMaterialPurchases) && todayMaterialPurchases.length > 0,
    workerTransfers: Array.isArray(todayWorkerTransfers) && todayWorkerTransfers.length > 0,
    miscExpenses: Array.isArray(todayMiscExpenses) && todayMiscExpenses.length > 0
  };

  const totalDataSections = Object.keys(dataIndicators).length;
  const sectionsWithData = Object.values(dataIndicators).filter(Boolean).length;

  return (
    <div className="p-4 slide-in space-y-4">

      {/* لوحة الإحصائيات والفلترة الموحدة */}
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث في المصروفات..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={{ 
          date: selectedDate ? (() => {
            const [year, month, day] = selectedDate.split('-').map(Number);
            return new Date(year, month - 1, day, 12, 0, 0, 0);
          })() : undefined,
          dateRange: filterValues.dateRange,
          type: filterValues.type,
          transportCategory: filterValues.transportCategory,
          miscCategory: filterValues.miscCategory
        }}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={actionsConfig}
      />

      {/* شريط تنقل التاريخ - يظهر فقط في حالة المشروع المحدد وتاريخ واحد */}
      {!isAllProjects && !filterValues.dateRange?.from && selectedDate && (
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mx-auto w-full max-w-md">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={prevDate}
            title="اليوم السابق"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
          
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">سجل مصروفات</span>
            <span className="text-sm font-black text-slate-900 dark:text-white arabic-numbers flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {format(new Date(selectedDate), "EEEE, d MMMM yyyy", { locale: ar })}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={nextDate}
            title="اليوم التالي"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
      )}


      {/* بطاقات ملخص المصروفات - عرض بطاقة لكل تاريخ (سواء اختيار جميع المشاريع أو مشروع محدد) */}
      {dailyExpensesData?.groupedByProjectDate && dailyExpensesData.groupedByProjectDate.length > 0 ? (
        <div className="space-y-4">
          {dailyExpensesData.groupedByProjectDate.map((cardData: any, index: number) => (
            <UnifiedCard
              key={`${cardData.projectId}-${cardData.date}-${index}`}
              title={cardData.projectName}
              subtitle={`مصروفات يوم ${formatDate(cardData.date)}`}
              titleIcon={Building}
              headerColor="#3b82f6"
              badges={[
                { label: formatDate(cardData.date), variant: "default" },
                { 
                  label: cardData.remainingBalance >= 0 ? "رصيد موجب" : "عجز", 
                  variant: cardData.remainingBalance >= 0 ? "success" : "destructive" 
                }
              ]}
              fields={[
                { 
                  label: "إجمالي الدخل", 
                  value: formatCurrency(cardData.totalIncome || 0), 
                  icon: TrendingUp, 
                  color: "success",
                  emphasis: true
                },
                { 
                  label: "المصروفات", 
                  value: formatCurrency(cardData.totalExpenses || 0), 
                  icon: TrendingDown, 
                  color: "danger",
                  emphasis: true
                },
                { 
                  label: "أجور العمال", 
                  value: formatCurrency(cardData.totalWorkerWages || 0), 
                  icon: Users, 
                  color: "info"
                },
                { 
                  label: "المواصلات", 
                  value: formatCurrency(cardData.totalTransportation || 0), 
                  icon: Truck, 
                  color: "warning"
                },
                { 
                  label: "المواد", 
                  value: formatCurrency(cardData.totalMaterialCosts || 0), 
                  icon: Package, 
                  color: "info"
                },
                { 
                  label: "النثريات", 
                  value: formatCurrency(cardData.totalMiscExpenses || 0), 
                  icon: Receipt, 
                  color: "muted"
                },
                { 
                  label: "حوالات العمال", 
                  value: formatCurrency(cardData.totalWorkerTransfers || 0), 
                  icon: Send, 
                  color: "warning"
                },
                { 
                  label: "المتبقي", 
                  value: formatCurrency(cardData.remainingBalance || 0), 
                  icon: Calculator, 
                  color: (cardData.remainingBalance || 0) >= 0 ? "success" : "danger",
                  emphasis: true
                },
              ]}
            />
          ))}
        </div>
      ) : selectedProjectId && selectedDate && (
        <UnifiedCard
          title={projects?.find(p => p.id === selectedProjectId)?.name || "المشروع"}
          subtitle={`مصروفات يوم ${formatDate(selectedDate)}`}
          titleIcon={Building}
          headerColor="#3b82f6"
          badges={[
            { label: formatDate(selectedDate), variant: "default" },
            { 
              label: totals.remainingBalance >= 0 ? "رصيد موجب" : "عجز", 
              variant: totals.remainingBalance >= 0 ? "success" : "destructive" 
            }
          ]}
          fields={[
            { 
              label: "إجمالي الدخل", 
              value: formatCurrency(totals.totalIncome), 
              icon: TrendingUp, 
              color: "success",
              emphasis: true
            },
            { 
              label: "المصروفات", 
              value: formatCurrency(totals.totalExpenses), 
              icon: TrendingDown, 
              color: "danger",
              emphasis: true
            },
            { 
              label: "أجور العمال", 
              value: formatCurrency(totals.totalWorkerWages), 
              icon: Users, 
              color: "info"
            },
            { 
              label: "المواصلات", 
              value: formatCurrency(totals.totalTransportation), 
              icon: Truck, 
              color: "warning"
            },
            { 
              label: "المواد", 
              value: formatCurrency(totals.totalMaterialCosts), 
              icon: Package, 
              color: "info"
            },
            { 
              label: "النثريات", 
              value: formatCurrency(totals.totalMiscExpenses), 
              icon: Receipt, 
              color: "muted"
            },
            { 
              label: "حوالات العمال", 
              value: formatCurrency(totals.totalWorkerTransfers), 
              icon: Send, 
              color: "warning"
            },
            { 
              label: "المتبقي", 
              value: formatCurrency(totals.remainingBalance), 
              icon: Calculator, 
              color: totals.remainingBalance >= 0 ? "success" : "danger",
              emphasis: true
            },
          ]}
        />
      )}

      {/* نموذج الإضافة القابل للطي - مع الطي الذكية */}
      <Collapsible open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <Card className="mb-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">إضافة مصروفات جديدة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {isAddFormOpen ? "اضغط للإخفاء" : "اضغط للعرض"}
                </span>
                {isAddFormOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <DatePickerField
                    label="التاريخ"
                    value={selectedDate || ""}
                    onChange={(date) => setSelectedDate(date ? format(date, "yyyy-MM-dd") : null)}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-foreground">المبلغ المتبقي السابق</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={carriedForward}
                    onChange={(e) => setCarriedForward(e.target.value)}
                    placeholder="0"
                    className="text-center arabic-numbers"
                  />
                </div>
              </div>

              {/* Fund Transfer Section - الطي الذكية */}
              <div className="border-t pt-3">
                <Collapsible open={isFundTransfersExpanded} onOpenChange={setIsFundTransfersExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground">تحويل عهدة جديدة</h4>
                      <div className="flex items-center gap-1">
                        {safeFundTransfers.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeFundTransfers.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    {dailyExpensesError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">
                          خطأ في جلب البيانات: {dailyExpensesError.message}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="flex flex-col">
                            <Label className="block text-sm font-medium text-foreground mb-1">المبلغ *</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={fundAmount}
                              onChange={(e) => setFundAmount(e.target.value)}
                              placeholder="المبلغ *"
                              className="text-center arabic-numbers"
                              min="0"
                              step="0.01"
                            />
                          </div>
                      <div>
                        <Label className="block text-sm font-medium text-foreground mb-1">اسم المرسل</Label>
                        <AutocompleteInput
                          value={senderName}
                          onChange={setSenderName}
                          category="senderNames"
                          placeholder="اسم المرسل"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="block text-sm font-medium text-foreground mb-1">رقم الحولة</Label>
                        <AutocompleteInput
                          type="number"
                          inputMode="numeric"
                          value={transferNumber}
                          onChange={setTransferNumber}
                          category="transferNumbers"
                          placeholder="رقم الحولة"
                          className="w-full arabic-numbers"
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-foreground mb-1">نوع التحويل *</Label>
                        <AutocompleteInput
                          value={transferType}
                          onChange={setTransferType}
                          category="transferTypes"
                          placeholder="نوع التحويل *"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAddFundTransfer} 
                        size="sm" 
                        className="flex-1 bg-primary"
                        disabled={addFundTransferMutation.isPending || updateFundTransferMutation.isPending}
                        data-testid="button-add-fund-transfer"
                      >
                        {addFundTransferMutation.isPending || updateFundTransferMutation.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : editingFundTransferId ? (
                          <><Save className="h-4 w-4 ml-2" /> حفظ التعديل</>
                        ) : (
                          <><Plus className="h-4 w-4 ml-2" /> إضافة العهدة</>
                        )}
                      </Button>
                      {editingFundTransferId && (
                        <Button onClick={resetFundTransferForm} size="sm" variant="outline">
                          إلغاء
                        </Button>
                      )}
                    </div>

                    {/* عرض العهد المضافة لهذا اليوم */}
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-sm font-medium text-muted-foreground">العهد المضافة اليوم:</h5>

                      {dailyExpensesLoading ? (
                        <div className="text-center text-muted-foreground">جاري التحميل...</div>
                      ) : safeFundTransfers.length > 0 ? (
                        <div className="space-y-2">
                          {safeFundTransfers.map((transfer: any, index) => (
                            <div key={transfer.id || index} className="p-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/20 rounded-lg shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-foreground text-sm">{transfer.senderName || 'غير محدد'}</h4>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-none">
                                      {transfer.transferType}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                    {transfer.transferNumber && (
                                      <div className="flex items-center gap-1">
                                        <span className="opacity-70">رقم الحولة:</span>
                                        <span className="font-medium text-foreground">{transfer.transferNumber}</span>
                                      </div>
                                    )}
                                    {isAllProjects && transfer.projectName && (
                                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                        <span>📁</span>
                                        <span className="font-medium">{transfer.projectName}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="font-bold text-primary arabic-numbers text-sm">{formatCurrency(transfer.amount)}</span>
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                      onClick={() => handleEditFundTransfer(transfer)}
                                      data-testid="button-edit-fund-transfer"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => deleteFundTransferMutation.mutate(transfer.id)}
                                      disabled={deleteFundTransferMutation.isPending}
                                      data-testid="button-delete-fund-transfer"
                                    >
                                      {deleteFundTransferMutation.isPending ? (
                                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="text-left pt-2 border-t mt-2">
                            <span className="text-sm font-medium text-muted-foreground">إجمالي العهد: </span>
                            <span className="font-bold text-primary arabic-numbers text-base">
                              {formatCurrency(totals.totalFundTransfers)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <DollarSign className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            لا توجد تحويلات عهد للتاريخ {selectedDate}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

      {/* Transportation Input Section + Display */}
      <div className="border-t pt-3 mt-3">
        <Collapsible open={isTransportationExpanded} onOpenChange={setIsTransportationExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
              <h4 className="font-medium text-foreground flex items-center">
                <Car className="text-secondary ml-2 h-5 w-5" />
                إضافة مواصلات جديدة
              </h4>
              <div className="flex items-center gap-1">
                {safeTransportation.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeTransportation.length}</Badge>}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">الوصف *</Label>
                  <AutocompleteInput
                    value={transportDescription}
                    onChange={setTransportDescription}
                    category="transportDescriptions"
                    placeholder="الوصف"
                  />
                </div>
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">الفئة *</Label>
                  <Select value={transportCategory} onValueChange={setTransportCategory}>
                    <SelectTrigger className="arabic-numbers">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker_transport">نقل عمال</SelectItem>
                      <SelectItem value="material_delivery">توريد مواد</SelectItem>
                      <SelectItem value="concrete_transport">نقل خرسانة</SelectItem>
                      <SelectItem value="iron_platforms">نقل حديد ومنصات</SelectItem>
                      <SelectItem value="fuel_shas">بترول شاص</SelectItem>
                      <SelectItem value="fuel_hilux">بترول هيلكس</SelectItem>
                      <SelectItem value="loading_unloading">تحميل وتنزيل</SelectItem>
                      <SelectItem value="maintenance">صيانة وإصلاح</SelectItem>
                      <SelectItem value="water_supply">توريد مياه</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">المبلغ *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={transportAmount}
                    onChange={(e) => setTransportAmount(e.target.value)}
                    placeholder="المبلغ"
                    className="text-center arabic-numbers"
                  />
                </div>
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">الملاحظات</Label>
                  <AutocompleteInput
                    value={transportNotes}
                    onChange={setTransportNotes}
                    category="notes"
                    placeholder="ملاحظات"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 mb-3">
                {selectedProjectId && !isAllProjects && (
                  <div className="flex flex-col">
                    <WellSelector
                      projectId={selectedProjectId}
                      value={selectedWellId}
                      onChange={setSelectedWellId}
                      optional={true}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  onClick={handleAddTransportation} 
                  size="sm" 
                  className="w-full bg-secondary"
                  disabled={addTransportationMutation.isPending || updateTransportationMutation.isPending}
                  data-testid="button-add-transportation"
                >
                  {addTransportationMutation.isPending || updateTransportationMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    editingTransportationId ? <><Save className="h-4 w-4 ml-2" /> حفظ التعديل</> : <><Plus className="h-4 w-4 ml-2" /> إضافة المواصلات</>
                  )}
                </Button>
                {editingTransportationId && (
                  <Button onClick={resetTransportationForm} size="sm" variant="outline">
                    إلغاء
                  </Button>
                )}
              </div>
            </div>
            
            {/* Transportation Display - يظهر فقط عند وجود بيانات */}
            {safeTransportation.length > 0 && (
              <div className="mt-3 space-y-2">
                {safeTransportation.map((expense: any, index) => (
                  <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground text-sm">{expense.description}</h4>
                          <span className="font-bold text-secondary arabic-numbers text-base">{formatCurrency(expense.amount)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-[10px] bg-secondary/5 text-secondary border-secondary/20">
                            {[
                              { value: "worker_transport", label: "نقل عمال" },
                              { value: "material_delivery", label: "توريد مواد" },
                              { value: "concrete_transport", label: "نقل خرسانة" },
                              { value: "iron_platforms", label: "نقل حديد ومنصات" },
                              { value: "fuel_shas", label: "بترول شاص" },
                              { value: "fuel_hilux", label: "بترول هيلكس" },
                              { value: "loading_unloading", label: "تحميل وتنزيل" },
                              { value: "maintenance", label: "صيانة وإصلاح" },
                              { value: "water_supply", label: "توريد مياه" },
                              { value: "other", label: "أخرى" }
                            ].find(opt => opt.value === expense.category)?.label || "أخرى"}
                          </Badge>
                          {expense.notes && (
                            <p className="text-xs text-muted-foreground">الملاحظات: {expense.notes}</p>
                          )}
                        </div>
                        {expense.wellName && (
                          <p className="text-xs text-muted-foreground">البئر: {expense.wellName}</p>
                        )}
                        {isAllProjects && expense.projectName && (
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">📁 {expense.projectName}</div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          onClick={() => handleEditTransportation(expense)}
                          data-testid="button-edit-transportation"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => deleteTransportationMutation.mutate(expense.id)}
                          disabled={deleteTransportationMutation.isPending}
                          data-testid="button-delete-transportation"
                        >
                          {deleteTransportationMutation.isPending ? (
                            <div className="h-4 w-4 animate-spin rounded-full border border-red-600 border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-left mt-3 pt-3 border-t bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
                  <span className="text-sm font-medium text-foreground">إجمالي المواصلات: </span>
                  <span className="font-bold text-secondary arabic-numbers">
                    {formatCurrency(totals.totalTransportation)}
                  </span>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* إضافة أجور العمال - حقول الإدخال السريعة */}
      <div className="border-t pt-3 mt-3">
        <Collapsible open={isAttendanceExpanded} onOpenChange={setIsAttendanceExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
              <h4 className="font-medium text-foreground flex items-center">
                <Users className="text-primary ml-2 h-5 w-5" />
                إضافة أجور عامل جديد
              </h4>
              <div className="flex items-center gap-1">
                {safeAttendance.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeAttendance.length}</Badge>}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-6">
                <Label className="text-[10px] font-bold text-foreground mb-1 block">العامل *</Label>
                <Select 
                  value={selectedWorkerId || "none"} 
                  onValueChange={(val) => setSelectedWorkerId(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="h-9 text-xs" data-testid="select-worker">
                    <SelectValue placeholder="اختر العامل" />
                  </SelectTrigger>
                  <SelectContent className="p-0 overflow-hidden">
                    <div className="p-2 border-b sticky top-0 bg-popover z-50">
                      <Input
                        placeholder="بحث عن عامل..."
                        className="h-8 w-full text-xs"
                        onChange={(e) => setSearchValue(e.target.value)}
                        value={searchValue}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      <SelectItem value="none" className="text-xs">اختر العامل</SelectItem>
                      {workers && workers.length > 0 ? (
                        workers
                          .filter(w => !searchValue || (w.name && w.name.toLowerCase().includes(searchValue.toLowerCase())))
                          .map((worker) => (
                            <SelectItem key={`worker-select-${worker.id}`} value={worker.id.toString()} className="text-xs">
                              {worker.name}
                            </SelectItem>
                          ))
                      ) : null}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <Label className="text-[10px] font-bold text-foreground mb-1 block">الأيام *</Label>
                <Input
                  type="number"
                  value={workerDays}
                  onChange={(e) => setWorkerDays(e.target.value)}
                  placeholder="0"
                  className="text-center h-9 text-xs"
                  min="0"
                  step="0.5"
                  data-testid="input-worker-days"
                />
              </div>

              <div className="col-span-3">
                <Label className="text-[10px] font-bold text-foreground mb-1 block">المبلغ *</Label>
                <Input
                  type="number"
                  value={workerAmount}
                  onChange={(e) => setWorkerAmount(e.target.value)}
                  placeholder="0"
                  className="text-center arabic-numbers h-9 text-xs"
                  min="0"
                  step="0.01"
                  data-testid="input-worker-amount"
                />
              </div>
            </div>

            <div className="mb-3">
              <Label className="text-xs font-bold text-foreground mb-1">الملاحظات</Label>
              <Input
                type="text"
                value={workerNotes}
                onChange={(e) => setWorkerNotes(e.target.value)}
                placeholder="ملاحظات إضافية"
                className="h-9"
                data-testid="input-worker-notes"
              />
            </div>

            {selectedProjectId && !isAllProjects && (
              <div className="mb-3">
                <WellSelector
                  projectId={selectedProjectId}
                  value={selectedWellId}
                  onChange={setSelectedWellId}
                  optional={true}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleQuickAddAttendance}
                className="bg-primary h-9 flex-1"
                disabled={addWorkerAttendanceMutation.isPending}
                data-testid="button-add-worker-attendance"
              >
                {addWorkerAttendanceMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة الحضور السريع
                  </>
                )}
              </Button>
            </div>

            {/* نموذج تعديل أجور العمال */}
            {editingAttendanceId && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
                <h5 className="font-medium text-foreground mb-3">تعديل بيانات الحضور</h5>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label className="text-xs font-bold text-foreground mb-1">الأيام</Label>
                    <Input
                      type="number"
                      value={editWorkerDays}
                      onChange={(e) => setEditWorkerDays(e.target.value)}
                      className="text-center h-9"
                      min="0"
                      step="0.5"
                      data-testid="input-edit-worker-days"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground mb-1">المبلغ</Label>
                    <Input
                      type="number"
                      value={editWorkerAmount}
                      onChange={(e) => setEditWorkerAmount(e.target.value)}
                      className="text-center h-9"
                      min="0"
                      step="0.01"
                      data-testid="input-edit-worker-amount"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <Label className="text-xs font-bold text-foreground mb-1">الملاحظات</Label>
                  <Input
                    type="text"
                    value={editWorkerNotes}
                    onChange={(e) => setEditWorkerNotes(e.target.value)}
                    placeholder="ملاحظات إضافية"
                    className="h-9"
                    data-testid="input-edit-worker-notes"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      updateWorkerAttendanceMutation.mutate({
                        id: editingAttendanceId,
                        workDays: editWorkerDays,
                        paidAmount: editWorkerAmount,
                        notes: editWorkerNotes
                      });
                    }}
                    className="bg-primary h-9 flex-1"
                    disabled={updateWorkerAttendanceMutation.isPending}
                    data-testid="button-save-edit-worker-attendance"
                  >
                    {updateWorkerAttendanceMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-1" />
                        حفظ التعديلات
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingAttendanceId(null);
                      setEditWorkerDays("");
                      setEditWorkerAmount("");
                      setEditWorkerNotes("");
                    }}
                    variant="outline"
                    className="h-9"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {/* أجور العمال - عرض البطاقات */}
            {safeAttendance.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">أجور العمال المضافة اليوم:</h5>
                <div className="space-y-2">
                  {safeAttendance.map((attendance: any, index) => {
                    const worker = workers.find(w => w.id === attendance.workerId);
                    const payableAmount = cleanNumber(attendance.payableAmount);
                    const paidAmount = cleanNumber(attendance.paidAmount);
                    const deferredAmount = payableAmount - paidAmount;
                    return (
                      <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground text-sm">{attendance.workerName || worker?.name || `عامل ${index + 1}`}</h4>
                                {worker?.type && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] px-1.5 h-4 flex items-center border-none ${
                                      worker.type.includes("معلم") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                      worker.type.includes("حداد") ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                      worker.type.includes("بلاط") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                      worker.type.includes("دهان") ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                      worker.type.includes("عامل") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                      worker.type.includes("نجار") ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                      worker.type.includes("كهربائي") ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                      worker.type.includes("سباك") ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" :
                                      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                  >
                                    {worker.type}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-bold text-primary arabic-numbers text-base">{formatCurrency(paidAmount)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-muted-foreground">
                                <span>الأيام: </span>
                                <span className="font-medium text-foreground">{cleanNumber(attendance.workDays) || 0}</span>
                              </div>
                              <div className="text-muted-foreground">
                                <span>الأجر اليومي: </span>
                                <span className="font-medium text-foreground">{formatCurrency(cleanNumber(attendance.dailyWage || worker?.dailyWage))}</span>
                              </div>
                            </div>
                            {deferredAmount > 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">مؤجل: {formatCurrency(deferredAmount)}</p>
                            )}
                            {attendance.workDescription && (
                              <p className="text-xs text-muted-foreground">ملاحظات: {attendance.workDescription}</p>
                            )}
                            <div className="flex flex-col gap-1">
                              {attendance.notes && (
                                <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md border border-amber-200 dark:border-amber-900/50 mt-1">
                                  <span className="font-bold text-amber-700 dark:text-amber-400">الملاحظات: </span>
                                  {attendance.notes}
                                </p>
                              )}
                            </div>
                            {isAllProjects && attendance.projectName && (
                              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">📁 {attendance.projectName}</div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              onClick={() => {
                                setEditingAttendanceId(attendance.id);
                                setEditWorkerDays(cleanNumber(attendance.workDays).toString());
                                setEditWorkerAmount(cleanNumber(attendance.paidAmount).toString());
                                setEditWorkerNotes(attendance.notes || "");
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => deleteWorkerAttendanceMutation.mutate(attendance.id)}
                              disabled={deleteWorkerAttendanceMutation.isPending}
                              data-testid="button-delete-worker-attendance"
                            >
                              {deleteWorkerAttendanceMutation.isPending ? (
                                <div className="h-4 w-4 animate-spin rounded-full border border-red-600 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-left mt-3 pt-3 border-t bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                    <span className="text-sm font-medium text-foreground">إجمالي أجور العمال: </span>
                    <span className="font-bold text-primary arabic-numbers">
                      {formatCurrency(totals.totalWorkerWages)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

              {/* شراء مواد - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isMaterialsExpanded} onOpenChange={setIsMaterialsExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <Package className="text-green-600 ml-2 h-5 w-5" />
                        المشتريات المضافة اليوم
                      </h4>
                      <div className="flex items-center gap-1">
                        {safeMaterialPurchases.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeMaterialPurchases.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/material-purchase")}
                      className="w-full border-2 border-dashed border-green-300 text-green-600 hover:bg-green-50 mb-3"
                    >
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة شراء مواد جديدة
                    </Button>
                    
                    {/* Materials Display - يظهر فقط عند وجود بيانات */}
                    {safeMaterialPurchases.length > 0 && (
                      <div className="space-y-2">
                        {safeMaterialPurchases.map((purchase: any, index: number) => {
                          const materialName = purchase.materialName || purchase.material?.name || 'مادة غير محددة';
                          const materialUnit = purchase.materialUnit || purchase.unit || purchase.material?.unit || 'وحدة';
                          const isCash = purchase.purchaseType === 'نقد';
                          
                          return (
                            <div key={index} className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                              isCash 
                                ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-900/30' 
                                : 'bg-white dark:bg-slate-800 border-orange-200 dark:border-orange-900/30'
                            }`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-foreground text-sm">{materialName}</h4>
                                    <span className={`font-bold arabic-numbers text-base ${isCash ? 'text-green-600' : 'text-orange-600'}`}>
                                      {formatCurrency(purchase.totalAmount)}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-muted-foreground">
                                      <span>الكمية: </span>
                                      <span className="font-medium text-foreground">{purchase.quantity} {materialUnit}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      <span>السعر: </span>
                                      <span className="font-medium text-foreground">{formatCurrency(purchase.unitPrice)}</span>
                                    </div>
                                  </div>
                                  {purchase.supplierName && (
                                    <p className="text-xs text-muted-foreground">المورد: {purchase.supplierName}</p>
                                  )}
                                  <div className={`inline-block text-xs font-semibold px-2 py-1 rounded ${
                                    isCash 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                  }`}>
                                    {isCash ? 'نقد' : 'آجل'}
                                  </div>
                                  {isAllProjects && purchase.projectName && (
                                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">📁 {purchase.projectName}</div>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                    onClick={() => setLocation(`/material-purchase?edit=${purchase.id}`)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => deleteMaterialPurchaseMutation.mutate(purchase.id)}
                                    disabled={deleteMaterialPurchaseMutation.isPending}
                                  >
                                    {deleteMaterialPurchaseMutation.isPending ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border border-red-600 border-t-transparent" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="text-left mt-2 pt-2 border-t space-y-1">
                          <div>
                            <span className="text-sm text-muted-foreground">المشتريات النقدية: </span>
                            <span className="font-bold text-success arabic-numbers">
                              {formatCurrency(totals.totalMaterialCosts)}
                            </span>
                          </div>
                          {(() => {
                            const deferredAmount = Array.isArray(todayMaterialPurchases) ? 
                              todayMaterialPurchases
                                .filter((purchase: any) => purchase.purchaseType === "آجل")
                                .reduce((sum: number, purchase: any) => sum + parseFloat(purchase.totalAmount || "0"), 0) : 0;
                            return deferredAmount > 0 ? (
                              <div>
                                <span className="text-sm text-muted-foreground">المشتريات الآجلة: </span>
                                <span className="font-bold text-orange-600 arabic-numbers">
                                  {formatCurrency(deferredAmount)}
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* إرسال حولة عامل - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isWorkerTransfersExpanded} onOpenChange={setIsWorkerTransfersExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <DollarSign className="text-yellow-600 ml-2 h-5 w-5" />
                        حوالات العمال المضافة اليوم
                      </h4>
                      <div className="flex items-center gap-1">
                        {safeWorkerTransfers.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeWorkerTransfers.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/worker-accounts")}
                      className="w-full border-2 border-dashed border-yellow-300 text-yellow-600 hover:bg-yellow-50 mb-3"
                    >
                      <Plus className="ml-2 h-4 w-4" />
                      إرسال حولة عامل جديدة
                    </Button>
                    
                    {/* Worker Transfers Display - يظهر فقط عند وجود بيانات */}
                    {safeWorkerTransfers.length > 0 && (
                      <div className="space-y-2">
                        {safeWorkerTransfers.map((transfer: any, index: number) => {
                          const worker = workers.find((w: any) => w.id === transfer.workerId);
                          const methodLabel = transfer.transferMethod === "hawaleh" ? "حولة" : transfer.transferMethod === "bank" ? "تحويل بنكي" : "نقداً";
                          return (
                            <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-foreground text-sm">{worker?.name || 'عامل غير معروف'}</h4>
                                    <span className="font-bold text-yellow-600 dark:text-yellow-500 arabic-numbers text-base">{formatCurrency(transfer.amount)}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-muted-foreground">
                                      <span>المستقبل: </span>
                                      <span className="font-medium text-foreground">{transfer.recipientName}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      <span>الطريقة: </span>
                                      <span className="font-medium text-foreground">{methodLabel}</span>
                                    </div>
                                  </div>
                                  {transfer.transferNumber && (
                                    <p className="text-xs text-muted-foreground">
                                      <span className="opacity-70">رقم الحوالة: </span>
                                      <span className="font-medium text-foreground">{transfer.transferNumber}</span>
                                    </p>
                                  )}
                                  {isAllProjects && transfer.projectName && (
                                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">📁 {transfer.projectName}</div>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => setLocation(`/worker-accounts?edit=${transfer.id}&worker=${transfer.workerId}`)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      if (window.confirm('هل أنت متأكد من حذف حوالة العامل؟')) {
                                        deleteWorkerTransferMutation.mutate(transfer.id);
                                      }
                                    }}
                                    disabled={deleteWorkerTransferMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="text-left mt-2 pt-2 border-t bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                          <span className="text-sm text-muted-foreground">إجمالي الحوالات: </span>
                          <span className="font-bold text-warning arabic-numbers">
                            {formatCurrency(totalsValue.totalWorkerTransfers)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* إدارة ترحيل الأموال - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isProjectTransfersExpanded} onOpenChange={setIsProjectTransfersExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <ArrowLeftRight className="text-orange-600 ml-2 h-5 w-5" />
                        ترحيل الأموال المضافة اليوم
                      </h4>
                      <div className="flex items-center gap-1">
                        {safeProjectTransfers.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeProjectTransfers.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/project-transfers")}
                      className="w-full border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 mb-3"
                    >
                      <Plus className="ml-2 h-4 w-4" />
                      إدارة ترحيل الأموال
                    </Button>
                    
                    {/* Project Fund Transfers Display - يظهر فقط عند وجود بيانات */}
                    {safeProjectTransfers.length > 0 && (
                      <div className="space-y-3">
                        {safeProjectTransfers.map((transfer: any) => (
                          <div 
                            key={transfer.id} 
                            className={`p-3 rounded border-r-4 ${
                              transfer.toProjectId === selectedProjectId 
                                ? 'bg-green-50 border-green-500' 
                                : 'bg-red-50 border-red-500'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {transfer.toProjectId === selectedProjectId ? (
                                      <span className="text-green-700">أموال واردة من: {transfer.fromProjectName}</span>
                                    ) : (
                                      <span className="text-red-700">أموال صادرة إلى: {transfer.toProjectName}</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold arabic-numbers ${
                                      transfer.toProjectId === selectedProjectId ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {transfer.toProjectId === selectedProjectId ? '+' : '-'}{formatCurrency(transfer.amount)}
                                    </span>
                                    <div className="flex gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        onClick={() => handleEditProjectTransfer(transfer)}
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          if (confirm("هل أنت متأكد من حذف هذا الترحيل؟")) {
                                            deleteProjectTransferMutation.mutate(transfer.id);
                                          }
                                        }}
                                        disabled={deleteProjectTransferMutation.isPending}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  <div>السبب: {transfer.transferReason || 'ترحيل أموال'}</div>
                                  {transfer.description && (
                                    <div className="mt-1">الوصف: {transfer.description}</div>
                                  )}
                                  <div className="mt-1">التاريخ: {formatDate(transfer.transferDate)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Worker Miscellaneous Expenses - القسم المطوي */}
              {selectedProjectId && (
                <div className="border-t pt-3 mt-3">
                  <Collapsible open={isMiscExpanded} onOpenChange={setIsMiscExpanded}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                        <h4 className="font-medium text-foreground flex items-center">
                          <Package className="text-purple-600 ml-2 h-5 w-5" />
                          نثريات العمال المضافة اليوم
                        </h4>
                        <div className="flex items-center gap-1">
                          {workerMiscExpenses.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{workerMiscExpenses.length}</Badge>}
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isMiscExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <WorkerMiscExpenses 
                        projectId={selectedProjectId} 
                        selectedDate={selectedDate || new Date().toISOString().split('T')[0]} 
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* الملخص اليومي - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isSummaryExpanded} onOpenChange={setIsSummaryExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <BarChart3 className="text-primary ml-2 h-5 w-5" />
                        الملخص المالي لليوم
                      </h4>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isSummaryExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <ExpenseSummary
                      totalIncome={totalsValue.totalIncome}
                      totalExpenses={totalsValue.totalCashExpenses}
                      remainingBalance={displayBalance}
                      details={{
                        workerWages: totalsValue.totalWorkerWages,
                        materialCosts: totalsValue.totalMaterialCosts,
                        transportation: totalsValue.totalTransportation,
                        miscExpenses: totalsValue.totalMiscExpenses,
                        workerTransfers: totalsValue.totalWorkerTransfers,
                        outgoingProjectTransfers: totalsValue.outgoingProjectTransfers,
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Save Button */}
              <div className="mt-4">
                <Button
                  onClick={handleSaveSummary}
                  disabled={saveDailySummaryMutation.isPending}
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                >
                  <Save className="ml-2 h-4 w-4" />
                  {saveDailySummaryMutation.isPending ? "جاري الحفظ..." : "حفظ المصروفات"}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
      </Card>
    </Collapsible>
    </div>
  );
}

// Export default مع Error Boundary
export default function DailyExpenses() {
  return (
    <ErrorBoundary>
      <DailyExpensesContent />
    </ErrorBoundary>
  );
}