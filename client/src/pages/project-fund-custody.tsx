
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormDatePickerField } from "@/components/ui/date-picker-field";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertFundTransferSchema } from "@shared/schema";
import type { InsertFundTransfer, FundTransfer, Project } from "@shared/schema";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { DollarSign, Calendar, Edit, Trash2, TrendingUp, FileText, Building2 } from "lucide-react";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { z } from "zod";

type FundTransferFormData = z.infer<typeof insertFundTransferSchema>;

export default function ProjectFundCustody() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const [editingTransfer, setEditingTransfer] = useState<FundTransfer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter Configs
  const filterConfigs: FilterConfig[] = [
    {
      key: 'project',
      label: 'المشروع',
      type: 'select',
      placeholder: 'اختر المشروع',
      options: [] // سيتم ملؤها ديناميكياً
    },
    {
      key: 'transferType',
      label: 'نوع التحويل',
      type: 'select',
      placeholder: 'اختر النوع',
      options: [
        { value: 'شيك', label: 'شيك' },
        { value: 'نقدي', label: 'نقدي' },
        { value: 'تحويل بنكي', label: 'تحويل بنكي' },
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
    project: '',
    transferType: '',
    dateRange: { from: undefined, to: undefined }
  });

  const onSearchChange = (value: string) => setSearchValue(value);
  const onFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };
  const onReset = () => {
    setSearchValue('');
    setFilterValues({ project: '', transferType: '', dateRange: { from: undefined, to: undefined } });
  };

  // Fetch Projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest('/api/projects', 'GET');
      return response.data || [];
    },
  });

  // Fetch Fund Transfers (الوارد الرئيسي)
  const { data: allTransfers = [], isLoading: transfersLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/projects/all/fund-transfers"],
    queryFn: async () => {
      const response = await apiRequest('/api/projects/all/fund-transfers', 'GET');
      return response.data || [];
    },
  });

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    let filtered = allTransfers;

    if (searchValue) {
      const search = searchValue.toLowerCase();
      filtered = filtered.filter(t => 
        t.senderName?.toLowerCase().includes(search) ||
        t.transferNumber?.toLowerCase().includes(search) ||
        t.notes?.toLowerCase().includes(search) ||
        t.projectName?.toLowerCase().includes(search)
      );
    }

    if (filterValues.project && filterValues.project !== 'all') {
      filtered = filtered.filter(t => t.projectId === filterValues.project);
    }

    if (filterValues.transferType) {
      filtered = filtered.filter(t => t.transferType === filterValues.transferType);
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
  }, [allTransfers, searchValue, filterValues]);

  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();

  // Calculate Stats
  const stats = useMemo(() => {
    return {
      total: allTransfers.length,
      totalAmount: summary?.totalIncome || allTransfers.reduce((sum, t) => sum + (parseFloat(t.amount?.toString() || '0') || 0), 0),
      currentBalance: summary?.totalProjectBalance || 0,
      filtered: filteredTransfers.length,
      today: filteredTransfers.filter(t => new Date(t.transferDate).toDateString() === new Date().toDateString()).length,
      thisWeek: filteredTransfers.filter(t => {
        const date = new Date(t.transferDate);
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo && date <= today;
      }).length,
    };
  }, [allTransfers, filteredTransfers, summary]);

  // Mutations
  const createTransferMutation = useMutation({
    mutationFn: async (data: InsertFundTransfer) => {
      if (editingTransfer) {
        return apiRequest(`/api/fund-transfers/${editingTransfer.id}`, "PATCH", data);
      }
      return apiRequest("/api/fund-transfers", "POST", data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/projects/all/fund-transfers"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({
        title: "تم بنجاح",
        description: editingTransfer ? "تم تحديث الوارد" : "تم إضافة وارد جديد",
      });
      form.reset();
      setEditingTransfer(null);
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حفظ الوارد",
        variant: "destructive",
      });
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/fund-transfers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/projects/all/fund-transfers"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الوارد بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف الوارد",
        variant: "destructive",
      });
    },
  });

  // Form
  const form = useForm<FundTransferFormData>({
    resolver: zodResolver(insertFundTransferSchema),
    defaultValues: {
      projectId: "",
      amount: "",
      senderName: "",
      transferNumber: "",
      transferType: "",
      transferDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  // تعيين إجراء الزر العائم
  useEffect(() => {
    const handleAddTransfer = () => {
      setEditingTransfer(null);
      form.reset({
        projectId: "",
        amount: "",
        senderName: "",
        transferNumber: "",
        transferType: "",
        transferDate: new Date().toISOString().split('T')[0],
        notes: "",
      });
      setShowCreateModal(true);
    };

    setFloatingAction(handleAddTransfer, "إضافة وارد");
    return () => setFloatingAction(null);
  }, [setFloatingAction, form]);

  const onSubmit = (data: FundTransferFormData) => {
    if (!data.projectId) {
      toast({
        title: "خطأ",
        description: "يجب تحديد المشروع",
        variant: "destructive",
      });
      return;
    }

    createTransferMutation.mutate(data);
  };

  const startEdit = (transfer: any) => {
    setEditingTransfer(transfer);
    form.reset({
      projectId: transfer.projectId,
      amount: transfer.amount,
      senderName: transfer.senderName || "",
      transferNumber: transfer.transferNumber || "",
      transferType: transfer.transferType || "",
      transferDate: transfer.transferDate,
      notes: transfer.notes || "",
    });
    setShowCreateModal(true);
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

  // تحديث خيارات فلتر المشروع
  const projectFilterOptions = useMemo(() => 
    projects.map(p => ({ value: p.id, label: p.name })),
    [projects]
  );

  const updatedFilterConfigs = useMemo(() => 
    filterConfigs.map(config => 
      config.key === 'project' ? { ...config, options: projectFilterOptions } : config
    ),
    [projectFilterOptions]
  );

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 4,
      gap: 'sm',
      items: [
        {
          key: 'totalAmount',
          label: "إجمالي الوارد",
          value: stats.totalAmount,
          icon: TrendingUp,
          color: "blue",
          formatter: formatCurrency
        },
        {
          key: 'totalExpenses',
          label: "إجمالي المنصرف",
          value: summary?.totalCashExpenses || 0,
          icon: TrendingUp,
          color: "red",
          formatter: formatCurrency
        },
        {
          key: 'currentBalance',
          label: "الرصيد المتبقي",
          value: stats.currentBalance,
          icon: DollarSign,
          color: stats.currentBalance >= 0 ? "green" : "red",
          formatter: formatCurrency
        },
        {
          key: 'filtered',
          label: "النتائج المفلترة",
          value: stats.filtered,
          icon: FileText,
          color: "purple"
        }
      ]
    }
  ], [stats, summary]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col" dir="rtl">
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3 md:px-6 md:py-6 w-full space-y-4 md:space-y-8 pb-24 md:pb-20">
          <UnifiedFilterDashboard
            statsRows={statsRowsConfig}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder="ابحث في الوارد..."
            showSearch={true}
            filters={updatedFilterConfigs}
            filterValues={filterValues}
            onFilterChange={onFilterChange}
            onReset={onReset}
            onRefresh={() => refetch()}
            isRefreshing={transfersLoading}
          />

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
                    <DollarSign className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">لا يوجد وارد</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ابدأ بإضافة وارد جديد</p>
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
                    headerColor="#10b981"
                    badges={[
                      { label: new Date(transfer.transferDate).toLocaleDateString('en-GB'), variant: 'outline' as const }
                    ]}
                    fields={[
                      {
                        label: "المشروع",
                        value: transfer.projectName || "غير محدد",
                        icon: Building2,
                        color: "info"
                      },
                      {
                        label: "المرسل",
                        value: transfer.senderName || "غير محدد",
                        icon: FileText,
                        color: "default"
                      },
                      {
                        label: "رقم الحوالة",
                        value: transfer.transferNumber || "غير محدد",
                        icon: FileText,
                        color: "default"
                      },
                      {
                        label: "النوع",
                        value: transfer.transferType || "غير محدد",
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
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl w-full max-h-[90vh] md:max-h-[80vh] md:w-full md:max-w-2xl rounded-t-2xl md:rounded-xl overflow-y-auto">
            <CardHeader className="sticky top-0 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 md:p-5 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white text-base md:text-lg">
                  {editingTransfer ? 'تعديل الوارد' : 'إضافة وارد جديد'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTransfer(null);
                    form.reset();
                  }}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pb-4 md:pb-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs md:text-sm font-semibold">المبلغ (ريال) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0" {...field} className="h-10 md:h-11 border-2 text-xs md:text-sm" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormDatePickerField
                      name="transferDate"
                      control={form.control}
                      label="التاريخ *"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">المشروع *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-10 md:h-11 border-2">
                                <SelectValue placeholder="اختر المشروع" />
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
                      name="transferType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">نوع التحويل</FormLabel>
                          <FormControl>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <SelectTrigger className="h-10 md:h-11 border-2">
                                <SelectValue placeholder="اختر النوع" />
                              </SelectTrigger>
                              <SelectContent className="z-[100]">
                                <SelectItem value="شيك">شيك</SelectItem>
                                <SelectItem value="نقدي">نقدي</SelectItem>
                                <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <FormField
                      control={form.control}
                      name="senderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">اسم المرسل</FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              category="senderNames"
                              placeholder="أدخل الاسم"
                              value={field.value || ""}
                              onChange={field.onChange}
                              className="h-10 md:h-11 border-2"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transferNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">رقم الحوالة</FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              category="transferNumbers"
                              placeholder="أدخل الرقم"
                              value={field.value || ""}
                              onChange={field.onChange}
                              className="h-10 md:h-11 border-2"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">الملاحظات</FormLabel>
                        <FormControl>
                          <AutocompleteInput
                            category="notes"
                            placeholder="أدخل ملاحظات"
                            value={field.value || ""}
                            onChange={field.onChange}
                            className="border-2 min-h-24 md:min-h-28"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 mt-6 -mx-4 md:-mx-6 z-50 flex gap-3 shadow-lg">
                    <Button
                      type="submit"
                      disabled={createTransferMutation.isPending}
                      className="flex-1 h-10 md:h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/30"
                    >
                      {createTransferMutation.isPending ? "جاري الحفظ..." : (editingTransfer ? "تحديث" : "إضافة وارد")}
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
