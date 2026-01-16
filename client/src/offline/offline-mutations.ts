import { queueForSync, getPendingSyncQueue, removeSyncQueueItem, addLocalFirst, updateLocalFirst } from './offline';
import { deleteLocalRecord, EntityName } from './offline-queries';
import { runSilentSync } from '../dev_system/monitoring/silent-sync';
import { queryClient } from '@/lib/queryClient';
import { BinarJoinDB } from './db';

/**
 * إضافة بيانات مع حفظ محلي فوري (Offline-First)
 */
export async function createRecordOffline(
  endpoint: string,
  entityName: EntityName,
  payload: any,
  id: string
): Promise<{ success: boolean; id: string; error?: string }> {
  try {
    console.log(`🚀 [Absolute-Offline] إنشاء سجل فوري: ${entityName}/${id}`);

    // استخدام الوظيفة الجديدة للحفظ المحلي الفوري والجدولة للمزامنة
    await addLocalFirst(entityName as keyof BinarJoinDB, { ...payload, id }, endpoint);

    // محاولة تشغيل المزامنة في الخلفية إذا كان هناك اتصال، دون انتظار
    if (navigator.onLine) {
      runSilentSync().catch(err => console.warn('⚠️ Background sync trigger failed:', err));
    }

    return { success: true, id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, id, error: errorMsg };
  }
}

/**
 * تحديث بيانات مع حفظ محلي فوري
 */
export async function updateRecordOffline(
  endpoint: string,
  entityName: EntityName,
  id: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🚀 [Absolute-Offline] تحديث سجل فوري: ${entityName}/${id}`);

    await updateLocalFirst(entityName as keyof BinarJoinDB, id, payload, endpoint);

    if (navigator.onLine) {
      runSilentSync().catch(err => console.warn('⚠️ Background sync trigger failed:', err));
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * حذف بيانات مع حفظ محلي
 */
export async function deleteRecordOffline(
  endpoint: string,
  entityName: EntityName,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🗑️ [Absolute-Offline] حذف سجل فوري: ${entityName}/${id}`);

    await deleteLocalRecord(entityName, id);
    await queueForSync('delete', endpoint, { id });

    if (navigator.onLine) {
      runSilentSync().catch(err => console.warn('⚠️ Background sync trigger failed:', err));
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * احصل على عدد العمليات المعلقة
 */
export async function getPendingOperationsCount(): Promise<number> {
  const pending = await getPendingSyncQueue();
  return pending.length;
}

/**
 * احصل على تفاصيل العمليات المعلقة
 */
export async function getPendingOperationsDetails() {
  const pending = await getPendingSyncQueue();
  return pending.map(item => ({
    id: item.id,
    action: item.action,
    endpoint: item.endpoint,
    retries: item.retries,
    timestamp: item.timestamp,
    error: item.lastError
  }));
}

/**
 * إحصائيات المزامنة
 */
export async function getSyncStatistics() {
  const pending = await getPendingSyncQueue();
  const creates = pending.filter(p => p.action === 'create').length;
  const updates = pending.filter(p => p.action === 'update').length;
  const deletes = pending.filter(p => p.action === 'delete').length;
  const failedOps = pending.filter(p => p.retries > 0).length;

  return {
    totalPending: pending.length,
    creates,
    updates,
    deletes,
    failedOperations: failedOps,
    oldestOperation: pending.length > 0 ? new Date(pending[0].timestamp) : null
  };
}

/**
 * دالة مساعدة لتحديث الـ cache
 */
export async function invalidateCache(entityName: EntityName): Promise<void> {
  const queryKeyMap: Record<EntityName, string[]> = {
    projects: ['/api/projects'],
    workers: ['/api/workers'],
    materials: ['/api/materials'],
    suppliers: ['/api/suppliers'],
    workerAttendance: ['/api/worker-attendance'],
    materialPurchases: ['/api/material-purchases'],
    transportationExpenses: ['/api/transportation-expenses'],
    fundTransfers: ['/api/fund-transfers'],
    workerTransfers: ['/api/worker-transfers'],
    workerMiscExpenses: ['/api/worker-misc-expenses'],
    wells: ['/api/wells'],
    projectTypes: ['/api/project-types'],
  };

  const queryKey = queryKeyMap[entityName];
  if (queryKey) {
    await queryClient.invalidateQueries({ queryKey, exact: false });
  }
}

/**
 * دالة شاملة لـ mutation offline-first
 */
export async function offlineFirstMutation<T>(
  action: 'create' | 'update' | 'delete',
  endpoint: string,
  entityName: EntityName,
  recordId: string,
  payload?: any
): Promise<T> {
  try {
    // [Absolute-Offline] تعطيل الاتصال بالسيرفر تماماً
    if (action === 'create') {
      const result = await createRecordOffline(endpoint, entityName, payload, recordId);
      if (!result.success) throw new Error(result.error);
      return { id: result.id } as T;
    } else if (action === 'update') {
      const result = await updateRecordOffline(endpoint, entityName, recordId, payload);
      if (!result.success) throw new Error(result.error);
      return { id: recordId } as T;
    } else if (action === 'delete') {
      const result = await deleteRecordOffline(endpoint, entityName, recordId);
      if (!result.success) throw new Error(result.error);
      return { id: recordId } as T;
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('❌ [OfflineMutations] Error:', error);
    throw error;
  }
}
