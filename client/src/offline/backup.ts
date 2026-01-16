import { getDB, BinarJoinDB } from './db';

/**
 * تصدير جميع البيانات المحلية إلى ملف JSON
 */
export async function exportLocalData(): Promise<string> {
  const db = await getDB();
  const stores: (keyof BinarJoinDB)[] = ['syncQueue', 'userData', 'projects', 'workers', 'materials', 'suppliers', 'expenses'];
  const exportData: Record<string, any> = {};

  for (const store of stores) {
    const tx = db.transaction(store as any, 'readonly');
    const objectStore = tx.objectStore(store as any);
    exportData[store] = await objectStore.getAll();
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `binarjoin-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return 'تم تصدير البيانات بنجاح';
}

/**
 * استيراد البيانات من ملف JSON
 */
export async function importLocalData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    const db = await getDB();
    const stores = Object.keys(data);

    for (const storeName of stores) {
      const tx = db.transaction(storeName as any, 'readwrite');
      const store = tx.objectStore(storeName as any);
      
      // مسح البيانات الحالية
      await store.clear();
      
      // إضافة البيانات الجديدة
      const items = data[storeName];
      if (Array.isArray(items)) {
        for (const item of items) {
          await store.put(item);
        }
      }
      
      await tx.done;
    }
    
    console.log('[Offline] تم استيراد البيانات بنجاح');
  } catch (error) {
    console.error('[Offline] خطأ في استيراد البيانات:', error);
    throw new Error('فشل استيراد البيانات: تنسيق غير صالح');
  }
}
