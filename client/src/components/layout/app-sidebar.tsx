import { 
  Home, Building2, Users, Package, Truck, 
  UserCheck, Calculator, Settings, LogOut,
  ChevronDown, BarChart3, ShieldCheck, Database, Wrench, Wallet, MessageSquare,
  Activity
} from "lucide-react";
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

const sections = [
  {
    title: "الرئيسية",
    icon: Home,
    items: [
      { title: "لوحة التحكم", url: "/", icon: Home },
      { title: "إدارة المشاريع", url: "/projects", icon: Building2 },
    ]
  },
  {
    title: "القوى العاملة",
    icon: Users,
    items: [
      { title: "إدارة العمال", url: "/workers", icon: Users },
      { title: "حضور العمال", url: "/worker-attendance", icon: UserCheck },
      { title: "حسابات العمال", url: "/worker-accounts", icon: Wallet },
    ]
  },
  {
    title: "المواد والعمليات",
    icon: Package,
    items: [
      { title: "شراء المواد", url: "/material-purchase", icon: Package },
      { title: "الموردين", url: "/suppliers-pro", icon: Truck },
      { title: "إدارة النقل", url: "/transport-management", icon: Truck },
      { title: "إدارة المعدات", icon: Wrench, url: "/equipment" },
    ]
  },
  {
    title: "المالية والتقارير",
    icon: Calculator,
    items: [
      { title: "المصاريف اليومية", url: "/daily-expenses", icon: Calculator },
      { title: "محاسبة الآبار", url: "/well-accounting", icon: Calculator },
      { title: "تقرير التكلفة", url: "/well-cost-report", icon: BarChart3 },
      { title: "تقارير احترافية", url: "/professional-reports", icon: BarChart3 },
    ]
  },
  {
    title: "الإدارة والأمان",
    icon: ShieldCheck,
    items: [
      { title: "المساعد الذكي", icon: MessageSquare, url: "/ai-chat" },
      { title: "سياسات الأمان", icon: ShieldCheck, url: "/security-policies" },
      { title: "نظام المراقبة", icon: Activity, url: "/monitoring" },
      { title: "قاعدة البيانات", icon: Database, url: "/local-db" },
    ]
  }
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNavigation = (url: string) => {
    setLocation(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar side="right" variant="sidebar" collapsible="icon" className="border-l-0">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden text-right">
            <span className="font-bold text-base tracking-tight text-white">مشروعي</span>
            <span className="text-[10px] text-white/50 truncate font-medium uppercase tracking-wider">نظام الإدارة المتكامل</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar gap-0 pt-2 custom-scrollbar overflow-x-hidden">
        {sections.map((section) => (
          <Collapsible key={section.title} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-white/40 hover:text-white transition-colors group-data-[collapsible=icon]:hidden">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{section.title}</span>
                  <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location === item.url}
                          className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-white/10"
                        >
                          <a 
                            href={item.url} 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              handleNavigation(item.url);
                            }}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium text-sm">{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar/50 p-2 mt-auto">
        <div className="px-4 py-2 flex items-center gap-3 group-data-[collapsible=icon]:hidden border-b border-white/5 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col overflow-hidden text-right">
            <span className="text-sm font-bold text-white truncate">{user?.name || "المستخدم"}</span>
            <span className="text-[10px] text-white/40 truncate">{user?.email}</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => handleNavigation("/settings")}
            >
              <Settings className="h-5 w-5 opacity-60" />
              <span className="text-sm font-medium">الإعدادات</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              onClick={() => {
                logout();
                if (isMobile) setOpenMobile(false);
              }}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
