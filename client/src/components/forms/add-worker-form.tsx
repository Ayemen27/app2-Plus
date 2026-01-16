import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { Plus, Phone, User, Briefcase, DollarSign } from "lucide-react";
import type { InsertWorker } from "@shared/schema";

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  phone?: string | null;
  hireDate?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AddWorkerFormProps {
  worker?: Worker;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

interface WorkerType {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

export default function AddWorkerForm({ worker, onSuccess, onCancel, submitLabel = "إضافة العامل" }: AddWorkerFormProps) {
  const [name, setName] = useState(worker?.name || "");
  const [type, setType] = useState(worker?.type || "");
  const [dailyWage, setDailyWage] = useState(worker ? worker.dailyWage : "");
  const [phone, setPhone] = useState(worker?.phone || "");
  const [hireDate, setHireDate] = useState(worker?.hireDate || "");
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (worker) {
      setName(worker.name || "");
      setType(worker.type || "");
      setDailyWage(worker.dailyWage || "");
      setPhone(worker.phone || "");
      setHireDate(worker.hireDate || "");
    }
  }, [worker]);

  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
    }
  };

  const { data: workerTypes = [] } = useQuery<WorkerType[]>({
    queryKey: ["/api/worker-types"],
  });

  const addWorkerMutation = useMutation({
    mutationFn: async (data: InsertWorker & { phone?: string; hireDate?: string }) => {
      await Promise.all([
        saveAutocompleteValue('workerNames', data.name),
        saveAutocompleteValue('workerTypes', data.type)
      ]);
      
      if (worker) {
        return apiRequest(`/api/workers/${worker.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/workers", "POST", data);
      }
    },
    onSuccess: async (newWorker, variables) => {
      // تحديث قائمة العمال فقط، وعدم عمل invalidate للمشاريع والإحصائيات الثقيلة فوراً
      queryClient.setQueryData(['/api/workers'], (old: any[] | undefined) => {
        if (!old) return [newWorker.data];
        return [newWorker.data, ...old];
      });
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/worker-types"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] })
      ]);
      
      toast({
        title: "تم الحفظ",
        description: worker ? "تم تعديل العامل بنجاح" : "تم إضافة العامل بنجاح",
      });
      if (!worker) {
        setName("");
        setType("");
        setDailyWage("");
        setPhone("");
        setHireDate("");
      }
      onSuccess?.();
    },
    onError: async (error: any, variables) => {
      await Promise.all([
        saveAutocompleteValue('workerNames', variables.name),
        saveAutocompleteValue('workerTypes', variables.type)
      ]);
      
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      const errorMessage = error?.message || (worker ? "حدث خطأ أثناء تعديل العامل" : "حدث خطأ أثناء إضافة العامل");
      toast({
        title: worker ? "فشل في تعديل العامل" : "فشل في إضافة العامل",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addWorkerTypeMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      await saveAutocompleteValue('workerTypes', data.name);
      return apiRequest("/api/worker-types", "POST", data);
    },
    onSuccess: async (newType, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/worker-types"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      toast({
        title: "تم الحفظ",
        description: "تم إضافة نوع العامل بنجاح",
      });
      setType(newType.name);
      setNewTypeName("");
      setShowAddTypeDialog(false);
    },
    onError: async (error: any, variables) => {
      await saveAutocompleteValue('workerTypes', variables.name);
      
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة نوع العامل";
      toast({
        title: "فشل في إضافة نوع العامل",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type || !dailyWage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const parsedWage = parseFloat(dailyWage);
    
    if (isNaN(parsedWage) || parsedWage <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح للأجر اليومي",
        variant: "destructive",
      });
      return;
    }

    addWorkerMutation.mutate({
      name: name.trim(),
      type,
      dailyWage: parsedWage.toString(),
      phone: phone.trim() || undefined,
      hireDate: hireDate || undefined,
      isActive: worker?.isActive ?? true,
    });
  };

  const handleAddNewType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم نوع العامل",
        variant: "destructive",
      });
      return;
    }

    addWorkerTypeMutation.mutate({
      name: newTypeName.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CompactFieldGroup columns={2}>
        <div className="space-y-2">
          <Label htmlFor="worker-name" className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            اسم العامل *
          </Label>
          <Input
            id="worker-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم العامل..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-type" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-500" />
            نوع العامل *
          </Label>
          <div className="flex gap-2">
            <SearchableSelect
              value={type}
              onValueChange={setType}
              options={
                Array.isArray(workerTypes) && workerTypes.length > 0 
                  ? workerTypes.map((workerType) => ({
                      value: workerType.name,
                      label: workerType.name,
                    }))
                  : [
                      { value: "معلم", label: "معلم" },
                      { value: "عامل", label: "عامل" },
                      { value: "حداد", label: "حداد" },
                      { value: "نجار", label: "نجار" },
                      { value: "سائق", label: "سائق" },
                      { value: "كهربائي", label: "كهربائي" },
                      { value: "سباك", label: "سباك" },
                    ]
              }
              placeholder="اختر نوع العامل..."
              searchPlaceholder="ابحث عن نوع..."
              emptyText="لا توجد أنواع"
              className="flex-1"
            />
          
            <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="shrink-0" title="إضافة نوع جديد">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>إضافة نوع عامل جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddNewType} className="space-y-4">
                  <div>
                    <Label htmlFor="new-type-name" className="block text-sm font-medium text-foreground">
                      اسم نوع العامل
                    </Label>
                    <Input
                      id="new-type-name"
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="مثال: كهربائي، سباك، حداد..."
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={addWorkerTypeMutation.isPending}
                      className="flex-1"
                    >
                      {addWorkerTypeMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddTypeDialog(false);
                        setNewTypeName("");
                      }}
                      className="flex-1"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CompactFieldGroup>

      <CompactFieldGroup columns={3}>
        <div className="space-y-2">
          <Label htmlFor="daily-wage" className="text-sm font-medium text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            الأجر اليومي (ر.ي) *
          </Label>
          <Input
            id="daily-wage"
            type="number"
            inputMode="decimal"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
            placeholder="0"
            className="text-center arabic-numbers"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            رقم الهاتف
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="966XXXXXXXXX+"
            className="text-left ltr"
            dir="ltr"
          />
        </div>

        <DatePickerField
          id="hire-date"
          label="تاريخ التوظيف"
          value={hireDate}
          onChange={(date) => setHireDate(date ? format(date, "yyyy-MM-dd") : "")}
        />
      </CompactFieldGroup>

      <div className="flex gap-2">
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={addWorkerMutation.isPending}
        >
          {addWorkerMutation.isPending ? "جاري الحفظ..." : submitLabel}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}
