import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { getDB } from './db';
import { clearAllLocalData } from './data-cleanup';
import { detectConflict, resolveConflict, logConflict } from './conflict-resolver';
import { apiRequest } from '../lib/api-client';
import { smartSave, smartGetAll } from './storage-factory';
import { intelligentMonitor } from '../dev_system/monitoring/intelligent-monitor';
import { ENV } from '../lib/env';

const MAX_RETRIES = 5;
const INITIAL_SYNC_DELAY = 2000; 
let isSyncing = false;
let syncListeners: ((state: SyncState) => void)[] = [];
let syncInterval: NodeJS.Timeout | null = null;
let retryCount = 0;

export interface SyncState {
  isSyncing: boolean;
  lastSync: number;
  pendingCount: number;
  lastError?: string;
  lastErrorType?: any;
  lastErrorDetails?: any;
  isOnline: boolean;
  syncedCount?: number;
  failedCount?: number;
  latency?: number; // زمن الاستجابة بالملي ثانية
  progress?: {
    total: number;
    current: number;
    tableName: string;
    percentage: number;
  };
}

let currentSyncState: SyncState = {
  isSyncing: false,
  lastSync: 0,
  pendingCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastErrorType: undefined,
  lastErrorDetails: undefined
};

export function subscribeSyncState(listener: (state: SyncState) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function updateSyncState(updates: Partial<SyncState>) {
  currentSyncState = { ...currentSyncState, ...updates };
  syncListeners.forEach(listener => listener(currentSyncState));
}

export function getSyncState(): SyncState {
  return { ...currentSyncState };
}

/**
 * حساب وقت الانتظار (Exponential Backoff)
 */
function getBackoffDelay(retries: number): number {
  return Math.min(30000, INITIAL_SYNC_DELAY * Math.pow(2, retries));
}

/**
 * 📥 سحب البيانات الكاملة من الخادم لمرة واحدة (التكامل التام)
 */
export async function performInitialDataPull(): Promise<boolean> {
  const accessToken = localStorage.getItem('accessToken');
  
  // فحص صارم للإنترنت والتوكن قبل بدء المزامنة الثقيلة
  if (!accessToken) {
    console.warn('🔑 [Sync] لا يمكن السحب الأولي بدون توكن');
    return false;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('📡 [Sync] لا يمكن السحب الأولي بدون إنترنت');
    return false;
  }

  // منع المزامنة المتكررة إذا كانت جارية بالفعل
  if (isSyncing) {
    console.log('🔄 [Sync] المزامنة جارية بالفعل، تخطي الطلب الجديد');
    return false;
  }

  try {
    console.log('📥 [Sync] بدء سحب البيانات الكاملة من الخادم...');
    updateSyncState({ isSyncing: true });

    // محاولة جلب البيانات مع مهلة زمنية (Timeout) للتعامل مع ضعف الإنترنت
    // ترقية: استخدام نقطة النهاية المخصصة للمزامنة الكاملة بدلاً من المسار القديم
    const result = await apiRequest('/api/sync/full-backup', 'GET');
    
    if (!result || (typeof result === 'object' && result.code === 'INVALID_TOKEN')) {
      console.error('❌ [Sync] فشل المصادقة أو انتهت المهلة، يجب تسجيل الدخول مرة أخرى');
      return false;
    }
    
    if (!result.success || !result.data) {
      console.error('❌ [Sync] فشل جلب البيانات من السيرفر:', result?.error || 'بيانات غير صالحة');
      return false;
    }

    const { data } = result;
    const db = await getDB();
    const tableEntries = Object.entries(data);
    const totalTables = tableEntries.length;
    let processedTables = 0;
    let totalSaved = 0;

    // ترقية: استخدام Transaction واحدة ضخمة لضمان سلامة البيانات (Atomic Import)
    // ملاحظة: بما أن smartSave قد يستخدم محركات مختلفة، سنكتفي بالمعالجة المتوازية المحسنة
    
    // 1. مزامنة المستخدمين أولاً لضمان عمل Auth (حرج جداً)
    if (data.users && Array.isArray(data.users)) {
      processedTables++;
      updateSyncState({ 
        progress: { 
          total: totalTables, 
          current: processedTables, 
          tableName: 'users',
          percentage: Math.round((processedTables / totalTables) * 100)
        } 
      });
      await smartSave('users', data.users);
      
      // حفظ بيانات الطوارئ (Offline Login)
      const emergencyData = data.users.map((u: any) => ({
        id: u.id.toString(),
        email: u.email,
        password: u.password,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        role: u.role || 'user'
      }));
      await smartSave('emergencyUsers', emergencyData);
    }

    // 2. مزامنة بقية الجداول (Batch processing لتجنب تعليق المتصفح)
    const BATCH_SIZE = 5;
    for (let i = 0; i < tableEntries.length; i += BATCH_SIZE) {
      const batch = tableEntries.slice(i, i + BATCH_SIZE);
      for (const [tableName, records] of batch) {
        if (tableName !== 'users' && Array.isArray(records)) {
          processedTables++;
          updateSyncState({ 
            progress: { 
              total: totalTables, 
              current: processedTables, 
              tableName,
              percentage: Math.min(100, Math.round((processedTables / totalTables) * 100))
            } 
          });
          await smartSave(tableName, records);
          totalSaved += records.length;
        }
      }
    }

    await db.put('syncMetadata', {
      key: 'lastSync',
      timestamp: Date.now(),
      version: '3.1',
      recordCount: totalSaved,
      lastSyncTime: Date.now()
    });

    console.log('🎉 [Sync] اكتملت المزامنة والاستيراد بنجاح!');
    updateSyncState({ isSyncing: false, lastSync: Date.now(), progress: undefined });
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [Sync] خطأ في المزامنة الأولية:', errorMsg);
    
    updateSyncState({ 
      isSyncing: false, 
      lastError: `فشل الاستيراد: ${errorMsg}` 
    });

    // معالجة سيناريو "انقطاع الإنترنت المفاجئ أثناء الاستيراد"
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('📡 [Sync] تم إلغاء المزامنة بسبب بطء الاتصال، سيتم المحاولة لاحقاً');
    }
    
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * مزامنة جميع البيانات المعلقة
 */
export async function syncOfflineData(): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) {
    updateSyncState({ isOnline: false });
    return;
  }

  isSyncing = true;
  updateSyncState({ isSyncing: true, isOnline: true });

  try {
    const pending = await getPendingSyncQueue();
    if (pending.length === 0) {
      updateSyncState({ isSyncing: false });
      isSyncing = false;
      retryCount = 0;
      return;
    }

    console.log(`🔄 [Sync] جاري مزامنة ${pending.length} عملية مجمعة...`);
    
    try {
      const result = await apiRequest('/api/sync/batch', 'POST', {
        operations: pending.map((item: any) => ({
          id: item.id,
          type: item.action,
          table: item.endpoint.split('/')[2],
          data: item.payload,
          timestamp: item.timestamp
        }))
      });

      if (result && result.success && Array.isArray(result.results)) {
        for (const res of result.results) {
          if (res.status === 'success') {
            await removeSyncQueueItem(res.id);
            // تحديث الحالة المحلية للسجل
            const op = pending.find((p: any) => p.id === res.id);
            if (op) {
              const tableName = op.endpoint.split('/')[2];
              const recordId = op.payload.id;
              if (tableName && recordId) {
                try {
                  const localRecords = await smartGetAll(tableName);
                  const record = localRecords.find((r: any) => (r.id || r.key) === recordId);
                  if (record) {
                    record.synced = true;
                    record.pendingSync = false;
                    record.isLocal = false;
                    await smartSave(tableName, [record]);
                  }
                } catch (e) { console.warn('Failed local state update', e); }
              }
            }
          }
        }
        updateSyncState({ 
          lastSync: Date.now(),
          isSyncing: false,
          syncedCount: result.results.filter((r: any) => r.status === 'success').length,
          pendingCount: 0
        });
      }
    } catch (batchError) {
      console.error('❌ [Sync] فشل المزامنة المجمعة:', batchError);
      // fallback to individual sync if batch fails? No, better retry batch with backoff
      throw batchError;
    }

  } catch (error) {
    console.error('❌ [Sync] خطأ في المزامنة:', error);
    updateSyncState({ isSyncing: false });
    
    if (intelligentMonitor) {
      intelligentMonitor.logEvent({
        type: 'error',
        severity: 'high',
        message: `خطأ حرج في محرك المزامنة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      });
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * تهيئة مستمع المزامنة
 */
export function initSyncListener(): void {
  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    performInitialDataPull();
    syncOfflineData();
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });

  const runSync = async () => {
    console.log('🚀 [Sync] بدء المزامنة التلقائية الفورية...');
    await performInitialDataPull();
    await syncOfflineData();
  };

  runSync();

  setInterval(() => {
    if (navigator.onLine) syncOfflineData();
  }, 30000);
}

export function stopSyncListener(): void {
  if (syncInterval) clearInterval(syncInterval);
}

export function triggerSync() {
  syncOfflineData().catch(err => console.error('❌ [Sync] خطأ في المزامنة الفورية:', err));
}

export async function loadFullBackup(): Promise<{ recordCount: number }> {
  try {
    console.log('📥 [Sync] جاري تحميل نسخة احتياطية كاملة من الخادم...');
    const result = await apiRequest('/api/sync/full-backup', 'GET');
    
    if (!result || !result.success || !result.data) {
      throw new Error('Backup failed on server');
    }
    
    const { data } = result;
    const db = await getDB();
    
    let totalSaved = 0;
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        await smartSave(tableName, records);
        console.log(`✅ [Sync] تم مزامنة ${records.length} سجل في ${tableName}`);
        totalSaved += records.length;
      }
    }
    
    await db.put('syncMetadata', {
      key: 'lastSync',
      timestamp: Date.now(),
      version: '3.0',
      recordCount: totalSaved
    });
    
    return { recordCount: totalSaved };
  } catch (error: any) {
    console.error('❌ [Sync] خطأ في تحميل النسخة الاحتياطية:', error);
    throw error;
  }
}

export function startBackgroundSync(): void {
  if (isSyncing) return;
  syncOfflineData().catch(err => {
    console.error('❌ [Sync] فشل المزامنة الخلفية:', err);
  });
}
