import { useState } from 'react';
import { useSyncData } from '@/hooks/useSyncData';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export function SyncStatusHeader() {
  const { isSyncing, offlineCount, isOnline, lastSync, lastError, lastErrorType, manualSync, cancelAllOperations, latency } = useSyncData();
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const handleManualSync = async () => {
    setIsSyncingManual(true);
    await manualSync();
    setIsSyncingManual(false);
  };

  const handleCancelAll = async () => {
    if (window.confirm('هل أنت متأكد من إلغاء جميع العمليات المعلقة؟')) {
      await cancelAllOperations();
    }
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return 'text-green-500';
    if (ms < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getErrorTitle = (errorType?: string) => {
    switch (errorType) {
      case 'timeout':
        return 'انتهت المهلة الزمنية';
      case 'network':
        return 'خطأ في الاتصال';
      case 'server':
        return 'خطأ في الخادم';
      case 'validation':
        return 'خطأ في البيانات';
      default:
        return 'حدث خطأ';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-2 rounded-full hover:bg-primary/80 relative"
          title="حالة المزامنة"
        >
          {isSyncing || isSyncingManual ? (
            <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
          ) : !isOnline ? (
            <WifiOff className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
          ) : offlineCount > 0 ? (
            <RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
          ) : (
            <Wifi className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
          )}
          {offlineCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
            >
              {offlineCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            حالة المزامنة
          </div>
          {latency && isOnline && (
            <span className={`text-[10px] font-mono ${getLatencyColor(latency)}`}>
              {latency}ms
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-3 py-2 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">حالة الاتصال:</span>
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">متصل</Badge>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </>
              ) : (
                <>
                  <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">أوفلاين</Badge>
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">عمليات معلقة:</span>
            <span className={`font-bold ${offlineCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {offlineCount}
            </span>
          </div>

          {(isSyncing || isSyncingManual) && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>جاري المزامنة...</span>
                <span>جاري المعالجة</span>
              </div>
              <Progress value={undefined} className="h-1" />
            </div>
          )}

          <div className="text-[10px] text-muted-foreground pt-1 border-t">
            {lastSync > 0 ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>آخر مزامنة: {formatDistanceToNow(lastSync, { addSuffix: true, locale: ar })}</span>
              </div>
            ) : (
              <span>لم يتم المزامنة بعد</span>
            )}
          </div>

          {lastError && (
            <div className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded flex gap-2 items-start mt-2 flex-col">
              <div className="flex gap-1 items-start w-full">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-red-500" />
                <div className="flex-1">
                  <div className="font-semibold">{getErrorTitle(lastErrorType)}</div>
                  <span className="break-words line-clamp-2 text-red-500">{lastError}</span>
                </div>
              </div>
              {offlineCount > 0 && (
                <button
                  onClick={handleCancelAll}
                  className="text-xs bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200 px-2 py-1 rounded hover:bg-red-300 dark:hover:bg-red-700 transition-colors w-full"
                  data-testid="button-cancel-all-operations"
                >
                  إلغاء جميع العمليات ({offlineCount})
                </button>
              )}
            </div>
          )}

          <Button 
            className="w-full mt-2 h-8 text-xs gap-2" 
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing || isSyncingManual || offlineCount === 0}
          >
            {(isSyncing || isSyncingManual) ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                جاري المزامنة...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                مزامنة الآن
              </>
            )}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
