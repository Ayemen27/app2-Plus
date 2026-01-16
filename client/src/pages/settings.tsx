import React, { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  Smartphone, 
  Palette, 
  Languages, 
  UserCircle,
  Database,
  Lock,
  Eye,
  Volume2,
  Cloud,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { exportLocalData, importLocalData } from "@/offline/backup";
import { clearAllLocalData } from "@/offline/data-cleanup";
import { getSyncStats } from "@/offline/offline";
import { useSyncData } from "@/hooks/useSyncData";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { manualSync, isSyncing, isOnline } = useSyncData();
  const [stats, setStats] = useState<{ pendingSync: number; localUserData: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadStats = async () => {
    const s = await getSyncStats();
    setStats(s);
  };

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
    loadStats();
  }, []);

  const handleExport = async () => {
    try {
      await exportLocalData();
      toast({ title: "تم التصدير بنجاح", description: "تم حفظ نسخة احتياطية من بياناتك المحلية" });
    } catch (error) {
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await importLocalData(event.target?.result as string);
        await loadStats();
        toast({ title: "تم الاستيراد بنجاح", description: "تم تحديث البيانات المحلية من النسخة الاحتياطية" });
      } catch (error) {
        toast({ title: "خطأ في الاستيراد", description: "تأكد من صحة ملف النسخة الاحتياطية", variant: "destructive" });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (confirm("هل أنت متأكد من مسح جميع البيانات المحلية؟ سيتم حذف جميع العمليات غير المتزامنة.")) {
      await clearAllLocalData();
      await loadStats();
      toast({ title: "تم مسح البيانات", description: "تم تنظيف قاعدة البيانات المحلية بنجاح" });
    }
  };

  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    toast({
      title: checked ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع النهاري",
      duration: 2000,
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث تفضيلاتك بنجاح",
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl animate-in fade-in duration-500 pb-20">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto">
          <TabsTrigger value="general" className="rounded-lg gap-2">
            <SettingsIcon className="h-4 w-4" />
            عام
          </TabsTrigger>
          <TabsTrigger value="offline" className="rounded-lg gap-2">
            <Database className="h-4 w-4" />
            البيانات (Offline)
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg gap-2">
            <Palette className="h-4 w-4" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg gap-2">
            <Bell className="h-4 w-4" />
            التنبيهات
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2">
            <Lock className="h-4 w-4" />
            الأمان
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-500" />
                تفضيلات التطبيق
              </CardTitle>
              <CardDescription>الإعدادات الأساسية لواجهة التطبيق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">لغة النظام</Label>
                  <p className="text-sm text-muted-foreground">اختر اللغة المفضلة لواجهة المستخدم</p>
                </div>
                <Select defaultValue="ar">
                  <SelectTrigger className="w-[140px] rounded-xl">
                    <SelectValue placeholder="اختر اللغة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تحديث تلقائي</Label>
                  <p className="text-sm text-muted-foreground">تحديث البيانات بشكل دوري في الخلفية</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                إدارة البيانات المحلية (Offline)
              </CardTitle>
              <CardDescription>تحكم في البيانات المخزنة على جهازك والمزامنة مع السيرفر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">عمليات معلقة للمزامنة</p>
                  <p className="text-xl font-bold text-orange-600">{stats?.pendingSync || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">بيانات محلية محفوظة</p>
                  <p className="text-xl font-bold text-blue-600">{stats?.localUserData || 0}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" />
                  تصدير نسخة
                </Button>
                
                <div className="relative">
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled={isImporting}>
                    <Upload className="h-3.5 w-3.5" />
                    استيراد نسخة
                  </Button>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleImport}
                    disabled={isImporting}
                  />
                </div>

                <Button 
                  variant="secondary" 
                  size="sm"
                  className="gap-2 rounded-xl" 
                  onClick={() => manualSync()} 
                  disabled={!isOnline || isSyncing || stats?.pendingSync === 0}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  مزامنة الآن
                </Button>

                <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-destructive hover:bg-destructive/10" onClick={handleClear}>
                  <Trash2 className="h-3.5 w-3.5" />
                  مسح البيانات
                </Button>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed">
                  يتم تخزين بياناتك محلياً لتمكينك من العمل بدون إنترنت. عند مسح البيانات المحلية، ستفقد أي عمليات لم يتم مزامنتها مع السيرفر بعد.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-500" />
                تخصيص المظهر
              </CardTitle>
              <CardDescription>تغيير ألوان وسمات التطبيق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    الوضع الليلي
                  </Label>
                  <p className="text-sm text-muted-foreground">تبديل بين الوضع الفاتح والداكن</p>
                </div>
                <Switch 
                  checked={isDarkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">حجم الخط</Label>
                  <p className="text-sm text-muted-foreground">تعديل حجم خط النصوص في التطبيق</p>
                </div>
                <Select defaultValue="medium">
                  <SelectTrigger className="w-[140px] rounded-xl">
                    <SelectValue placeholder="اختر الحجم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">صغير</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="large">كبير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                إعدادات التنبيهات
              </CardTitle>
              <CardDescription>إدارة كيفية استلام الإشعارات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">إشعارات الدفع (Push)</Label>
                  <p className="text-sm text-muted-foreground">استلام تنبيهات على المتصفح أو الجهاز</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تنبيهات المصروفات</Label>
                  <p className="text-sm text-muted-foreground">الإخطار عند تسجيل مصروفات كبيرة</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تنبيهات الحضور</Label>
                  <p className="text-sm text-muted-foreground">الإخطار عند اكتمال كشف الحضور اليومي</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                الأمان والخصوصية
              </CardTitle>
              <CardDescription>إعدادات حماية الحساب والبيانات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">التحقق بخطوتين (2FA)</Label>
                  <p className="text-sm text-muted-foreground">إضافة طبقة حماية إضافية لحسابك</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl">تفعيل</Button>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">قفل التطبيق</Label>
                  <p className="text-sm text-muted-foreground">طلب كلمة مرور عند فتح التطبيق</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" className="rounded-xl px-8">إلغاء</Button>
          <Button onClick={handleSaveSettings} className="rounded-xl px-8">حفظ التغييرات</Button>
        </div>
      </Tabs>
    </div>
  );
}
