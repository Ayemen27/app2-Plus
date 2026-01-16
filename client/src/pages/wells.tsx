import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, MapPin, Loader, BarChart3, X, CirclePlus, Wrench, TrendingUp } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";

interface Well {
  id: number;
  projectId: string;
  wellNumber: number;
  ownerName: string;
  region: string;
  numberOfBases: number;
  numberOfPanels: number;
  wellDepth: number;
  waterLevel?: number;
  numberOfPipes: number;
  fanType?: string;
  pumpPower?: number;
  status: 'pending' | 'in_progress' | 'completed';
  completionPercentage: number;
  startDate?: string;
  completionDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

const STATUS_MAP = {
  pending: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-800', badgeVariant: 'outline' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-800', badgeVariant: 'warning' },
  completed: { label: 'منجز', color: 'bg-green-100 text-green-800', badgeVariant: 'success' }
};

export default function WellsPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  
  // إدارة المناطق
  const [regions, setRegions] = useState<string[]>(REGIONS);
  
  // استخدام UnifiedFilter للبحث والفلترة
  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset,
  } = useUnifiedFilter({
    region: 'all',
    status: 'all'
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Well>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedWell, setSelectedWell] = useState<Partial<Well> | null>(null);
  
  // إضافة خيارات جديدة
  const [showAddFanTypeDialog, setShowAddFanTypeDialog] = useState(false);
  const [newFanType, setNewFanType] = useState("");
  const [showAddPumpPowerDialog, setShowAddPumpPowerDialog] = useState(false);
  const [newPumpPower, setNewPumpPower] = useState("");

  // تعيين الزر العائم عند دخول الصفحة
  useEffect(() => {
    const handleFloatingAction = () => {
      setShowAddDialog(true);
    };
    
    setFloatingAction(handleFloatingAction, '+ بئر جديد');
    
    // تنظيف عند مغادرة الصفحة
    return () => {
      setFloatingAction(null);
    };
  }, [setFloatingAction]);

  // جلب الآبار
  const { data: wells = [], isLoading, isFetching } = useQuery({
    queryKey: ['wells', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await apiRequest(`/api/wells?projectId=${selectedProjectId}`);
      return response.data || [];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // إضافة نوع مروحة جديد
  const addFanTypeMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest('/api/autocomplete', 'POST', {
        category: 'fanTypes',
        value
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تمت إضافة نوع المروحة بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: ['autocomplete/fanTypes'] });
      setShowAddFanTypeDialog(false);
      setNewFanType("");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إضافة نوع المروحة",
        variant: "destructive"
      });
    }
  });

  // إضافة قوة مضخة جديدة
  const addPumpPowerMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest('/api/autocomplete', 'POST', {
        category: 'pumpPowers',
        value
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تمت إضافة قوة المضخة بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: ['autocomplete/pumpPowers'] });
      setShowAddPumpPowerDialog(false);
      setNewPumpPower("");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إضافة قوة المضخة",
        variant: "destructive"
      });
    }
  });

  // إضافة اسم مالك جديد
  const addOwnerNameMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest('/api/autocomplete', 'POST', {
        category: 'ownerNames',
        value
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autocomplete/ownerNames'] });
    },
    onError: (error: any) => {
      console.error('خطأ في إضافة اسم المالك:', error);
    }
  });

  // معالج تغيير اسم المالك مع الإضافة التلقائية
  const handleOwnerNameChange = (value: string) => {
    setFormData({ ...formData, ownerName: value });
    // إذا لم تكن القيمة موجودة في القائمة، أضفها تلقائياً
    if (value.trim() && !ownerNames.includes(value)) {
      addOwnerNameMutation.mutate(value);
    }
  };

  // جلب بيانات الإكمال التلقائي
  const { data: ownerNames = [] } = useQuery({
    queryKey: ['autocomplete/ownerNames', selectedProjectId],
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=ownerNames');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId
  });

  const { data: fanTypes = [] } = useQuery({
    queryKey: ['autocomplete/fanTypes', selectedProjectId],
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=fanTypes');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId
  });

  const { data: pumpPowers = [] } = useQuery({
    queryKey: ['autocomplete/pumpPowers', selectedProjectId],
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=pumpPowers');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId
  });

  // إنشاء بئر
  const createWellMutation = useMutation({
    mutationFn: async (data: Partial<Well>) => {
      if (!selectedProjectId || selectedProjectId === 'all') {
        throw new Error('يرجى اختيار مشروع محدد أولاً');
      }
      return apiRequest('/api/wells', 'POST', {
        ...data,
        projectId: selectedProjectId
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تم إنشاء البئر بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: ['wells'] });
      setShowAddDialog(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء البئر",
        variant: "destructive"
      });
    }
  });

  // تحديث بئر
  const updateWellMutation = useMutation({
    mutationFn: async (data: Partial<Well>) => {
      if (!selectedWell?.id) throw new Error('معرف البئر غير موجود');
      return apiRequest(`/api/wells/${selectedWell.id}`, 'PUT', {
        ...data,
        projectId: selectedProjectId
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تم تحديث البئر بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: ['wells'] });
      setShowEditDialog(false);
      setSelectedWell(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث البئر",
        variant: "destructive"
      });
    }
  });

  // حذف بئر
  const deleteWellMutation = useMutation({
    mutationFn: async (wellId: number) => {
      return apiRequest(`/api/wells/${wellId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تم حذف البئر بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: ['wells'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف البئر",
        variant: "destructive"
      });
    }
  });

  // فلترة الآبار
  const filteredWells = useMemo(() => {
    return wells.filter((well: any) => {
      const matchesSearch = 
        well.ownerName.toLowerCase().includes(searchValue.toLowerCase()) ||
        well.wellNumber.toString().includes(searchValue);
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;
      
      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [wells, searchValue, filterValues]);

  // إحصائيات
  const stats = useMemo(() => {
    return {
      total: wells.length,
      completed: wells.filter((w: any) => w.status === 'completed').length,
      inProgress: wells.filter((w: any) => w.status === 'in_progress').length,
      pending: wells.filter((w: any) => w.status === 'pending').length,
      avgCompletion: wells.length > 0 
        ? Math.round(wells.reduce((sum: number, w: any) => sum + (w.completionPercentage || 0), 0) / wells.length)
        : 0
    };
  }, [wells]);

  if (!selectedProjectId || selectedProjectId === 'all') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">يرجى اختيار مشروع محدد لعرض وإدارة الآبار</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* شريط الإحصائيات الموحد */}
      <UnifiedStats
        title="إحصائيات الآبار"
        hideHeader={false}
        stats={[
          {
            title: 'إجمالي الآبار',
            value: stats.total,
            icon: BarChart3,
            color: 'blue',
            status: stats.total === 0 ? 'normal' : undefined
          },
          {
            title: 'منجزة',
            value: stats.completed,
            icon: MapPin,
            color: 'green',
            status: stats.completed > stats.inProgress ? 'normal' : 'warning'
          },
          {
            title: 'قيد التنفيذ',
            value: stats.inProgress,
            icon: Loader,
            color: 'amber',
            status: stats.inProgress > 0 ? 'normal' : undefined
          },
          {
            title: 'لم تبدأ بعد',
            value: stats.pending,
            icon: MapPin,
            color: 'gray',
            status: stats.pending > stats.completed ? 'warning' : undefined
          },
          {
            title: 'متوسط التقدم',
            value: `${stats.avgCompletion}%`,
            icon: BarChart3,
            color: 'indigo'
          }
        ]}
        columns={3}
        showStatus={true}
      />

      {/* شريط البحث والفلترة الموحد */}
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
            options: [
              { value: 'all', label: 'جميع الحالات' },
              { value: 'pending', label: 'لم يبدأ' },
              { value: 'in_progress', label: 'قيد التنفيذ' },
              { value: 'completed', label: 'منجز' }
            ],
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

      {/* نموذج إضافة بئر جديد */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="pb-2">
              <DialogTitle>إضافة بئر جديد</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2 pr-4">
                <div>
                  <Label className="text-sm">رقم البئر *</Label>
                  <Input
                    type="number"
                    value={formData.wellNumber || ''}
                    onChange={(e) => setFormData({ ...formData, wellNumber: parseInt(e.target.value) })}
                    placeholder="أدخل رقم البئر"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">اسم المالك *</Label>
                  <SearchableSelect
                    value={formData.ownerName || ''}
                    onValueChange={handleOwnerNameChange}
                    options={ownerNames.map((name: string) => ({ value: name, label: name }))}
                    placeholder="اختر أو اكتب اسم المالك"
                    searchPlaceholder="ابحث عن اسم المالك..."
                    showSearch={true}
                    allowCustom={true}
                    onCustomAdd={(value) => addOwnerNameMutation.mutate(value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">المنطقة *</Label>
                  <SearchableSelect
                    value={formData.region || ''}
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                    options={regions.map(region => ({ value: region, label: region }))}
                    placeholder="اختر المنطقة"
                    searchPlaceholder="ابحث عن المنطقة..."
                    showSearch={true}
                  />
                </div>
                <div>
                  <Label className="text-sm">عمق البئر (متر) *</Label>
                  <Input
                    type="number"
                    value={formData.wellDepth || ''}
                    onChange={(e) => setFormData({ ...formData, wellDepth: parseInt(e.target.value) })}
                    placeholder="أدخل عمق البئر"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">عدد الألواح *</Label>
                  <Input
                    type="number"
                    value={formData.numberOfPanels || ''}
                    onChange={(e) => setFormData({ ...formData, numberOfPanels: parseInt(e.target.value) })}
                    placeholder="أدخل عدد الألواح"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">عدد القواعد *</Label>
                  <Input
                    type="number"
                    value={formData.numberOfBases || ''}
                    onChange={(e) => setFormData({ ...formData, numberOfBases: parseInt(e.target.value) })}
                    placeholder="أدخل عدد القواعد"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">عدد المواسير *</Label>
                  <Input
                    type="number"
                    value={formData.numberOfPipes || ''}
                    onChange={(e) => setFormData({ ...formData, numberOfPipes: parseInt(e.target.value) })}
                    placeholder="أدخل عدد المواسير"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">مستوى الماء (متر)</Label>
                  <Input
                    type="number"
                    value={formData.waterLevel || ''}
                    onChange={(e) => setFormData({ ...formData, waterLevel: parseInt(e.target.value) })}
                    placeholder="أدخل مستوى الماء"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Label className="text-sm flex-1">نوع المروحة</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowAddFanTypeDialog(true)}
                    >
                      + إضافة
                    </Button>
                  </div>
                  <SearchableSelect
                    value={formData.fanType || ''}
                    onValueChange={(value) => setFormData({ ...formData, fanType: value })}
                    options={fanTypes.map((type: string) => ({ value: type, label: type }))}
                    placeholder="اختر نوع المروحة"
                    searchPlaceholder="ابحث عن نوع المروحة..."
                    showSearch={true}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Label className="text-sm flex-1">قوة المضخة</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowAddPumpPowerDialog(true)}
                    >
                      + إضافة
                    </Button>
                  </div>
                  <SearchableSelect
                    value={formData.pumpPower ? String(formData.pumpPower) : ''}
                    onValueChange={(value) => setFormData({ ...formData, pumpPower: parseInt(value) })}
                    options={pumpPowers.map((power: any) => ({ value: String(power), label: String(power) }))}
                    placeholder="اختر قوة المضخة"
                    searchPlaceholder="ابحث عن قوة المضخة..."
                    showSearch={true}
                  />
                </div>
                <div>
                  <Label className="text-sm">الحالة</Label>
                  <SearchableSelect
                    value={formData.status || ''}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                    options={[
                      { value: 'pending', label: 'لم يبدأ' },
                      { value: 'in_progress', label: 'قيد التنفيذ' },
                      { value: 'completed', label: 'منجز' }
                    ]}
                    placeholder="اختر الحالة"
                    searchPlaceholder="ابحث عن الحالة..."
                    showSearch={true}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">الملاحظات</Label>
                  <Input
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أضف ملاحظات اختيارية"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} size="sm">إلغاء</Button>
              <Button 
                onClick={() => {
                  if (!formData.wellNumber || !formData.ownerName || !formData.region || !formData.wellDepth || !formData.numberOfPanels || !formData.numberOfPipes || !formData.numberOfBases) {
                    toast({
                      title: "تنبيه",
                      description: "يرجى ملء جميع الحقول الإجبارية",
                      variant: "destructive"
                    });
                    return;
                  }
                  createWellMutation.mutate(formData);
                }} 
                size="sm"
                disabled={!formData.wellNumber || !formData.ownerName || !formData.region || !formData.wellDepth || !formData.numberOfPanels || !formData.numberOfPipes || !formData.numberOfBases}
              >
                {createWellMutation.isPending ? 'جاري...' : 'إضافة'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* نموذج إضافة نوع مروحة جديد */}
        <Dialog open={showAddFanTypeDialog} onOpenChange={setShowAddFanTypeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة نوع مروحة جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم نوع المروحة</Label>
                <Input
                  placeholder="مثال: مروحة سقفية"
                  value={newFanType}
                  onChange={(e) => setNewFanType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFanTypeMutation.mutate(newFanType)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddFanTypeDialog(false)} size="sm">إلغاء</Button>
              <Button onClick={() => addFanTypeMutation.mutate(newFanType)} size="sm">
                {addFanTypeMutation.isPending ? 'جاري...' : 'إضافة'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* نموذج إضافة قوة مضخة جديدة */}
        <Dialog open={showAddPumpPowerDialog} onOpenChange={setShowAddPumpPowerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة قوة مضخة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>قوة المضخة</Label>
                <Input
                  placeholder="مثال: 1.5 أو 2.0"
                  value={newPumpPower}
                  onChange={(e) => setNewPumpPower(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPumpPowerMutation.mutate(newPumpPower)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddPumpPowerDialog(false)} size="sm">إلغاء</Button>
              <Button onClick={() => addPumpPowerMutation.mutate(newPumpPower)} size="sm">
                {addPumpPowerMutation.isPending ? 'جاري...' : 'إضافة'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* نموذج تعديل بئر */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="pb-2">
              <DialogTitle>تعديل البئر #{selectedWell?.wellNumber}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2 pr-4">
                <div>
                  <Label className="text-sm">رقم البئر *</Label>
                  <Input
                    type="number"
                    value={selectedWell?.wellNumber || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, wellNumber: parseInt(e.target.value) })}
                    placeholder="أدخل رقم البئر"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">اسم المالك *</Label>
                  <SearchableSelect
                    value={selectedWell?.ownerName || ''}
                    onValueChange={(value) => setSelectedWell({ ...selectedWell, ownerName: value })}
                    options={ownerNames.map((name: string) => ({ value: name, label: name }))}
                    placeholder="اختر أو اكتب اسم المالك"
                    searchPlaceholder="ابحث عن اسم المالك..."
                    showSearch={true}
                    allowCustom={true}
                  />
                </div>
                <div>
                  <Label className="text-sm">المنطقة *</Label>
                  <SearchableSelect
                    value={selectedWell?.region || ''}
                    onValueChange={(value) => setSelectedWell({ ...selectedWell, region: value })}
                    options={regions.map(region => ({ value: region, label: region }))}
                    placeholder="اختر المنطقة"
                    searchPlaceholder="ابحث عن المنطقة..."
                    showSearch={true}
                  />
                </div>
                <div>
                  <Label className="text-sm">عدد الألواح *</Label>
                  <Input
                    type="number"
                    value={selectedWell?.numberOfPanels || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, numberOfPanels: parseInt(e.target.value) })}
                    placeholder="أدخل عدد الألواح"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">عمق البئر (متر) *</Label>
                  <Input
                    type="number"
                    value={selectedWell?.wellDepth || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, wellDepth: parseInt(e.target.value) })}
                    placeholder="أدخل عمق البئر"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">عدد القواعد *</Label>
                  <Input
                    type="number"
                    value={selectedWell?.numberOfBases || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, numberOfBases: parseInt(e.target.value) })}
                    placeholder="أدخل عدد القواعد"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">عدد المواسير *</Label>
                  <Input
                    type="number"
                    value={selectedWell?.numberOfPipes || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, numberOfPipes: parseInt(e.target.value) })}
                    placeholder="أدخل عدد المواسير"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">مستوى الماء (متر)</Label>
                  <Input
                    type="number"
                    value={selectedWell?.waterLevel || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, waterLevel: parseInt(e.target.value) })}
                    placeholder="أدخل مستوى الماء"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">نوع المروحة</Label>
                  <SearchableSelect
                    value={selectedWell?.fanType || ''}
                    onValueChange={(value) => setSelectedWell({ ...selectedWell, fanType: value })}
                    options={fanTypes.map((type: string) => ({ value: type, label: type }))}
                    placeholder="اختر نوع المروحة"
                    searchPlaceholder="ابحث عن نوع المروحة..."
                    showSearch={true}
                  />
                </div>
                <div>
                  <Label className="text-sm">قوة المضخة</Label>
                  <SearchableSelect
                    value={selectedWell?.pumpPower ? String(selectedWell.pumpPower) : ''}
                    onValueChange={(value) => setSelectedWell({ ...selectedWell, pumpPower: parseInt(value) })}
                    options={pumpPowers.map((power: any) => ({ value: String(power), label: String(power) }))}
                    placeholder="اختر قوة المضخة"
                    searchPlaceholder="ابحث عن قوة المضخة..."
                    showSearch={true}
                  />
                </div>
                <div>
                  <Label className="text-sm">الحالة</Label>
                  <SearchableSelect
                    value={selectedWell?.status || ''}
                    onValueChange={(value) => setSelectedWell({ ...selectedWell, status: value as any })}
                    options={[
                      { value: 'pending', label: 'لم يبدأ' },
                      { value: 'in_progress', label: 'قيد التنفيذ' },
                      { value: 'completed', label: 'منجز' }
                    ]}
                    placeholder="اختر الحالة"
                    searchPlaceholder="ابحث عن الحالة..."
                    showSearch={true}
                  />
                </div>
                <div>
                  <Label className="text-sm">نسبة الإكمال %</Label>
                  <Input
                    type="number"
                    value={selectedWell?.completionPercentage || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, completionPercentage: parseInt(e.target.value) })}
                    placeholder="أدخل نسبة الإكمال"
                    className="h-9 text-sm"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">الملاحظات</Label>
                  <Input
                    value={selectedWell?.notes || ''}
                    onChange={(e) => setSelectedWell({ ...selectedWell, notes: e.target.value })}
                    placeholder="أضف ملاحظات اختيارية"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} size="sm">إلغاء</Button>
              <Button 
                onClick={() => {
                  if (!selectedWell?.wellNumber || !selectedWell?.ownerName || !selectedWell?.region || !selectedWell?.wellDepth || !selectedWell?.numberOfPanels || !selectedWell?.numberOfPipes || !selectedWell?.numberOfBases) {
                    toast({
                      title: "تنبيه",
                      description: "يرجى ملء جميع الحقول الإجبارية",
                      variant: "destructive"
                    });
                    return;
                  }
                  updateWellMutation.mutate(selectedWell || {});
                }} 
                size="sm"
                disabled={!selectedWell?.wellNumber || !selectedWell?.ownerName || !selectedWell?.region || !selectedWell?.wellDepth || !selectedWell?.numberOfPanels || !selectedWell?.numberOfPipes || !selectedWell?.numberOfBases}
              >
                {updateWellMutation.isPending ? 'جاري...' : 'حفظ'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {/* قائمة الآبار بالبطاقات الموحدة */}
      <UnifiedCardGrid columns={2}>
        {filteredWells.map((well: any) => (
          <UnifiedCard
            key={well.id}
            title={`بئر #${well.wellNumber} - ${well.ownerName}`}
            subtitle={well.region}
            titleIcon={MapPin}
            badges={[
              {
                label: STATUS_MAP[well.status as keyof typeof STATUS_MAP]?.label,
                variant: STATUS_MAP[well.status as keyof typeof STATUS_MAP]?.badgeVariant as any
              }
            ]}
            fields={[
              { label: 'المنطقة', value: well.region, icon: MapPin, color: 'info' as const },
              { label: 'الألواح', value: well.numberOfPanels, icon: BarChart3, color: 'success' as const },
              { label: 'المواسير', value: well.numberOfPipes, icon: Wrench, color: 'success' as const },
              { label: 'العمق', value: `${well.wellDepth}م`, icon: TrendingUp, color: 'warning' as const },
              { label: 'القواعد', value: well.numberOfBases, icon: BarChart3, color: 'info' as const },
              { label: 'مستوى الماء', value: well.waterLevel ? `${well.waterLevel}م` : '-', icon: TrendingUp, color: 'info' as const },
              { label: 'التقدم', value: `${well.completionPercentage}%`, emphasis: true, color: 'info' as const, icon: TrendingUp },
              ...(well.fanType ? [{ label: 'نوع المروحة', value: well.fanType, icon: Wrench, color: 'info' as const }] : []),
              ...(well.pumpPower ? [{ label: 'قوة المضخة', value: `${well.pumpPower}`, icon: Wrench, color: 'warning' as const }] : []),
              ...(well.notes ? [{ label: 'الملاحظات', value: well.notes, color: 'muted' as const }] : [])
            ]}
            actions={[
              {
                icon: Edit,
                label: 'تعديل',
                onClick: () => {
                  setSelectedWell(well);
                  setShowEditDialog(true);
                },
                color: 'blue'
              },
              {
                icon: Trash2,
                label: 'حذف',
                onClick: () => deleteWellMutation.mutate(well.id),
                color: 'red'
              }
            ]}
          />
        ))}
      </UnifiedCardGrid>

      {filteredWells.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد آبار</p>
        </div>
      )}
    </div>
  );
}
