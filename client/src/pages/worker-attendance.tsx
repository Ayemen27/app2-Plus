import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Save, ChevronDown, ChevronUp, Users, Clock, DollarSign, CheckCircle2, User, Calendar, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject, ALL_PROJECTS_ID } from "@/hooks/use-selected-project";
import EnhancedWorkerCard from "@/components/enhanced-worker-card";
import { WellSelector } from "@/components/well-selector";
import { getCurrentDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import type { Worker, InsertWorkerAttendance } from "@shared/schema";

interface AttendanceData {
  [workerId: string]: {
    isPresent: boolean;
    startTime?: string;
    endTime?: string;
    workDescription?: string;
    workDays?: number;
    paidAmount?: string;
    paymentType?: string;
    hoursWorked?: number;
    overtime?: number;
    overtimeRate?: number;
    actualWage?: number;
    totalPay?: number;
    remainingAmount?: number;
    notes?: string;
    recordId?: string;
    recordType?: "work" | "advance";
  };
}


export default function WorkerAttendance() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects, projects } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: undefined,
    type: 'all'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();

  // Get URL parameters for editing
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const workerId = urlParams.get('worker');
  const dateParam = urlParams.get('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(dateParam || null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [showSharedSettings, setShowSharedSettings] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(true);

  // إعدادات مشتركة لجميع العمال
  const [bulkSettings, setBulkSettings] = useState({
    startTime: "07:00",
    endTime: "15:00",
    workDays: 0,
    paymentType: "partial",
    paidAmount: "",
    workDescription: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({
      dateRange: undefined,
      type: 'all'
    });
    if (showDateFilter) {
      setSelectedDate(getCurrentDate());
    }
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر وتعيين تاريخ اليوم",
    });
  }, [toast, showDateFilter]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", selectedProjectId, "worker-attendance"] 
      });
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
  }, [queryClient, selectedProjectId, toast]);

  // تعيين تاريخ اليوم تلقائياً عند الفتح
  useEffect(() => {
    if (!selectedDate && showDateFilter) {
      setSelectedDate(getCurrentDate());
    }
  }, []);

  // إزالة الزر العائم من صفحة الحضور
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة مساعدة لحفظ قيم الإكمال التلقائي
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

  // Get today's attendance records
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "worker-attendance", selectedDate],
    queryFn: async () => {
      try {
        // إذا كان "جميع المشاريع" محدد، نجلب من جميع المشاريع
        if (isAllProjects) {
          const allRecords: any[] = [];
          for (const project of projects) {
            const url = selectedDate 
              ? `/api/projects/${project.id}/worker-attendance?date=${selectedDate}`
              : `/api/projects/${project.id}/worker-attendance`;
            try {
              const response = await apiRequest(url, "GET");
              const records = response?.data || response || [];
              if (Array.isArray(records)) {
                allRecords.push(...records.map((r: any) => ({ ...r, projectId: project.id, projectName: project.name })));
              }
            } catch (e) {
              console.error(`Error fetching attendance for project ${project.id}:`, e);
            }
          }
          return allRecords;
        }
        
        const url = selectedDate 
          ? `/api/projects/${selectedProjectId}/worker-attendance?date=${selectedDate}`
          : `/api/projects/${selectedProjectId}/worker-attendance`;
        const response = await apiRequest(url, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching attendance records:", error);
        return [];
      }
    },
    enabled: !!selectedProjectId && (isAllProjects ? projects.length > 0 : true),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Get all project attendance records (للسجلات القديمة)
  const { data: allProjectAttendance = [] } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "worker-attendance"],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/worker-attendance`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching all attendance records:", error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Fetch specific attendance record for editing
  const { data: attendanceToEdit } = useQuery({
    queryKey: ["/api/worker-attendance", editId],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/worker-attendance/${editId}`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data) {
          return response.data;
        }
        return response || null;
      } catch (error) {
        console.error("Error fetching attendance record for editing:", error);
        return null;
      }
    },
    enabled: !!editId,
  });

  // تصفير بيانات الحضور والبئر عند تغيير المشروع أو التاريخ
  useEffect(() => {
    setAttendanceData({});
    setSelectedWellId(undefined);
  }, [selectedDate, selectedProjectId]);

  // Effect to populate form when editing
  useEffect(() => {
    if (attendanceToEdit && workerId) {
      const newAttendanceData = { ...attendanceData };
      newAttendanceData[workerId] = {
        isPresent: true,
        startTime: attendanceToEdit.startTime,
        endTime: attendanceToEdit.endTime,
        workDescription: attendanceToEdit.workDescription || "",
        workDays: parseFloat(attendanceToEdit.workDays || '0'),
        paidAmount: attendanceToEdit.paidAmount?.toString() || "",
        paymentType: attendanceToEdit.paymentType || "partial"
      };
      setAttendanceData(newAttendanceData);
    }
  }, [attendanceToEdit, workerId]);

  // Delete Attendance Mutation with Optimistic Updates
  const deleteAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onMutate: async (id) => {
      // حفظ المفاتيح الحالية للاستخدام في onError و onSettled
      const projectId = selectedProjectId;
      const date = selectedDate;
      const allKey = ["/api/projects", projectId, "worker-attendance"];
      const dateKey = ["/api/projects", projectId, "worker-attendance", date];

      // إلغاء كلا الـ queries
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: dateKey });

      // حفظ البيانات السابقة لكلا الكاشين
      const previousAllData = queryClient.getQueryData(allKey);
      const previousDateData = queryClient.getQueryData(dateKey);

      // تحديث كاش جميع السجلات
      if (Array.isArray(previousAllData)) {
        queryClient.setQueryData(allKey, 
          previousAllData.filter((record: any) => record.id !== id)
        );
      }

      // تحديث كاش السجلات المحددة بالتاريخ
      if (Array.isArray(previousDateData)) {
        queryClient.setQueryData(dateKey, 
          previousDateData.filter((record: any) => record.id !== id)
        );
      }

      // إرجاع المفاتيح مع البيانات للاستخدام في onError و onSettled
      return { previousAllData, previousDateData, allKey, dateKey };
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف سجل الحضور بنجاح",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
    },
    onError: (error: any, _id, context) => {
      // استعادة كلا الكاشين عند الخطأ باستخدام المفاتيح المحفوظة
      if (context?.previousAllData && context?.allKey) {
        queryClient.setQueryData(context.allKey, context.previousAllData);
      }
      if (context?.previousDateData && context?.dateKey) {
        queryClient.setQueryData(context.dateKey, context.previousDateData);
      }
      console.error('❌ [DeleteAttendance] خطأ في الحذف:', error);
      const errorMessage = error.message || "حدث خطأ أثناء حذف سجل الحضور";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, _id, context) => {
      // تحديث كلا الكاشين من الخادم باستخدام المفاتيح المحفوظة
      if (context?.allKey) {
        queryClient.invalidateQueries({ queryKey: context.allKey });
      }
      if (context?.dateKey) {
        queryClient.invalidateQueries({ queryKey: context.dateKey });
      }
    }
  });

  // Edit Attendance Function - حفظ ID السجل الأصلي للتعديل
  const handleEditAttendance = (record: any) => {
    const worker = Array.isArray(workers) ? workers.find(w => w.id === record.workerId) : null;
    if (worker) {
      const newAttendanceData = { ...attendanceData };
      newAttendanceData[record.workerId] = {
        isPresent: true,
        startTime: record.startTime,
        endTime: record.endTime,
        workDescription: record.workDescription || "",
        workDays: parseFloat(record.workDays || '0'),
        paidAmount: record.paidAmount,
        paymentType: record.paymentType || "partial",
        recordId: record.id, // حفظ ID السجل الأصلي
        recordType: record.recordType || "work"
      };
      setAttendanceData(newAttendanceData);
    }
  };

  const { data: workers = [], isLoading: workersLoading } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceRecords: InsertWorkerAttendance[]) => {
      console.log("💾 بدء حفظ سجلات الحضور للعمال:", attendanceRecords.length);

      // حفظ قيم الإكمال التلقائي قبل العملية الأساسية
      const autocompletePromises = attendanceRecords.flatMap(record => [
        saveAutocompleteValue('workDescriptions', record.workDescription),
        saveAutocompleteValue('paymentTypes', record.paymentType)
      ]).filter(Boolean);

      if (autocompletePromises.length > 0) {
        await Promise.all(autocompletePromises);
      }

      // تحسين منطق الحفظ لتجنب تضارب السجلات الموجودة
      const results = [];
      const errors: Array<{ workerId: string; workerName: string; error: string }> = [];

      for (const record of attendanceRecords) {
        try {
          // التأكد من وجود تاريخ التحضير
          if (!record.attendanceDate && record.date) {
            record.attendanceDate = record.date;
          }

          if (!record.attendanceDate) {
            record.attendanceDate = selectedDate || getCurrentDate();
          }

          console.log(`🔄 محاولة حفظ حضور العامل: ${record.workerId} في التاريخ: ${record.attendanceDate}`);

          // إذا كان نوع السجل = سحب (advance)، فرض workDays = 0
          if ((record as any).recordType === "advance") {
            record.workDays = 0;
            console.log(`💳 سحب مقدم - فرض workDays = 0`);
          }

          // إذا كان هناك recordId (من التعديل)، قم بالتعديل مباشرة
          if ((record as any).recordId) {
            console.log(`📝 تحديث سجل موجود للعامل: ${record.workerId} برقم: ${(record as any).recordId}`);
            const recordToUpdate = { ...record };
            delete (recordToUpdate as any).recordId; // حذف recordId من البيانات المُرسلة
            const updatedRecord = await apiRequest(
              `/api/worker-attendance/${(record as any).recordId}`, 
              "PATCH", 
              recordToUpdate
            );
            results.push(updatedRecord);
          } else {
            // البحث عن سجل موجود (حالة إضافة جديدة)
            try {
              const existingRecordResponse = await apiRequest(
                `/api/projects/${record.projectId}/attendance?date=${record.date}&workerId=${record.workerId}`, 
                "GET"
              );

              const existingRecords = existingRecordResponse?.data || existingRecordResponse || [];
              const existingRecord = Array.isArray(existingRecords) 
                ? existingRecords.find((r: any) => r.workerId === record.workerId)
                : null;

              if (existingRecord) {
                console.log(`📝 سجل موجود بالفعل للعامل: ${record.workerId} في هذا اليوم - يجب التعديل وليس الإنشاء`);
                // منع إنشاء سجل جديد - يجب تعديل السجل الموجود
                const updatedRecord = await apiRequest(
                  `/api/worker-attendance/${existingRecord.id}`, 
                  "PATCH", 
                  record
                );
                results.push(updatedRecord);
              } else {
                console.log(`➕ إنشاء سجل جديد للعامل: ${record.workerId}`);
                const newRecord = await apiRequest("/api/worker-attendance", "POST", record);
                results.push(newRecord);
              }
            } catch (checkError) {
              console.log(`❌ خطأ في البحث عن السجل الموجود - محاولة الإنشاء:`, checkError);
              // إذا فشل التحقق، نحاول إنشاء سجل جديد
              try {
                const newRecord = await apiRequest("/api/worker-attendance", "POST", record);
                results.push(newRecord);
              } catch (createError: any) {
                // إذا فشل الإنشاء (خطأ UNIQUE)، قد يكون هناك سجل موجود
                if (createError.message && createError.message.includes("unique") || createError.message.includes("UNIQUE")) {
                  console.log(`⚠️ هناك سجل موجود بالفعل للعامل ${record.workerId} في هذا اليوم`);
                  // لا نتابع - السجل موجود ولم نتمكن من الوصول إليه
                  throw new Error(`سجل موجود بالفعل للعامل في هذا اليوم. يرجى تحديث الصفحة وتعديل السجل الموجود.`);
                }
                throw createError;
              }
            }
          }

        } catch (error: any) {
          console.error(`❌ فشل في حفظ حضور العامل ${record.workerId}:`, error);
          const worker = workers.find(w => w.id === record.workerId);
          const workerName = worker?.name || 'عامل غير معروف';
          
          // استخراج رسالة الخطأ بشكل أفضل
          let errorMsg = "خطأ غير معروف";
          if (error?.response?.data?.message) {
            errorMsg = error.response.data.message;
          } else if (error?.response?.data?.error) {
            errorMsg = error.response.data.error;
          } else if (error?.message) {
            errorMsg = error.message;
          }
          
          errors.push({
            workerId: record.workerId,
            workerName: workerName,
            error: errorMsg
          });
        }
      }

      console.log(`✅ تم حفظ ${results.length} سجل حضور بنجاح`);
      if (errors.length > 0) {
        console.warn(`⚠️ فشل في حفظ ${errors.length} سجل حضور:`, errors);
      }

      return { 
        successful: results, 
        failed: errors,
        totalProcessed: attendanceRecords.length 
      };
    },
    onSuccess: async (result) => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects", selectedProjectId, "worker-attendance"] });

      const { successful, failed, totalProcessed } = result;

      if (failed.length === 0) {
        // جميع العمليات نجحت
        toast({
          title: "✅ تم الحفظ بنجاح",
          description: `تم حفظ حضور ${successful.length} عامل بنجاح`,
        });
      } else if (successful.length > 0) {
        // بعض العمليات نجحت وبعضها فشل
        const failedDetails = failed.map((f: any) => `• ${f.workerName}: ${f.error}`).join('\n');
        toast({
          title: "⚠️ تم الحفظ جزئياً",
          description: `نجح: ${successful.length} عامل\nفشل: ${failed.length} عامل\n\n${failedDetails}`,
          variant: "default",
        });
        console.error("تفاصيل الأخطاء:", failed);
      } else {
        // جميع العمليات فشلت
        const failedDetails = failed.map((f: any) => `• ${f.workerName}: ${f.error}`).join('\n');
        toast({
          title: "❌ فشل الحفظ",
          description: `فشل في حفظ جميع سجلات الحضور:\n\n${failedDetails}`,
          variant: "destructive",
        });
      }

      // مسح البيانات المحفوظة فقط للعمال الذين تم حفظهم بنجاح
      if (successful.length > 0) {
        setAttendanceData(prevData => {
          const newData = { ...prevData };
          successful.forEach((record: any) => {
            const savedRecord = record?.data || record;
            if (savedRecord?.workerId) {
              delete newData[savedRecord.workerId];
            }
          });
          return newData;
        });
      }
    },
    onError: async (error: any, attendanceRecords) => {
      // حفظ قيم الإكمال التلقائي حتى في حالة الخطأ
      const autocompletePromises = attendanceRecords.flatMap(record => [
        saveAutocompleteValue('workDescriptions', record.workDescription),
        saveAutocompleteValue('paymentTypes', record.paymentType)
      ]).filter(Boolean);

      if (autocompletePromises.length > 0) {
        await Promise.all(autocompletePromises);
        // تحديث كاش autocomplete
        queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      }

      console.error("Error saving attendance:", error);
      let errorMessage = "حدث خطأ أثناء حفظ الحضور";

      // التحقق من رسالة الخطأ المحددة
      if (error?.response?.data?.error || error?.message) {
        const serverError = error?.response?.data?.error || error?.message;
        if (serverError.includes("تم تسجيل حضور هذا العامل مسبقاً")) {
          errorMessage = "تم تسجيل حضور هذا العامل مسبقاً في هذا التاريخ";
        } else {
          errorMessage = serverError;
        }
      }

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });


  const handleAttendanceChange = (workerId: string, attendance: AttendanceData[string]) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker && attendance.isPresent && attendance.workDays === undefined) {
      attendance.workDays = 1; // Default to 1 day if not set
      const dailyWage = parseFloat(worker.dailyWage || "0");
      attendance.actualWage = dailyWage * (attendance.workDays || 0);
      attendance.totalPay = attendance.actualWage;
      attendance.remainingAmount = attendance.totalPay - parseFloat(attendance.paidAmount || "0");
    }
    
    setAttendanceData(prev => ({
      ...prev,
      [workerId]: attendance,
    }));
  };

  // تطبيق الإعدادات المشتركة على جميع العمال المحددين
  const applyBulkSettings = () => {
    const newAttendanceData = { ...attendanceData };

    Object.keys(newAttendanceData).forEach(workerId => {
      if (newAttendanceData[workerId].isPresent) {
        newAttendanceData[workerId] = {
          ...newAttendanceData[workerId],
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          workDays: bulkSettings.workDays,
          paymentType: bulkSettings.paymentType,
          paidAmount: bulkSettings.paidAmount,
          workDescription: bulkSettings.workDescription
        };
      }
    });

    setAttendanceData(newAttendanceData);

    toast({
      title: "تم التطبيق",
      description: "تم تطبيق الإعدادات على جميع العمال المحددين",
    });
  };

  // تحديد/إلغاء تحديد جميع العمال
  const toggleAllWorkers = (isPresent: boolean) => {
    const newAttendanceData: AttendanceData = {};

    workers.forEach(worker => {
      if (isPresent) {
        newAttendanceData[worker.id] = {
          isPresent: true,
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          workDays: bulkSettings.workDays,
          paymentType: bulkSettings.paymentType,
          paidAmount: bulkSettings.paidAmount,
          workDescription: bulkSettings.workDescription
        };
      } else {
        newAttendanceData[worker.id] = {
          isPresent: false
        };
      }
    });
    setAttendanceData(newAttendanceData);
  };

  const handleSaveAttendance = () => {
    // التحقق من اختيار المشروع
    if (!selectedProjectId || selectedProjectId === ALL_PROJECTS_ID) {
      toast({
        title: "⚠️ خطأ في البيانات",
        description: "يرجى اختيار مشروع محدد من القائمة أعلاه قبل تسجيل الحضور",
        variant: "destructive",
      });
      return;
    }

    // التحقق من اختيار التاريخ
    if (!selectedDate) {
      toast({
        title: "⚠️ خطأ في البيانات",
        description: "يرجى اختيار تاريخ الحضور من الفلتر أعلاه",
        variant: "destructive",
      });
      return;
    }

    // التحقق من أن جميع السجلات الحاضرة من نوع "work" لها أيام عمل > 0
    // أما "advance" فيجب أن يكون workDays = 0 ومبلغ > 0
    const invalidRecords = Object.entries(attendanceData)
      .filter(([_, data]) => {
        if (!data.isPresent) return false;
        const recordType = (data as any).recordType || "work";
        
        // إذا كان عمل عادي - يجب أن يكون هناك أيام
        if (recordType === "work" && (!data.workDays || data.workDays <= 0)) {
          return true;
        }
        // إذا كان سحب مقدم - يجب أن يكون هناك مبلغ مسحوب فقط
        if (recordType === "advance" && (!data.paidAmount || parseFloat(data.paidAmount) <= 0)) {
          return true;
        }
        return false;
      });

    if (invalidRecords.length > 0) {
      const hasWorkErrors = invalidRecords.some(([_, data]) => {
        const recordType = (data as any).recordType || "work";
        return recordType === "work";
      });
      const hasAdvanceErrors = invalidRecords.some(([_, data]) => {
        const recordType = (data as any).recordType || "work";
        return recordType === "advance";
      });

      let errorMsg = "";
      const errorDetails: string[] = [];
      
      if (hasWorkErrors) {
        errorMsg += "• يرجى إدخال عدد أيام عمل أكبر من صفر للعمل العادي\n";
        invalidRecords.forEach(([workerId, data]) => {
          const recordType = (data as any).recordType || "work";
          if (recordType === "work") {
            const worker = workers.find(w => w.id === workerId);
            errorDetails.push(`  - ${worker?.name || 'عامل غير معروف'}: يجب إدخال أيام العمل`);
          }
        });
      }
      
      if (hasAdvanceErrors) {
        errorMsg += "• يرجى إدخال مبلغ مسحوب أكبر من صفر للسحب المقدم\n";
        invalidRecords.forEach(([workerId, data]) => {
          const recordType = (data as any).recordType || "work";
          if (recordType === "advance") {
            const worker = workers.find(w => w.id === workerId);
            errorDetails.push(`  - ${worker?.name || 'عامل غير معروف'}: يجب إدخال المبلغ المسحوب`);
          }
        });
      }

      toast({
        title: "⚠️ خطأ في البيانات",
        description: errorMsg + (errorDetails.length > 0 ? "\n" + errorDetails.join("\n") : ""),
        variant: "destructive",
      });
      return;
    }

    // التحقق من وجود عمال محددين كحاضرين
    const presentWorkers = Object.entries(attendanceData).filter(([_, data]) => data.isPresent);
    
    if (presentWorkers.length === 0) {
      toast({
        title: "⚠️ تنبيه",
        description: "لم يتم تحديد أي عامل كحاضر. يرجى تحديد العمال الحاضرين أولاً.",
        variant: "destructive",
      });
      return;
    }

    const attendanceRecords: any[] = Object.entries(attendanceData)
      .filter(([_, data]) => {
        if (!data.isPresent) return false;
        const recordType = (data as any).recordType || "work";
        
        // للعمل العادي: workDays > 0
        if (recordType === "work") {
          return data.workDays && data.workDays > 0;
        }
        // للسحب المقدم: paidAmount > 0 فقط
        return data.paidAmount && parseFloat(data.paidAmount) > 0;
      })
      .map(([workerId, data]) => {
        const worker = workers.find(w => w.id === workerId);
        const dailyWage = parseFloat(worker?.dailyWage || "0");
        const recordType = (data as any).recordType || "work";
        
        // للسحب المقدم: workDays = 0 دائماً
        const workDays = recordType === "advance" ? 0 : (data.workDays || 0);

        // حساب الأجر الأساسي
        const baseWage = dailyWage * workDays;

        // حساب الوقت الإضافي
        const overtime = parseFloat(String(data.overtime || 0));
        const overtimeRate = parseFloat(String(data.overtimeRate || 0));
        const overtimePay = overtime * overtimeRate;

        // حساب إجمالي الدفع
        // للسحب المقدم: totalPay = 0 (لأنه لم يعمل)
        const totalPay = recordType === "advance" ? 0 : Math.max(0, baseWage + overtimePay);

        // حساب المبلغ المدفوع والمتبقي
        const paidAmount = parseFloat(data.paidAmount || "0");
        // للسحب المقدم: المتبقي = سالب المبلغ المسحوب (دين على العامل)
        const remainingAmount = recordType === "advance" 
          ? -paidAmount 
          : (data.paymentType === 'credit' ? totalPay : (totalPay - paidAmount));

        // حساب ساعات العمل
        const calculateWorkingHours = () => {
          if (!data.startTime || !data.endTime) return 0;
          const start = new Date(`2000-01-01T${data.startTime}:00`);
          const end = new Date(`2000-01-01T${data.endTime}:00`);
          let diffMs = end.getTime() - start.getTime();

          // التعامل مع الورديات الليلية
          if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000;
          }

          return Math.max(0, diffMs / (1000 * 60 * 60));
        };

        const recordData: any = {
          projectId: selectedProjectId,
          workerId,
          date: selectedDate,
          attendanceDate: selectedDate,
          startTime: data.startTime || "07:00",
          endTime: data.endTime || "15:00",
          workDescription: data.workDescription || "",
          isPresent: true,
          workDays: workDays,
          dailyWage: worker?.dailyWage || "0",
          hoursWorked: calculateWorkingHours().toString(),
          overtime: overtime.toString(),
          overtimeRate: overtimeRate.toString(),
          actualWage: baseWage.toString(),
          totalPay: totalPay.toString(),
          paidAmount: paidAmount.toString(),
          remainingAmount: remainingAmount.toString(),
          paymentType: data.paymentType || "partial",
          notes: data.notes || "",
          wellId: selectedWellId || null,
        };

        // إذا كان هناك recordId، أضفه للحفظ حتى نعرف أنه تعديل
        if ((data as any).recordId) {
          recordData.recordId = (data as any).recordId;
        }

        return recordData;
      });

    if (attendanceRecords.length === 0) {
      toast({
        title: "⚠️ لا توجد سجلات صالحة للحفظ",
        description: "يرجى التأكد من:\n• تحديد عمال كحاضرين\n• إدخال عدد الأيام للعمل العادي\n• إدخال المبلغ المسحوب للسحب المقدم",
        variant: "destructive",
      });
      return;
    }

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  // حساب إحصائيات الحضور من البيانات المجلوبة
  const todayRecords = Array.isArray(todayAttendance) ? todayAttendance : [];

  // فلترة العمال حسب نص البحث
  const filteredWorkers = useMemo(() => {
    if (!searchValue.trim()) return workers;
    const searchLower = searchValue.toLowerCase().trim();
    return workers.filter(worker => 
      worker.name?.toLowerCase().includes(searchLower) ||
      worker.phone?.toLowerCase().includes(searchLower) ||
      worker.type?.toLowerCase().includes(searchLower)
    );
  }, [workers, searchValue]);

  // فلترة سجلات الحضور حسب نص البحث ونطاق التاريخ
  const filteredAttendance = useMemo(() => {
    let result = todayRecords;
    
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase().trim();
      result = result.filter(record => {
        const worker = workers.find(w => w.id === record.workerId);
        return (
          worker?.name?.toLowerCase().includes(searchLower) ||
          record.workDescription?.toLowerCase().includes(searchLower) ||
          record.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (filterValues.dateRange?.from || filterValues.dateRange?.to) {
      result = result.filter(record => {
        const recordDate = new Date(record.attendanceDate || record.date);
        if (filterValues.dateRange.from) {
          const fromDate = new Date(filterValues.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (recordDate < fromDate) return false;
        }
        if (filterValues.dateRange.to) {
          const toDate = new Date(filterValues.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (recordDate > toDate) return false;
        }
        return true;
      });
    }

    if (filterValues.type && filterValues.type !== 'all') {
      result = result.filter(record => {
        const worker = workers.find(w => w.id === record.workerId);
        return worker?.type === filterValues.type;
      });
    }

    return result;
  }, [todayRecords, workers, searchValue, filterValues.dateRange, filterValues.type]);

  const stats = useMemo(() => {
    const presentWorkers = filteredAttendance.length;
    const totalWorkDays = filteredAttendance.reduce((sum, record) => sum + parseFloat(record.workDays || '0'), 0);

    let totalEarned = 0;
    let totalPaid = 0;
    let totalTransfers = 0;

    filteredAttendance.forEach(record => {
      const worker = workers.find(w => w.id === record.workerId);
      const currentDailyWage = parseFloat(worker?.dailyWage || record.dailyWage || '0');
      const workDays = parseFloat(record.workDays || '0');
      const earned = currentDailyWage * workDays;
      const paid = parseFloat(record.paidAmount || '0');
      totalEarned += earned;
      totalPaid += paid;
      if (record.transfers) {
        totalTransfers += parseFloat(record.transfers);
      }
    });

    const totalRemaining = totalEarned - totalPaid - totalTransfers;

    return {
      totalWorkers: filteredWorkers.length,
      presentWorkers,
      totalWorkDays,
      totalEarned,
      totalPaid,
      totalRemaining,
      // للملخص
      allWorkersCount: workers.length,
      allRecordsCount: todayRecords.length,
    };
  }, [filteredAttendance, filteredWorkers, workers, todayRecords]);

  // تكوين صفوف الإحصائيات الموحدة
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي العمال',
          value: stats.totalWorkers,
          icon: Users,
          color: 'blue',
        },
        {
          key: 'present',
          label: 'الحاضرون اليوم',
          value: stats.presentWorkers,
          icon: CheckCircle2,
          color: 'green',
        },
        {
          key: 'days',
          label: 'إجمالي الأيام',
          value: stats.totalWorkDays.toFixed(2),
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
          key: 'earned',
          label: 'المستحق',
          value: formatCurrency(stats.totalEarned),
          icon: DollarSign,
          color: 'blue',
        },
        {
          key: 'paid',
          label: 'المدفوع',
          value: formatCurrency(stats.totalPaid),
          icon: CheckCircle2,
          color: 'green',
        },
        {
          key: 'remaining',
          label: 'المتبقي',
          value: formatCurrency(stats.totalRemaining),
          icon: DollarSign,
          color: stats.totalRemaining >= 0 ? 'purple' : 'red',
        },
      ]
    }
  ], [stats]);

  // تكوين الفلاتر
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
      label: 'المهنة',
      type: 'select',
      placeholder: 'جميع المهن',
      options: [
        { value: 'all', label: 'جميع المهن' },
        ...Array.from(new Set(workers.map(w => w.type))).filter(Boolean).map(type => ({
          value: type,
          label: type
        }))
      ]
    },
  ], [workers]);

  return (
    <div className="p-4 space-y-4">

      {/* لوحة الإحصائيات والفلترة الموحدة */}
      {selectedProjectId && (
        <UnifiedFilterDashboard
          statsRows={statsRowsConfig}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="ابحث عن عامل..."
          showSearch={true}
          filters={filtersConfig}
          filterValues={{ 
            date: selectedDate ? (() => {
              const [year, month, day] = selectedDate.split('-').map(Number);
              return new Date(year, month - 1, day, 12, 0, 0, 0);
            })() : undefined
          }}
          onFilterChange={(key, value) => {
            if (key === 'date') {
              if (value instanceof Date) {
                const year = value.getFullYear();
                const month = String(value.getMonth() + 1).padStart(2, '0');
                const day = String(value.getDate()).padStart(2, '0');
                setSelectedDate(`${year}-${month}-${day}`);
              } else {
                setSelectedDate(null);
              }
            }
          }}
          onReset={handleResetFilters}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          resultsSummary={searchValue ? {
            totalCount: stats.allRecordsCount,
            filteredCount: stats.presentWorkers,
            totalLabel: 'نتائج البحث',
            filteredLabel: 'من',
            totalValue: stats.totalEarned,
            totalValueLabel: 'إجمالي المستحق',
            unit: 'ر.ي',
          } : undefined}
        />
      )}


      {/* نموذج الإدخال القابل للطي */}
      {workers.length > 0 && (
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
          <Card className="mb-4">
            {/* رسالة تنبيه عند عدم تحديد المشروع أو التاريخ */}
            {(!selectedProjectId || selectedProjectId === ALL_PROJECTS_ID || !selectedDate) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 m-4 rounded">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                      ⚠️ يرجى إكمال البيانات المطلوبة
                    </h3>
                    <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                      {(!selectedProjectId || selectedProjectId === ALL_PROJECTS_ID) && (
                        <p>• اختر مشروعاً محدداً من القائمة أعلاه</p>
                      )}
                      {!selectedDate && (
                        <p>• اختر تاريخ الحضور من الفلتر أعلاه</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">نموذج تسجيل الحضور</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isFormOpen ? "اضغط للإخفاء" : "اضغط للعرض"}
                  </span>
                  {isFormOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 bg-muted/30 border-b space-y-3">
                <WellSelector
                  projectId={selectedProjectId}
                  value={selectedWellId}
                  onChange={setSelectedWellId}
                  optional={true}
                />
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-reverse space-x-2">
                                            <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSharedSettings(!showSharedSettings)}
                        className="px-2 py-1 h-8"
                        data-testid="toggle-shared-settings"
                      >
                        {showSharedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showSharedSettings && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAllWorkers(true)}
                          className="text-xs"
                        >
                          تحديد الكل
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAllWorkers(false)}
                          className="text-xs"
                        >
                          إلغاء الكل
                        </Button>
                        <Button
                          size="sm"
                          onClick={applyBulkSettings}
                          className="text-xs"
                        >
                          تطبيق على المحدد
                        </Button>
                      </div>
                    )}
                  </div>

                  {showSharedSettings && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">وقت البدء</Label>
                          <Input
                            type="time"
                            value={bulkSettings.startTime}
                            onChange={(e) => setBulkSettings(prev => ({ ...prev, startTime: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">وقت الانتهاء</Label>
                          <Input
                            type="time"
                            value={bulkSettings.endTime}
                            onChange={(e) => setBulkSettings(prev => ({ ...prev, endTime: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">عدد الأيام</Label>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              min="0"
                              max="10.0"
                              value={bulkSettings.workDays || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBulkSettings(prev => ({ 
                                  ...prev, 
                                  workDays: value === "" ? 0 : parseFloat(value) || 0 
                                }));
                              }}
                              placeholder="0"
                              className="mt-1 english-numbers"
                              style={{ direction: 'ltr', unicodeBidi: 'embed' }}
                            />
                            {bulkSettings.workDays !== 0 && (
                              <button
                                onClick={() => setBulkSettings(prev => ({ ...prev, workDays: 0 }))}
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                title="مسح"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">نوع الدفع</Label>
                          <Select
                            value={bulkSettings.paymentType}
                            onValueChange={(value) => setBulkSettings(prev => ({ ...prev, paymentType: value }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">دفع كامل</SelectItem>
                              <SelectItem value="partial">دفع جزئي</SelectItem>
                              <SelectItem value="credit">على الحساب</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {bulkSettings.paymentType !== "credit" && (
                          <div>
                            <Label className="text-xs text-muted-foreground">المبلغ المدفوع</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={bulkSettings.paidAmount}
                              onChange={(e) => setBulkSettings(prev => ({ ...prev, paidAmount: e.target.value }))}
                              className="mt-1 english-numbers"
                              style={{ direction: 'ltr', unicodeBidi: 'embed' }}
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">وصف العمل</Label>
                          <AutocompleteInput
                            value={bulkSettings.workDescription}
                            onChange={(value) => setBulkSettings(prev => ({ ...prev, workDescription: value }))}
                            placeholder="اكتب وصف العمل..."
                            category="workDescriptions"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                {/* Worker List */}
                {workersLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">جاري تحميل العمال...</p>
                  </div>
                ) : workers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">لا توجد عمال مسجلين</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredWorkers.length === 0 && searchValue ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">لا توجد نتائج للبحث "{searchValue}"</p>
                      </div>
                    ) : (
                      filteredWorkers.map((worker) => (
                        <EnhancedWorkerCard
                          key={worker.id}
                          worker={worker}
                          attendance={attendanceData[worker.id] || { isPresent: false }}
                          onAttendanceChange={(attendance) => handleAttendanceChange(worker.id, attendance)}
                          selectedDate={selectedDate ?? undefined}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-6">
                  <Button
                    onClick={handleSaveAttendance}
                    disabled={saveAttendanceMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Save className="ml-2 h-4 w-4" />
                    {saveAttendanceMutation.isPending ? "جاري الحفظ..." : "حفظ الحضور"}
                  </Button>
                </div>
              </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}

      {/* Today's Attendance List */}
      {selectedProjectId && (
        <div className="mt-6">
          {filteredAttendance.length > 0 ? (
            <UnifiedCardGrid columns={2}>
              {filteredAttendance.map((record: any) => {
                const worker = workers.find(w => w.id === record.workerId);
                const currentDailyWage = parseFloat(worker?.dailyWage || record.dailyWage || '0');
                const workDays = parseFloat(record.workDays || '0');
                const calculatedActualWage = currentDailyWage * workDays;
                const paidAmount = parseFloat(record.paidAmount || '0');
                const remainingAmount = calculatedActualWage - paidAmount;
                const projectName = record.projectName || projects.find(p => p.id === record.projectId)?.name;
                return (
                  <UnifiedCard
                    key={record.id}
                    title={worker?.name || record.workerId}
                    subtitle={isAllProjects && projectName ? `${projectName} - ${record.date || record.attendanceDate}` : (record.date || record.attendanceDate)}
                    titleIcon={User}
                    headerColor="#22c55e"
                    badges={[
                      { label: 'حاضر', variant: 'success' },
                      ...(isAllProjects && projectName ? [{ label: projectName, variant: 'outline' as const }] : [])
                    ]}
                    fields={[
                      {
                        label: "الوقت",
                        value: `${record.startTime || 'غير محدد'} - ${record.endTime || 'غير محدد'}`,
                        icon: Clock,
                        color: "info",
                      },
                      {
                        label: "عدد الأيام",
                        value: workDays.toString(),
                        icon: Calendar,
                        color: "warning",
                      },
                      {
                        label: "الراتب اليومي",
                        value: formatCurrency(currentDailyWage),
                        icon: DollarSign,
                        color: "default",
                      },
                      {
                        label: "المستحق",
                        value: formatCurrency(calculatedActualWage),
                        icon: DollarSign,
                        color: "info",
                        emphasis: true,
                      },
                      {
                        label: "المدفوع",
                        value: formatCurrency(paidAmount),
                        icon: CheckCircle2,
                        color: "success",
                      },
                      {
                        label: "المتبقي",
                        value: formatCurrency(remainingAmount),
                        icon: DollarSign,
                        color: remainingAmount > 0 ? "danger" : "success",
                        emphasis: true,
                      },
                    ]}
                    actions={[
                      {
                        icon: Edit2,
                        label: "تعديل",
                        onClick: () => handleEditAttendance(record),
                        color: "blue",
                      },
                      {
                        icon: Trash2,
                        label: "حذف",
                        onClick: () => deleteAttendanceMutation.mutate(record.id),
                        color: "red",
                        disabled: deleteAttendanceMutation.isPending,
                      },
                    ]}
                    footer={record.workDescription ? (
                      <p className="text-sm text-muted-foreground">{record.workDescription}</p>
                    ) : undefined}
                    compact
                  />
                );
              })}
            </UnifiedCardGrid>
          ) : null}
        </div>
      )}
    </div>
  );
}