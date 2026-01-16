import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";

const DEFAULT_UNITS = ["قطعة", "مجموعة", "صندوق", "متر", "كيلو", "لتر", "طن", "عدد", "علبة", "كرتون"];

const equipmentSchema = z.object({
  name: z.string().min(1, "اسم المعدة مطلوب"),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().min(1, "الوحدة مطلوبة"),
  status: z.string().min(1, "حالة المعدة مطلوبة"),
  condition: z.string().min(1, "حالة الجودة مطلوبة"),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  projectId: z.string().nullable().optional(),
  imageUrl: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
  equipment?: any;
}

export function AddEquipmentDialog({ open, onOpenChange, projects, equipment }: AddEquipmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isEditing = !!equipment;

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: equipment?.name || "",
      sku: equipment?.sku || "", 
      categoryId: equipment?.categoryId || "",
      unit: equipment?.unit || "قطعة",
      status: equipment?.status || "available",
      condition: equipment?.condition || "excellent",
      description: equipment?.description || "",
      purchaseDate: equipment?.purchaseDate || "",
      purchasePrice: equipment?.purchasePrice?.toString() || "",
      projectId: equipment?.projectId || null,
      imageUrl: equipment?.imageUrl || "",
    },
  });

  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
        setImageFile(file);
        form.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
    }
  };

  const handleImageCapture = (useCamera: boolean) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      if (useCamera) {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    form.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data: EquipmentFormData) => {
      if (isEditing && equipment?.id) {
        return apiRequest(`/api/equipment/${equipment.id}`, "PUT", data);
      } else {
        return apiRequest("/api/equipment", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'equipment'
      });
      queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'equipment'
      });
      toast({
        title: "نجح الحفظ",
        description: isEditing ? "تم تحديث المعدة بنجاح" : "تم إضافة المعدة بنجاح",
        variant: "default",
      });
      form.reset();
      handleRemoveImage();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || (isEditing ? "حدث خطأ أثناء تحديث المعدة" : "حدث خطأ أثناء إضافة المعدة"),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (equipment && isEditing) {
      form.reset({
        name: equipment.name || "",
        sku: equipment.sku || "", 
        categoryId: equipment.categoryId || "",
        unit: equipment.unit || "قطعة",
        status: equipment.status || "available",
        condition: equipment.condition || "excellent",
        description: equipment.description || "",
        purchaseDate: equipment.purchaseDate || "",
        purchasePrice: equipment.purchasePrice?.toString() || "",
        projectId: equipment.projectId || null,
        imageUrl: equipment.imageUrl || "",
      });
      if (equipment.imageUrl) {
        setSelectedImage(equipment.imageUrl);
      }
    }
  }, [equipment, isEditing, form]);

  const onSubmit = (data: EquipmentFormData) => {
    const submitData = {
      ...data,
      purchasePrice: data.purchasePrice ? data.purchasePrice : undefined,
      projectId: data.projectId || null,
      categoryId: data.categoryId || undefined,
    };
    saveMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">{isEditing ? "تعديل المعدة" : "إضافة معدة جديدة"}</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {isEditing ? "قم بتحديث بيانات المعدة" : "أدخل تفاصيل المعدة الجديدة"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <CompactFieldGroup columns={2}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">اسم المعدة *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="مثال: حفار صغير"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-equipment-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الكود</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="مثال: EQ-001"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-equipment-sku"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CompactFieldGroup>

            <CompactFieldGroup columns={2}>
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الوحدة *</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={field.onChange}
                        options={DEFAULT_UNITS}
                        placeholder="اختر الوحدة"
                        allowCustom={true}
                        customPlaceholder="إضافة وحدة جديدة..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الحالة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-status" className="h-9 text-sm">
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">متاح</SelectItem>
                        <SelectItem value="assigned">مخصص</SelectItem>
                        <SelectItem value="maintenance">صيانة</SelectItem>
                        <SelectItem value="lost">مفقود</SelectItem>
                        <SelectItem value="consumed">مستهلك</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CompactFieldGroup>

            <CompactFieldGroup columns={2}>
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">حالة الجودة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-condition" className="h-9 text-sm">
                          <SelectValue placeholder="اختر الجودة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="excellent">ممتاز</SelectItem>
                        <SelectItem value="good">جيد</SelectItem>
                        <SelectItem value="fair">مقبول</SelectItem>
                        <SelectItem value="poor">ضعيف</SelectItem>
                        <SelectItem value="damaged">تالف</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => {
                  const projectOptions: SelectOption[] = [
                    { value: "warehouse", label: "المستودع" },
                    ...(Array.isArray(projects) ? projects.map((project) => ({
                      value: project.id,
                      label: project.name,
                    })) : [])
                  ];
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">المشروع</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value || "warehouse"}
                          onValueChange={(value) => field.onChange(value === "warehouse" ? null : value)}
                          options={projectOptions}
                          placeholder="المستودع"
                          searchPlaceholder="ابحث عن مشروع..."
                          emptyText="لا توجد مشاريع"
                          triggerClassName="h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CompactFieldGroup>

            <CompactFieldGroup columns={2}>
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">تاريخ الشراء</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-purchase-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">سعر الشراء</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-purchase-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CompactFieldGroup>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">صورة المعدة</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(file);
                        }}
                        data-testid="input-file-image"
                      />
                      
                      <CompactFieldGroup columns={2}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageCapture(true)}
                          className="h-9 text-xs w-full"
                          data-testid="button-camera"
                        >
                          <Camera className="h-4 w-4 ml-1" />
                          تصوير بالكاميرا
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageCapture(false)}
                          className="h-9 text-xs w-full"
                          data-testid="button-gallery"
                        >
                          <Upload className="h-4 w-4 ml-1" />
                          اختيار من المعرض
                        </Button>
                      </CompactFieldGroup>
                      
                      {selectedImage && (
                        <div className="relative w-full h-28 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <img 
                            src={selectedImage} 
                            alt="معاينة الصورة"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                            data-testid="button-remove-image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            <ImageIcon className="h-3 w-3 inline ml-1" />
                            {imageFile?.name || 'صورة محددة'}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">الوصف</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="وصف إضافي للمعدة..."
                      className="resize-none text-sm min-h-[50px]"
                      rows={2}
                      {...field} 
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="order-2 sm:order-1 h-9 text-sm"
                data-testid="button-cancel"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="order-1 sm:order-2 h-9 text-sm"
                data-testid="button-submit"
              >
                {saveMutation.isPending ? "جاري الحفظ..." : (isEditing ? "تحديث المعدة" : "إضافة المعدة")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
