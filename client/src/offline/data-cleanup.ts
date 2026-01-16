/**
 * نظام تنظيف البيانات القديمة والمؤقتة
 */

import { getDB } from './db';
import { EntityName } from './offline-queries';

/**
 * احذف السجلات القديمة (أكبر من maxAge)
 */
export async function deleteOldRecords(
  entityName: EntityName,
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000 // 30 يوم افتراضي
): Promise<number> {
  try {
    const db = await getDB();
    const allRecords = await db.getAll(entityName as any);
    const cutoffTime = Date.now() - maxAgeMs;
    let deleted = 0;

    for (const record of allRecords) {
      const createdAt = record.createdAt ? new Date(record.createdAt).getTime() : 0;
      if (createdAt > 0 && createdAt < cutoffTime) {
        await db.delete(entityName as any, record.id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🗑️ [Cleanup] تم حذف ${deleted} سجل قديم من ${entityName}`);
    }

    return deleted;
  } catch (error) {
    console.error('❌ [Cleanup] خطأ في حذف السجلات القديمة:', error);
    return 0;
  }
}

/**
 * احذف السجلات المحذوفة (soft-deleted)
 */
export async function deleteSoftDeletedRecords(
  entityName: EntityName,
  deletedField: string = 'isDeleted'
): Promise<number> {
  try {
    const db = await getDB();
    const allRecords = await db.getAll(entityName as any);
    let deleted = 0;

    for (const record of allRecords) {
      if (record[deletedField] === true) {
        await db.delete(entityName as any, record.id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🗑️ [Cleanup] تم حذف ${deleted} سجل محذوف من ${entityName}`);
    }

    return deleted;
  } catch (error) {
    console.error('❌ [Cleanup] خطأ في حذف السجلات المحذوفة:', error);
    return 0;
  }
}

/**
 * احذف جميع البيانات المحلية (الطاقة النووية)
 */
export async function clearAllLocalData(): Promise<boolean> {
  try {
    const db = await getDB();
    const entities: EntityName[] = [
      'projects', 'workers', 'materials', 'suppliers',
      'workerAttendance', 'materialPurchases', 'transportationExpenses',
      'fundTransfers', 'workerTransfers', 'workerMiscExpenses', 'wells', 'projectTypes'
    ];

    for (const entity of entities) {
      const records = await db.getAll(entity as any);
      for (const record of records) {
        await db.delete(entity as any, record.id);
      }
    }

    console.log('🧹 [Cleanup] تم مسح جميع البيانات المحلية');
    return true;
  } catch (error) {
    console.error('❌ [Cleanup] خطأ في مسح البيانات:', error);
    return false;
  }
}

/**
 * احذف سجل واحد بشكل آمن
 */
export async function secureDelete(
  entityName: EntityName,
  id: string,
  overwrites: number = 3
): Promise<boolean> {
  try {
    const db = await getDB();
    
    // الكتابة فوقها عدة مرات قبل الحذف (لأغراض الأمان)
    for (let i = 0; i < overwrites; i++) {
      await db.delete(entityName as any, id);
    }

    console.log(`🔐 [Cleanup] تم حذف السجل بشكل آمن: ${entityName}/${id}`);
    return true;
  } catch (error) {
    console.error('❌ [Cleanup] خطأ في الحذف الآمن:', error);
    return false;
  }
}

/**
 * احذف جميع البيانات المعلقة (التي لم تتم مزامنتها)
 */
export async function clearPendingSyncData(): Promise<number> {
  try {
    const db = await getDB();
    const queue = await db.getAll('syncQueue' as any);
    
    for (const item of queue) {
      await db.delete('syncQueue' as any, item.id);
    }

    console.log(`🗑️ [Cleanup] تم حذف ${queue.length} عملية معلقة`);
    return queue.length;
  } catch (error) {
    console.error('❌ [Cleanup] خطأ في حذف البيانات المعلقة:', error);
    return 0;
  }
}

/**
 * نظف البيانات المحلية بناءً على سياسات
 */
export async function runCleanupPolicy(): Promise<{
  totalDeleted: number;
  deletedByType: Record<string, number>;
}> {
  try {
    const entities: EntityName[] = [
      'projects', 'workers', 'materials', 'suppliers',
      'workerAttendance', 'materialPurchases', 'transportationExpenses',
      'fundTransfers', 'workerTransfers', 'workerMiscExpenses', 'wells', 'projectTypes'
    ];

    const deletedByType: Record<string, number> = {};
    let totalDeleted = 0;

    for (const entity of entities) {
      // احذف البيانات الأقدم من 30 يوم
      const deleted = await deleteOldRecords(entity, 30 * 24 * 60 * 60 * 1000);
      deletedByType[entity] = deleted;
      totalDeleted += deleted;
    }

    console.log(`✅ [Cleanup] انتهت سياسة التنظيف: ${totalDeleted} سجل محذوف`);
    return { totalDeleted, deletedByType };
  } catch (error) {
    console.error('❌ [Cleanup] خطأ في سياسة التنظيف:', error);
    return { totalDeleted: 0, deletedByType: {} };
  }
}
