import { getDB, BinarJoinDB } from './db';
import { v4 as uuidv4 } from 'uuid';

/**
 * حفظ عملية في قائمة الانتظار للمزامنة لاحقاً
 */
export async function queueForSync(
  action: 'create' | 'update' | 'delete',
  endpoint: string,
  payload: Record<string, any>
): Promise<string> {
  const db = await getDB();
  const id = uuidv4();

  const queueItem = {
    id,
    action,
    endpoint,
    payload,
    timestamp: Date.now(),
    retries: 0,
    lastError: undefined
  };

  await db.add('syncQueue', queueItem);
  console.log(`[Offline] تم إضافة عملية إلى قائمة الانتظار: ${id}`);

  return id;
}

/**
 * جلب جميع العمليات المعلقة من قائمة الانتظار
 */
export async function getPendingSyncQueue() {
  const db = await getDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const store = tx.objectStore('syncQueue');
  const allItems = await store.getAll();
  return (allItems as any[]).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * إزالة عملية من قائمة الانتظار بعد المزامنة الناجحة
 */
export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
  console.log(`[Offline] تم حذف عملية من قائمة الانتظار: ${id}`);
}

/**
 * تحديث عدد محاولات إعادة التجربة
 */
export async function updateSyncRetries(
  id: string,
  retries: number,
  error?: string,
  errorType?: string
): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  
  if (item) {
    item.retries = retries;
    if (error) {
      item.lastError = error;
    }
    if (errorType) {
      item.errorType = errorType as any;
    }
    await db.put('syncQueue', item);
  }
}

/**
 * إلغاء عملية معلقة
 */
export async function cancelSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
  console.log(`[Offline] تم إلغاء عملية من قائمة الانتظار: ${id}`);
}

/**
 * إلغاء جميع العمليات المعلقة
 */
export async function cancelAllSyncQueueItems(): Promise<number> {
  const db = await getDB();
  const items = await getPendingSyncQueue();
  const count = items.length;
  
  const tx = db.transaction('syncQueue', 'readwrite');
  await tx.objectStore('syncQueue').clear();
  await tx.done;
  
  console.log(`[Offline] تم إلغاء جميع العمليات المعلقة: ${count} عملية`);
  return count;
}

/**
 * حفظ بيانات محلية بسرعة (قبل إرسالها للـ API)
 */
export async function saveUserDataLocal(
  type: string,
  data: Record<string, any>
): Promise<string> {
  const db = await getDB();
  const id = data.id || uuidv4();

  // @ts-ignore
  const userData = {
    id,
    type,
    data,
    syncedAt: 0,
    createdAt: Date.now()
  };

  // @ts-ignore
  await db.put('userData', userData);
  console.log(`[Offline] تم حفظ بيانات محلية: ${type}/${id}`);

  return id;
}

/**
 * جلب بيانات محلية حسب النوع
 */
export async function getUserDataLocal(type: string) {
  const db = await getDB();
  // @ts-ignore
  const tx = db.transaction('userData', 'readonly');
  // @ts-ignore
  const store = tx.objectStore('userData');
  // @ts-ignore
  const index = store.index('type');
  // @ts-ignore
  return await index.getAll(type);
}

/**
 * حفظ قائمة API (projects, workers, etc) محلياً
 */
export async function saveListLocal(
  storeName: 'projects' | 'workers' | 'materials' | 'suppliers' | 'expenses',
  items: Record<string, any>[],
  metadata?: { syncedAt: number; totalCount: number }
): Promise<void> {
  const db = await getDB();
  // @ts-ignore
  const tx = db.transaction(storeName as any, 'readwrite');

  // حذف البيانات القديمة
  const store = tx.objectStore(storeName as any);
  const allKeys = await store.getAllKeys();
  for (const key of allKeys) {
    await store.delete(key);
  }

  // إضافة البيانات الجديدة
  for (const item of items) {
    await store.put({
      ...item,
      createdAt: item.createdAt || Date.now(),
      _syncedAt: metadata?.syncedAt || Date.now()
    });
  }

  await tx.done;
  console.log(`[Offline] تم حفظ ${items.length} عنصر من ${storeName}`);
}

/**
 * جلب قائمة محلية (تدمج البيانات السحابية مع التعديلات المحلية المعلقة)
 * @deprecated استخدم getListLocal من db.ts بدلاً من ذلك
 */
export async function getListLocal(
  storeName: keyof BinarJoinDB
) {
  const db = await getDB();
  // @ts-ignore
  const tx = db.transaction(storeName as any, 'readonly');
  const store = tx.objectStore(storeName as any);
  const items = await store.getAll();
  
  // ترتيب تنازلي حسب تاريخ الإنشاء لضمان ظهور الأحدث أولاً
  return (items as any[]).sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * البحث عن عنصر محلي
 * @deprecated استخدم getItemLocal من db.ts بدلاً من ذلك
 */
export async function getItemLocal(
  storeName: keyof BinarJoinDB,
  id: string
) {
  const db = await getDB();
  // @ts-ignore
  return await db.get(storeName as any, id);
}

/**
 * تحديث عنصر محلي
 */
export async function updateItemLocal(
  storeName: keyof BinarJoinDB,
  id: string,
  updates: Record<string, any>
): Promise<void> {
  const db = await getDB();
  // @ts-ignore
  const item = await db.get(storeName as any, id);

  if (item) {
    const updated = {
      ...item,
      ...updates,
      _updatedAt: Date.now()
    };
    // @ts-ignore
    await db.put(storeName as any, updated);
    console.log(`[Offline] تم تحديث عنصر محلي: ${String(storeName)}/${id}`);
  }
}

/**
 * إضافة عنصر محلي فورياً مع وسمه للمزامنة
 */
export async function addLocalFirst(
  storeName: keyof BinarJoinDB,
  item: Record<string, any>,
  endpoint: string
): Promise<string> {
  const db = await getDB();
  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  const id = item.id || uuidv4();
  
  const newItem = {
    ...item,
    id,
    _isLocal: true,
    _pendingSync: true,
    createdAt: item.createdAt || new Date().toISOString()
  };

  // 1. الكتابة الفورية في الجدول المحلي
  await db.put(storeName as any, newItem);
  
  // 2. إضافة لجدول المزامنة
  await queueForSync('create', endpoint, newItem);
  
  console.log(`[Offline-First] تم الحفظ محلياً: ${storeName}/${id}`);
  return id;
}

/**
 * تحديث محلي فوري
 */
export async function updateLocalFirst(
  storeName: keyof BinarJoinDB,
  id: string,
  updates: Record<string, any>,
  endpoint: string
): Promise<void> {
  const db = await getDB();
  const item = await db.get(storeName as any, id);
  
  if (item) {
    const updatedItem = {
      ...item,
      ...updates,
      _pendingSync: true,
      updatedAt: new Date().toISOString()
    };
    
    await db.put(storeName as any, updatedItem);
    await queueForSync('update', `${endpoint}/${id}`, updates);
    console.log(`[Offline-First] تم التحديث محلياً: ${storeName}/${id}`);
  }
}

// ⚠️ ملاحظة: استخدم clearAllLocalData() من data-cleanup.ts بدلاً من clearAllOfflineData()
// لتجنب التكرار والحفاظ على نظام موحد

/**
 * الحصول على إحصائيات العمليات المعلقة
 */
export async function getSyncStats() {
  const db = await getDB();
  const pendingCount = await db.count('syncQueue');
  const userDataCount = await db.count('userData');

  return {
    pendingSync: pendingCount,
    localUserData: userDataCount,
    lastUpdate: Date.now()
  };
}
