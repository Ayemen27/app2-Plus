import { useLocation } from "wouter";
import { 
  Clock, 
  Receipt, 
  ShoppingCart, 
  ArrowLeftRight,
  Users,
  FolderKanban,
  Wallet,
  Building2,
  Wrench,
  BarChart,
  Brain,
  UserPlus,
  FolderPlus,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  route?: string;
  action?: () => void;
  gradient: string;
  iconColor: string;
}

interface QuickActionsGridProps {
  onAddWorker?: () => void;
  onAddProject?: () => void;
}

export function QuickActionsGrid({ onAddWorker, onAddProject }: QuickActionsGridProps) {
  const [, setLocation] = useLocation();

  const quickActions: QuickAction[] = [
    {
      id: "add-worker",
      label: "إضافة عامل",
      icon: UserPlus,
      action: onAddWorker,
      gradient: "from-teal-500 to-teal-600",
      iconColor: "text-white",
    },
    {
      id: "add-project",
      label: "إضافة مشروع",
      icon: FolderPlus,
      action: onAddProject,
      gradient: "from-violet-500 to-violet-600",
      iconColor: "text-white",
    },
    {
      id: "project-fund-custody",
      label: "الوارد للعهد",
      icon: DollarSign,
      route: "/project-fund-custody",
      gradient: "from-blue-500 to-blue-600",
      iconColor: "text-white",
    },
    {
      id: "project-transfers",
      label: "ترحيل أموال",
      icon: ArrowLeftRight,
      route: "/project-transfers",
      gradient: "from-purple-500 to-purple-600",
      iconColor: "text-white",
    },
    {
      id: "supplier-accounts",
      label: "حسابات الموردين",
      icon: Building2,
      route: "/supplier-accounts",
      gradient: "from-amber-500 to-amber-600",
      iconColor: "text-white",
    },
    {
      id: "equipment",
      label: "إدارة المعدات",
      icon: Wrench,
      route: "/equipment",
      gradient: "from-slate-500 to-slate-600",
      iconColor: "text-white",
    },
    {
      id: "worker-accounts",
      label: "حسابات العمال",
      icon: DollarSign,
      route: "/worker-accounts",
      gradient: "from-cyan-500 to-cyan-600",
      iconColor: "text-white",
    },
    {
      id: "professional-reports",
      label: "التقارير",
      icon: BarChart,
      route: "/professional-reports",
      gradient: "from-indigo-500 to-indigo-600",
      iconColor: "text-white",
    },
    {
      id: "ai-chat",
      label: "الوكيل الذكي",
      icon: Brain,
      route: "/ai-chat",
      gradient: "from-pink-500 to-pink-600",
      iconColor: "text-white",
    },
  ];

  const handleClick = (action: QuickAction) => {
    if (action.action) {
      action.action();
    } else if (action.route) {
      setLocation(action.route);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" dir="rtl">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            className={cn(
              "flex flex-col items-center justify-center",
              "p-3 sm:p-4 rounded-xl",
              "bg-gradient-to-br",
              action.gradient,
              "shadow-md hover:shadow-lg",
              "transform hover:scale-[1.02] active:scale-[0.98]",
              "transition-all duration-200 ease-out",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "min-h-[80px] sm:min-h-[90px]"
            )}
          >
            <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7 mb-1.5 sm:mb-2", action.iconColor)} />
            <span className={cn(
              "text-[11px] sm:text-xs font-medium text-center leading-tight",
              action.iconColor
            )}>
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
