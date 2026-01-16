import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Wrench, Truck, PenTool, Settings, Eye, MapPin, Calendar, DollarSign, Activity, Edit, Trash2, X, FileSpreadsheet, FileText, Printer, BarChart3, History, CheckCircle2, Download } from "lucide-react";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { AddEquipmentDialog } from "@/components/equipment/add-equipment-dialog";
import { TransferEquipmentDialog } from "@/components/equipment/transfer-equipment-dialog";
import { EquipmentMovementHistoryDialog } from "@/components/equipment/equipment-movement-history-dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { saveAs } from 'file-saver';
import { useToast } from "@/hooks/use-toast";
import { EXCEL_STYLES, COMPANY_INFO, addReportHeader } from "@/components/excel-export-utils";
import { downloadExcelFile } from "@/utils/webview-download";

interface Equipment {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  currentProjectId: string | null;
  purchasePrice: string | number | null;
  purchaseDate: string | null;
  description?: string;
  imageUrl?: string | null;
}

export function EquipmentManagement() {
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
    type: "all",
    project: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showMovementHistoryDialog, setShowMovementHistoryDialog] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { toast } = useToast();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", type: "all", project: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر",
    });
  }, [toast]);

  useEffect(() => {
    const handleAddEquipment = () => setShowAddDialog(true);
    setFloatingAction(handleAddEquipment, "إضافة معدة جديدة");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const { data: equipment = [], isLoading, refetch: refetchEquipment } = useQuery({
    queryKey: ['equipment', searchValue, filterValues.status, filterValues.type, filterValues.project],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchValue) params.append('searchTerm', searchValue);
      if (filterValues.status !== 'all') params.append('status', filterValues.status);
      if (filterValues.type !== 'all') params.append('type', filterValues.type);
      if (filterValues.project !== 'all' && filterValues.project !== 'warehouse') {
        params.append('projectId', filterValues.project);
      } else if (filterValues.project === 'warehouse') {
        params.append('projectId', '');
      }
      
      try {
        const result = await apiRequest(`/api/equipment?${params}`);
        return result.data || result || [];
      } catch (error) {
        throw new Error('فشل في جلب المعدات');
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled: true
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiRequest('/api/projects', 'GET');
      return response;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1000,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchEquipment();
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
  }, [refetchEquipment, toast]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/equipment/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'equipment'
      });
      toast({
        title: "تم حذف المعدة بنجاح",
        description: "تم حذف المعدة من النظام نهائياً"
      });
      setShowEquipmentModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حذف المعدة", 
        description: error.message || "حدث خطأ أثناء حذف المعدة",
        variant: "destructive"
      });
    }
  });

  const stats = useMemo(() => ({
    total: Array.isArray(equipment) ? equipment.length : 0,
    active: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'active' || e.status === 'available').length : 0,
    assigned: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'assigned').length : 0,
    maintenance: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'maintenance').length : 0,
    outOfService: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'out_of_service' || e.status === 'lost').length : 0,
    inWarehouse: Array.isArray(equipment) ? equipment.filter((e: Equipment) => !e.currentProjectId).length : 0,
  }), [equipment]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي المعدات',
          value: stats.total,
          icon: Wrench,
          color: 'blue',
        },
        {
          key: 'active',
          label: 'متاحة',
          value: stats.active,
          icon: CheckCircle2,
          color: 'green',
        },
        {
          key: 'assigned',
          label: 'مخصصة',
          value: stats.assigned,
          icon: MapPin,
          color: 'purple',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'maintenance',
          label: 'في الصيانة',
          value: stats.maintenance,
          icon: Settings,
          color: 'orange',
        },
        {
          key: 'outOfService',
          label: 'خارج الخدمة',
          value: stats.outOfService,
          icon: Truck,
          color: 'red',
        },
        {
          key: 'inWarehouse',
          label: 'في المستودع',
          value: stats.inWarehouse,
          icon: BarChart3,
          color: 'gray',
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
        { value: 'maintenance', label: 'صيانة' },
        { value: 'out_of_service', label: 'خارج الخدمة' },
        { value: 'inactive', label: 'غير نشط' },
      ],
    },
    {
      key: 'type',
      label: 'الفئة',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        { value: 'أدوات كهربائية', label: 'أدوات كهربائية' },
        { value: 'أدوات يدوية', label: 'أدوات يدوية' },
        { value: 'أدوات قياس', label: 'أدوات قياس' },
        { value: 'معدات لحام', label: 'معدات لحام' },
        { value: 'معدات حفر', label: 'معدات حفر' },
        { value: 'معدات قطع', label: 'معدات قطع' },
        { value: 'أدوات ربط', label: 'أدوات ربط' },
        { value: 'مواد كهربائية', label: 'مواد كهربائية' },
        { value: 'معدات أمان', label: 'معدات أمان' },
        { value: 'أدوات نقل', label: 'أدوات نقل' },
      ],
    },
    {
      key: 'project',
      label: 'المشروع',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع المواقع' },
        { value: 'warehouse', label: 'المستودع' },
        ...(Array.isArray(projects) ? projects.map((project: any) => ({
          value: project.id,
          label: project.name,
        })) : []),
      ],
    },
  ], [projects]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'maintenance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'out_of_service': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'inactive': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[status] || colors.active;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'active': 'نشط',
      'maintenance': 'صيانة',
      'out_of_service': 'خارج الخدمة',
      'inactive': 'غير نشط'
    };
    return texts[status] || status;
  };

  const getStatusBadgeVariant = (status: string): "success" | "warning" | "destructive" | "secondary" => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      'active': 'success',
      'maintenance': 'warning',
      'out_of_service': 'destructive',
      'inactive': 'secondary'
    };
    return variants[status] || 'secondary';
  };

  const getHeaderColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': '#22c55e',
      'maintenance': '#eab308',
      'out_of_service': '#ef4444',
      'inactive': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const handleEquipmentClick = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowEquipmentModal(true);
  };

  const handleTransferClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEquipment(item);
    setShowTransferDialog(true);
  };

  const handleEditClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEquipment(item);
    setShowDetailsDialog(true);
  };

  const handleMovementHistoryClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEquipment(item);
    setShowMovementHistoryDialog(true);
  };

  const handleDeleteClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف المعدة "${item.name}" نهائياً؟\n\nلا يمكن التراجع عن هذا الإجراء.`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const getFilteredEquipmentForReport = () => {
    if (!Array.isArray(equipment)) return [];
    return equipment;
  };

  const exportEquipmentToExcel = async () => {
    const filteredEquipment = getFilteredEquipmentForReport();
    
    if (filteredEquipment.length === 0) {
      toast({
        title: "لا توجد معدات للتصدير",
        description: "يرجى التأكد من الفلاتر المحددة",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      workbook.creator = COMPANY_INFO.name;
      workbook.lastModifiedBy = 'نظام إدارة المعدات';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      const worksheet = workbook.addWorksheet('كشف المعدات');
      worksheet.views = [{ rightToLeft: true }];
      
      const reportProjectName = filterValues.project === "all" ? "جميع المشاريع" : 
                                filterValues.project === "warehouse" ? "المستودع" :
                                (Array.isArray(projects) ? projects.find((p: any) => p.id === filterValues.project)?.name : undefined) || "مشروع محدد";
      
      let currentRow = addReportHeader(
        worksheet,
        'كشف المعدات التفصيلي',
        `المشروع: ${reportProjectName}`,
        [
          `تاريخ الإصدار: ${formatDate(new Date().toISOString().split('T')[0])}`,
          `إجمالي المعدات: ${filteredEquipment.length}`,
          `المعدات النشطة: ${filteredEquipment.filter((e: Equipment) => e.status === 'active').length}`,
          `في الصيانة: ${filteredEquipment.filter((e: Equipment) => e.status === 'maintenance').length}`
        ]
      );
      
      const headers = ['الكود', 'اسم المعدة', 'الفئة', 'الحالة', 'الموقع', 'سعر الشراء', 'تاريخ الشراء', 'الوصف'];
      const headerRow = worksheet.addRow(headers);
      
      headers.forEach((_, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.font = EXCEL_STYLES.fonts.header;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.headerBg } };
        cell.border = {
          top: EXCEL_STYLES.borders.medium,
          bottom: EXCEL_STYLES.borders.medium,
          left: EXCEL_STYLES.borders.thin,
          right: EXCEL_STYLES.borders.thin
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 25;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 15;
      worksheet.getColumn(5).width = 25;
      worksheet.getColumn(6).width = 18;
      worksheet.getColumn(7).width = 15;
      worksheet.getColumn(8).width = 30;
      
      currentRow++;

      filteredEquipment.forEach((item: Equipment, index: number) => {
        const projectName = item.currentProjectId 
          ? (Array.isArray(projects) ? projects.find((p: any) => p.id === item.currentProjectId)?.name : undefined) || 'مشروع غير معروف'
          : 'المستودع';
        
        const row = worksheet.addRow([
          item.code,
          item.name,
          item.type || 'غير محدد',
          getStatusText(item.status),
          projectName,
          item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : 'غير محدد',
          item.purchaseDate ? formatDate(item.purchaseDate) : 'غير محدد',
          item.description || 'غير محدد'
        ]);
        
        row.eachCell((cell, colNumber) => {
          cell.font = EXCEL_STYLES.fonts.data;
          cell.border = {
            top: EXCEL_STYLES.borders.thin,
            bottom: EXCEL_STYLES.borders.thin,
            left: EXCEL_STYLES.borders.thin,
            right: EXCEL_STYLES.borders.thin
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          if (colNumber === 6 && item.purchasePrice) {
            cell.numFmt = '#,##0 "ريال"';
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          
          if (colNumber === 8) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
          
          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
        currentRow++;
      });

      const filenameProjectName = filterValues.project === "all" ? "جميع_المشاريع" : 
                                  filterValues.project === "warehouse" ? "المستودع" :
                                  (Array.isArray(projects) ? projects.find((p: any) => p.id === filterValues.project)?.name : undefined)?.replace(/\s/g, '_') || "مشروع_محدد";
      
      const filename = `كشف_المعدات_${filenameProjectName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      const buffer = await workbook.xlsx.writeBuffer();
      await downloadExcelFile(buffer as ArrayBuffer, filename);
      
      toast({
        title: "تم تصدير كشف المعدات بنجاح",
        description: `تم حفظ الملف: ${filename}`
      });
      
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير كشف المعدات",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportEquipmentToPDF = async () => {
    const filteredEquipment = getFilteredEquipmentForReport();
    
    if (filteredEquipment.length === 0) {
      toast({
        title: "لا توجد معدات للتصدير",
        description: "يرجى التأكد من الفلاتر المحددة",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      
      const pdfProjectName = filterValues.project === "all" ? "جميع المشاريع" : 
                             filterValues.project === "warehouse" ? "المستودع" :
                             (Array.isArray(projects) ? projects.find((p: any) => p.id === filterValues.project)?.name : undefined) || "مشروع محدد";
      
      const printContent = `
        <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>كشف المعدات - ${pdfProjectName}</title>
            <style>
              @page { margin: 2cm 1.5cm; size: A4; }
              body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; direction: rtl; }
              .company-header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 25px; text-align: center; border-radius: 12px; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
              .report-header { background: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-left: 6px solid #3b82f6; }
              .report-title { font-size: 22px; color: #1e293b; margin: 0; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 25px; background: white; }
              th { background: linear-gradient(135deg, #334155 0%, #475569 100%); color: white; padding: 15px 10px; text-align: center; font-weight: bold; }
              td { padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
              tr:nth-child(even) td { background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <div class="company-header">
              <div class="company-name">شركة الفتيني للمقاولات والاستشارات الهندسية</div>
            </div>
            <div class="report-header">
              <div class="report-title">كشف المعدات التفصيلي - ${pdfProjectName}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم المعدة</th>
                  <th>الفئة</th>
                  <th>الحالة</th>
                  <th>الموقع</th>
                  <th>السعر</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEquipment.map((item: Equipment) => {
                  const itemProjectName = item.currentProjectId 
                    ? (Array.isArray(projects) ? projects.find((p: any) => p.id === item.currentProjectId)?.name : undefined) || 'مشروع غير معروف'
                    : 'المستودع';
                  return `
                    <tr>
                      <td>${item.code}</td>
                      <td>${item.name}</td>
                      <td>${item.type || 'غير محدد'}</td>
                      <td>${getStatusText(item.status)}</td>
                      <td>${itemProjectName}</td>
                      <td>${item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : 'غير محدد'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (printWindow) {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 2000);
        }, 1500);
        
        toast({
          title: "جاري إعداد الطباعة",
          description: "انتظر قليلاً ليتم تحميل المحتوى"
        });
      }
      
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير كشف المعدات",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">جاري تحميل المعدات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4" dir="rtl">
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث بالاسم أو الكود..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={[
          {
            key: 'export-excel',
            icon: Download,
            label: 'تصدير Excel',
            onClick: exportEquipmentToExcel,
            variant: 'outline',
            disabled: equipment.length === 0 || isExporting,
            tooltip: 'تصدير إلى Excel'
          },
          {
            key: 'export-pdf',
            icon: Printer,
            label: 'طباعة PDF',
            onClick: exportEquipmentToPDF,
            variant: 'outline',
            disabled: equipment.length === 0 || isExporting,
            tooltip: 'طباعة كشف المعدات'
          }
        ]}
      />

      {equipment.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="text-gray-400">
            <Wrench className="h-16 w-16 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">
            لا توجد معدات
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            لم يتم العثور على أي معدات تطابق الفلاتر المحددة
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-500 hover:bg-blue-600 text-white mt-4">
            <Plus className="h-4 w-4 mr-2" />
            إضافة معدة جديدة
          </Button>
        </Card>
      ) : (
        <UnifiedCardGrid columns={3}>
          {Array.isArray(equipment) && equipment.map((item: Equipment) => {
            const projectName = item.currentProjectId 
              ? (Array.isArray(projects) ? projects.find((p: any) => p.id === item.currentProjectId)?.name : undefined) || 'مشروع غير معروف'
              : 'المستودع';
            
            return (
              <UnifiedCard
                key={item.id}
                title={item.name}
                subtitle={item.code}
                titleIcon={Wrench}
                headerColor={getHeaderColor(item.status)}
                onClick={() => handleEquipmentClick(item)}
                badges={[
                  {
                    label: getStatusText(item.status),
                    variant: getStatusBadgeVariant(item.status),
                  },
                  ...(item.type ? [{
                    label: item.type,
                    variant: "secondary" as const,
                  }] : []),
                ]}
                fields={[
                  {
                    label: "الموقع",
                    value: projectName,
                    icon: MapPin,
                  },
                  {
                    label: "سعر الشراء",
                    value: item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : "غير محدد",
                    icon: DollarSign,
                    emphasis: !!item.purchasePrice,
                    color: item.purchasePrice ? "success" : "muted",
                  },
                  {
                    label: "تاريخ الشراء",
                    value: item.purchaseDate ? formatDate(item.purchaseDate) : "غير محدد",
                    icon: Calendar,
                  },
                  ...(item.description ? [{
                    label: "الوصف",
                    value: item.description,
                    icon: Wrench,
                  }] : []),
                ]}
                actions={[
                  {
                    icon: Edit,
                    label: "تعديل",
                    onClick: () => handleEditClick(item),
                  },
                  {
                    icon: History,
                    label: "السجل",
                    onClick: () => handleMovementHistoryClick(item),
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    variant: "ghost",
                    onClick: () => handleDeleteClick(item),
                  },
                ]}
                footer={
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTransferClick(item, e);
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm"
                    size="sm"
                  >
                    نقل المعدة
                  </Button>
                }
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}

      <AddEquipmentDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={projects}
      />

      <AddEquipmentDialog 
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        projects={projects}
        equipment={selectedEquipment}
      />

      <TransferEquipmentDialog
        equipment={selectedEquipment as any}
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        projects={projects}
      />

      <EquipmentMovementHistoryDialog
        equipment={selectedEquipment}
        open={showMovementHistoryDialog}
        onOpenChange={setShowMovementHistoryDialog}
        projects={projects}
      />

      <Dialog open={showEquipmentModal} onOpenChange={setShowEquipmentModal}>
        <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          {selectedEquipment && (
            <div className="relative">
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Wrench className="h-16 w-16 text-white opacity-50" />
              </div>

              <div className="p-6 space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedEquipment.name}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge className={`text-xs ${getStatusColor(selectedEquipment.status)}`}>
                      {getStatusText(selectedEquipment.status)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedEquipment.code}
                    </Badge>
                  </div>
                </div>

                {selectedEquipment.purchasePrice && (
                  <div className="text-center bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3">
                    <div className="text-sm text-orange-600 dark:text-orange-400">السعر</div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {formatCurrency(Number(selectedEquipment.purchasePrice))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">الموقع الحالي</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedEquipment.currentProjectId 
                          ? projects.find((p: any) => p.id === selectedEquipment.currentProjectId)?.name || 'مشروع غير معروف'
                          : 'المستودع'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleEditClick(selectedEquipment);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full py-3 font-medium text-sm"
                  >
                    تعديل
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleMovementHistoryClick(selectedEquipment);
                    }}
                    className="bg-purple-500 hover:bg-purple-600 text-white rounded-full py-3 font-medium text-sm flex items-center gap-1 justify-center"
                  >
                    <History className="w-4 h-4" />
                    السجل
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleDeleteClick(selectedEquipment);
                    }}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-full py-3 font-medium text-sm"
                  >
                    {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleTransferClick(selectedEquipment);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full py-3 font-medium text-sm"
                  >
                    نقل
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={enlargedImage} 
              alt="صورة المعدة بالحجم الكامل"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentManagement;
