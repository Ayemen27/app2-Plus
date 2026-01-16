# 🔌 Offline Support Module

توثيق الدعم الكامل للعمل بدون اتصال إنترنت باستخدام IndexedDB

---

## 📁 الملفات

### `db.ts` - Database Initialization
قاعدة البيانات المحلية باستخدام `idb` library.

**الـ Stores:**
- `syncQueue` - قائمة العمليات المعلقة للمزامنة
- `userData` - بيانات المستخدم المحلية
- `projects` - المشاريع
- `workers` - العمال
- `materials` - المواد
- `suppliers` - الموردون
- `expenses` - المصاريف

**الـ Functions:**
```typescript
await initializeDB()      // تهيئة أو فتح DB
await getDB()             // الحصول على instance
closeDB()                 // إغلاق DB
```

### `offline.ts` - Operations
دوال العمليات الأساسية للعمل بدون إنترنت.

**دوال Sync Queue:**
```typescript
await queueForSync(action, endpoint, payload)  // إضافة عملية للانتظار
await getPendingSyncQueue()                     // جلب العمليات المعلقة
await removeSyncQueueItem(id)                   // حذف عملية بعد المزامنة
await updateSyncRetries(id, retries, error)   // تحديث محاولات إعادة التجربة
```

**دوال البيانات المحلية:**
```typescript
await saveUserDataLocal(type, data)            // حفظ بيانات مستخدم
await getUserDataLocal(type)                   // جلب بيانات المستخدم
await saveListLocal(storeName, items)          // حفظ قائمة API
await getListLocal(storeName)                  // جلب القائمة المحلية
await getItemLocal(storeName, id)              // جلب عنصر واحد
await updateItemLocal(storeName, id, updates)  // تحديث عنصر
await addItemLocal(storeName, item)            // إضافة عنصر
await deleteItemLocal(storeName, id)           // حذف عنصر
await clearAllOfflineData()                    // مسح جميع البيانات
await getSyncStats()                           // إحصائيات العمليات المعلقة
```

---

## 🚀 الاستخدام

### 1. حفظ بيانات عند عدم الاتصال

```typescript
import { queueForSync } from '@/offline/offline';

// عند محاولة حفظ بيانات والإنترنت معطل
try {
  const response = await api.post('/api/expenses', expenseData);
  // نجح الإرسال
} catch (error) {
  if (!navigator.onLine) {
    // حفظ محلياً وأضفه للانتظار
    await queueForSync('create', '/api/expenses', expenseData);
    showToast({ title: 'تم الحفظ محلياً', description: 'سيتم المزامنة عند الاتصال' });
  }
}
```

### 2. حفظ قوائم API محلياً

```typescript
import { saveListLocal, getListLocal } from '@/offline/offline';

// عند جلب المشاريع
const projects = await api.get('/api/projects');
await saveListLocal('projects', projects);

// لاحقاً عند عدم الاتصال
const localProjects = await getListLocal('projects');
```

### 3. المزامنة عند العودة للإنترنت

```typescript
import { getPendingSyncQueue, removeSyncQueueItem } from '@/offline/offline';

// تشغيل مراقب الاتصال
window.addEventListener('online', async () => {
  const pending = await getPendingSyncQueue();
  
  for (const item of pending) {
    try {
      await api[item.action.toLowerCase()](item.endpoint, item.payload);
      await removeSyncQueueItem(item.id);
      console.log(`✅ تمت المزامنة: ${item.id}`);
    } catch (error) {
      console.error(`❌ فشل المزامنة: ${item.id}`, error);
    }
  }
});
```

---

## 📊 Data Types

### SyncQueueItem
```typescript
{
  id: string;                          // معرف فريد
  action: 'create' | 'update' | 'delete';  // نوع العملية
  endpoint: string;                    // مسار API
  payload: Record<string, any>;        // البيانات
  timestamp: number;                   // وقت الإضافة
  retries: number;                     // عدد محاولات إعادة التجربة
  lastError?: string;                  // آخر خطأ
}
```

### UserData
```typescript
{
  id: string;
  type: string;                        // نوع البيانات (expense, project, etc)
  data: Record<string, any>;          // البيانات الفعلية
  syncedAt: number;                   // آخر مزامنة
  createdAt: number;                  // وقت الإنشاء
}
```

---

## ⚙️ Configuration

قاعدة البيانات مهيأة في `initializeDB()` في `db.ts`.

**تفاصيل الإعدادات:**
- اسم DB: `binarjoin-db`
- الإصدار: `1`
- Stores: 7 متاجر

للتغيير أو الترقية:
1. عدّل الـ stores في `db.ts`
2. زيّد رقم الإصدار (`version`)
3. أضف منطق الترقية في `upgrade()` callback

---

## 🔄 Lifecycle

1. **التهيئة**: عند تحميل التطبيق (`main.tsx`)
2. **العملية العادية**: حفظ البيانات محلياً + إرسال API
3. **بدون إنترنت**: حفظ محلي فقط + إضافة للـ queue
4. **عند الاتصال**: مزامنة جميع العمليات المعلقة
5. **الـ Logout**: حذف جميع البيانات المحلية

---

## 🐛 Debugging

### عرض محتويات DB

```typescript
import { getDB } from '@/offline/db';

const db = await getDB();
const syncQueue = await db.getAll('syncQueue');
const projects = await db.getAll('projects');

console.log('Sync Queue:', syncQueue);
console.log('Projects:', projects);
```

### عرض في DevTools

```
F12 → Application → Storage → Indexed Databases → binarjoin-db
```

### مسح DB

```typescript
import { clearAllOfflineData } from '@/offline/offline';
await clearAllOfflineData();
```

---

## 📋 Checklist للاستخدام

- [ ] `initializeDB()` مستدعاة في `main.tsx`
- [ ] استيراد الدوال عند الحاجة
- [ ] معالجة أخطاء الاتصال بالـ try-catch
- [ ] استدعاء `queueForSync()` عند الفشل
- [ ] إعداد مراقب `online` للمزامنة
- [ ] اختبار الاتصال والـ offline modes

---

**آخر تحديث**: 24 ديسمبر 2025
