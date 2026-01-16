import { useSyncData } from '@/hooks/useSyncData';

/**
 * Component لعرض حالة الاتصال والمزامنة
 * 
 * @example
 * ```typescript
 * <SyncStatus />
 * ```
 */
export function SyncStatus() {
  const { isSyncing, offlineCount, isOnline, manualSync } = useSyncData();

  if (!isOnline && offlineCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-md max-w-xs z-50">
      <div className="space-y-2">
        {!isOnline && (
          <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <span>📡</span>
            بدون اتصال بالإنترنت
          </div>
        )}
        
        {isSyncing && (
          <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <span className="inline-block animate-spin">🔄</span>
            جاري المزامنة...
          </div>
        )}
        
        {offlineCount > 0 && !isSyncing && (
          <div className="text-sm text-orange-600 dark:text-orange-400 flex items-center justify-between gap-2">
            <span>⏳ {offlineCount} عملية معلقة</span>
            <button
              onClick={manualSync}
              className="text-xs bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
              data-testid="button-manual-sync"
            >
              مزامنة الآن
            </button>
          </div>
        )}

        {offlineCount > 0 && isSyncing && (
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span>✓</span>
            تم مزامنة البيانات بنجاح
          </div>
        )}
      </div>
    </div>
  );
}
