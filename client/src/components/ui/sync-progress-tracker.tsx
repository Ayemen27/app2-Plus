import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export function SyncProgressTracker() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'completed' | 'offline'>('idle');

  // Simulate sync logic for demonstration
  // In a real app, this would connect to a sync manager or service worker
  useEffect(() => {
    const handleSyncStart = () => {
      setIsSyncing(true);
      setStatus('syncing');
      setProgress(0);
    };

    const handleSyncProgress = (p: number) => {
      setProgress(p);
    };

    const handleSyncEnd = () => {
      setStatus('completed');
      setTimeout(() => {
        setIsSyncing(false);
        setStatus('idle');
        setProgress(0);
      }, 2000);
    };

    // Listen for online/offline status
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setStatus('offline');
      } else if (status === 'offline') {
        setStatus('idle');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [status]);

  if (status === 'idle' && !isSyncing) return null;

  return (
    <div 
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-md transition-all duration-500 transform",
        isSyncing || status === 'offline' ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
      )}
      dir="rtl"
    >
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              status === 'syncing' && "bg-primary/10 text-primary animate-pulse",
              status === 'completed' && "bg-green-100 text-green-600 dark:bg-green-900/30",
              status === 'offline' && "bg-red-100 text-red-600 dark:bg-red-900/30"
            )}>
              {status === 'syncing' && <RefreshCw className="w-5 h-5 animate-spin" />}
              {status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
              {status === 'offline' && <CloudOff className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {status === 'syncing' && "جاري مزامنة البيانات..."}
                {status === 'completed' && "تمت المزامنة بنجاح"}
                {status === 'offline' && "أنت غير متصل بالإنترنت"}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {status === 'syncing' && `يتم تحديث ${Math.round(progress)}% من البيانات المحلية`}
                {status === 'completed' && "جميع بياناتك الآن محدثة على السحابة"}
                {status === 'offline' && "سيتم حفظ تغييراتك ومزامنتها فور عودة الاتصال"}
              </p>
            </div>
          </div>
          {status === 'syncing' && (
            <span className="text-xs font-mono font-bold text-primary">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        
        {status === 'syncing' && (
          <Progress 
            value={progress} 
            className="h-1.5 bg-slate-100 dark:bg-slate-800" 
          />
        )}
      </div>
    </div>
  );
}
