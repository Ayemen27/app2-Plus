import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { ArrowUpDown } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  code?: string;
  type?: string;
  status?: string;
  description?: string;
  purchaseDate?: string;
  purchasePrice?: string;
  currentProjectId?: string | null;
  imageUrl?: string;
}

const transferSchema = z.object({
  toProjectId: z.string().nullable(),
  reason: z.string().min(1, "سبب النقل مطلوب"),
  performedBy: z.string().min(1, "اسم من قام بالنقل مطلوب"),
  notes: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferEquipmentDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
}

export function TransferEquipmentDialog({ equipment, open, onOpenChange, projects }: TransferEquipmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toProjectId: null,
      reason: "",
      performedBy: "",
      notes: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: TransferFormData) => 
      apiRequest(`/api/equipment/${equipment?.id}/transfer`, "POST", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] });
      await queryClient.invalidateQueries({ queryKey: ['equipment-movements'] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects/with-stats'] });
      
      toast({
        title: "نجح النقل",
        description: "تم نقل المعدة بنجاح",
        variant: "default",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في نقل المعدة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferFormData) => {
    transferMutation.mutate({
      ...data,
      toProjectId: data.toProjectId || null,
    });
  };

  const getCurrentLocationName = () => {
    if (!equipment) return "";
    if (!equipment.currentProjectId) return "المستودع";
    const project = Array.isArray(projects) ? projects.find(p => p.id === equipment.currentProjectId) : undefined;
    return project ? project.name : "مشروع غير معروف";
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir="rtl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowUpDown className="h-5 w-5" />
            نقل المعدة
          </DialogTitle>
          <DialogDescription className="text-sm">
            نقل المعدة "{equipment.name}" إلى موقع جديد
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">الموقع الحالي:</p>
                  <p className="font-medium" data-testid="text-current-location">{getCurrentLocationName()}</p>
                </div>
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">الموقع الجديد:</p>
                  <p className="font-medium text-blue-600" data-testid="text-new-location">
                    {form.watch('toProjectId') && form.watch('toProjectId') !== 'warehouse'
                      ? projects.find(p => p.id === form.watch('toProjectId'))?.name || 'المستودع'
                      : 'المستودع'
                    }
                  </p>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="toProjectId"
              render={({ field }) => {
                const projectOptions: SelectOption[] = [
                  { value: "warehouse", label: "المستودع" },
                  ...projects
                    .filter(p => p.id !== equipment?.currentProjectId)
                    .map((project) => ({
                      value: project.id,
                      label: project.name,
                    }))
                ];
                return (
                  <FormItem>
                    <FormLabel className="text-sm">المشروع المقصود</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value || "warehouse"}
                        onValueChange={(value) => field.onChange(value === "warehouse" ? null : value)}
                        options={projectOptions}
                        placeholder="اختر المشروع المقصود"
                        searchPlaceholder="ابحث عن مشروع..."
                        emptyText="لا توجد مشاريع"
                        triggerClassName="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <CompactFieldGroup columns={2}>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">سبب النقل *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="سبب النقل"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-transfer-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="performedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">تم بواسطة *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="اسم المسؤول"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-performed-by"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CompactFieldGroup>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="ملاحظات أو تفاصيل إضافية..."
                      className="resize-none text-sm min-h-[50px]"
                      rows={2}
                      {...field} 
                      data-testid="textarea-transfer-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="h-9 text-sm"
                data-testid="button-cancel-transfer"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={transferMutation.isPending}
                className="h-9 text-sm"
                data-testid="button-confirm-transfer"
              >
                {transferMutation.isPending ? "جاري النقل..." : "تأكيد النقل"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
