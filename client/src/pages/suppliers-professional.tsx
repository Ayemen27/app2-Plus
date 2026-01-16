import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Building, Phone, MapPin, User, CreditCard, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { type Supplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AddSupplierForm from "@/components/forms/add-supplier-form";
import { useFloatingButton } from "@/components/layout/floating-button-context";

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all" });
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

  const { data: suppliers = [], isLoading, refetch: refetchSuppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchSuppliers();
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
  }, [refetchSuppliers, toast]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/suppliers/${id}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "تم حذف المورد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف المورد", variant: "destructive" });
    },
  });

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(false);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    setFloatingAction(handleAddSupplier, "إضافة مورد جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const filteredSuppliers = useMemo(() => {
    return (suppliers as Supplier[]).filter((supplier: Supplier) => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchValue.toLowerCase())) ||
        (supplier.phone && supplier.phone.includes(searchValue));
      const matchesStatus = filterValues.status === 'all' || 
        (filterValues.status === 'active' && supplier.isActive) ||
        (filterValues.status === 'inactive' && !supplier.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchValue, filterValues]);

  const stats = useMemo(() => ({
    total: (suppliers as Supplier[]).length,
    active: (suppliers as Supplier[]).filter((s: Supplier) => s.isActive).length,
    inactive: (suppliers as Supplier[]).filter((s: Supplier) => !s.isActive).length,
    totalDebt: (suppliers as Supplier[]).reduce((sum: number, s: Supplier) => sum + (parseFloat(s.totalDebt?.toString() || '0') || 0), 0),
  }), [suppliers]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 2,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي الموردين',
          value: stats.total,
          icon: Building,
          color: 'blue',
        },
        {
          key: 'active',
          label: 'الموردين النشطين',
          value: stats.active,
          icon: TrendingUp,
          color: 'green',
          showDot: true,
          dotColor: 'bg-green-500',
        },
      ]
    },
    {
      columns: 2,
      gap: 'sm',
      items: [
        {
          key: 'inactive',
          label: 'غير النشطين',
          value: stats.inactive,
          icon: AlertCircle,
          color: 'orange',
        },
        {
          key: 'totalDebt',
          label: 'إجمالي المديونية',
          value: formatCurrency(stats.totalDebt),
          icon: CreditCard,
          color: stats.totalDebt > 0 ? 'red' : 'green',
        },
      ]
    }
  ], [stats]);

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
  ], []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-1">
        <div className="animate-pulse space-y-1">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-12"></div>
                  </div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-5 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                  <div className="h-3 bg-muted rounded w-28"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {selectedSupplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
            </DialogTitle>
            <DialogDescription>
              {selectedSupplier ? "قم بتعديل بيانات المورد المحدد" : "أدخل بيانات المورد الجديد"}
            </DialogDescription>
          </DialogHeader>

          <AddSupplierForm
            supplier={selectedSupplier as any}
            onSuccess={() => {
              resetForm();
              queryClient.refetchQueries({ queryKey: ["/api/suppliers"] });
            }}
            onCancel={resetForm}
            submitLabel={selectedSupplier ? "تحديث المورد" : "إضافة المورد"}
          />
        </DialogContent>
      </Dialog>

      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في الموردين (الاسم، الشخص المسؤول، رقم الهاتف)..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        resultsSummary={(searchValue || filterValues.status !== 'all') ? {
          totalCount: (suppliers as Supplier[]).length,
          filteredCount: filteredSuppliers.length,
          totalLabel: 'النتائج',
          filteredLabel: 'من',
          totalValue: filteredSuppliers.reduce((sum, s) => sum + (parseFloat(s.totalDebt?.toString() || '0') || 0), 0),
          totalValueLabel: 'إجمالي المديونية',
          unit: 'ر.ي',
        } : undefined}
      />

      {filteredSuppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium mt-4">
              {searchValue ? "لا توجد نتائج" : "لا توجد موردين"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              {searchValue 
                ? "لم يتم العثور على موردين يطابقون كلمات البحث المدخلة. جرب كلمات أخرى." 
                : "ابدأ ببناء قاعدة بيانات الموردين الخاصة بك عن طريق إضافة أول مورد."}
            </p>
            {!searchValue && (
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 mt-4">
                <Plus className="h-4 w-4" />
                إضافة مورد جديد
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <UnifiedCardGrid columns={4}>
          {filteredSuppliers.map((supplier: Supplier) => {
            const debt = parseFloat(supplier.totalDebt?.toString() || '0') || 0;
            
            return (
              <UnifiedCard
                key={supplier.id}
                title={supplier.name}
                subtitle={supplier.contactPerson || undefined}
                titleIcon={Building}
                headerColor={supplier.isActive ? '#22c55e' : '#6b7280'}
                badges={[
                  {
                    label: supplier.isActive ? "نشط" : "معطل",
                    variant: supplier.isActive ? "success" : "secondary",
                  },
                  ...(debt > 0 ? [{
                    label: "مديون",
                    variant: "destructive" as const,
                  }] : [{
                    label: "رصيد سليم",
                    variant: "success" as const,
                  }]),
                ]}
                fields={[
                  {
                    label: "المديونية",
                    value: debt > 0 ? formatCurrency(debt) : "لا يوجد",
                    icon: CreditCard,
                    emphasis: debt > 0,
                    color: debt > 0 ? "danger" : "success",
                  },
                  {
                    label: "رقم الهاتف",
                    value: supplier.phone || "غير محدد",
                    icon: Phone,
                  },
                  {
                    label: "شروط الدفع",
                    value: supplier.paymentTerms || "غير محدد",
                    icon: CreditCard,
                  },
                  {
                    label: "تاريخ الإضافة",
                    value: supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('en-GB') : "غير محدد",
                    icon: Calendar,
                  },
                  ...(supplier.address ? [{
                    label: "العنوان",
                    value: supplier.address,
                    icon: MapPin,
                  }] : []),
                ]}
                actions={[
                  {
                    icon: Edit2,
                    label: "تعديل",
                    onClick: () => handleEdit(supplier),
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    variant: "ghost" as const,
                    onClick: () => handleDelete(supplier),
                  },
                ]}
                footer={supplier.notes ? (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                    <p className="line-clamp-2 text-amber-800 dark:text-amber-200">{supplier.notes}</p>
                  </div>
                ) : undefined}
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}
    </div>
  );
}
