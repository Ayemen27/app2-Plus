import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSelect } from "@/components/ui/searchable-select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Zap, Users, Shield, User, Send, Sparkles, AlertTriangle, ChevronDown, Crown, UserCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const notificationSchema = z.object({
  type: z.enum(['safety', 'task', 'payroll', 'announcement', 'system']),
  title: z.string().min(1, "العنوان مطلوب"),
  body: z.string().min(1, "المحتوى مطلوب"),
  priority: z.number().min(1).max(5),
  recipientType: z.enum(['all', 'admins', 'workers', 'specific']),
  specificUserId: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface CreateNotificationDialogProps {
  onUpdate?: () => void;
  notificationType?: 'safety' | 'task' | 'payroll' | 'announcement' | 'system';
  projectId?: string;
}

const notificationTypes = [
  { 
    value: 'safety', 
    label: 'تنبيه أمني', 
    description: 'تنبيهات السلامة والأمان',
    icon: '🚨',
    color: 'from-red-500 to-red-600'
  },
  { 
    value: 'task', 
    label: 'إشعار مهمة', 
    description: 'إشعارات المهام والواجبات',
    icon: '📝',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    value: 'payroll', 
    label: 'إشعار راتب', 
    description: 'إشعارات الرواتب والمستحقات',
    icon: '💰',
    color: 'from-green-500 to-green-600'
  },
  { 
    value: 'announcement', 
    label: 'إعلان عام', 
    description: 'إعلانات عامة للجميع',
    icon: '📢',
    color: 'from-purple-500 to-purple-600'
  },
  { 
    value: 'system', 
    label: 'إشعار نظام', 
    description: 'إشعارات النظام التلقائية',
    icon: '⚙️',
    color: 'from-gray-500 to-gray-600'
  },
];

const priorityLevels = [
  { value: 1, label: 'حرج جداً', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { value: 2, label: 'عاجل', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { value: 3, label: 'متوسط', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { value: 4, label: 'منخفض', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { value: 5, label: 'معلومة', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
];

export function CreateNotificationDialog({
  onUpdate,
  notificationType = 'announcement',
  projectId
}: CreateNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAccessToken } = useAuth();
  const [selectedRecipientType, setSelectedRecipientType] = useState<string>('all');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAccessToken() ? `Bearer ${getAccessToken()}` : '',
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users', 'with-roles'],
    queryFn: async () => {
      const response = await fetch('/api/users?includeRole=true', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب المستخدمين');
      return response.json();
    },
    enabled: open
  });

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: notificationType,
      title: "",
      body: "",
      priority: 3,
      recipientType: "all",
      specificUserId: undefined,
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData & { projectId?: string }) => {
      let endpoint = '/api/notifications';
      switch (data.type) {
        case 'safety': endpoint = '/api/notifications/safety'; break;
        case 'task': endpoint = '/api/notifications/task'; break;
        case 'payroll': endpoint = '/api/notifications/payroll'; break;
        case 'announcement': endpoint = '/api/notifications/announcement'; break;
        default: endpoint = '/api/notifications';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          projectId: projectId,
          recipients: data.recipientType === 'specific' && data.specificUserId ? [data.specificUserId] : data.recipientType,
        }),
      });

      if (!response.ok) throw new Error('فشل في إنشاء الإشعار');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      
      toast({ title: "تم بنجاح", description: "تم إنشاء الإشعار بنجاح" });
      setOpen(false);
      form.reset();
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast({ title: "خطأ", description: "فشل في إنشاء الإشعار", variant: "destructive" });
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    createNotificationMutation.mutate({ ...data, projectId });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Send className="h-4 w-4" />
        إنشاء إشعار
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-[600px] border-0 p-0 overflow-hidden bg-white rounded-xl md:rounded-2xl shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 md:p-5">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base md:text-lg font-bold">إنشاء إشعار</DialogTitle>
                <DialogDescription className="text-blue-100 text-xs md:text-sm mt-0.5">
                  أرسل إشعاراً للمستخدمين عبر قنوات النظام
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3 md:p-5 overflow-y-auto max-h-[80vh]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل العنوان..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>النوع</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {notificationTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الأولوية</FormLabel>
                        <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الأولوية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {priorityLevels.map((level) => (
                              <SelectItem key={level.value} value={level.value.toString()}>{level.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="recipientType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المستقبلين</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'all', label: 'الجميع', icon: Users },
                          { value: 'admins', label: 'المسؤولين', icon: Shield },
                          { value: 'workers', label: 'الموظفين', icon: User },
                          { value: 'specific', label: 'محدد', icon: UserCheck },
                        ].map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={field.value === option.value ? "default" : "outline"}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => field.onChange(option.value)}
                          >
                            <option.icon className="h-3.5 w-3.5" />
                            {option.label}
                          </Button>
                        ))}
                      </div>

                      {field.value === 'specific' && (
                        <div className="mt-2">
                          <FormField
                            control={form.control}
                            name="specificUserId"
                            render={({ field: userField }) => (
                              <FormItem>
                                <FormControl>
                                  <UserSelect
                                    value={userField.value || ''}
                                    onValueChange={userField.onChange}
                                    users={users.map((u: any) => ({
                                      id: u.id,
                                      fullName: u.firstName || u.name || 'بدون اسم',
                                      email: u.email
                                    }))}
                                    placeholder="اختر المستخدم..."
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المحتوى</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="اكتب الرسالة..." rows={4} className="resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>إلغاء</Button>
                  <Button type="submit" className="flex-1" disabled={createNotificationMutation.isPending}>
                    {createNotificationMutation.isPending ? "جاري الإرسال..." : "إرسال الإشعار"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const UserCheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
);
