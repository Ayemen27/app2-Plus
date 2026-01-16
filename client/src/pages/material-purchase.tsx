import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowRight, Save, Plus, Camera, Package, ChartGantt, Edit, Trash2, Users, CreditCard, DollarSign, TrendingUp, ShoppingCart, ChevronDown, ChevronUp, Building2, Calendar, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { getCurrentDate, formatCurrency } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { WellSelector } from "@/components/well-selector";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { exportMaterialPurchasesToExcel } from "@/components/ui/export-material-purchases-excel";
import type { Material, InsertMaterialPurchase, InsertMaterial, Supplier, InsertSupplier } from "@shared/schema";

export default function MaterialPurchase() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects, getProjectIdForApi } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ 
    paymentType: 'all', 
    category: 'all',
    dateRange: undefined,
    dateFrom: '',
    dateTo: '',
    specificDate: ''
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'selectedDate') {
      setSelectedDate(value ? format(new Date(value), "yyyy-MM-dd") : "");
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  // Get URL parameters for editing
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  // Form states
  const [materialName, setMaterialName] = useState<string>("");
  const [materialCategory, setMaterialCategory] = useState<string>("");
  const [materialUnit, setMaterialUnit] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("نقد");
  const [supplierName, setSupplierName] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(getCurrentDate());
  const [purchaseDate, setPurchaseDate] = useState<string>(getCurrentDate());
  const [notes, setNotes] = useState<string>("");
  const [invoicePhoto, setInvoicePhoto] = useState<string>("");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);

  // حالة طي النموذج - مطوي افتراضياً
  const [isFormCollapsed, setIsFormCollapsed] = useState(true);

  // حالات نموذج إضافة المورد
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [supplierFormName, setSupplierFormName] = useState("");
  const [supplierFormContactPerson, setSupplierFormContactPerson] = useState("");
  const [supplierFormPhone, setSupplierFormPhone] = useState("");
  const [supplierFormAddress, setSupplierFormAddress] = useState("");
  const [supplierFormPaymentTerms, setSupplierFormPaymentTerms] = useState("نقد");
  const [supplierFormNotes, setSupplierFormNotes] = useState("");
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // التحقق من وجود التاريخ في URL أولاً
    const params = new URLSearchParams(window.location.search);
    return params.get('date') || ""; // القيمة الافتراضية فارغة لجلب الكل
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setSelectedDate(""); 
    setFilterValues({ 
      paymentType: 'all', 
      category: 'all',
      dateRange: undefined,
      dateFrom: '',
      dateTo: '',
      specificDate: '' 
    });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر وعرض كافة المشتريات",
    });
  }, [toast]);

  // إزالة التعيين التلقائي لتاريخ اليوم لجلب الكل افتراضياً
  useEffect(() => {
    // لا نفعل شيئاً هنا للسماح بجلب الكل افتراضياً
  }, []);

  // إزالة الزر العائم من صفحة المشتريات
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

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

  // دالة إعادة تعيين نموذج المورد
  const resetSupplierForm = () => {
    setSupplierFormName("");
    setSupplierFormContactPerson("");
    setSupplierFormPhone("");
    setSupplierFormAddress("");
    setSupplierFormPaymentTerms("نقد");
    setSupplierFormNotes("");
  };

  // إضافة مورد جديد
  const addSupplierMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('supplier_name', supplierFormName),
        saveAutocompleteValue('supplier_contact_person', supplierFormContactPerson),
        saveAutocompleteValue('supplier_phone', supplierFormPhone),
        saveAutocompleteValue('supplier_address', supplierFormAddress),
        saveAutocompleteValue('supplier_payment_terms', supplierFormPaymentTerms)
      ]);

      return apiRequest("/api/suppliers", "POST", data);
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "تم إضافة المورد بنجاح",
        description: `تم إضافة المورد "${supplierFormName}" إلى قاعدة البيانات`,
      });

      // تحديد المورد الجديد في قائمة الاختيار
      setSupplierName(supplierFormName);

      // إغلاق النموذج وإعادة تعيين القيم
      setIsSupplierDialogOpen(false);
      resetSupplierForm();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إضافة المورد",
        description: error?.message || "حدث خطأ أثناء إضافة المورد. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierFormName.trim()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم المورد",
        variant: "destructive",
      });
      return;
    }

    const supplierData: InsertSupplier = {
      name: supplierFormName.trim(),
      contactPerson: supplierFormContactPerson.trim() || undefined,
      phone: supplierFormPhone.trim() || undefined,
      address: supplierFormAddress.trim() || undefined,
      paymentTerms: supplierFormPaymentTerms || undefined,
      notes: supplierFormNotes.trim() || undefined,
      isActive: true,
    };

    addSupplierMutation.mutate(supplierData);
  };

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/materials", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Material[];
        }
        return Array.isArray(response) ? response as Material[] : [];
      } catch (error) {
        console.error("Error fetching materials:", error);
        return [];
      }
    },
    staleTime: 300000, // 5 دقائق
    gcTime: 600000, // 10 دقائق
  });

  // جلب بيانات الموردين من قاعدة البيانات
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suppliers", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Supplier[];
        }
        return Array.isArray(response) ? response as Supplier[] : [];
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
    staleTime: 300000, // 5 دقائق
    gcTime: 600000, // 10 دقائق
  });

  // Fetch purchase data for editing
  const { data: purchaseToEdit, isLoading: isLoadingEdit } = useQuery({
    queryKey: ["/api/material-purchases", editId],
    queryFn: async () => {
      if (!editId) return null;

      try {
        console.log(`🔄 جلب بيانات المشترية للتعديل: ${editId}`);
        const response = await apiRequest(`/api/material-purchases/${editId}`, "GET");

        console.log('📊 استجابة جلب بيانات التعديل:', response);

        // معالجة الهيكل المتداخل للاستجابة
        let purchaseData = null;
        if (response && response.data) {
          purchaseData = response.data;
        } else if (response && response.id) {
          purchaseData = response;
        } else {
          console.warn('⚠️ لا توجد بيانات في الاستجابة');
          return null;
        }

        console.log('✅ تم جلب بيانات المشترية للتعديل:', purchaseData);
        return purchaseData;
      } catch (error) {
        console.error("❌ خطأ في جلب بيانات المشترية للتعديل:", error);
        return null;
      }
    },
    enabled: !!editId,
    retry: 1,
    staleTime: 0, // Always fetch fresh data for editing
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (purchaseToEdit && editId) {
      console.log('🔄 ملء النموذج ببيانات التعديل:', purchaseToEdit);

      // تشخيص مفصل لحقول المادة
      console.log('🔍 تحليل البيانات المسترجعة:', {
        purchaseToEdit: {
          materialName: purchaseToEdit.materialName,
          materialCategory: purchaseToEdit.materialCategory,
          materialUnit: purchaseToEdit.materialUnit,
          unit: purchaseToEdit.unit
        },
        material: purchaseToEdit.material ? {
          name: purchaseToEdit.material.name,
          category: purchaseToEdit.material.category,
          unit: purchaseToEdit.material.unit
        } : 'لا توجد بيانات مادة مرتبطة'
      });

      // استخدام البيانات المحفوظة في الجدول أولاً، ثم البيانات المرتبطة
      const materialName = purchaseToEdit.materialName || purchaseToEdit.material?.name || "";
      const materialCategory = purchaseToEdit.materialCategory || purchaseToEdit.material?.category || "";
      const materialUnit = purchaseToEdit.materialUnit || purchaseToEdit.unit || purchaseToEdit.material?.unit || "";

      console.log('📝 القيم النهائية التي سيتم ملؤها:', {
        materialName,
        materialCategory,
        materialUnit
      });

      setMaterialName(materialName);
      setMaterialCategory(materialCategory);
      setMaterialUnit(materialUnit);
      setQuantity(purchaseToEdit.quantity?.toString() || "");
      setUnitPrice(purchaseToEdit.unitPrice?.toString() || "");
      setPaymentType(purchaseToEdit.purchaseType || "نقد");
      setSupplierName(purchaseToEdit.supplierName || "");
      setInvoiceNumber(purchaseToEdit.invoiceNumber || "");
      setInvoiceDate(purchaseToEdit.invoiceDate || "");
      setPurchaseDate(purchaseToEdit.purchaseDate || "");
      setNotes(purchaseToEdit.notes || "");
      setInvoicePhoto(purchaseToEdit.invoicePhoto || "");
      setEditingPurchaseId(purchaseToEdit.id);

      console.log('✅ تم ملء النموذج بالبيانات:', {
        materialName,
        materialCategory,
        materialUnit,
        quantity: purchaseToEdit.quantity,
        unitPrice: purchaseToEdit.unitPrice,
        purchaseType: purchaseToEdit.purchaseType
      });
    }
  }, [purchaseToEdit, editId]);

  const addMaterialMutation = useMutation({
    mutationFn: (data: InsertMaterial) => apiRequest("/api/materials", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
    },
    onError: (error: any) => {
      console.error("Material creation error:", error);
      let errorMessage = "حدث خطأ أثناء إضافة المادة";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Get unique material names, categories, units, and suppliers
  const materialNames = Array.isArray(materials) ? materials.map(m => m.name) : [];
  const materialUnits = Array.isArray(materials) ? Array.from(new Set(materials.map(m => m.unit))) : [];

  // جلب الفئات الفعلية من المشتريات بدلاً من جدول المواد فقط
  const { data: purchaseList = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", selectedProjectId, "material-purchases", selectedDate],
    enabled: !!selectedProjectId,
  });

  const materialCategories = useMemo(() => {
    const categoriesFromMaterials = Array.isArray(materials) ? materials.map(m => m.category) : [];
    const categoriesFromPurchases = Array.isArray(purchaseList) ? purchaseList.map(p => p.materialCategory) : [];
    // تنظيف الفئات من القيم الفارغة والمكررة
    const allCategories = Array.from(new Set([...categoriesFromMaterials, ...categoriesFromPurchases]))
      .filter(Boolean)
      .map(c => c.trim())
      .filter(c => c !== "");
    
    return allCategories;
  }, [materials, purchaseList]);

  // الموردين النشطين من قاعدة البيانات
  const activeSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier => supplier.isActive) : [];

  const addMaterialPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      // تنفيذ العملية الأساسية
      return apiRequest("/api/material-purchases", "POST", data);
    },
    onMutate: async (data) => {
      // فوري - تحديث البيانات محلياً قبل انتظار الخادم
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases", selectedDate] });
      const previousData = queryClient.getQueryData(["/api/projects", selectedProjectId, "material-purchases", selectedDate]);

      queryClient.setQueryData(["/api/projects", selectedProjectId, "material-purchases", selectedDate], (old: any) => {
        const newPurchase = { id: `temp-${Date.now()}`, ...data, createdAt: new Date().toISOString() };
        return old ? [...old, newPurchase] : [newPurchase];
      });

      toast({
        title: "جاري الحفظ",
        description: "البيانات تحدثت فوراً",
      });

      return { previousData };
    },
    onSuccess: async () => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم الحفظ",
        description: "تم حفظ شراء المواد بنجاح",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases", selectedDate] });
    },
    onError: async (error: any) => {
      // حفظ القيم في autocomplete_data حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      console.error("Material purchase error:", error);
      let errorMessage = "حدث خطأ أثناء حفظ شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;

        // استخدام الرسالة والتفاصيل من الخادم
        if (errorData.message) {
          errorMessage = errorData.message;
        }

        // إضافة التفاصيل إذا كانت متوفرة
        if (errorData.details && Array.isArray(errorData.details)) {
          errorDetails = errorData.details;
        } else if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
          errorDetails = errorData.validationErrors;
        }
      }

      // تحسين عرض الرسالة مع التفاصيل
      const fullMessage = errorDetails.length > 0 
        ? `${errorMessage}\n\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`
        : errorMessage;

      toast({
        title: "خطأ في حفظ شراء المواد",
        description: fullMessage,
        variant: "destructive",
        duration: 8000, // وقت أطول لقراءة التفاصيل
      });
      // لا تقم بإعادة تعيين النموذج عند حدوث خطأ
    },
  });

  const resetForm = () => {
    setMaterialName("");
    setMaterialCategory("");
    setMaterialUnit("");
    setQuantity("");
    setUnitPrice("");
    setPaymentType("نقد");
    setSupplierName("");
    setInvoiceNumber("");
    setInvoiceDate(getCurrentDate());
    setPurchaseDate(getCurrentDate());
    setNotes("");
    setInvoicePhoto("");
    setEditingPurchaseId(null);
  };

  // Update Material Purchase Mutation
  const updateMaterialPurchaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log('🔄 [PATCH] بدء تحديث المشترية:', { id, data });

      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      const response = await apiRequest(`/api/material-purchases/${id}`, "PATCH", data);
      console.log('✅ [PATCH] استجابة تحديث المشترية:', response);
      return response;
    },
    onSuccess: async () => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم التعديل",
        description: "تم تعديل شراء المواد بنجاح",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases", selectedDate] });
    },
    onError: async (error: any) => {
      // حفظ القيم في autocomplete_data حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      console.error("Material purchase update error:", error);
      let errorMessage = "حدث خطأ أثناء تحديث شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;

        if (errorData.message) {
          errorMessage = errorData.message;
        }

        if (errorData.details && Array.isArray(errorData.details)) {
          errorDetails = errorData.details;
        } else if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
          errorDetails = errorData.validationErrors;
        }
      }

      const fullMessage = errorDetails.length > 0 
        ? `${errorMessage}\n\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`
        : errorMessage;

      toast({
        title: "خطأ في تحديث شراء المواد",
        description: fullMessage,
        variant: "destructive",
        duration: 8000,
      });
      // لا تقم بإعادة تعيين النموذج عند حدوث خطأ
    }
  });

  // Delete Material Purchase Mutation
  const deleteMaterialPurchaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-purchases/${id}`, "DELETE"),
    onMutate: async (id) => {
      // فوري - حذف البيانات محلياً قبل انتظار الخادم
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases", selectedDate] });
      const previousData = queryClient.getQueryData(["/api/projects", selectedProjectId, "material-purchases", selectedDate]);

      queryClient.setQueryData(["/api/projects", selectedProjectId, "material-purchases", selectedDate], (old: any) => {
        return old ? old.filter((p: any) => p.id !== id) : [];
      });

      toast({
        title: "جاري الحذف",
        description: "تم حذف السجل من الواجهة",
      });

      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف شراء المواد بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases", selectedDate] });
    },
    onError: (error: any) => {
      console.error("Material purchase delete error:", error);
      let errorMessage = "حدث خطأ أثناء حذف شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;

        if (errorData.message) {
          errorMessage = errorData.message;
        }

        if (errorData.details && Array.isArray(errorData.details)) {
          errorDetails = errorData.details;
        }
      }

      const fullMessage = errorDetails.length > 0 
        ? `${errorMessage}\n\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`
        : errorMessage;

      toast({
        title: "خطأ في حذف شراء المواد",
        description: fullMessage,
        variant: "destructive",
        duration: 6000,
      });
    }
  });

  const calculateTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    return (qty * price).toFixed(2);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInvoicePhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSave = (saveAndAddAnother = false) => {
    if (!selectedProjectId || !materialName || !materialUnit || !quantity || !unitPrice) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = parseFloat(calculateTotal());
    const purchaseData = {
      projectId: selectedProjectId,
      materialName: materialName.trim(),
      materialCategory: materialCategory.trim() || null, // تأكد من حفظ null بدلاً من سلسلة فارغة
      materialUnit: materialUnit.trim(),
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(unitPrice),
      totalAmount: totalAmount,
      purchaseType: paymentType.trim(), // تنظيف وتنسيق نوع الدفع - استخدام purchaseType
      paidAmount: paymentType.trim() === 'نقد' ? totalAmount : 0, // إذا نقد، املأ المبلغ المدفوع بالكامل
      remainingAmount: paymentType.trim() === 'نقد' ? 0 : totalAmount, // إذا نقد، لا يوجد متبقي
      supplierName: supplierName?.trim() || '',
      invoiceNumber: invoiceNumber?.trim() || '',
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      invoicePhoto: invoicePhoto || '',
      notes: notes?.trim() || '',
      purchaseDate: purchaseDate,
      wellId: selectedWellId || null,
    };

    console.log('💾 بيانات المشترية قبل الحفظ:', {
      materialName: purchaseData.materialName,
      materialCategory: purchaseData.materialCategory,
      materialUnit: purchaseData.materialUnit,
      isEditing: !!editingPurchaseId
    });

    if (editingPurchaseId) {
      updateMaterialPurchaseMutation.mutate({
        id: editingPurchaseId,
        data: purchaseData
      });
    } else {
      addMaterialPurchaseMutation.mutate(purchaseData);
    }

    if (!saveAndAddAnother && !editingPurchaseId) {
      setLocation("/daily-expenses");
    }
  };

  // Fetch Material Purchases - جلب جميع المشتريات مع تحسين الكاش
  const { data: allMaterialPurchases = [], isLoading: materialPurchasesLoading, refetch: refetchMaterialPurchases } = useQuery<any[]>({
    queryKey: ["/api/material-purchases", getProjectIdForApi() ?? 'all', selectedDate],
    queryFn: async () => {
      const projectIdForApi = getProjectIdForApi();
      const baseUrl = `/api/material-purchases`;
      
      const queryParams = new URLSearchParams();
      // إذا كان projectId هو 'all'، لا نرسله كمعامل projectId للخادم بل نتركه ليجلب الكل
      if (projectIdForApi && projectIdForApi !== 'all') {
        queryParams.append('projectId', projectIdForApi);
      }
      
      // نرسل التاريخ فقط إذا كان محدداً، وإلا سيجلب السيرفر الكل
      if (selectedDate && selectedDate !== "") {
        queryParams.append('date', selectedDate);
      }
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      
      console.log(`📡 [Fetching] ${endpoint}`);
      const response = await apiRequest(endpoint, "GET");
      
      // توحيد شكل البيانات المسترجعة
      const data = response.data || response;
      return Array.isArray(data) ? data : [];
    },
    enabled: true,
    staleTime: 0, 
  });

  // استخدام البيانات المجلوبة بدلاً من تعريف useQuery مكرر
  const purchases = allMaterialPurchases;
  const isLoadingPurchases = materialPurchasesLoading;
  const refetchPurchases = refetchMaterialPurchases;

  // Filter purchases - عرض جميع المشتريات افتراضياً
  const filteredPurchases = useMemo(() => {
    return allMaterialPurchases.filter((purchase: any) => {
      // فلترة حسب المشروع المحدد - استخدام isAllProjects
      const matchesProject = isAllProjects || 
        !selectedProjectId || 
        purchase.projectId === selectedProjectId;

      const matchesSearch = searchValue === '' || 
        purchase.materialName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        purchase.supplierName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        purchase.notes?.toLowerCase().includes(searchValue.toLowerCase()) ||
        purchase.materialCategory?.toLowerCase().includes(searchValue.toLowerCase());

      const matchesPaymentType = filterValues.paymentType === 'all' || 
        purchase.purchaseType === filterValues.paymentType;

      const matchesCategory = !filterValues.category || filterValues.category === 'all' ||
        purchase.materialCategory === filterValues.category;

      // فلترة حسب التاريخ المختار من القائمة العلوية (إذا لم يكن "all")
      // ملاحظة: قمنا بإضافة المعامل للسيرفر، ولكن هنا نضمن الفلترة في الواجهة أيضاً
      const matchesSelectedDate = !selectedDate || purchase.purchaseDate === selectedDate;

      // فلترة حسب نطاق التاريخ من الفلتر المتقدم
      let matchesDateRange = true;
      if (filterValues.dateRange?.from || filterValues.dateRange?.to) {
        const purchaseDate = new Date(purchase.purchaseDate);
        if (filterValues.dateRange.from) {
          const fromDate = new Date(filterValues.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDateRange = matchesDateRange && purchaseDate >= fromDate;
        }
        if (filterValues.dateRange.to) {
          const toDate = new Date(filterValues.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && purchaseDate <= toDate;
        }
      }

      let matchesSpecificDate = true;
      if (filterValues.specificDate) {
        const pDate = new Date(purchase.purchaseDate);
        const sDate = new Date(filterValues.specificDate);
        matchesSpecificDate = pDate.getFullYear() === sDate.getFullYear() &&
                             pDate.getMonth() === sDate.getMonth() &&
                             pDate.getDate() === sDate.getDate();
      }

      return matchesProject && matchesSearch && matchesPaymentType && matchesCategory && matchesDateRange && matchesSelectedDate && matchesSpecificDate;
    });
  }, [allMaterialPurchases, selectedProjectId, isAllProjects, searchValue, filterValues.paymentType, filterValues.category, filterValues.dateRange, filterValues.specificDate, selectedDate]);


  // Calculate stats
  const stats = useMemo(() => ({
    total: allMaterialPurchases.length,
    cash: allMaterialPurchases.filter((p: any) => p.purchaseType === 'نقد').length,
    credit: allMaterialPurchases.filter((p: any) => p.purchaseType?.includes('آجل') || p.purchaseType?.includes('جل')).length,
    supply: allMaterialPurchases.filter((p: any) => p.purchaseType === 'توريد').length,
    totalValue: allMaterialPurchases.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || '0'), 0),
    avgValue: allMaterialPurchases.length > 0 
      ? allMaterialPurchases.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || '0'), 0) / allMaterialPurchases.length 
      : 0,
  }), [allMaterialPurchases]);


  // فلترة المشتريات حسب المشروع المحدد، البحث، ونوع الدفع، والتاريخ
  // THIS IS THE LINE THAT WAS REMOVED: const materialPurchases = filteredPurchases;

  // دالة التحديث
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchMaterialPurchases();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchMaterialPurchases]);

  // Auto-refresh when page loads or project changes - محسّن
  useEffect(() => {
    if ((isAllProjects || selectedProjectId) && !allMaterialPurchases.length) {
      refetchMaterialPurchases();
    }
  }, [selectedProjectId, isAllProjects, refetchMaterialPurchases, allMaterialPurchases.length]);

  // Edit Function
  const handleEdit = (purchase: any) => {
    setMaterialName(purchase.materialName || purchase.material?.name || "");
    setMaterialCategory(purchase.materialCategory || purchase.material?.category || "");
    setMaterialUnit(purchase.materialUnit || purchase.material?.unit || purchase.unit || "");
    setQuantity(purchase.quantity);
    setUnitPrice(purchase.unitPrice);
    setPaymentType(purchase.purchaseType || purchase.paymentType || "نقد");
    setSupplierName(purchase.supplierName || "");
    setInvoiceNumber(purchase.invoiceNumber || "");
    setInvoiceDate(purchase.invoiceDate || "");
    setPurchaseDate(purchase.purchaseDate || "");
    setNotes(purchase.notes || "");
    setInvoicePhoto(purchase.invoicePhoto || "");
    setEditingPurchaseId(purchase.id);
    setIsFormCollapsed(false);
  };

  // Helper function to format date for display in UnifiedCard footer
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      // Adjusting to ensure correct locale date string, e.g., 'en-GB' for DD/MM/YYYY
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return dateString; // Fallback to original string if parsing fails
    }
  };

  // Helper function to delete a purchase
  const handleDelete = (id: string) => {
    // Optionally show a confirmation dialog here
    if (window.confirm("هل أنت متأكد أنك تريد حذف هذا السجل؟")) {
      deleteMaterialPurchaseMutation.mutate(id);
    }
  };

  // تكوين صفوف الإحصائيات الموحدة - شبكة 3×2
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي المشتريات',
          value: stats.total,
          icon: Package,
          color: 'blue',
        },
        {
          key: 'cash',
          label: 'مشتريات نقد',
          value: stats.cash,
          icon: DollarSign,
          color: 'green',
        },
        {
          key: 'credit',
          label: 'مشتريات آجلة',
          value: stats.credit,
          icon: CreditCard,
          color: 'orange',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'supply',
          label: 'توريدات',
          value: stats.supply,
          icon: ShoppingCart,
          color: 'purple',
        },
        {
          key: 'totalValue',
          label: 'إجمالي القيمة',
          value: formatCurrency(stats.totalValue),
          icon: TrendingUp,
          color: 'teal',
        },
        {
          key: 'avgValue',
          label: 'متوسط الشراء',
          value: formatCurrency(stats.avgValue),
          icon: ChartGantt,
          color: 'indigo',
        },
      ]
    }
  ], [stats]);

  // تكوين الفلاتر
  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'selectedDate',
      label: 'التاريخ',
      type: 'date',
      placeholder: 'جميع التواريخ',
    },
    {
      key: 'category',
      label: 'الفئة',
      type: 'select',
      placeholder: 'جميع الفئات',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        ...(materialCategories || []).map(cat => ({ value: cat, label: cat }))
      ],
    },
    {
      key: 'paymentType',
      label: 'نوع الدفع',
      type: 'select',
      placeholder: 'اختر نوع الدفع',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        { value: 'نقد', label: 'نقد' },
        { value: 'آجل', label: 'آجل' },
        { value: 'توريد', label: 'توريد' }
      ],
    },
    {
      key: 'dateRange',
      label: 'نطاق التاريخ',
      type: 'date-range',
      placeholder: 'اختر نطاق التاريخ',
    },
    {
      key: 'specificDate',
      label: 'تاريخ يوم محدد',
      type: 'date',
      placeholder: 'تاريخ يوم محدد',
    },
  ], [materialCategories]);

  // Export to Excel function
  const handleExportExcel = useCallback(async () => {
    if (filteredPurchases.length === 0) {
      toast({
        title: "لا توجد بيانات",
        description: "لا توجد مشتريات لتصديرها بناءً على الفلاتر الحالية",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportMaterialPurchasesToExcel(filteredPurchases);
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${filteredPurchases.length} سجل إلى ملف Excel`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء محاولة تصدير البيانات",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [filteredPurchases, toast]);

  // تكوين الأزرار الإضافية - زر التصدير
  const actions = useMemo(() => [
    {
      key: 'export',
      label: isExporting ? 'جاري التصدير...' : 'تصدير إكسل',
      icon: FileSpreadsheet,
      onClick: handleExportExcel,
      variant: 'outline' as const,
      disabled: isExporting || filteredPurchases.length === 0,
    }
  ], [handleExportExcel, isExporting, filteredPurchases.length]);

  return (
    <div className="p-4 slide-in">
      {/* لوحة الإحصائيات والفلترة الموحدة - شبكة 3×2 */}
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث عن مادة أو مورد..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={actions}
      />

      {/* مؤشر التحميل لبيانات التعديل */}
      {isLoadingEdit && editId && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-blue-700">جاري تحميل بيانات المشترية للتعديل...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Form */}
      <Collapsible open={!isFormCollapsed} onOpenChange={(open) => setIsFormCollapsed(!open)}>
        <Card className="mb-4">
          <CardContent className={isFormCollapsed ? "p-2" : "p-4"}>
            <CollapsibleTrigger asChild>
              <div className={`flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg transition-colors ${isFormCollapsed ? "p-2 -m-2" : "p-2 -m-2 mb-2"}`}>
                <h3 className={`font-semibold text-foreground flex items-center gap-2 ${isFormCollapsed ? "text-base" : "text-lg"}`}>
                  <Package className={isFormCollapsed ? "h-4 w-4 text-primary" : "h-5 w-5 text-primary"} />
                  {editingPurchaseId ? "تعديل مشترية" : "إضافة مشترية جديدة"}
                </h3>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isFormCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-2">
                {/* Material Name */}
                <div>
                  <Label className="block text-sm font-medium text-foreground">اسم المادة</Label>
              <AutocompleteInput
                value={materialName}
                onChange={setMaterialName}
                category="materialNames"
                placeholder="اختر أو أدخل اسم المادة..."
              />
            </div>

            {/* Material Category */}
            <div>
              <Label className="block text-sm font-medium text-foreground">فئة المادة</Label>
              <AutocompleteInput
                value={materialCategory}
                onChange={setMaterialCategory}
                category="materialCategories"
                placeholder="اختر أو أدخل فئة المادة..."
              />
            </div>

            {/* Material Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-foreground">الكمية</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="text-center arabic-numbers"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-foreground">الوحدة</Label>
                <AutocompleteInput
                  value={materialUnit}
                  onChange={setMaterialUnit}
                  category="materialUnits"
                  placeholder="طن، كيس، م³..."
                />
              </div>
            </div>

            {/* Price and Total */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-foreground">سعر الوحدة</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="text-center arabic-numbers"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-foreground">المبلغ الإجمالي</Label>
                <Input
                  type="number"
                  value={calculateTotal()}
                  readOnly
                  className="text-center arabic-numbers bg-muted"
                />
              </div>
            </div>

            {/* Payment Type */}
            <div>
              <Label className="block text-sm font-medium text-foreground">نوع الدفع</Label>
              <RadioGroup value={paymentType} onValueChange={setPaymentType} className="flex gap-4">
                <div className="flex items-center space-x-reverse space-x-2">
                  <RadioGroupItem value="نقد" id="cash" />
                  <Label htmlFor="cash" className="text-sm">نقد</Label>
                </div>
                <div className="flex items-center space-x-reverse space-x-2">
                  <RadioGroupItem value="آجل" id="credit" />
                  <Label htmlFor="credit" className="text-sm">آجل</Label>
                </div>
                <div className="flex items-center space-x-reverse space-x-2">
                  <RadioGroupItem value="توريد" id="supply" />
                  <Label htmlFor="supply" className="text-sm">توريد</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Well Selector */}
            <WellSelector
              projectId={selectedProjectId}
              value={selectedWellId}
              onChange={setSelectedWellId}
              optional={true}
            />

            {/* Supplier/Store */}
            <div>
              <Label className="block text-sm font-medium text-foreground">اسم المورد/المحل</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  value={supplierName}
                  onValueChange={setSupplierName}
                  options={activeSuppliers.map((supplier) => ({
                    value: supplier.name,
                    label: supplier.name,
                    description: supplier.contactPerson || undefined
                  }))}
                  placeholder="اختر المورد..."
                  searchPlaceholder="ابحث عن مورد..."
                  emptyText="لا توجد موردين مسجلين"
                  className="flex-1"
                />
                <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="إضافة مورد جديد"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إضافة مورد جديد</DialogTitle>
                      <DialogDescription>
                        أدخل معلومات المورد الجديد. جميع الحقول اختيارية عدا اسم المورد.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSupplier} className="form-grid">
                      <div className="form-field form-field-full">
                        <Label htmlFor="supplier-name">اسم المورد/المحل *</Label>
                        <Input
                          id="supplier-name"
                          value={supplierFormName}
                          onChange={(e) => setSupplierFormName(e.target.value)}
                          placeholder="مثال: مؤسسة الخضراء للمواد"
                          required
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="supplier-contact">الشخص المسؤول</Label>
                        <Input
                          id="supplier-contact"
                          value={supplierFormContactPerson}
                          onChange={(e) => setSupplierFormContactPerson(e.target.value)}
                          placeholder="مثال: أحمد محمد"
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="supplier-phone">رقم الهاتف</Label>
                        <Input
                          id="supplier-phone"
                          value={supplierFormPhone}
                          onChange={(e) => setSupplierFormPhone(e.target.value)}
                          placeholder="مثال: 777123456"
                          type="tel"
                        />
                      </div>

                      <div className="form-field form-field-full">
                        <Label htmlFor="supplier-address">العنوان</Label>
                        <Input
                          id="supplier-address"
                          value={supplierFormAddress}
                          onChange={(e) => setSupplierFormAddress(e.target.value)}
                          placeholder="مثال: شارع الستين، صنعاء"
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="supplier-payment">شروط الدفع</Label>
                        <Select value={supplierFormPaymentTerms} onValueChange={setSupplierFormPaymentTerms}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر شروط الدفع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="نقد">نقد</SelectItem>
                            <SelectItem value="أجل">أجل</SelectItem>
                            <SelectItem value="نقد وأجل">نقد وأجل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="form-field form-field-full">
                        <Label htmlFor="supplier-notes">ملاحظات</Label>
                        <Textarea
                          id="supplier-notes"
                          value={supplierFormNotes}
                          onChange={(e) => setSupplierFormNotes(e.target.value)}
                          placeholder="أي ملاحظات إضافية..."
                          rows={3}
                        />
                      </div>

                      <div className="form-actions">
                        <Button
                          type="submit"
                          disabled={addSupplierMutation.isPending || !supplierFormName.trim()}
                        >
                          {addSupplierMutation.isPending ? "جاري الإضافة..." : "إضافة المورد"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsSupplierDialogOpen(false);
                            resetSupplierForm();
                          }}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {activeSuppliers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  لا توجد موردين مسجلين. اضغط + لإضافة مورد جديد
                </p>
              )}
            </div>

            {/* Purchase Date */}
            <DatePickerField
              label="تاريخ الشراء"
              value={purchaseDate}
              onChange={(date) => setPurchaseDate(date ? format(date, "yyyy-MM-dd") : "")}
            />

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-foreground">رقم الفاتورة</Label>
                <AutocompleteInput
                  type="number"
                  inputMode="numeric"
                  value={invoiceNumber}
                  onChange={setInvoiceNumber}
                  category="invoiceNumbers"
                  placeholder="رقم الفاتورة"
                  className="arabic-numbers"
                />
              </div>
              <DatePickerField
                label="تاريخ الفاتورة"
                value={invoiceDate}
                onChange={(date) => setInvoiceDate(date ? format(date, "yyyy-MM-dd") : "")}
              />
            </div>

            {/* Invoice Photo Upload */}
            <div>
              <Label className="block text-sm font-medium text-foreground">صورة الفاتورة</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {invoicePhoto ? (
                  <div className="space-y-2">
                    <img 
                      src={invoicePhoto} 
                      alt="Invoice" 
                      className="max-w-full max-h-32 mx-auto rounded"
                    />
                    <p className="text-sm text-success">تم رفع الصورة بنجاح</p>
                  </div>
                ) : (
                  <>
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">اضغط لإضافة صورة الفاتورة</p>
                  </>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="invoice-photo"
                />
                <Label
                  htmlFor="invoice-photo"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors inline-block"
                >
                  {invoicePhoto ? "تغيير الصورة" : "اختر صورة"}
                </Label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="block text-sm font-medium text-foreground">ملاحظات</Label>
              <AutocompleteInput
                value={notes}
                onChange={setNotes}
                category="notes"
                placeholder="أي ملاحظات إضافية..."
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => handleSave(false)}
                disabled={addMaterialPurchaseMutation.isPending || updateMaterialPurchaseMutation.isPending}
                className="w-full bg-success hover:bg-success/90 text-success-foreground"
              >
                <Save className="ml-2 h-4 w-4" />
                {(addMaterialPurchaseMutation.isPending || updateMaterialPurchaseMutation.isPending) 
                  ? "جاري الحفظ..." 
                  : editingPurchaseId 
                    ? "تحديث الشراء" 
                    : "حفظ الشراء"}
              </Button>

              {!editingPurchaseId && (
                <Button
                  onClick={() => handleSave(true)}
                  disabled={addMaterialPurchaseMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  حفظ وإضافة آخر
                </Button>
              )}

              {editingPurchaseId && (
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                >
                  إلغاء التحرير
                </Button>
              )}
            </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* قائمة المشتريات - عرض جميع البطاقات افتراضياً */}
      {materialPurchasesLoading && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="text-center text-muted-foreground">جاري تحميل المشتريات...</div>
          </CardContent>
        </Card>
      )}

      {/* رسالة عدم وجود مشتريات */}
      {!materialPurchasesLoading && filteredPurchases.length === 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-medium">لا توجد مشتريات</h3>
              <p className="text-sm">
                {allMaterialPurchases.length > 0 
                  ? "لا توجد نتائج مطابقة للبحث أو الفلتر المحدد" 
                  : "لم يتم تسجيل أي مشتريات بعد"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* عرض جميع البطاقات باستخدام UnifiedCard */}
      {filteredPurchases.length > 0 && (
        <div className="mt-4">
          <UnifiedCardGrid columns={3}>
            {filteredPurchases.map((purchase) => {
              // تحديد لون الشريط حسب نوع الدفع
              const headerColor = purchase.purchaseType === 'نقد' ? '#22c55e' : purchase.purchaseType === 'آجل' ? '#f97316' : '#6366f1'; // Green for cash, Orange for credit, Blue for supply

              return (
                <UnifiedCard
                  key={purchase.id}
                  title={purchase.materialName || 'مادة غير محددة'}
                  subtitle={formatDate(purchase.purchaseDate)}
                  titleIcon={ShoppingCart}
                  headerColor={headerColor}
                  badges={[
                    {
                      label: purchase.purchaseType,
                      variant: purchase.purchaseType === 'نقد' ? 'success' : purchase.purchaseType === 'آجل' ? 'warning' : 'default',
                    }
                  ]}
                  fields={[
                    ...(isAllProjects || !selectedProjectId ? [{
                      label: "المشروع",
                      value: purchase.projectName || purchase.project?.name || 'غير محدد',
                      icon: Building2,
                      color: "info" as const,
                    }] : []),
                    {
                      label: "المورد",
                      value: purchase.supplierName || 'غير محدد',
                      icon: Users,
                      color: "default",
                    },
                    {
                      label: "الكمية",
                      value: `${purchase.quantity} ${purchase.materialUnit || purchase.unit}`,
                      icon: Package,
                      color: "warning",
                      emphasis: true,
                    },
                    {
                      label: "سعر الوحدة",
                      value: formatCurrency(purchase.unitPrice),
                      icon: DollarSign,
                      color: "default",
                    },
                    {
                      label: "الإجمالي",
                      value: formatCurrency(purchase.totalAmount),
                      icon: DollarSign,
                      color: purchase.purchaseType === 'نقد' ? 'success' : purchase.purchaseType === 'آجل' ? 'warning' : 'default',
                      emphasis: true,
                    },
                    {
                      label: "التاريخ",
                      value: formatDate(purchase.purchaseDate),
                      icon: Calendar,
                      color: "muted",
                    },
                  ]}
                  actions={[
                    {
                      icon: Edit,
                      label: "تعديل",
                      onClick: () => handleEdit(purchase),
                      color: "blue",
                    },
                    {
                      icon: Trash2,
                      label: "حذف",
                      onClick: () => handleDelete(purchase.id),
                      color: "red",
                    },
                  ]}
                  compact
                />
              );
            })}
          </UnifiedCardGrid>
        </div>
      )}
    </div>
  );
}