import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';
import { getDB as getIDB, saveSyncedData as saveIDBSyncedData } from './db';

/**
 * دالة تهيئة التخزين الذكي
 */
export async function initializeStorage() {
  if (Capacitor.getPlatform() !== 'web') {
    await nativeStorage.initialize();
  } else {
    await getIDB();
  }
}

/**
 * جلب البيانات بشكل ذكي
 */
export async function smartGet(tableName: string, id: string) {
  if (Capacitor.getPlatform() !== 'web') {
    return await nativeStorage.get(tableName, id);
  } else {
    const db = await getIDB();
    return await db.get(tableName as any, id);
  }
}

/**
 * جلب جميع السجلات من جدول بشكل ذكي
 */
export async function smartGetAll(tableName: string): Promise<any[]> {
  if (Capacitor.getPlatform() !== 'web') {
    return await nativeStorage.getAll(tableName);
  } else {
    const db = await getIDB();
    return await db.getAll(tableName as any);
  }
}

/**
 * حفظ سجلات في الجدول المناسب
 */
export async function smartSave(tableName: string, records: any[]): Promise<number> {
  if (!records || records.length === 0) return 0;
  
  if (Capacitor.getPlatform() !== 'web') {
    let count = 0;
    for (const record of records) {
      if (record && (record.id || record.key)) {
        const id = (record.id || record.key).toString();
        await nativeStorage.set(tableName, id, record);
        count++;
      }
    }
    return count;
  } else {
    const { saveSyncedData } = await import('./db');
    return await saveSyncedData(tableName, records);
  }
}
