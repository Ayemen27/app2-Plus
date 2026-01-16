
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'app_mirror_db';
const DB_VERSION = 1;

export const TABLES = [
  'account_balances', 'accounts', 'actions', 'ai_chat_messages', 'ai_chat_sessions',
  'ai_usage_stats', 'approvals', 'auth_user_sessions', 'autocomplete_data',
  'build_deployments', 'channels', 'daily_expense_summaries', 'email_verification_tokens',
  'finance_events', 'finance_payments', 'fund_transfers', 'journals',
  'maintenance_schedules', 'maintenance_tasks', 'material_categories',
  'material_purchases', 'materials', 'messages', 'notification_read_states',
  'notifications', 'password_reset_tokens', 'permission_audit_logs', 'print_settings',
  'project_fund_transfers', 'projects', 'project_types', 'report_templates',
  'security_policies', 'security_policy_implementations', 'security_policy_suggestions',
  'security_policy_violations', 'supplier_payments', 'suppliers', 'system_events',
  'system_notifications', 'tool_categories', 'tool_cost_tracking', 'tool_maintenance_logs',
  'tool_movements', 'tool_notifications', 'tool_purchase_items', 'tool_reservations',
  'tools', 'tool_stock', 'tool_stock_items', 'tool_usage_analytics', 'transaction_lines',
  'transactions', 'transportation_expenses', 'user_project_permissions', 'users',
  'well_audit_logs', 'well_expenses', 'wells', 'well_task_accounts', 'well_tasks',
  'worker_attendance', 'worker_balances', 'worker_misc_expenses', 'workers',
  'worker_transfers', 'worker_types'
];

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        TABLES.forEach(table => {
          if (!db.objectStoreNames.contains(table)) {
            db.createObjectStore(table, { keyPath: 'id' });
          }
        });
      },
    });
  }
  return dbPromise;
};

export const syncAllToIndexedDB = async (data: Record<string, any[]>) => {
  const db = await getDB();
  const tx = db.transaction(TABLES, 'readwrite');
  
  await Promise.all([
    ...TABLES.map(table => {
      const store = tx.objectStore(table);
      const tableData = data[table] || [];
      return Promise.all([
        store.clear(),
        ...tableData.map(item => store.put(item))
      ]);
    }),
    tx.done
  ]);
  
  localStorage.setItem('last_full_sync', Date.now().toString());
};

export const getDataWithFallback = async <T>(table: string, fetchFn: () => Promise<T>): Promise<T> => {
  try {
    // محاولة جلب البيانات من الخادم أولاً
    const data = await fetchFn();
    
    // تحديث النسخة المحلية في IndexedDB للرجوع إليها مستقبلاً
    const db = await getDB();
    if (Array.isArray(data)) {
      const tx = db.transaction(table, 'readwrite');
      const store = tx.objectStore(table);
      await store.clear();
      await Promise.all(data.map(item => store.put(item)));
      await tx.done;
    }
    
    return data;
  } catch (error) {
    console.warn(`⚠️ [Fallback] فشل الاتصال بالخادم للجدول ${table}، جاري استخدام IndexedDB:`, error);
    
    // إذا فشل الخادم، جلب البيانات من IndexedDB
    const db = await getDB();
    const localData = await db.getAll(table);
    
    if (localData && localData.length > 0) {
      return localData as unknown as T;
    }
    
    // إذا لم تكن هناك بيانات محلية أيضاً، ألقِ الخطأ الأصلي
    throw error;
  }
};
