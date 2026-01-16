/**
 * الوصف: صفحة إدارة حسابات العمال والحوالات المالية
 * المدخلات: بيانات العمال والحوالات المالية
 * المخرجات: عرض أرصدة العمال وإدارة الحوالات
 * المالك: عمار
 * آخر تعديل: 2025-12-07
 * الحالة: نشط - إدارة مالية العمال - تصميم موحد
 */

import { DatePickerField } from "@/components/ui/date-picker-field";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkerSelect, ProjectSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { useSelectedProject, ALL_PROJECTS_ID } from '@/hooks/use-selected-project';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import type { StatsRowConfig, FilterConfig } from '@/components/ui/unified-filter-dashboard/types';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { 
  Send, 
  User, 
  Phone, 
  CreditCard, 
  Calendar,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Users,
  Wallet,
  TrendingUp,
  FileText,
  Download,
  Building2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { downloadExcelFile } from '@/utils/webview-download';
import { AutocompleteInput } from '@/components/ui/autocomplete-input-database';
import '@/styles/unified-print-styles.css';

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  isActive: boolean;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface WorkerTransfer {
  id: string;
  workerId: string;
  projectId: string;
  amount: number;
  recipientName: string;
  recipientPhone?: string;
  transferMethod: 'cash' | 'bank' | 'hawaleh';
  transferNumber?: string;
  transferDate: string;
  notes?: string;
}

interface TransferFormData {
  workerId: string;
  projectId: string;
  amount: number;
  recipientName: string;
  recipientPhone: string;
  transferMethod: 'cash' | 'bank' | 'hawaleh';
  transferNumber: string;
  transferDate: string;
  notes: string;
}

export default function WorkerAccountsPage() {
  const [, setLocation] = useLocation();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<WorkerTransfer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [transferMethodFilter, setTransferMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId, getProjectIdForApi, isAllProjects } = useSelectedProject();
  
  const selectedProject = getProjectIdForApi() || '';

  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;
    
    try {
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
    } catch (error) {
      console.error(`خطأ في حفظ قيمة الإكمال التلقائي ${field}:`, error);
    }
  };

  const [formData, setFormData] = useState<TransferFormData>({
    workerId: '',
    projectId: '',
    amount: 0,
    recipientName: '',
    recipientPhone: '',
    transferMethod: 'hawaleh',
    transferNumber: '',
    transferDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const saveAllTransferAutocompleteValues = async () => {
    const promises = [];
    
    if (formData.recipientName && formData.recipientName.trim().length >= 2) {
      promises.push(saveAutocompleteValue('recipientNames', formData.recipientName));
    }
    
    if (formData.recipientPhone && formData.recipientPhone.trim().length >= 3) {
      promises.push(saveAutocompleteValue('recipientPhones', formData.recipientPhone));
    }
    
    if (formData.transferNumber && formData.transferNumber.trim().length >= 1) {
      promises.push(saveAutocompleteValue('workerTransferNumbers', formData.transferNumber));
    }
    
    if (formData.notes && formData.notes.trim().length >= 2) {
      promises.push(saveAutocompleteValue('workerTransferNotes', formData.notes));
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const editTransferId = urlParams.get('edit');
  const preselectedWorker = urlParams.get('worker');

  const { data: workers = [], isLoading: isLoadingWorkers } = useQuery<Worker[]>({
    queryKey: ['/api/workers'],
    select: (data: Worker[]) => Array.isArray(data) ? data.filter(w => w.isActive) : []
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    select: (data) => Array.isArray(data) ? data : []
  });

  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery<WorkerTransfer[]>({
    queryKey: ['/api/worker-transfers', selectedProjectId],
    queryFn: async () => {
      const url = selectedProject 
        ? `/api/worker-transfers?projectId=${selectedProject}` 
        : '/api/worker-transfers';
      const response = await apiRequest(url, 'GET');
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    }
  });

  useEffect(() => {
    const handleAddNew = () => {
      setEditingTransfer(null);
      setFormData({
        workerId: preselectedWorker || '',
        projectId: '',
        amount: 0,
        recipientName: '',
        recipientPhone: '',
        transferMethod: 'hawaleh',
        transferNumber: '',
        transferDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowTransferDialog(true);
    };

    setFloatingAction(handleAddNew, 'إضافة حولة جديدة');

    return () => {
      setFloatingAction(null);
    };
  }, [setFloatingAction, preselectedWorker]);

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      await saveAllTransferAutocompleteValues();
      return apiRequest('/api/worker-transfers', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/worker-transfers', selectedProjectId] });
      queryClient.refetchQueries({ queryKey: ['/api/autocomplete'] });
      setShowTransferDialog(false);
      resetForm();
      toast({
        title: "تم بنجاح",
        description: "تم إرسال الحولة بنجاح"
      });
    },
    onError: async (error: any) => {
      await saveAllTransferAutocompleteValues();
      queryClient.refetchQueries({ queryKey: ['/api/autocomplete'] });
      
      let errorMessage = "فشل في إرسال الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const updateTransferMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<TransferFormData> }) => {
      await saveAllTransferAutocompleteValues();
      return apiRequest(`/api/worker-transfers/${data.id}`, 'PATCH', data.updates);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/worker-transfers', selectedProjectId] });
      queryClient.refetchQueries({ queryKey: ['/api/autocomplete'] });
      setShowTransferDialog(false);
      setEditingTransfer(null);
      resetForm();
      toast({
        title: "تم بنجاح",
        description: "تم تحديث الحولة بنجاح"
      });
    },
    onError: async (error: any) => {
      await saveAllTransferAutocompleteValues();
      queryClient.refetchQueries({ queryKey: ['/api/autocomplete'] });
      
      let errorMessage = "فشل في تحديث الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/worker-transfers/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/worker-transfers', selectedProjectId] });
      toast({
        title: "تم بنجاح",
        description: "تم حذف الحولة بنجاح"
      });
    },
    onError: (error: any) => {
      let errorMessage = "فشل في حذف الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (editTransferId && transfers.length > 0) {
      const transfer = transfers.find(t => t.id === editTransferId);
      if (transfer) {
        setEditingTransfer(transfer);
        setFormData({
          workerId: transfer.workerId,
          projectId: transfer.projectId,
          amount: transfer.amount,
          recipientName: transfer.recipientName,
          recipientPhone: transfer.recipientPhone || '',
          transferMethod: transfer.transferMethod,
          transferNumber: transfer.transferNumber || '',
          transferDate: transfer.transferDate,
          notes: transfer.notes || ''
        });
        setShowTransferDialog(true);
      }
    }
  }, [editTransferId, transfers]);

  const resetForm = () => {
    setFormData({
      workerId: '',
      projectId: '',
      amount: 0,
      recipientName: '',
      recipientPhone: '',
      transferMethod: 'hawaleh',
      transferNumber: '',
      transferDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleSubmit = () => {
    if (!formData.workerId || !formData.projectId || !formData.amount || !formData.recipientName || !formData.transferDate) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    if (editingTransfer) {
      updateTransferMutation.mutate({
        id: editingTransfer.id,
        updates: formData
      });
    } else {
      createTransferMutation.mutate(formData);
    }
  };

  const handleEdit = (transfer: WorkerTransfer) => {
    setEditingTransfer(transfer);
    setFormData({
      workerId: transfer.workerId,
      projectId: transfer.projectId,
      amount: transfer.amount,
      recipientName: transfer.recipientName,
      recipientPhone: transfer.recipientPhone || '',
      transferMethod: transfer.transferMethod,
      transferNumber: transfer.transferNumber || '',
      transferDate: transfer.transferDate,
      notes: transfer.notes || ''
    });
    setShowTransferDialog(true);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toLocaleString('en-US')} ر.ي`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getTransferMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقداً';
      case 'bank': return 'تحويل بنكي';
      case 'hawaleh': return 'حولة';
      default: return method;
    }
  };

  const filteredTransfers = useMemo(() => {
    let result = [...transfers];
    
    if (selectedProject && selectedProject !== 'all') {
      result = result.filter(t => t.projectId === selectedProject);
    }
    
    if (selectedWorkerId && selectedWorkerId !== 'all') {
      result = result.filter(t => t.workerId === selectedWorkerId);
    }
    
    if (transferMethodFilter && transferMethodFilter !== 'all') {
      result = result.filter(t => t.transferMethod === transferMethodFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => {
        const worker = workers.find(w => w.id === t.workerId);
        return (
          worker?.name.toLowerCase().includes(term) ||
          t.recipientName.toLowerCase().includes(term) ||
          t.notes?.toLowerCase().includes(term)
        );
      });
    }
    
    if (dateFrom) {
      result = result.filter(t => new Date(t.transferDate) >= new Date(dateFrom));
    }
    
    if (dateTo) {
      result = result.filter(t => new Date(t.transferDate) <= new Date(dateTo));
    }

    if (specificDate) {
      result = result.filter(t => {
        const tDate = new Date(t.transferDate);
        const sDate = new Date(specificDate);
        return tDate.getFullYear() === sDate.getFullYear() &&
               tDate.getMonth() === sDate.getMonth() &&
               tDate.getDate() === sDate.getDate();
      });
    }
    
    return result;
  }, [transfers, selectedProject, selectedWorkerId, transferMethodFilter, searchTerm, dateFrom, dateTo, specificDate, workers]);

  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();

  const stats = useMemo(() => {
    const totalAmount = filteredTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const cashTransfers = filteredTransfers.filter(t => t.transferMethod === 'cash');
    const bankTransfers = filteredTransfers.filter(t => t.transferMethod === 'bank');
    const hawalehTransfers = filteredTransfers.filter(t => t.transferMethod === 'hawaleh');
    
    const cashAmount = cashTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const bankAmount = bankTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const hawalehAmount = hawalehTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const uniqueWorkers = new Set(filteredTransfers.map(t => t.workerId)).size;
    
    // استخدام البيانات الموحدة للحوالات الكلية إذا لم يكن هناك فلتر
    const isFiltered = (selectedProject && selectedProject !== 'all') || 
                      (selectedWorkerId && selectedWorkerId !== 'all') || 
                      (transferMethodFilter && transferMethodFilter !== 'all') ||
                      searchTerm || dateFrom || dateTo || specificDate;

    return {
      totalTransfers: filteredTransfers.length,
      totalAmount: isFiltered ? totalAmount : (summary?.totalWorkerTransfers || totalAmount),
      cashAmount,
      bankAmount,
      hawalehAmount,
      uniqueWorkers,
      averageTransfer: filteredTransfers.length > 0 ? totalAmount / filteredTransfers.length : 0
    };
  }, [filteredTransfers, summary, selectedProject, selectedWorkerId, transferMethodFilter, searchTerm, dateFrom, dateTo, specificDate]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalTransfers',
          label: 'إجمالي الحوالات',
          value: stats.totalTransfers.toString(),
          icon: Send,
          color: 'blue',
        },
        {
          key: 'totalAmount',
          label: 'إجمالي المبالغ',
          value: formatCurrency(stats.totalAmount),
          icon: DollarSign,
          color: 'green',
        },
        {
          key: 'uniqueWorkers',
          label: 'عدد العمال',
          value: stats.uniqueWorkers.toString(),
          icon: Users,
          color: 'purple',
        },
        {
          key: 'cashAmount',
          label: 'نقداً',
          value: formatCurrency(stats.cashAmount),
          icon: Wallet,
          color: 'emerald',
        },
        {
          key: 'bankAmount',
          label: 'تحويل بنكي',
          value: formatCurrency(stats.bankAmount),
          icon: CreditCard,
          color: 'orange',
        },
        {
          key: 'hawalehAmount',
          label: 'حوالات',
          value: formatCurrency(stats.hawalehAmount),
          icon: TrendingUp,
          color: 'teal',
        },
      ]
    }
  ], [stats, formatCurrency]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'worker',
      label: 'العامل',
      type: 'select',
      placeholder: 'اختر العامل',
      options: [
        { value: 'all', label: 'جميع العمال' },
        ...workers.map(w => ({
          value: w.id,
          label: `${w.name} (${w.type})`
        }))
      ],
    },
    {
      key: 'transferMethod',
      label: 'طريقة التحويل',
      type: 'select',
      placeholder: 'طريقة التحويل',
      options: [
        { value: 'all', label: 'جميع الطرق' },
        { value: 'cash', label: 'نقداً' },
        { value: 'bank', label: 'تحويل بنكي' },
        { value: 'hawaleh', label: 'حولة' }
      ],
    },
    {
      key: 'dateFrom',
      label: 'من تاريخ',
      type: 'date',
      placeholder: 'من تاريخ',
    },
    {
      key: 'dateTo',
      label: 'إلى تاريخ',
      type: 'date',
      placeholder: 'إلى تاريخ',
    },
    {
      key: 'specificDate',
      label: 'تاريخ يوم محدد',
      type: 'date',
      placeholder: 'تاريخ يوم محدد',
    }
  ], [workers]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'worker') {
      setSelectedWorkerId(value);
    } else if (key === 'transferMethod') {
      setTransferMethodFilter(value);
    } else if (key === 'dateFrom') {
      setDateFrom(value);
    } else if (key === 'dateTo') {
      setDateTo(value);
    } else if (key === 'specificDate') {
      setSpecificDate(value);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedWorkerId('all');
    setTransferMethodFilter('all');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSpecificDate('');
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['/api/worker-transfers', selectedProjectId] });
    setIsRefreshing(false);
  }, [queryClient, selectedProjectId]);

  const exportToExcel = async () => {
    if (filteredTransfers.length === 0) return;

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('حوالات العمال');
    worksheet.views = [{ rightToLeft: true }];

    worksheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
      horizontalCentered: true,
      scale: 80
    };

    worksheet.columns = [
      { width: 5 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 12 },
      { width: 12 }, { width: 15 }, { width: 12 }, { width: 20 }
    ];

    let currentRow = 1;

    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'شركة الفتيني للمقاولات والاستشارات الهندسية';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1f4e79' } };
    worksheet.getRow(currentRow).height = 25;
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.value = 'تقرير حوالات العمال';
    subtitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1f4e79' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f2f2f2' } };
    worksheet.getRow(currentRow).height = 16;
    currentRow += 2;

    const headers = ['#', 'التاريخ', 'العامل', 'المشروع', 'المبلغ', 'طريقة التحويل', 'المستلم', 'رقم الهاتف', 'ملاحظات'];
    const headerRow = worksheet.getRow(currentRow);
    
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1f4e79' } };
    });
    headerRow.height = 22;
    currentRow++;

    filteredTransfers.forEach((transfer, index) => {
      const row = worksheet.getRow(currentRow);
      const worker = workers.find(w => w.id === transfer.workerId);
      const project = projects.find(p => p.id === transfer.projectId);
      
      const rowData = [
        index + 1,
        formatDate(transfer.transferDate),
        worker?.name || 'غير معروف',
        project?.name || 'غير معروف',
        transfer.amount,
        getTransferMethodLabel(transfer.transferMethod),
        transfer.recipientName,
        transfer.recipientPhone || '-',
        transfer.notes || '-'
      ];

      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'cccccc' } },
          bottom: { style: 'thin', color: { argb: 'cccccc' } },
          left: { style: 'thin', color: { argb: 'cccccc' } },
          right: { style: 'thin', color: { argb: 'cccccc' } }
        };
      });
      
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    });

    currentRow += 2;
    worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const totalLabelCell = worksheet.getCell(`E${currentRow}`);
    totalLabelCell.value = 'إجمالي المبالغ:';
    totalLabelCell.font = { name: 'Arial', size: 11, bold: true };
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`G${currentRow}:I${currentRow}`);
    const totalValueCell = worksheet.getCell(`G${currentRow}`);
    totalValueCell.value = formatCurrency(stats.totalAmount);
    totalValueCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '006600' } };
    totalValueCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = new Date().toISOString().split('T')[0];
    await downloadExcelFile(buffer as ArrayBuffer, `حوالات-العمال-${currentDate}.xlsx`);
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="ابحث عن عامل أو مستلم..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={{
          worker: selectedWorkerId,
          transferMethod: transferMethodFilter
        }}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={[
          {
            key: 'export',
            icon: Download,
            label: 'تصدير Excel',
            onClick: exportToExcel,
            variant: 'outline',
            disabled: filteredTransfers.length === 0,
            tooltip: 'تصدير إلى Excel'
          }
        ]}
      />

      {isLoadingTransfers ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">جاري تحميل الحوالات...</p>
          </CardContent>
        </Card>
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">لا توجد حوالات</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedWorkerId !== 'all' || transferMethodFilter !== 'all'
                ? 'لا توجد نتائج مطابقة للفلاتر المحددة'
                : 'لم يتم إرسال أي حوالات بعد'}
            </p>
            <Button 
              onClick={() => {
                setEditingTransfer(null);
                resetForm();
                setShowTransferDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 ml-2" />
              إرسال حولة جديدة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <UnifiedCardGrid columns={2}>
          {filteredTransfers.map((transfer) => {
            const worker = workers.find(w => w.id === transfer.workerId);
            const project = projects.find(p => p.id === transfer.projectId);
            
            return (
              <UnifiedCard
                key={transfer.id}
                title={worker?.name || 'عامل غير معروف'}
                subtitle={project?.name || 'مشروع غير معروف'}
                titleIcon={User}
                badges={[
                  {
                    label: worker?.type || 'غير محدد',
                    variant: 'secondary'
                  },
                  {
                    label: getTransferMethodLabel(transfer.transferMethod),
                    variant: transfer.transferMethod === 'cash' ? 'success' : 
                             transfer.transferMethod === 'bank' ? 'warning' : 'default'
                  }
                ]}
                fields={[
                  {
                    label: 'المبلغ',
                    value: formatCurrency(transfer.amount),
                    icon: DollarSign,
                    color: 'success',
                    emphasis: true
                  },
                  {
                    label: 'التاريخ',
                    value: formatDate(transfer.transferDate),
                    icon: Calendar,
                    color: 'muted'
                  },
                  {
                    label: 'المستلم',
                    value: transfer.recipientName,
                    icon: User,
                    color: 'info'
                  },
                  {
                    label: 'الهاتف',
                    value: transfer.recipientPhone || '-',
                    icon: Phone,
                    color: 'muted'
                  }
                ]}
                actions={[
                  {
                    icon: Edit2,
                    label: 'تعديل',
                    onClick: () => handleEdit(transfer),
                    color: 'blue'
                  },
                  {
                    icon: Trash2,
                    label: 'حذف',
                    onClick: () => deleteTransferMutation.mutate(transfer.id),
                    color: 'red'
                  }
                ]}
                footer={transfer.notes ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">ملاحظات:</span> {transfer.notes}
                  </p>
                ) : undefined}
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransfer ? 'تعديل الحولة' : 'حولة جديدة'}
            </DialogTitle>
            <DialogDescription>
              {editingTransfer ? 'قم بتعديل بيانات الحولة المالية' : 'إنشاء حولة مالية جديدة للعامل'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>العامل *</Label>
                <WorkerSelect
                  value={formData.workerId}
                  onValueChange={(value) => setFormData({...formData, workerId: value})}
                  workers={workers}
                  placeholder="اختر العامل"
                />
              </div>
              <div>
                <Label>المشروع *</Label>
                <ProjectSelect
                  value={formData.projectId}
                  onValueChange={(value) => setFormData({...formData, projectId: value})}
                  projects={projects}
                  placeholder="اختر المشروع"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المبلغ (ر.ي) *</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({...formData, amount: value ? parseFloat(value) : 0});
                  }}
                  placeholder="0.00"
                  min="0"
                  className="text-center arabic-numbers"
                />
              </div>
              <div>
                <Label>التاريخ *</Label>
                <DatePickerField
                  value={formData.transferDate}
                  onChange={(date) => setFormData({...formData, transferDate: date ? format(date, "yyyy-MM-dd") : ""})}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المستلم *</Label>
                <AutocompleteInput
                  category="recipientNames"
                  value={formData.recipientName}
                  onChange={(value) => setFormData({...formData, recipientName: value})}
                  placeholder="اسم المستلم"
                />
              </div>
              <div>
                <Label>طريقة التحويل *</Label>
                <Select
                  value={formData.transferMethod}
                  onValueChange={(value: 'cash' | 'bank' | 'hawaleh') => setFormData({...formData, transferMethod: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطريقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hawaleh">حولة</SelectItem>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="bank">تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>رقم الهاتف</Label>
                <AutocompleteInput
                  category="recipientPhones"
                  value={formData.recipientPhone}
                  onChange={(value) => setFormData({...formData, recipientPhone: value})}
                  placeholder="رقم الهاتف"
                />
              </div>
              <div>
                <Label>رقم التحويل</Label>
                <AutocompleteInput
                  category="workerTransferNumbers"
                  value={formData.transferNumber}
                  onChange={(value) => setFormData({...formData, transferNumber: value})}
                  placeholder="رقم التحويل"
                />
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <AutocompleteInput
                category="workerTransferNotes"
                value={formData.notes}
                onChange={(value) => setFormData({...formData, notes: value})}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={createTransferMutation.isPending || updateTransferMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createTransferMutation.isPending || updateTransferMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full ml-2" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                {editingTransfer ? 'تحديث الحولة' : 'إرسال الحولة'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTransferDialog(false);
                  setEditingTransfer(null);
                  resetForm();
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
