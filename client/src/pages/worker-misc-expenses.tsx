import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Save, X, DollarSign, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { formatCurrency } from "@/lib/utils";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useEffect, useState as useStateAlias } from "react";

interface WorkerMiscExpense {
  id: string;
  projectId: string;
  amount: string;
  description: string;
  date: string;
  notes?: string;
  createdAt: string;
}

interface WorkerMiscExpensesProps {
  projectId: string;
  selectedDate: string;
}

export default function WorkerMiscExpenses({ projectId, selectedDate }: WorkerMiscExpensesProps) {
  const [miscDescription, setMiscDescription] = useState("");
  const [miscAmount, setMiscAmount] = useState("");
  const [editingMiscId, setEditingMiscId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

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

  const { data: todayMiscExpenses = [] } = useQuery<WorkerMiscExpense[]>({
    queryKey: ["/api/worker-misc-expenses", projectId, selectedDate],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/worker-misc-expenses?projectId=${projectId}&date=${selectedDate}`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as WorkerMiscExpense[];
        }
        return Array.isArray(response) ? response as WorkerMiscExpense[] : [];
      } catch (error) {
        console.error("Error fetching worker misc expenses:", error);
        return [];
      }
    },
    enabled: !!projectId,
  });

  // تحديث حالة التوسع عند تغير البيانات
  useEffect(() => {
    setIsExpanded(todayMiscExpenses.length > 0);
  }, [todayMiscExpenses]);

  const createMiscExpenseMutation = useMutation({
    mutationFn: (data: { amount: string; description: string; projectId: string; date: string }) =>
      apiRequest("/api/worker-misc-expenses", "POST", data),
    onSuccess: async () => {
      // حفظ قيم الإكمال التلقائي
      if (miscDescription) await saveAutocompleteValue('workerMiscDescriptions', miscDescription);
      
      queryClient.invalidateQueries({ queryKey: ["/api/worker-misc-expenses"] });
      setMiscDescription("");
      setMiscAmount("");
      toast({
        title: "تم إضافة النثريات",
        description: "تم إضافة نثريات العمال بنجاح"
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "حدث خطأ أثناء إضافة النثريات";
      console.error("Error creating misc expense:", error);
      toast({
        title: "خطأ في إضافة النثريات",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const updateMiscExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkerMiscExpense> }) =>
      apiRequest(`/api/worker-misc-expenses/${id}`, "PATCH", data),
    onSuccess: async () => {
      // حفظ قيم الإكمال التلقائي
      if (miscDescription) await saveAutocompleteValue('workerMiscDescriptions', miscDescription);
      
      queryClient.invalidateQueries({ queryKey: ["/api/worker-misc-expenses"] });
      resetMiscExpenseForm();
      toast({
        title: "تم تحديث النثريات",
        description: "تم تحديث النثريات بنجاح"
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "حدث خطأ أثناء تحديث النثريات";
      console.error("Error updating misc expense:", error);
      toast({
        title: "خطأ في تحديث النثريات",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const deleteMiscExpenseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-misc-expenses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/worker-misc-expenses"] });
      toast({
        title: "تم حذف النثريات",
        description: "تم حذف النثريات بنجاح"
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "حدث خطأ أثناء حذف النثريات";
      console.error("Error deleting misc expense:", error);
      toast({
        title: "خطأ في حذف النثريات",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const handleAddMiscExpense = async () => {
    if (!projectId || projectId === "all") {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة نثريات عند اختيار 'جميع المشاريع'. يرجى اختيار مشروع محدد أولاً.",
        variant: "destructive"
      });
      return;
    }

    if (!miscDescription.trim() || !miscAmount) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال الوصف والمبلغ",
        variant: "destructive"
      });
      return;
    }

    // حفظ الوصف في نظام الإكمال التلقائي فوراً
    if (miscDescription && miscDescription.trim().length >= 2) {
      await saveAutocompleteValue('workerMiscDescriptions', miscDescription);
    }

    if (editingMiscId) {
      // Update existing expense
      updateMiscExpenseMutation.mutate({
        id: editingMiscId,
        data: {
          description: miscDescription,
          amount: miscAmount
        }
      });
    } else {
      // Create new expense
      createMiscExpenseMutation.mutate({
        description: miscDescription,
        amount: miscAmount,
        projectId,
        date: selectedDate
      });
    }
  };

  const resetMiscExpenseForm = () => {
    setMiscDescription("");
    setMiscAmount("");
    setEditingMiscId(null);
  };

  const handleEditMiscExpense = (expense: WorkerMiscExpense) => {
    setMiscDescription(expense.description);
    setMiscAmount(expense.amount);
    setEditingMiscId(expense.id);
  };

  // حساب إجمالي النثريات مع معالجة آمنة
  const totalMiscExpenses = Array.isArray(todayMiscExpenses) 
    ? todayMiscExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || "0"), 0)
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
            <AutocompleteInput
              value={miscDescription}
              onChange={setMiscDescription}
              category="workerMiscDescriptions"
              placeholder="الوصف"
            />
            <Input
              type="number"
              inputMode="decimal"
              value={miscAmount}
              onChange={(e) => setMiscAmount(e.target.value)}
              placeholder="المبلغ"
              className="text-center arabic-numbers"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddMiscExpense} 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700 transition-all duration-200 disabled:opacity-50"
              disabled={createMiscExpenseMutation.isPending || updateMiscExpenseMutation.isPending}
              data-testid="button-add-misc-expense"
            >
              {createMiscExpenseMutation.isPending || updateMiscExpenseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingMiscId ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
            {editingMiscId && (
              <Button 
                onClick={resetMiscExpenseForm} 
                size="sm" 
                variant="outline"
                disabled={createMiscExpenseMutation.isPending || updateMiscExpenseMutation.isPending}
                data-testid="button-cancel-edit-misc-expense"
              >
                إلغاء
              </Button>
            )}
          </div>
          
          {/* Show existing misc expenses */}
          {Array.isArray(todayMiscExpenses) && todayMiscExpenses.map((expense, index) => (
            <div key={expense.id || index} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="text-sm flex-1">{expense.description}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium arabic-numbers">{formatCurrency(expense.amount)}</span>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleEditMiscExpense(expense)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteMiscExpenseMutation.mutate(expense.id)}
                    disabled={deleteMiscExpenseMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {Array.isArray(todayMiscExpenses) && todayMiscExpenses.length > 0 && (
            <div className="text-left mt-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">إجمالي النثريات: </span>
              <span className="font-bold text-purple-600 arabic-numbers">
                {formatCurrency(totalMiscExpenses.toString())}
              </span>
            </div>
          )}
        </div>
  );
}