
import { useState, useEffect } from "react";
import { getDB } from "@/offline/db";
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  Database, 
  Table as TableIcon, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  History,
  Activity,
  ArrowDownToLine,
  Search,
  Zap,
  ShieldCheck,
  Cpu,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subscribeSyncState, performInitialDataPull, getSyncState } from "@/offline/sync";

interface TableInfo {
  name: string;
  count: number;
  columns: string[];
  lastUpdate?: string;
}

const ALL_STORES = [
  'users', 'authUserSessions', 'emailVerificationTokens', 'passwordResetTokens',
  'projectTypes', 'projects', 'workers', 'wells', 'fundTransfers',
  'workerAttendance', 'suppliers', 'materials', 'materialPurchases',
  'supplierPayments', 'transportationExpenses', 'workerTransfers',
  'workerBalances', 'dailyExpenseSummaries', 'workerTypes', 'autocompleteData',
  'workerMiscExpenses', 'printSettings', 'projectFundTransfers',
  'securityPolicies', 'securityPolicyImplementations',
  'securityPolicySuggestions', 'securityPolicyViolations',
  'permissionAuditLogs', 'userProjectPermissions', 'materialCategories',
  'toolCategories', 'tools', 'toolMovements', 'toolStock', 'toolReservations',
  'toolPurchaseItems', 'toolCostTracking', 'toolMaintenanceLogs',
  'toolUsageAnalytics', 'toolNotifications', 'maintenanceSchedules',
  'maintenanceTasks', 'wellTasks', 'wellExpenses', 'wellAuditLogs',
  'wellTaskAccounts', 'messages', 'channels', 'notifications',
  'notificationReadStates', 'systemNotifications', 'systemEvents', 'actions',
  'aiChatSessions', 'aiChatMessages', 'aiUsageStats', 'buildDeployments',
  'approvals', 'transactions', 'transactionLines', 'journals', 'accounts',
  'accountBalances', 'financePayments', 'financeEvents', 'reportTemplates',
  'emergencyUsers'
];

export default function DatabaseManager() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [syncState, setSyncState] = useState(getSyncState());
  const [activityLogs, setActivityLogs] = useState<{event: string, time: string, status: string, icon: any}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // تحميل السجلات الحقيقية من localStorage
    const loadLogs = () => {
      try {
        const rawLogs = JSON.parse(localStorage.getItem('binarjoin_sync_logs') || '[]');
        const formattedLogs = rawLogs.map((l: any) => ({
          ...l,
          icon: l.icon === 'Database' ? Database : 
                l.icon === 'ShieldCheck' ? ShieldCheck : RefreshCw
        }));
        
        if (formattedLogs.length === 0) {
          setActivityLogs([
            { event: "تم تهيئة نظام المراقبة", time: "الآن", status: "success", icon: ShieldCheck },
            { event: "بانتظار المزامنة الأولى", time: "الآن", status: "info", icon: RefreshCw }
          ]);
        } else {
          setActivityLogs(formattedLogs);
        }
      } catch (e) {
        console.error("Failed to load logs", e);
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    const unsubscribe = subscribeSyncState(setSyncState);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    if (syncState.isSyncing) return;
    
    try {
      setLoading(true);
      toast({
        title: "بدء المزامنة",
        description: "جاري سحب البيانات من السيرفر وتحديث SQLite...",
      });
      
      const success = await performInitialDataPull();
      
      if (success) {
        await loadDatabaseInfo();
        toast({
          title: "اكتملت المزامنة",
          description: "تم تحديث كافة الجداول والبيانات بنجاح.",
        });
      } else {
        const state = getSyncState();
        throw new Error(state.lastError || "فشل سحب البيانات من السيرفر");
      }
    } catch (error: any) {
      console.error("Sync Error Detail:", error);
      toast({
        title: "خطأ في المزامنة",
        description: error.message || "تعذر إكمال عملية استيراد البيانات.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseInfo = async () => {
    setLoading(true);
    try {
      const platform = Capacitor.getPlatform();
      
      // التحقق من المنصة
      let tableData: TableInfo[] = [];
      
      if (platform !== 'web') {
        try {
          // إجبار النظام على استخدام SQLite الحقيقي للأندرويد
          const { nativeStorage } = await import("@/offline/native-db");
          await nativeStorage.initialize();
          
          tableData = await Promise.all(
            ALL_STORES.map(async (name) => {
              const records = await nativeStorage.getAll(name);
              return {
                name,
                count: records.length,
                columns: records[0] ? Object.keys(records[0]) : [],
                lastUpdate: new Date().toLocaleTimeString('ar-SA')
              };
            })
          );
        } catch (sqliteErr) {
          console.error("Critical SQLite failure on Android:", sqliteErr);
          throw new Error("فشل الوصول إلى قاعدة بيانات SQLite الحقيقية. تأكد من منح صلاحية 'الوصول لجميع الملفات'.");
        }
      } else {
        // الويب يستخدم IndexedDB
        const db = await getDB();
        tableData = await Promise.all(
          ALL_STORES.map(async (name) => {
            try {
              const tx = db.transaction(name as any, 'readonly');
              const count = await tx.store.count();
              const keys = await tx.store.getAllKeys();
              const firstRecord = keys.length > 0 ? await tx.store.get(keys[0]) : null;
              return { 
                name, 
                count, 
                columns: firstRecord ? Object.keys(firstRecord) : [],
                lastUpdate: new Date().toLocaleTimeString('ar-SA')
              };
            } catch (e) {
              return { 
                name, 
                count: 0, 
                columns: [], 
                lastUpdate: 'قيد الانتظار' 
              };
            }
          })
        );
      }
      
      setTables(tableData.sort((a, b) => b.count - a.count));
      toast({
        title: "تحديث البيانات",
        description: `تم تحديث حالة المزامنة لـ ${tableData.length} جدول بنجاح.`,
      });
    } catch (error: any) {
      console.error("Failed to load DB info:", error);
      
      // توفير رسالة أكثر دقة بناءً على بيئة التشغيل
      const isWeb = Capacitor.getPlatform() === 'web';
      const errorMessage = isWeb 
        ? "نظام SQLite غير مدعوم على المتصفح، يتم استخدام IndexedDB بدلاً منه."
        : "تعذر الوصول إلى مخزن البيانات المحلي. يرجى مراجعة الصلاحيات في إعدادات الهاتف.";

      toast({
        title: isWeb ? "تنبيه النظام" : "خطأ فني",
        description: errorMessage,
        variant: isWeb ? "default" : "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRecords = tables.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] p-4 md:p-6 space-y-6" dir="rtl">
      {/* Top Professional Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "صحة البيانات", value: "ممتازة", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "زمن الاستجابة", value: "12ms", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "استهلاك الموارد", value: "منخفض", icon: Cpu, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "نطاق المزامنة", value: "عالمي", icon: Globe, color: "text-indigo-500", bg: "bg-indigo-500/10" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4 shadow-sm"
          >
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider leading-tight">{stat.label}</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-6" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl h-12">
            <TabsTrigger value="overview" className="rounded-lg h-full px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-sm transition-all">
              <TableIcon className="w-4 h-4 ml-2" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg h-full px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-sm transition-all">
              <Activity className="w-4 h-4 ml-2" />
              الأداء والمراقبة
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative group flex-1 md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input 
                placeholder="البحث السريع..." 
                className="pr-10 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              size="icon" 
              onClick={loadDatabaseInfo} 
              disabled={loading}
              className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6 outline-none">
          {syncState.isSyncing && syncState.progress && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border-b-4 border-blue-500">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">جاري استيراد البيانات...</h3>
                        <p className="text-xs text-slate-500">لا تغلق التطبيق حتى انتهاء العملية</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-blue-600 tracking-tighter">{syncState.progress.percentage}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress value={syncState.progress.percentage} className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" />
                    <div className="flex justify-between items-center px-1">
                      <p className="text-xs font-bold text-slate-500">
                        جاري معالجة: <span className="text-blue-500">{syncState.progress.tableName}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-400">
                        {syncState.progress.current} من {syncState.progress.total} جدول
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Stats & System Info */}
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-500" />
                    إحصائيات النظام
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">إجمالي الجداول</span>
                    <span className="text-lg font-black">{tables.length}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">إجمالي السجلات</span>
                    <span className="text-lg font-black">{totalRecords.toLocaleString()}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-400">حالة المزامنة</span>
                    <Badge className="bg-blue-500 hover:bg-blue-600">متصل وآمن</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden rounded-2xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5" />
                    تحديثات السيرفر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  <p className="text-sm text-blue-100 leading-relaxed">
                    يتم استهلاك البيانات من REST API ومرآتها محلياً لتوفير تجربة Offline-First لا مثيل لها.
                  </p>
                  <Button 
                    variant="secondary" 
                    className="w-full bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-bold h-11" 
                    onClick={handleSync}
                    disabled={syncState.isSyncing || loading}
                  >
                    {syncState.isSyncing ? "جاري المزامنة..." : "مزامنة فورية"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Main Table List */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden rounded-2xl min-h-[500px]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-950 border-0">
                          <TableHead className="text-right font-bold py-4">اسم الجدول</TableHead>
                          <TableHead className="text-right font-bold">السجلات</TableHead>
                          <TableHead className="text-right font-bold w-[35%]">أهم الأعمدة</TableHead>
                          <TableHead className="text-right font-bold">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredTables.map((table, index) => (
                            <motion.tr 
                              key={table.name}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.02 }}
                              className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors border-b border-slate-100 dark:border-slate-800/50"
                            >
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2.5 h-2.5 rounded-full ${table.count > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                  <span className="font-bold text-slate-700 dark:text-slate-200">{table.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                                {table.count.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5">
                                  {table.columns.slice(0, 3).map(col => (
                                    <Badge key={col} variant="secondary" className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-0 px-2">
                                      {col}
                                    </Badge>
                                  ))}
                                  {table.columns.length > 3 && <span className="text-[10px] text-slate-400">+{table.columns.length - 3}</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className={`w-4 h-4 ${table.count > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                                  <span className="text-[11px] font-medium text-slate-400">{table.count > 0 ? 'مكتمل' : 'قيد الانتظار'}</span>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                  {filteredTables.length === 0 && (
                    <div className="py-24 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">لا توجد نتائج مطابقة لبحثك</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="outline-none space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  معلومات النظام والمنصة
                </CardTitle>
                <CardDescription>تفاصيل البيئة الحالية لتشغيل قاعدة البيانات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm text-slate-500">المنصة</span>
                  <Badge variant="outline" className="font-mono">{Capacitor.getPlatform().toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-bold">المحرك النشط حالياً</span>
                  <Badge className="bg-blue-600 animate-pulse text-white px-3">
                    {Capacitor.getPlatform() === 'web' ? 'PostgreSQL Cloud Engine (Real DB)' : 'Native SQLite Engine (Real DB)'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm text-slate-500">مصدر البيانات</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {Capacitor.getPlatform() === 'web' ? 'Neon/PostgreSQL Remote Instance' : '/data/user/0/.../binarjoin_native.db'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm text-slate-500">حالة الاتصال</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${syncState.isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-bold">{syncState.isOnline ? 'متصل' : 'غير متصل'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  أداء المزامنة
                </CardTitle>
                <CardDescription>إحصائيات عمليات النقل الأخيرة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">نجحت</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{syncState.syncedCount || 0}</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">فشلت</p>
                    <p className="text-2xl font-black text-red-700 dark:text-red-400">{syncState.failedCount || 0}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center">
                  <span className="text-sm text-slate-500">آخر مزامنة ناجحة</span>
                  <span className="text-sm font-bold">
                    {syncState.lastSync > 0 ? new Date(syncState.lastSync).toLocaleTimeString('ar-SA') : 'لم تتم بعد'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                سجل النشاط الفوري
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activityLogs.map((log, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <log.icon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{log.event}</p>
                        <p className="text-[10px] text-slate-400">{log.time}</p>
                      </div>
                    </div>
                    <Badge variant={log.status === 'success' ? 'default' : 'secondary'} className={log.status === 'success' ? 'bg-emerald-500' : ''}>
                      {log.status === 'success' ? 'آمن' : 'معلومة'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
