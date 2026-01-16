import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { 
  Truck, Save, Plus, Edit, Trash2, 
  DollarSign, TrendingUp, RefreshCw, ChevronUp,
  FileSpreadsheet, Filter, XCircle, Calendar, Hash,
  MapPin, Info, User, Settings, Droplets, Package, Building2
} from "lucide-react";
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';

const categoryColors: Record<string, string> = {
  worker_transport: "border-l-blue-500",
  material_delivery: "border-l-green-500",
  concrete_transport: "border-l-orange-500",
  iron_platforms: "border-l-slate-500",
  fuel_shas: "border-l-red-500",
  fuel_hilux: "border-l-red-400",
  loading_unloading: "border-l-amber-500",
  maintenance: "border-l-purple-500",
  water_supply: "border-l-cyan-500",
  other: "border-l-slate-400"
};

const categoryIconColors: Record<string, string> = {
  worker_transport: "text-blue-500",
  material_delivery: "text-green-500",
  concrete_transport: "text-orange-500",
  iron_platforms: "text-slate-500",
  fuel_shas: "text-red-500",
  fuel_hilux: "text-red-400",
  loading_unloading: "text-amber-500",
  maintenance: "text-purple-500",
  water_supply: "text-cyan-500",
  other: "text-slate-400"
};
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { cn, getCurrentDate, formatDate, formatCurrency, formatDateForApi } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { WellSelector } from "@/components/well-selector";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats, type UnifiedStatItem } from "@/components/ui/unified-stats";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TransportationExpense, Worker } from "@shared/schema";
import * as XLSX from 'xlsx';

export default function TransportManagement() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, isAllProjects, getProjectIdForApi } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ 
    dateRange: undefined,
    specificDate: getCurrentDate()
  });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form states
  const [workerId, setWorkerId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(getCurrentDate());
  const [notes, setNotes] = useState<string>("");
  const [category, setCategory] = useState<string>("worker_transport");
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // Reset form logic
  const resetForm = useCallback(() => {
    setWorkerId("");
    setAmount("");
    setDescription("");
    setDate(getCurrentDate());
    setNotes("");
    setCategory("worker_transport");
    setSelectedWellId(undefined);
    setEditingExpenseId(null);
    setIsDialogOpen(false);
  }, []);

  // Unified Floating Button
  useEffect(() => {
    setFloatingAction(() => {
      setIsDialogOpen(true);
      setEditingExpenseId(null);
    }, "إضافة سجل نقل");
    
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const { data: expensesResponse, isLoading, refetch } = useQuery<{ success: boolean; data: (TransportationExpense & { workerName?: string, projectName?: string })[] }>({
    queryKey: ["/api/projects", selectedProjectId, "transportation", filterValues.specificDate, filterValues.dateRange],
    queryFn: async () => {
      let url = isAllProjects 
        ? `/api/transportation-expenses` 
        : `/api/projects/${getProjectIdForApi()}/transportation-expenses`;
      
      const params = new URLSearchParams();
      if (filterValues.specificDate) {
        params.append("date", filterValues.specificDate);
      }
      if (filterValues.dateRange?.from) {
        params.append("dateFrom", formatDateForApi(filterValues.dateRange.from));
      }
      if (filterValues.dateRange?.to) {
        params.append("dateTo", formatDateForApi(filterValues.dateRange.to));
      }
      
      const queryString = params.toString();
      const response = await apiRequest(`${url}${queryString ? `?${queryString}` : ''}`, "GET");
      return response;
    },
    enabled: !!selectedProjectId || isAllProjects
  });

  const { data: autocompleteResponse } = useQuery({
    queryKey: ["/api/autocomplete/transport-categories"],
    queryFn: async () => apiRequest("/api/autocomplete/transport-categories", "GET")
  });

  const categoriesMap = useMemo(() => {
    const map: Record<string, string> = {
      worker_transport: "نقل عمال",
      material_delivery: "توريد مواد",
      concrete_transport: "نقل خرسانة",
      iron_platforms: "نقل حديد ومنصات",
      fuel_shas: "بترول شاص",
      fuel_hilux: "بترول هيلكس",
      loading_unloading: "تحميل وتنزيل",
      maintenance: "صيانة وإصلاح",
      water_supply: "توريد مياه",
      other: "أخرى"
    };
    if (autocompleteResponse?.data) {
      autocompleteResponse.data.forEach((cat: any) => {
        map[cat.value] = cat.label;
      });
    }
    return map;
  }, [autocompleteResponse]);

  const filterCategories = useMemo(() => {
    const base = [
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
    ];
    if (!autocompleteResponse?.data) return base;
    const existingValues = new Set(base.map(b => b.value));
    const dynamic = autocompleteResponse.data
      .map((cat: any) => ({ value: cat.value, label: cat.label }))
      .filter((cat: any) => !existingValues.has(cat.value));
    return [...base, ...dynamic];
  }, [autocompleteResponse]);

  const expenses = useMemo(() => expensesResponse?.data || [], [expensesResponse]);

  const filteredExpenses = useMemo(() => {
    if (!searchValue) return expenses;
    const lowerSearch = searchValue.toLowerCase();
    return expenses.filter(e => 
      e.description.toLowerCase().includes(lowerSearch) || 
      (e.workerName && e.workerName.toLowerCase().includes(lowerSearch)) ||
      (e.projectName && e.projectName.toLowerCase().includes(lowerSearch))
    );
  }, [expenses, searchValue]);

  const statsData = useMemo(() => {
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = expenses.length;
    const maintenanceCost = expenses.filter(e => e.category === 'maintenance').reduce((sum, e) => sum + Number(e.amount), 0);
    const fuelCost = expenses.filter(e => e.category === 'fuel_shas' || e.category === 'fuel_hilux').reduce((sum, e) => sum + Number(e.amount), 0);
    const materialTransport = expenses.filter(e => e.category === 'material_delivery').reduce((sum, e) => sum + Number(e.amount), 0);
    const concreteTransport = expenses.filter(e => e.category === 'concrete_transport').reduce((sum, e) => sum + Number(e.amount), 0);
    const ironPlatformsCost = expenses.filter(e => e.category === 'iron_platforms').reduce((sum, e) => sum + Number(e.amount), 0);
    const otherCategories = expenses.filter(e => e.category === 'other' || !['maintenance', 'fuel_shas', 'fuel_hilux', 'material_delivery', 'concrete_transport', 'iron_platforms'].includes(e.category)).reduce((sum, e) => sum + Number(e.amount), 0);

    return [
      {
        title: "إجمالي تكلفة النقل",
        value: formatCurrency(totalAmount),
        icon: DollarSign,
        color: "blue" as const,
      },
      {
        title: "عدد الرحلات",
        value: count,
        icon: Truck,
        color: "green" as const,
      },
      {
        title: "متوسط تكلفة الرحلة",
        value: formatCurrency(count > 0 ? totalAmount / count : 0),
        icon: TrendingUp,
        color: "amber" as const,
      },
      {
        title: "تكاليف الصيانة",
        value: formatCurrency(maintenanceCost),
        icon: Settings,
        color: "purple" as const,
      },
      {
        title: "تكاليف الوقود",
        value: formatCurrency(fuelCost),
        icon: Droplets,
        color: "red" as const,
      },
      {
        title: "نقل المواد",
        value: formatCurrency(materialTransport),
        icon: Package,
        color: "indigo" as const,
      },
      {
        title: "نقل الخرسانة",
        value: formatCurrency(concreteTransport),
        icon: Building2,
        color: "orange" as const,
      },
      {
        title: "نقل حديد المنصات",
        value: formatCurrency(ironPlatformsCost),
        icon: Package,
        color: "slate" as const,
      },
      {
        title: "فئات أخرى",
        value: formatCurrency(otherCategories),
        icon: Info,
        color: "gray" as const,
      }
    ] as UnifiedStatItem[];
  }, [expenses]);

  const handleExportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.views = [{ activeTab: 0, firstSheet: 0, showGridLines: true }];
      const worksheet = workbook.addWorksheet('حركة النقل', { views: [{ rightToLeft: true }] });

      worksheet.columns = [
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: 'البيان / الوصف', key: 'description', width: 30 },
        { header: 'المبلغ (RY)', key: 'amount', width: 15 },
        { header: 'الفئة', key: 'category', width: 20 },
        { header: 'العامل', key: 'worker', width: 20 },
        { header: 'رقم البئر', key: 'well', width: 12 },
        { header: 'ملاحظات', key: 'notes', width: 30 }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E293B' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      expenses.forEach(expense => {
        const row = worksheet.addRow({
          date: expense.date,
          description: expense.description,
          amount: Number(expense.amount),
          category: categoriesMap[expense.category] || expense.category || "أخرى",
          worker: workers.find(w => w.id === expense.workerId)?.name || "مصروف عام",
          well: expense.wellId || "N/A",
          notes: expense.notes || ""
        });

        row.alignment = { vertical: 'middle', horizontal: 'right' };
      });

      worksheet.eachRow((row, rowNumber) => {
        row.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (rowNumber > 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNumber % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }
          };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `تقرير_النقل_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast({ title: "تم التصدير بنجاح", description: "تم تحميل ملف إكسل احترافي" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setSearchValue("");
    setFilterValues({
      dateRange: undefined,
      specificDate: getCurrentDate()
    });
    toast({ title: "تمت إعادة التعيين", description: "تم مسح جميع الفلاتر" });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({ title: "تم التحديث", description: "تم تحديث البيانات بنجاح" });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingExpenseId) {
        return apiRequest(`/api/transportation-expenses/${editingExpenseId}`, "PATCH", data);
      }
      return apiRequest("/api/transportation-expenses", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-expenses"] });
      toast({ title: editingExpenseId ? "تم التعديل بنجاح" : "تم الحفظ بنجاح" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ في الحفظ", 
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/transportation-expenses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-expenses"] });
      toast({ title: "تم الحذف بنجاح" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول الأساسية", variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      projectId: selectedProjectId,
      workerId: workerId || null,
      amount: amount,
      description: description,
      date: date,
      category: category,
      notes: notes,
      wellId: selectedWellId
    });
  };

  const handleEdit = (expense: TransportationExpense) => {
    setEditingExpenseId(expense.id);
    setWorkerId(expense.workerId || "");
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setDate(expense.date);
    setNotes(expense.notes || "");
    setCategory(expense.category || "worker_transport");
    setSelectedWellId(expense.wellId || undefined);
    setIsDialogOpen(true);
  };

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'specificDate') {
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        setFilterValues(prev => ({ ...prev, specificDate: `${year}-${month}-${day}`, dateRange: undefined }));
      } else {
        setFilterValues(prev => ({ ...prev, specificDate: undefined }));
      }
    } else if (key === 'dateRange') {
      setFilterValues(prev => ({ ...prev, [key]: value, specificDate: undefined }));
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  const filters: FilterConfig[] = [
    {
      key: "specificDate",
      type: "date",
      label: "تاريخ محدد",
      placeholder: "اختر التاريخ"
    },
    {
      key: "dateRange",
      type: "date-range",
      label: "فترة زمنية"
    },
    {
      key: "category",
      type: "select",
      label: "الفئة",
      placeholder: "جميع الفئات",
      options: filterCategories
    }
  ];

  const actions: ActionButton[] = [
    {
      key: "export",
      icon: FileSpreadsheet,
      label: "تصدير إكسل",
      onClick: handleExportToExcel,
      variant: "outline",
      tooltip: "تحميل التقرير بصيغة إكسل"
    }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-7xl mx-auto w-full p-4 space-y-6">
          
          <UnifiedStats
            title="ملخص حركة النقل"
            stats={statsData}
            columns={3}
          />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
              <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-primary">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>
                  {editingExpenseId ? "تعديل سجل النقل" : "إضافة سجل نقل جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Edit className="h-3 w-3" /> البيان / الوصف
                      </Label>
                      <AutocompleteInput
                        category="transport_desc"
                        value={description}
                        onChange={setDescription}
                        placeholder="مثلاً: نقل عمال، توريد مياه..."
                        className="h-9 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Filter className="h-3 w-3" /> الفئة
                      </Label>
                      <SearchableSelect
                        options={[
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
                        ]}
                        value={category}
                        onValueChange={(val) => setCategory(val)}
                        allowCustom={true}
                        placeholder="اختر الفئة..."
                        className="h-9"
                        triggerClassName="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" /> المبلغ
                      </Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={amount} 
                          onChange={(e) => setAmount(e.target.value)} 
                          placeholder="0.00"
                          className="h-9 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 pl-7 focus:ring-primary/20 text-xs"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">RY</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> التاريخ
                      </Label>
                      <DatePickerField
                        value={date}
                        onChange={(d) => setDate(d ? format(d, "yyyy-MM-dd") : getCurrentDate())}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Plus className="h-3 w-3" /> العامل (اختياري)
                      </Label>
                      <Combobox
                        options={workers.map(w => String(w.name))}
                        value={workers.find(w => w.id === workerId)?.name || ""}
                        onValueChange={(val) => {
                          const worker = workers.find(w => w.name === val);
                          if (worker) setWorkerId(worker.id);
                        }}
                        placeholder="اختر العامل..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Hash className="h-3 w-3" /> البئر
                      </Label>
                      <WellSelector 
                        projectId={selectedProjectId}
                        value={selectedWellId} 
                        onChange={setSelectedWellId}
                        showLabel={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ملاحظات</Label>
                    <Textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="أي ملاحظات إضافية..."
                      className="min-h-[60px] rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-none py-2 focus:ring-primary/20 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={resetForm} className="flex-1 rounded-lg h-9 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold">إلغاء</Button>
                    <Button type="submit" className="flex-[2] rounded-lg h-9 shadow-lg shadow-primary/20 gap-2 text-xs font-bold" disabled={saveMutation.isPending}>
                      <Save className="h-4 w-4" />
                      {editingExpenseId ? "تحديث" : "حفظ"}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <UnifiedFilterDashboard
            filters={filters}
            filterValues={{
              ...filterValues,
              specificDate: filterValues.specificDate ? (() => {
                const [year, month, day] = filterValues.specificDate.split('-').map(Number);
                return new Date(year, month - 1, day, 12, 0, 0, 0);
              })() : undefined
            }}
            onFilterChange={handleFilterChange}
            onSearchChange={setSearchValue}
            searchValue={searchValue}
            onReset={handleReset}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            actions={actions}
            searchPlaceholder="بحث في سجلات النقل..."
          />

          {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />)}
             </div>
          ) : expenses.length === 0 ? (
            <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-transparent rounded-2xl">
              <Truck className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-600">لا توجد سجلات</h3>
              <p className="text-sm text-slate-400 max-w-xs">لم يتم العثور على أي سجلات نقل للفترة المحددة.</p>
            </Card>
          ) : (
            <UnifiedCardGrid>
              {filteredExpenses.map((expense) => (
                <UnifiedCard
                  key={expense.id}
                  title={expense.description}
                  subtitle={
                    (() => {
                      const workerLabel = expense.workerName || "مصروف عام";
                      if (isAllProjects && expense.projectName) {
                        return `${workerLabel} - ${expense.projectName}`;
                      }
                      return workerLabel;
                    })()
                  }
                  titleIcon={Truck}
                  className={cn(
                    "hover-elevate active-elevate-2 transition-all duration-300 border-l-4 shadow-md hover:shadow-xl group py-2",
                    categoryColors[expense.category] || "border-l-blue-500"
                  )}
                  compact={true}
                  fields={[
                    {
                      label: "المبلغ",
                      value: formatCurrency(Number(expense.amount)),
                      icon: DollarSign,
                      emphasis: true,
                      color: "success",
                      iconClassName: "text-green-600 dark:text-green-400"
                    },
                    {
                      label: "الفئة",
                      value: [
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
                      ].find(opt => opt.value === expense.category)?.label || expense.category || "أخرى",
                      icon: Filter,
                      emphasis: false,
                      iconClassName: categoryIconColors[expense.category] || "text-blue-500"
                    } as any,
                    {
                      label: "التاريخ",
                      value: expense.date,
                      icon: Calendar,
                      color: "info",
                      iconClassName: "text-sky-500"
                    },
                    {
                      label: "البئر",
                      value: expense.wellId ? `بئر ${expense.wellId}` : "N/A",
                      icon: Hash,
                      hidden: !expense.wellId,
                      color: "info",
                      iconClassName: "text-amber-500"
                    }
                  ]}
                  actions={[
                    {
                      icon: Edit,
                      label: "تعديل",
                      onClick: () => handleEdit(expense),
                      variant: "ghost"
                    },
                    {
                      icon: Trash2,
                      label: "حذف",
                      onClick: () => {
                        if (confirm("هل أنت متأكد من الحذف؟")) deleteMutation.mutate(expense.id);
                      },
                      variant: "ghost"
                    }
                  ]}
                  footer={expense.notes && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-2">
                        <Info className="h-3 w-3 text-slate-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            {expense.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                />
              ))}
            </UnifiedCardGrid>
          )}
        </div>
      </div>
    </div>
  );
}
