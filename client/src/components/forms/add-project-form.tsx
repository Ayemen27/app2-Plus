import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { ProjectTypeSelect } from "@/components/ui/searchable-select";
import type { InsertProject, ProjectType } from "@shared/schema";

interface AddProjectFormProps {
  onSuccess?: () => void;
}

export default function AddProjectForm({ onSuccess }: AddProjectFormProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [engineerId, setEngineerId] = useState<string | null>(null);
  const [projectTypeId, setProjectTypeId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // جلب قائمة المستخدمين (للاستخدام في اختيار المهندس)
  const { data: usersData = [], isLoading: usersLoading, isError: usersError } = useQuery<{id: string; name: string; email: string; role: string}[]>({
    queryKey: ["/api/users/list"],
    queryFn: async () => {
      const response = await apiRequest("/api/users/list", "GET");
      
      // التحقق من نجاح الاستجابة
      if (response.success === false) {
        throw new Error(response.message || "فشل في جلب قائمة المهندسين");
      }
      
      // التأكد من وجود البيانات
      if (!response.data || !Array.isArray(response.data)) {
        console.warn("استجابة غير متوقعة من /api/users/list:", response);
        return [];
      }
      
      return response.data;
    },
    retry: false,
  });

  // جلب قائمة أنواع المشاريع
  const { data: projectTypes = [], isLoading: typesLoading } = useQuery<ProjectType[]>({
    queryKey: ["/api/project-types"],
    queryFn: async () => {
      const response = await apiRequest("/api/project-types", "GET");
      if (response.success === false) {
        throw new Error(response.message || "فشل في جلب أنواع المشاريع");
      }
      return response.data || [];
    },
  });


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

  const addProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      await saveAutocompleteValue('projectNames', data.name);
      return apiRequest("/api/projects", "POST", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      toast({
        title: "تم الحفظ",
        description: "تم إضافة المشروع بنجاح",
      });
      setName("");
      setStatus("active");
      setEngineerId(null);
      setProjectTypeId(null);
      onSuccess?.();
    },
    onError: async (error: any, variables) => {
      await saveAutocompleteValue('projectNames', variables.name);
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة المشروع";
      toast({
        title: "فشل في إضافة المشروع",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المشروع",
        variant: "destructive",
      });
      return;
    }

    addProjectMutation.mutate({
      name: name.trim(),
      status,
      engineerId: engineerId,
      projectTypeId: projectTypeId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CompactFieldGroup columns={2}>
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-sm font-medium text-foreground">
            اسم المشروع
          </Label>
          <AutocompleteInput
            category="projectNames"
            value={name}
            onChange={setName}
            placeholder="أدخل اسم المشروع..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-status" className="text-sm font-medium text-foreground">
            حالة المشروع
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="اختر حالة المشروع..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="paused">متوقف</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-engineer" className="text-sm font-medium text-foreground">
            المهندس المسؤول
          </Label>
          <Select
            value={engineerId || "none"}
            onValueChange={(value) => setEngineerId(value === "none" ? null : value)}
            disabled={usersLoading}
          >
            <SelectTrigger id="project-engineer">
              <SelectValue placeholder={usersLoading ? "جاري التحميل..." : usersError ? "فشل في جلب المهندسين" : "اختر مهندسًا..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون مهندس</SelectItem>
              {usersError && (
                <SelectItem value="error" disabled className="text-destructive">
                  فشل في تحميل قائمة المهندسين
                </SelectItem>
              )}
              {usersData.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            نوع المشروع
          </Label>
          <ProjectTypeSelect
            value={projectTypeId?.toString() || ""}
            onValueChange={(val) => setProjectTypeId(val ? parseInt(val) : null)}
            projectTypes={projectTypes}
            placeholder={typesLoading ? "جاري التحميل..." : "اختر نوع المشروع..."}
            disabled={typesLoading}
          />
        </div>
      </CompactFieldGroup>

      <Button
        type="submit"
        disabled={addProjectMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {addProjectMutation.isPending ? "جاري الإضافة..." : "إضافة المشروع"}
      </Button>
    </form>
  );
}