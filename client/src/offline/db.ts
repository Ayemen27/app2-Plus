import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';

/**
 * دالة ذكية لاختيار المحرك المناسب (SQLite للأندرويد حصراً)
 */
export async function getSmartStorage() {
  const platform = Capacitor.getPlatform();
  
  // 🚀 إجبار النظام على استخدام SQLite فقط وفقط في بيئة الأندرويد/iOS
  if (platform === 'android' || platform === 'ios') {
    try {
      console.log('📱 [DB] محاولة تهيئة محرك SQLite للأندرويد...');
      // التأكد من تهيئة المحرك قبل إرجاعه مع مهلة زمنية
      if (!(nativeStorage as any).db) {
        const initPromise = nativeStorage.initialize();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SQLite Initialization Timeout')), 5000)
        );
        await Promise.race([initPromise, timeoutPromise]);
      }
      console.log('✅ [DB] تم تهيئة محرك SQLite بنجاح');
      return nativeStorage;
    } catch (e) {
      console.error("🔴 SQLite Engine Critical Failure, falling back to IDB:", e);
      // Fallback to IndexedDB if SQLite fails to prevent app crash
      if (!dbInstance) {
        dbInstance = await initializeDB();
      }
      return dbInstance;
    }
  }
  
  // المتصفح (Web) يستخدم IndexedDB (الذي يدعمه openDB)
  if (!dbInstance) {
    dbInstance = await initializeDB();
  }
  return dbInstance;
}

/**
 * دالة مساعدة لضمان وجود Transaction آمنة
 */
export async function getSafeTransaction(storeNames: string | string[], mode: 'readonly' | 'readwrite' = 'readonly') {
  const db = await getDB();
  if (!db || typeof db.transaction !== 'function') {
    throw new Error('Database not initialized correctly or missing transaction method');
  }
  return db.transaction(storeNames, mode);
}

// تعريف schema قاعدة البيانات - مرآة كاملة 100% من الخادم (66 جدول)
export interface BinarJoinDB extends DBSchema {
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: 'create' | 'update' | 'delete';
      endpoint: string;
      payload: Record<string, any>;
      timestamp: number;
      retries: number;
      lastError?: string;
      errorType?: 'timeout' | 'network' | 'server' | 'validation' | 'unknown';
    };
  };
  syncMetadata: {
    key: string;
    value: {
      key: string;
      timestamp: number;
      version: string;
      recordCount: number;
      lastSyncTime?: number;
      tableList?: string[];
    };
  };
  // جميع جداول الخادم - 66 جدول
  users: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  authUserSessions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  emailVerificationTokens: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  passwordResetTokens: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  projectTypes: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  projects: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wells: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  fundTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerAttendance: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  suppliers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  materials: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  materialPurchases: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  supplierPayments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  transportationExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerBalances: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  dailyExpenseSummaries: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerTypes: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  autocompleteData: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerMiscExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  printSettings: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  projectFundTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicies: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicyImplementations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicySuggestions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicyViolations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  permissionAuditLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  userProjectPermissions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  materialCategories: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolCategories: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  tools: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolMovements: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolStock: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolReservations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolPurchaseItems: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolCostTracking: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolMaintenanceLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolUsageAnalytics: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  toolNotifications: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  maintenanceSchedules: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  maintenanceTasks: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellTasks: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellAuditLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellTaskAccounts: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  messages: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  channels: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  notifications: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  notificationReadStates: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  systemNotifications: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  systemEvents: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  actions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  aiChatSessions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  aiChatMessages: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  aiUsageStats: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  emergencyUsers: { key: string; value: Record<string, any> };
  buildDeployments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  approvals: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  transactions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  transactionLines: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  journals: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  accounts: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  accountBalances: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  financePayments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  financeEvents: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  reportTemplates: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  userData: { key: string; value: { id: string; type: string; data: any; syncedAt: number; createdAt: number } };
}

let dbInstance: IDBPDatabase<BinarJoinDB> | null = null;

// قائمة جميع الجداول (66 جدول)
const ALL_STORES = [
  'users', 'authUserSessions', 'emailVerificationTokens', 'passwordResetTokens',
  'projectTypes', 'projects', 'workers', 'wells', 'fundTransfers',
  'workerAttendance', 'suppliers', 'materials', 'materialPurchases',
  'supplierPayments', 'transportationExpenses', 'workerTransfers',
  'workerBalances', 'dailyExpenseSummaries', 'workerTypes', 'autocompleteData',
  'workerMiscExpenses', 'printSettings', 'projectFundTransfers',
  'securityPolicies', 'securityPolicyImplementations',
  'securityPolicySuggestions', 'securityPolicyViolations',
  'permissionAuditLogs', 'userProjectPermissions', 'materialCategories',
  'toolCategories', 'tools', 'toolMovements', 'toolStock', 'toolReservations',
  'toolPurchaseItems', 'toolCostTracking', 'toolMaintenanceLogs',
  'toolUsageAnalytics', 'toolNotifications', 'maintenanceSchedules',
  'maintenanceTasks', 'wellTasks', 'wellExpenses', 'wellAuditLogs',
  'wellTaskAccounts', 'messages', 'channels', 'notifications',
  'notificationReadStates', 'systemNotifications', 'systemEvents', 'actions',
  'aiChatSessions', 'aiChatMessages', 'aiUsageStats', 'buildDeployments',
  'approvals', 'transactions', 'transactionLines', 'journals', 'accounts',
  'accountBalances', 'financePayments', 'financeEvents', 'reportTemplates', 
  'emergencyUsers', 'syncQueue', 'syncMetadata', 'userData', 'autocompleteData'
] as const;

// فتح أو إنشاء قاعدة البيانات المحلية (مرآة 100% من الخادم)
export async function initializeDB(): Promise<IDBPDatabase<BinarJoinDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<BinarJoinDB>('binarjoin-db', 9, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`[DB] Upgrading from ${oldVersion} to ${newVersion}`);
        
        // التأكد من وجود جميع الجداول المطلوبة
        for (const storeName of ALL_STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            if (storeName === 'syncQueue') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('timestamp', 'timestamp');
              // @ts-ignore
              store.createIndex('action', 'action');
            } else if (storeName === 'userData') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('type', 'type');
            } else if (storeName === 'syncMetadata') {
              // @ts-ignore
              db.createObjectStore(storeName, { keyPath: 'key' });
            } else {
              // @ts-ignore
              const store = db.createObjectStore(storeName as any, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('createdAt', 'createdAt');
              // @ts-ignore
              store.createIndex('projectId', 'projectId');
              // @ts-ignore
              store.createIndex('synced', 'synced');
              // @ts-ignore
              store.createIndex('_pendingSync', '_pendingSync');
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("[DB] Critical initialization error:", error);
    throw error;
  }

  return dbInstance;
}

/**
 * الحصول على instance قاعدة البيانات (أو المحرك الأصلي)
 */
export async function getDB(): Promise<any> {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') {
    // في الأندرويد، نستخدم المحرك الأصلي دائماً
    const storage = await getSmartStorage();
    if (storage) return storage;
  }

  if (!dbInstance) {
    return await initializeDB();
  }
  return dbInstance;
}

/**
 * إغلاق قاعدة البيانات
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * حذف قاعدة البيانات بالكامل (للاستعادة)
 */
export async function deleteDB(): Promise<void> {
  closeDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('binarjoin-db');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * تحديث سجل مزامنة
 */
export async function updateSyncMetadata(key: string, metadata: Record<string, any>): Promise<void> {
  const db = await getDB();
  await db.put('syncMetadata', {
    key,
    timestamp: Date.now(),
    version: metadata.version || '3.0',
    recordCount: metadata.recordCount || 0,
    ...metadata
  });
}

/**
 * الحصول على آخر وقت مزامنة
 */
export async function getLastSyncTime(): Promise<number> {
  const db = await getDB();
  const metadata = await db.get('syncMetadata', 'lastSync');
  return metadata?.lastSyncTime || 0;
}

/**
 * حفظ بيانات من الخادم إلى محرك التخزين المناسب
 */
export async function saveSyncedData(tableName: string, records: any[]): Promise<number> {
  const storage = await getSmartStorage();
  
  if (storage) {
    // استخدام قاعدة البيانات الحقيقية (SQLite)
    let count = 0;
    for (const record of records) {
      if (record && record.id) {
        // التحقق من وجود الدالة قبل الاستدعاء لتجنب الانهيار
        if (storage && typeof (storage as any).set === 'function') {
          await (storage as any).set(tableName, record.id.toString(), record);
          count++;
        } else if (storage && typeof (storage as any).put === 'function') {
          await (storage as any).put(tableName, record);
          count++;
        }
      }
    }
    return count;
  }

  // Fallback to IndexedDB (Web)
  const db = await getDB();
  const tx = db.transaction(tableName as any, 'readwrite');
  const store = tx.objectStore(tableName as any);
  let count = 0;
  
  for (const record of records) {
    if (record && record.id) {
      await store.put(record);
      count++;
    }
  }
  
  await tx.done;
  return count;
}

/**
 * إضافة عملية إلى طابور المزامنة وتنفيذها محلياً فوراً
 */
export async function performLocalOperation(
  tableName: string,
  action: 'create' | 'update' | 'delete',
  payload: Record<string, any>,
  endpoint: string
): Promise<any> {
  const storage = await getSmartStorage();
  const id = payload.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
  const record = { ...payload, id, _isLocal: true, _pendingSync: true };

  if (storage) {
    // 🛠️ تنفيذ مباشر على SQLite الحقيقي
    if (action === 'delete') {
      await storage.delete(tableName, id);
    } else {
      await storage.set(tableName, id, record);
    }
    
    // إضافة للطابور في SQLite
    const queueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    await storage.set('syncQueue', queueId, {
      id: queueId,
      action,
      endpoint,
      payload: record,
      timestamp: Date.now(),
      retries: 0
    });
    
    console.log(`🚀 [SQLite] تم التنفيذ محلياً: ${action} على ${tableName}`);
    return record;
  }

  // Fallback to IndexedDB (Web)
  const db = await getDB();
  // 1. تنفيذ العملية محلياً فوراً (المصدر الأساسي للحقيقة)
  const tx = db.transaction([tableName as any, 'syncQueue'], 'readwrite');
  const store = tx.objectStore(tableName as any);
  const queueStore = tx.objectStore('syncQueue');

  if (action === 'delete') {
    await store.delete(id);
  } else {
    await store.put(record);
  }

  // 2. إضافة العملية إلى طابور المزامنة للخلفية
  await queueStore.put({
    id: crypto.randomUUID(),
    action,
    endpoint,
    payload: record,
    timestamp: Date.now(),
    retries: 0
  });

  await tx.done;
  
  console.log(`🚀 [IDB] تم التنفيذ محلياً: ${action} على ${tableName}`);
  return record;
}

/**
 * جلب قائمة محلية (تدمج البيانات السحابية مع التعديلات المحلية المعلقة)
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
  return items.sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * البحث عن عنصر محلي
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
 * حذف جميع البيانات من جدول معين
 */
export async function clearTable(tableName: string): Promise<void> {
  const db = await getDB();
  await db.clear(tableName as any);
}

// ⚠️ ملاحظة: استخدم clearAllLocalData() من data-cleanup.ts بدلاً من clearAllData()
// لتجنب التكرار والحفاظ على نظام موحد
