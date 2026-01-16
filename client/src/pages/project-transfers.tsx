import { DatePickerField } from "@/components/ui/date-picker-field";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectFundTransferSchema } from "@shared/schema";
import type { InsertProjectFundTransfer, ProjectFundTransfer, Project } from "@shared/schema";
import { ArrowRightLeft, ArrowRight, Calendar, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, MoreVertical, Plus, ChevronRight, RefreshCw, Download, Upload, Settings, BarChart3, ListChecks, Building2, FileText, X } from "lucide-react";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { cn } from "@/lib/utils";
import { z } from "zod";

type TransferFormData = z.infer<typeof insertProjectFundTransferSchema>;

export default function ProjectTransfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const [editingTransfer, setEditingTransfer] = useState<ProjectFundTransfer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter Configs
  const filterConfigs: FilterConfig[] = [
    {
      key: 'reason',
      label: 'السبب',
      type: 'select',
      placeholder: 'اختر السبب',
      options: [
        { value: 'payroll', label: 'الرواتب' },
        { value: 'materials', label: 'المواد' },
        { value: 'tools', label: 'الأدوات' },
        { value: 'maintenance', label: 'الصيانة' },
        { value: 'emergency', label: 'طارئ' },
        { value: 'other', label: 'أخرى' },
      ]
    },
    {
      key: 'dateRange',
      label: 'الفترة الزمنية',
      type: 'date-range',
      placeholder: 'اختر الفترة'
    }
  ];

  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    reason: '',
    dateRange: { from: undefined, to: undefined }
  });

  const onSearchChange = (value: string) => setSearchValue(value);
  const onFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };
  const onReset = () => {
    setSearchValue('');
    setFilterValues({ reason: '', dateRange: { from: undefined, to: undefined } });
  };

  // Fetch Projects with Stats (للحصول على الرصيد الحالي)
  const { data: projectsWithStats = [] } = useQuery<any[]>({
    queryKey: ["/api/projects/with-stats"],
    queryFn: async () => {
      const response = await apiRequest('/api/projects/with-stats', 'GET');
      return response.data || response || [];
    },
  });

  // استخدام المشاريع مع الإحصائيات
  const projects = projectsWithStats;

  // Fetch All Transfers
  const { data: transfersResponse = { data: [] }, isLoading: transfersLoading, refetch } = useQuery<any>({
    queryKey: ["/api/project-fund-transfers"],
    queryFn: async () => {
      const response = await apiRequest('/api/project-fund-transfers', 'GET');
      return response || { data: [] };
    },
  });

  const allTransfers = useMemo(() => {
    return Array.isArray(transfersResponse?.data) ? transfersResponse.data : [];
  }, [transfersResponse]);

  // Filter transfers based on search and filters
  const filteredTransfers = useMemo(() => {
    let filtered = allTransfers;

    if (searchValue) {
      const search = searchValue.toLowerCase();
      filtered = filtered.filter(t => 
        t.transferReason?.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        projects.find(p => p.id === t.fromProjectId)?.name.toLowerCase().includes(search) ||
        projects.find(p => p.id === t.toProjectId)?.name.toLowerCase().includes(search)
      );
    }

    if (filterValues.reason) {
      filtered = filtered.filter(t => {
        if (!t.transferReason) return false;
        // Search in the display label or the value itself
        const option = filterConfigs.find(c => c.key === 'reason')?.options?.find(opt => opt.value === filterValues.reason);
        return t.transferReason === filterValues.reason || t.transferReason === option?.label;
      });
    }

    if (filterValues.dateRange?.from || filterValues.dateRange?.to) {
      const from = filterValues.dateRange.from ? new Date(filterValues.dateRange.from).getTime() : 0;
      const to = filterValues.dateRange.to ? new Date(filterValues.dateRange.to).getTime() : Infinity;
      filtered = filtered.filter(t => {
        const date = new Date(t.transferDate).getTime();
        return date >= from && date <= to;
      });
    }

    return filtered;
  }, [allTransfers, searchValue, filterValues, projects]);

  // Calculate Stats
  const stats = useMemo(() => {
    const transfers = Array.isArray(allTransfers) ? allTransfers : [];
    return {
      total: transfers.length,
      totalAmount: transfers.reduce((sum, t) => sum + (parseFloat(t.amount?.toString() || '0') || 0), 0),
      filtered: filteredTransfers.length,
      outgoing: filteredTransfers.filter(t => !filteredTransfers.some(other => other.fromProjectId === other.toProjectId)).length,
      incoming: filteredTransfers.filter(t => filteredTransfers.some(other => other.toProjectId === other.fromProjectId)).length,
    };
  }, [allTransfers, filteredTransfers]);

  // Mutations
  const createTransferMutation = useMutation({
    mutationFn: async (data: InsertProjectFundTransfer) => {
      if (editingTransfer) {
        return apiRequest(`/api/project-fund-transfers/${editingTransfer.id}`, "PATCH", data);
      }
      return apiRequest("/api/project-fund-transfers", "POST", data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/project-fund-transfers"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({
        title: "تم بنجاح",
        description: editingTransfer ? "تم تحديث عملية الترحيل" : "تم إنشاء عملية ترحيل جديدة",
      });
      form.reset();
      setEditingTransfer(null);
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حفظ عملية الترحيل",
        variant: "destructive",
      });
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ [Client] حذف التحويل:', id);
      const result = await apiRequest(`/api/project-fund-transfers/${id}`, "DELETE");
      console.log('✅ [Client] نتيجة الحذف:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('✅ [Client] نجح الحذف، تحديث البيانات...', variables);
      // تحديث البيانات مباشرة من البيانات المحفوظة
      queryClient.setQueryData(["/api/project-fund-transfers"], (oldData: any) => {
        console.log('📊 [Client] البيانات القديمة:', oldData);
        const filtered = oldData?.data?.filter((t: any) => t.id !== variables) || [];
        const result = { ...oldData, data: filtered, success: true };
        console.log('📊 [Client] البيانات الجديدة:', result);
        return result;
      });

      // إبطال الاستعلامات
      queryClient.refetchQueries({ queryKey: ["/api/project-fund-transfers"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });

      toast({
        title: "تم الحذف",
        description: "تم حذف عملية الترحيل بنجاح",
      });
    },
    onError: (error: any) => {
      console.error('❌ [Client] خطأ في الحذف:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف عملية الترحيل",
        variant: "destructive",
      });
    },
  });

  // Form
  const form = useForm<TransferFormData>({
    resolver: zodResolver(insertProjectFundTransferSchema),
    defaultValues: {
      fromProjectId: "",
      toProjectId: "",
      amount: "",
      transferReason: "",
      transferDate: new Date().toISOString().split('T')[0],
      description: "",
    },
  });

  // تعيين إجراء الزر العائم لفتح نموذج الإضافة
  useEffect(() => {
    const handleAddTransfer = () => {
      setEditingTransfer(null);
      form.reset({
        fromProjectId: "",
        toProjectId: "",
        amount: "",
        transferReason: "",
        transferDate: new Date().toISOString().split('T')[0],
        description: "",
      });
      setShowCreateModal(true);
    };

    setFloatingAction(handleAddTransfer, "إضافة ترحيل");
    return () => setFloatingAction(null);
  }, [setFloatingAction, form]);

  const onSubmit = (data: TransferFormData) => {
    if (!data.fromProjectId || !data.toProjectId || data.fromProjectId === "all" || data.toProjectId === "all") {
      toast({
        title: "خطأ",
        description: "يجب تحديد مشروع محدد للتحويل. لا يمكن استخدام 'جميع المشاريع' كطرف في التحويل.",
        variant: "destructive",
      });
      return;
    }

    // التحقق من أن المشروع المرسل مختلف عن المشروع المستقبل
    if (data.fromProjectId === data.toProjectId) {
      toast({
        title: "خطأ",
        description: "لا يمكن الترحيل من وإلى نفس المشروع",
        variant: "destructive",
      });
      return;
    }

    createTransferMutation.mutate(data);
  };

  const startEdit = (transfer: ProjectFundTransfer) => {
    setEditingTransfer(transfer);
    form.reset({
      fromProjectId: transfer.fromProjectId,
      toProjectId: transfer.toProjectId,
      amount: transfer.amount,
      transferReason: transfer.transferReason || "",
      transferDate: transfer.transferDate,
      description: transfer.description || "",
    });
    setShowCreateModal(true);
  };

  const getProjectName = (projectId: string) => {
    return projects.find((p: Project) => p.id === projectId)?.name || "غير محدد";
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') {
      const num = parseFloat(String(amount));
      if (isNaN(num)) return '0 ر.ي';
      amount = num;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  // تكوين صفوف الإحصائيات للمكون الموحد
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: "إجمالي العمليات",
          value: stats.total,
          icon: ArrowRightLeft,
          color: "orange"
        },
        {
          key: 'totalAmount',
          label: "إجمالي المبالغ",
          value: stats.totalAmount,
          icon: DollarSign,
          color: "green",
          formatter: formatCurrency
        },
        {
          key: 'filtered',
          label: "النتائج المفلترة",
          value: stats.filtered,
          icon: TrendingDown,
          color: "blue"
        }
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'today',
          label: "عمليات اليوم",
          value: filteredTransfers.filter(t => new Date(t.transferDate).toDateString() === new Date().toDateString()).length,
          icon: TrendingUp,
          color: "purple"
        },
        {
          key: 'average',
          label: "متوسط العملية",
          value: stats.total > 0 ? stats.totalAmount / stats.total : 0,
          icon: Calendar,
          color: "red",
          formatter: formatCurrency
        },
        {
          key: 'projects',
          label: "المشاريع النشطة",
          value: projects.length,
          icon: BarChart3,
          color: "indigo"
        }
      ]
    }
  ], [stats, filteredTransfers, projects]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col" dir="rtl">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3 md:px-6 md:py-6 w-full space-y-4 md:space-y-8 pb-24 md:pb-20">
          {/* شريط الفلترة والإحصائيات الموحد */}
          <UnifiedFilterDashboard
            statsRows={statsRowsConfig}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder="ابحث عن التحويلات..."
            showSearch={true}
            filters={filterConfigs}
            filterValues={filterValues}
            onFilterChange={onFilterChange}
            onReset={onReset}
            onRefresh={() => refetch()}
            isRefreshing={transfersLoading}
          />

          {/* List Tab Content - Always Displayed */}
          <div className="space-y-4 md:space-y-6">
              {transfersLoading ? (
                <div className="space-y-4 md:space-y-6">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="bg-white dark:bg-slate-900">
                      <CardContent className="p-4 md:p-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredTransfers.length === 0 ? (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <ArrowRightLeft className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">لا توجد تحويلات</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ابدأ بإضافة تحويل عهدة جديد</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <UnifiedCardGrid columns={2}>
                  {filteredTransfers.map(transfer => (
                    <UnifiedCard
                      key={transfer.id}
                      title={formatCurrency(parseFloat(transfer.amount?.toString() || '0'))}
                      titleIcon={DollarSign}
                      headerColor="#f59e0b"
                      badges={[
                        { label: new Date(transfer.transferDate).toLocaleDateString('en-GB'), variant: 'outline' as const }
                      ]}
                      fields={[
                        {
                          label: "المشروع",
                          value: `${getProjectName(transfer.fromProjectId)} ⬅️ ${getProjectName(transfer.toProjectId)}`,
                          icon: Building2,
                          color: "info"
                        },
                        {
                          label: "السبب",
                          value: transfer.transferReason || "غير محدد",
                          icon: FileText,
                          color: "default"
                        },
                        {
                          label: "التاريخ",
                          value: new Date(transfer.transferDate).toLocaleDateString('en-GB'),
                          icon: Calendar,
                          color: "info"
                        }
                      ]}
                      actions={[
                        {
                          icon: Edit,
                          label: "تعديل",
                          onClick: () => startEdit(transfer),
                          color: "blue"
                        },
                        {
                          icon: Trash2,
                          label: "حذف",
                          onClick: () => deleteTransferMutation.mutate(transfer.id),
                          color: "red"
                        }
                      ]}
                      compact
                    />
                  ))}
                </UnifiedCardGrid>
              )}
          </div>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[999999] flex items-end md:items-center justify-center p-0 md:p-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl w-full max-h-[92vh] md:max-h-[85vh] md:w-full md:max-w-2xl rounded-t-[2rem] md:rounded-xl overflow-hidden flex flex-col mb-0 md:mb-0">
            <CardHeader className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white text-base md:text-lg">
                  {editingTransfer ? 'تعديل عملية الترحيل' : 'إضافة عملية ترحيل جديدة'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTransfer(null);
                    form.reset();
                  }}
                  className="h-8 w-8 p-0 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                      {/* Row 1: Amount and Date */}
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <FormField
                          control={form.control}
                          name="transferReason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">السبب</FormLabel>
                              <FormControl>
                                <AutocompleteInput
                                  category="transferTypes"
                                  placeholder="أدخل سبب التحويل"
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  className="h-10 md:h-11 border-2 text-xs md:text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">الوصف / الملاحظات</FormLabel>
                              <FormControl>
                                <AutocompleteInput
                                  category="notes"
                                  placeholder="أدخل وصفاً إضافياً"
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  className="h-10 md:h-11 border-2 text-xs md:text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Row 2: Projects */}
                      <div className="grid grid-cols-2 gap-2 md:gap-4">
                        <FormField
                          control={form.control}
                          name="fromProjectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">المشروع المرسل *</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="h-10 md:h-11 border-2 text-xs md:text-sm">
                                    <SelectValue placeholder="اختر المشروع المرسل" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[100]">
                                    {projects.map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="toProjectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">المشروع المستقبل *</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="h-10 md:h-11 border-2 text-xs md:text-sm">
                                    <SelectValue placeholder="اختر المشروع المستقبل" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[100]">
                                    {projects.map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Row 3: Reason */}
                      <FormField
                        control={form.control}
                        name="transferReason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">سبب التحويل</FormLabel>
                            <FormControl>
                              <AutocompleteInput
                                category="transferTypes"
                                placeholder="أدخل السبب"
                                value={field.value || ""}
                                onChange={field.onChange}
                                className="h-10 md:h-11 border-2"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Row 4: Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">الملاحظات (اختياري)</FormLabel>
                            <FormControl>
                              <AutocompleteInput
                                category="notes"
                                placeholder="أدخل أي ملاحظات"
                                value={field.value || ""}
                                onChange={field.onChange}
                                className="border-2 min-h-24 md:min-h-28"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Action Buttons - Sticky */}
                      <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 mt-6 -mx-4 md:-mx-6 z-50 flex gap-3 shadow-lg">
                        <Button
                          type="submit"
                          disabled={createTransferMutation.isPending}
                          className="flex-1 h-10 md:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30"
                        >
                          {createTransferMutation.isPending ? "جاري الحفظ..." : (editingTransfer ? "تحديث" : "إضافة تحويل")}
                        </Button>
                        {editingTransfer && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingTransfer(null);
                              form.reset();
                            }}
                            className="flex-1 h-10 md:h-11 border-2"
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}