import { getDB, BinarJoinDB } from '../../offline/db';
import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from '../../offline/offline';
import { apiRequest } from '../../lib/queryClient';

/**
 * محرك المزامنة الخلفي (Silent Sync Engine)
 * يعمل في الخلفية لمزامنة العمليات المعلقة دون حظر المستخدم
 */
export async function runSilentSync() {
  const queue = await getPendingSyncQueue();
  if (queue.length === 0) return;

  console.log(`[Silent-Sync] بدء مزامنة ${queue.length} عملية معلقة...`);

  for (const item of queue) {
    try {
      // محاكاة تأخير بسيط لتجنب الضغط على السيرفر
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await apiRequest(item.endpoint, item.action === 'create' ? 'POST' : 'PATCH', item.payload);
      
      if (response.success) {
        // إزالة من الطابور وتحديث حالة العنصر في الجدول الأصلي
        await removeSyncQueueItem(item.id);
        
        // تحديث وسم _pendingSync في الجدول الأصلي
        const db = await getDB();
        const storeName = item.endpoint.split('/')[2] as keyof BinarJoinDB; // افتراض هيكلية /api/storeName
        
        if (storeName) {
          const localItem = await db.get(storeName as any, item.payload.id);
          if (localItem) {
            localItem._pendingSync = false;
            localItem._isLocal = false; // أصبح الآن متزامناً
            await db.put(storeName as any, localItem);
          }
        }
        
        console.log(`[Silent-Sync] تم مزامنة العملية بنجاح: ${item.id}`);
      }
    } catch (error: any) {
      console.error(`[Silent-Sync] فشل مزامنة العملية ${item.id}:`, error);
      await updateSyncRetries(item.id, item.retries + 1, error.message, 'network');
    }
  }
}

/**
 * بدء مراقب المزامنة التلقائي
 */
export function initSilentSyncObserver(intervalMs = 30000) {
  // تشغيل أولي
  runSilentSync();
  
  // تشغيل دوري
  setInterval(() => {
    if (navigator.onLine) {
      runSilentSync();
    }
  }, intervalMs);

  // تشغيل عند عودة الاتصال
  window.addEventListener('online', () => {
    console.log('[Silent-Sync] عاد الاتصال، بدء المزامنة...');
    runSilentSync();
  });
}
