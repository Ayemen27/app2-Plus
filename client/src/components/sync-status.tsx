import { useEffect, useState } from 'react';
import { subscribeSyncState, triggerSync } from '@/offline/sync';
import { Check, AlertCircle, Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: number;
  pendingCount: number;
  lastError?: string;
  isOnline: boolean;
}

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: 0,
    pendingCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setStatus(state);
    });

    return () => unsubscribe();
  }, []);

  const getLastSyncText = () => {
    if (status.lastSync === 0) return 'لم يتم المزامنة';
    const diff = Date.now() - status.lastSync;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    return `منذ ${Math.floor(minutes / 60)} ساعة`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-sm transition-all duration-300">
      {/* Connection Status & Intelligent Fallback UI */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <div className={`relative flex h-2.5 w-2.5 items-center justify-center`}>
                {status.isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${status.isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
              </div>
              {status.isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {status.isOnline ? 'متصل بالإنترنت - نظام المزامنة نشط' : 'وضع عدم الاتصال - جاري العمل من قاعدة البيانات المحلية'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Sync Status Engine */}
      <div className="flex items-center gap-2 overflow-hidden">
        {status.isSyncing ? (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1 duration-300">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">جاري المزامنة...</span>
          </div>
        ) : status.pendingCount > 0 ? (
          <div className="flex items-center gap-1.5 animate-in zoom-in duration-300">
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              {status.pendingCount} معلق
            </Badge>
            {status.isOnline && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600"
                onClick={() => triggerSync()}
                title="مزامنة الآن"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 animate-in fade-in duration-500">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[11px] font-medium whitespace-nowrap">{getLastSyncText()}</span>
          </div>
        )}
      </div>

      {/* Intelligent Error Handling UI */}
      {status.lastError && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="w-4 h-4 text-red-500 cursor-pointer animate-pulse shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] bg-red-50 text-red-900 border-red-200 text-xs">
                {status.lastError}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  );
}
