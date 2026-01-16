import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { 
  Home, Users, Building2, Truck, Calculator, 
  MoreHorizontal, MapPin, BarChart, UserCheck, 
  Package, DollarSign, Settings, ArrowLeftRight, 
  FileText, CreditCard, FileSpreadsheet, Bell, 
  Shield, Database, Wrench, Terminal, Brain,
  ReceiptText, Search, X, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

const navigationItems = [
  { path: "/", icon: Home, label: "الرئيسية", key: "dashboard" },
  { path: "/projects", icon: Building2, label: "المشاريع", key: "projects" },
  { path: "/workers", icon: Users, label: "العمال", key: "workers" },
  { path: "/material-purchase", icon: Package, label: "المشتريات", key: "material_purchase" },
  { path: "/transport-management", icon: Truck, label: "النقل", key: "transport_management" },
  { path: "/worker-attendance", icon: UserCheck, label: "حضور", key: "attendance" },
  { path: "/daily-expenses", icon: Calculator, label: "المصاريف", key: "expenses" },
];

const allPagesData = [
  {
    category: "الصفحات الرئيسية",
    pages: [
      { path: "/", icon: Home, label: "لوحة التحكم", description: "عرض شامل للمشاريع والإحصائيات", requireAdmin: false },
      { path: "/projects", icon: Building2, label: "إدارة المشاريع", description: "إضافة وإدارة المشاريع", requireAdmin: false },
      { path: "/workers", icon: Users, label: "إدارة العمال", description: "إضافة وإدارة العمال والحرفيين", requireAdmin: false },
      { path: "/suppliers-pro", icon: Truck, label: "إدارة الموردين", description: "إدارة الموردين والموزعين", requireAdmin: false },
    ]
  },
  {
    category: "العمليات اليومية",
    pages: [
      { path: "/wells", icon: MapPin, label: "إدارة الآبار", description: "إدارة الآبار والمهام والمحاسبة", requireAdmin: false },
      { path: "/well-accounting", icon: Calculator, label: "محاسبة الآبار", description: "إدارة مهام ومحاسبة الآبار", requireAdmin: false },
      { path: "/well-cost-report", icon: BarChart, label: "تقرير التكاليف", description: "تحليل شامل لتكاليف الآبار", requireAdmin: false },
      { path: "/worker-attendance", icon: UserCheck, label: "حضور العمال", description: "تسجيل حضور وغياب العمال", requireAdmin: false },
      { path: "/daily-expenses", icon: Calculator, label: "المصاريف اليومية", description: "تسجيل المصاريف اليومية للمشاريع", requireAdmin: false },
      { path: "/material-purchase", icon: Package, label: "شراء المواد", description: "إدارة مشتريات مواد البناء", requireAdmin: false },
      { path: "/transport-management", icon: Truck, label: "إدارة النقل", description: "إدارة أجور ونقل العمال والمعدات", requireAdmin: false },
      { path: "/worker-accounts", icon: DollarSign, label: "حسابات العمال", description: "إدارة حوالات وتحويلات العمال", requireAdmin: true },
      { path: "/equipment", icon: Settings, label: "إدارة المعدات", description: "إدارة المعدات مع النقل والتتبع", requireAdmin: true },
      { path: "/project-fund-custody", icon: DollarSign, label: "الوارد للعهد", description: "إدارة الوارد الرئيسي للعُهد", requireAdmin: true },
      { path: "/project-transfers", icon: ArrowLeftRight, label: "ترحيل بين المشاريع", description: "إدارة ترحيل الأرصدة بين المشاريع", requireAdmin: true },
      { path: "/project-transactions", icon: FileText, label: "سجل العمليات", description: "عرض شامل لجميع المعاملات المالية", requireAdmin: true },
    ]
  },
  {
    category: "إدارة الموردين", 
    pages: [
      { path: "/supplier-accounts", icon: CreditCard, label: "حسابات الموردين", description: "إدارة حسابات ودفعات الموردين", requireAdmin: true },
    ]
  },
  {
    category: "التقارير",
    pages: [
      { path: "/professional-reports", icon: BarChart, label: "التقارير الاحترافية", description: "لوحة تقارير متقدمة مع رسوم بيانية وتحليلات", requireAdmin: false },
    ]
  },
  {
    category: "إدارة النظام",
    pages: [
      { path: "/users-management", icon: Users, label: "إدارة المستخدمين", description: "إدارة حسابات المستخدمين والصلاحيات", requireAdmin: true },
    ]
  },
  {
    category: "الإشعارات والتنبيهات",
    pages: [
      { path: "/notifications", icon: Bell, label: "الإشعارات", description: "عرض وإدارة إشعارات النظام", requireAdmin: false },
    ]
  },
  {
    category: "الأمان والمراقبة",
    pages: [
      { path: "/monitoring", icon: Activity, label: "المراقبة الموحدة", description: "مراقبة الأداء، الأمان، وصحة النظام بشكل كامل", requireAdmin: true },
      { path: "/security-policies", icon: Shield, label: "السياسات الأمنية", description: "إدارة السياسات الأمنية والامتثال", requireAdmin: true },
      { path: "/local-db", icon: Database, label: "إدارة القاعدة المحلية", description: "فحص حالة البيانات المحلية والمزامنة", requireAdmin: true },
    ]
  },
  {
    category: "الإعدادات والإدارة",
    pages: [
      { path: "/autocomplete-admin", icon: Wrench, label: "إعدادات الإكمال التلقائي", description: "إدارة بيانات الإكمال التلقائي", requireAdmin: true },
      { path: "/admin-notifications", icon: Bell, label: "إشعارات المسؤولين", description: "إدارة وإرسال إشعارات للمستخدمين", requireAdmin: true },
      { path: "/deployment", icon: Terminal, label: "لوحة البناء والنشر", description: "نظام البناء الآلي والنشر على السيرفر", requireAdmin: true },
    ]
  },
  {
    category: "الذكاء الاصطناعي",
    pages: [
      { path: "/ai-chat", icon: Brain, label: "الوكيل الذكي", description: "مساعد ذكي لإدارة المشاريع والاستعلامات", requireAdmin: true },
      { path: "/sync-comparison", icon: ArrowLeftRight, label: "مقارنة المزامنة", description: "مقارنة البيانات بين السيرفر والجهاز المحلي", requireAdmin: true },
    ]
  },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const allPages = allPagesData.map(category => ({
    ...category,
    pages: category.pages.filter(page => !page.requireAdmin || isAdmin)
  })).filter(category => category.pages.length > 0);

  // تصفية الصفحات بناءً على البحث
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return allPages;
    
    const query = searchQuery.toLowerCase();
    return allPages.map(category => ({
      ...category,
      pages: category.pages.filter(page => 
        page.label.toLowerCase().includes(query) || 
        page.description.toLowerCase().includes(query)
      )
    })).filter(category => category.pages.length > 0);
  }, [searchQuery, allPages]);

  const handlePageNavigation = (path: string) => {
    setLocation(path);
    setIsMenuOpen(false);
    setSearchQuery("");
  };

  const totalPages = allPages.reduce((acc, cat) => acc + cat.pages.length, 0);

  return (
    <nav 
      className="bg-transparent flex-shrink-0 h-[84px] w-full relative z-[10] pb-[env(safe-area-inset-bottom,20px)] touch-none mb-1"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="flex justify-around items-center h-full w-full max-w-screen-xl mx-auto px-2 relative">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Button
              key={item.key}
              variant="ghost"
              data-testid={`nav-item-${item.key}`}
              className={`flex flex-col items-center justify-center gap-1 h-full min-w-[50px] px-1 rounded-xl transition-all duration-500 relative group no-default-hover-elevate no-default-active-elevate ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-400 dark:text-slate-500"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <div className="relative flex items-center justify-center">
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-bg"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="absolute inset-[-6px] bg-blue-50 dark:bg-blue-900/20 rounded-xl z-0"
                    />
                  )}
                </AnimatePresence>
                <Icon className={`h-[22px] w-[22px] z-10 transition-transform duration-500 ${isActive ? "scale-110" : "group-hover:scale-105"}`} />
              </div>
              <span className={`text-[11px] font-medium z-10 transition-all duration-500 ${isActive ? "opacity-100 translate-y-0" : "opacity-70 group-hover:opacity-100"}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-dot"
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-5 h-[3px] bg-blue-600 dark:bg-blue-400 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </Button>
          );
        })}

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              data-testid="nav-more-button"
              className={`flex flex-col items-center justify-center gap-1 h-full min-w-[50px] px-1 rounded-xl transition-all duration-500 relative group no-default-hover-elevate no-default-active-elevate ${
                isMenuOpen 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isMenuOpen && (
                  <div className="absolute inset-[-6px] bg-blue-50 dark:bg-blue-900/20 rounded-xl" />
                )}
                <MoreHorizontal className={`h-[22px] w-[22px] z-10 transition-transform duration-500 ${isMenuOpen ? "scale-110" : "group-hover:scale-105"}`} />
              </div>
              <span className={`text-[11px] font-medium z-10 transition-all duration-500 ${isMenuOpen ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                المزيد
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-[28px] px-0 border-none shadow-[0_-15px_50px_rgba(0,0,0,0.15)] bg-white dark:bg-slate-950 backdrop-blur-2xl z-[2000] overflow-hidden flex flex-col">
            {/* شريط السحب */}
            <div className="flex-shrink-0 w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-3" />
            
            {/* رأس المنطقة مع الإحصائيات وحقل البحث */}
            <div className="flex-shrink-0 px-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <SheetHeader>
                  <SheetTitle className="text-right text-2xl font-bold bg-gradient-to-l from-blue-600 to-blue-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
                    اكتشف التطبيق
                  </SheetTitle>
                </SheetHeader>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </Button>
                </SheetTrigger>
              </div>
              
              {/* شريط الإحصائيات */}
              <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {filteredPages.reduce((acc, cat) => acc + cat.pages.length, 0)} من {totalPages}
                </span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  جميع الخدمات
                </span>
              </div>

              {/* شريط البحث المحسّن */}
              <div className="relative group">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                <Input
                  data-testid="input-menu-search"
                  type="text"
                  placeholder="ابحث عن صفحة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pr-10 pl-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 dark:focus-visible:ring-offset-0 transition-all duration-300"
                />
              </div>
            </div>

            {/* قائمة الصفحات */}
            <ScrollArea className="flex-1 px-4">
              <div className="pb-40">
                {filteredPages.length > 0 ? (
                  <div className="space-y-6">
                    <AnimatePresence mode="wait">
                      {filteredPages.map((category, categoryIndex) => (
                        <motion.div
                          key={categoryIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: categoryIndex * 0.05 }}
                          className="space-y-3"
                        >
                          {/* عنوان الفئة */}
                          <div className="flex items-center gap-3 px-2 mb-3">
                            <div className="h-0.5 flex-1 bg-gradient-to-l from-slate-200 dark:from-slate-800 to-transparent" />
                            <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                              {category.category}
                            </h3>
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
                          </div>

                          {/* شبكة الصفحات */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {category.pages.map((page, pageIndex) => {
                              const PageIcon = page.icon;
                              const isPageActive = location === page.path;

                              return (
                                <motion.div
                                  key={pageIndex}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: pageIndex * 0.03 }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Button
                                    variant="ghost"
                                    data-testid={`menu-item-${page.path}`}
                                    className={`w-full h-auto p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden relative group cursor-pointer ${
                                      isPageActive 
                                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-950 dark:from-blue-600 dark:to-blue-700" 
                                        : "bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 text-slate-900 dark:text-white hover:border-blue-300 dark:hover:border-blue-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                    }`}
                                    onClick={() => handlePageNavigation(page.path)}
                                  >
                                    {/* خلفية تأثير عند المرور */}
                                    {!isPageActive && (
                                      <motion.div
                                        className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-blue-500/0 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300"
                                        whileHover={{ opacity: 1 }}
                                      />
                                    )}

                                    <div className="flex items-center gap-3 w-full relative z-10">
                                      {/* أيقونة الصفحة */}
                                      <motion.div
                                        className={`p-2.5 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                                          isPageActive 
                                            ? "bg-white/25 shadow-lg" 
                                            : "bg-slate-100 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                                        }`}
                                        whileHover={{ scale: 1.15, rotate: 5 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                      >
                                        <PageIcon className="h-5 w-5" />
                                      </motion.div>

                                      {/* محتوى النص */}
                                      <div className="flex-1 min-w-0 text-right">
                                        <div className={`font-bold text-sm leading-tight mb-1 truncate transition-all duration-300 ${
                                          isPageActive ? "text-white" : "text-slate-900 dark:text-slate-100"
                                        }`}>
                                          {page.label}
                                        </div>
                                        <div className={`text-[11px] leading-tight truncate transition-all duration-300 ${
                                          isPageActive 
                                            ? "text-white/85" 
                                            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                        }`}>
                                          {page.description}
                                        </div>
                                      </div>
                                    </div>
                                  </Button>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <Search className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                      لا توجد نتائج
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs">
                      جرب كلمات بحث أخرى
                    </p>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
