import { Bell, UserCircle, HardHat, Settings, Home, Building2, Users, Truck, UserCheck, DollarSign, Calculator, Package, ArrowLeftRight, FileText, CreditCard, FileSpreadsheet, Wrench, LogOut, User, Shield, FolderOpen, CheckCircle2, X, Layers, Activity, Wallet, MessageSquare, Lock, FileBarChart, FileCheck, Cloud, CloudOff, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { PushTestButton } from "@/components/push-test-button";
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject, ALL_PROJECTS_ID, ALL_PROJECTS_NAME } from "@/hooks/use-selected-project";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";
import { SyncStatusHeader } from "@/components/SyncStatusHeader";
import { subscribeSyncState } from "@/offline/sync";

const pageInfo: Record<string, { title: string; icon: any }> = {
  '/': { title: 'لوحة التحكم', icon: Home },
  '/projects': { title: 'إدارة المشاريع', icon: Building2 },
  '/workers': { title: 'إدارة العمال', icon: Users },
  '/suppliers-pro': { title: 'إدارة الموردين', icon: Truck },
  '/worker-attendance': { title: 'حضور العمال', icon: UserCheck },
  '/worker-accounts': { title: 'حسابات العمال', icon: DollarSign },
  '/material-purchase': { title: 'شراء المواد', icon: Package },
  '/project-transfers': { title: 'ترحيل بين المشاريع', icon: ArrowLeftRight },
  '/project-transactions': { title: 'سجل العمليات', icon: FileText },
  '/well-accounting': { title: 'محاسبة الآبار', icon: Calculator },
  '/well-cost-report': { title: 'تقرير تكلفة الآبار', icon: FileText },
  '/wells': { title: 'إدارة الآبار', icon: Layers },
  '/transport-management': { title: 'إدارة النقل', icon: Truck },
  '/daily-expenses': { title: 'المصاريف اليومية', icon: DollarSign },
  '/deployment': { title: 'لوحة البناء والنشر التلقائي', icon: Activity },
  '/settings': { title: 'إعدادات النظام', icon: Settings },
  '/project-fund-custody': { title: 'عهدة صندوق المشروع', icon: Wallet },
  '/admin-notifications': { title: 'إشعارات الإدارة', icon: Shield },
  '/ai-chat': { title: 'المساعد الذكي', icon: MessageSquare },
  '/security-policies': { title: 'سياسات الأمان', icon: Lock },
  '/monitoring': { title: 'نظام المراقبة والجودة', icon: Activity },
  '/equipment': { title: 'إدارة المعدات', icon: Wrench },
  '/real-reports': { title: 'تقارير حقيقية', icon: FileBarChart },
  '/professional-reports': { title: 'تقارير احترافية', icon: FileCheck },
  '/local-db': { title: 'إدارة قاعدة البيانات المحلية', icon: Database },
};

export default function Header() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { selectedProjectId, selectedProjectName, selectProject } = useSelectedProject();
  const [syncState, setSyncState] = useState({ isOnline: true, pendingCount: 0 });

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState({
        isOnline: state.isOnline,
        pendingCount: state.pendingCount || 0
      });
    });
    return () => unsubscribe();
  }, []);

  const { isOnline, pendingCount } = syncState;
  
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/projects', 'GET');
        return (data?.data || data || []) as Project[];
      } catch (error) {
        return [] as Project[];
      }
    },
  });

  const currentPage = pageInfo[location] || { title: 'إدارة المشاريع الإنشائية', icon: HardHat };
  const PageIcon = currentPage.icon;

  const handleProjectSelect = (projectId: string, projectName: string) => {
    selectProject(projectId, projectName);
    toast({ title: "تم تحديد المشروع", description: projectName });
  };

  return (
    <div className="flex items-center justify-between h-full w-full">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
          <PageIcon className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">{currentPage.title}</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">مشروعي - إدارة المشاريع</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <SyncStatusHeader />
        
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
          {isOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-yellow-500" />
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-1 mr-1">
              <RefreshCw className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] font-bold text-primary">{pendingCount}</span>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-3 gap-2 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50"
            >
              <FolderOpen className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold max-w-[80px] truncate">
                {selectedProjectId ? (selectedProjectId === ALL_PROJECTS_ID ? ALL_PROJECTS_NAME : selectedProjectName) : "اختر مشروعاً"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-80">
            <DropdownMenuLabel className="text-right">اختيار المشروع</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {projectsLoading ? (
              <div className="p-4 text-center text-xs">جاري التحميل...</div>
            ) : (
              <>
                <DropdownMenuItem onClick={() => handleProjectSelect(ALL_PROJECTS_ID, ALL_PROJECTS_NAME)} className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>{ALL_PROJECTS_NAME}</span>
                  </div>
                  {selectedProjectId === ALL_PROJECTS_ID && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </DropdownMenuItem>
                {projects.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => handleProjectSelect(p.id.toString(), p.name)} className="flex justify-between">
                    <span>{p.name}</span>
                    {selectedProjectId === p.id.toString() && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
