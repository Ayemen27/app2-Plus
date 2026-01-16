import { useEffect, useState } from 'react';
import { subscribeSyncState, getSyncState, syncOfflineData } from '@/offline/sync';
import { cancelSyncQueueItem, cancelAllSyncQueueItems, getPendingSyncQueue } from '@/offline/offline';

export function useSyncData() {
  const [syncState, setSyncState] = useState(() => getSyncState());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // اشتراك في تحديثات حالة المزامنة
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState(state);
    });

    // مراقبة اتصال الإنترنت
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData().catch(console.error);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const manualSync = async () => {
    if (isOnline) {
      await syncOfflineData();
    }
  };

  const cancelOperation = async (operationId: string) => {
    await cancelSyncQueueItem(operationId);
    // تحديث حالة المزامنة
    const pending = await getPendingSyncQueue();
    setSyncState(prev => ({
      ...prev,
      pendingCount: pending.length
    }));
  };

  const cancelAllOperations = async () => {
    const count = await cancelAllSyncQueueItems();
    setSyncState(prev => ({
      ...prev,
      pendingCount: 0,
      lastError: `تم إلغاء ${count} عملية معلقة`
    }));
  };

  return {
    isSyncing: syncState.isSyncing,
    offlineCount: syncState.pendingCount,
    lastSync: syncState.lastSync,
    lastError: syncState.lastError,
    lastErrorType: syncState.lastErrorType,
    lastErrorDetails: syncState.lastErrorDetails,
    isOnline,
    manualSync,
    cancelOperation,
    cancelAllOperations,
    latency: syncState.latency,
  };
}
