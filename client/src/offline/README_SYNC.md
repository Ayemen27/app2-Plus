# 🔄 Smart Sync Module - المزامنة الذكية

توثيق محرك المزامنة التلقائي للبيانات المحلية

---

## 📁 الملفات

### `sync.ts` - Sync Engine
محرك المزامنة الذكي - يراقب الاتصال ويمزامن البيانات تلقائياً.

**الـ Functions الرئيسية:**
```typescript
// بدء المزامنة اليدوية
await syncOfflineData()

// تهيئة مراقب الاتصال (استدعى مرة واحدة)
initSyncListener()

// الاشتراك في تحديثات الحالة
const unsubscribe = subscribeSyncState((state) => {
  console.log('Sync state updated:', state);
});

// الحصول على حالة المزامنة الحالية
const state = getSyncState()

// إعادة محاولة عملية معينة
await retrySyncItem(itemId)

// مسح قائمة الانتظار يدويًا
await clearSyncQueue()

// جدولة مزامنة دورية
const stopPeriodicSync = schedulePeriodicSync(30000) // كل 30 ثانية
```

### `hooks/useSyncData.ts` - React Hook
React hook لمراقبة حالة المزامنة والاتصال.

**الـ Hook:**
```typescript
const {
  isSyncing,      // هل جاري المزامنة الآن
  offlineCount,   // عدد العمليات المعلقة
  lastSync,       // وقت آخر مزامنة
  lastError,      // آخر خطأ
  isOnline,       // هل الاتصال متصل
  manualSync      // دالة للمزامنة اليدوية
} = useSyncData()
```

**Component مدمج:**
```typescript
<SyncStatus />  // يعرض حالة الاتصال والمزامنة
```

---

## 🚀 الاستخدام

### 1. التهيئة (مرة واحدة)

في `App.tsx` أو عند تحميل التطبيق:

```typescript
import { initSyncListener } from '@/offline/sync';

useEffect(() => {
  // تهيئة مراقب الاتصال
  initSyncListener();
}, []);
```

### 2. في Components

```typescript
import { useSyncData, SyncStatus } from '@/hooks/useSyncData';

function MyComponent() {
  const { isSyncing, offlineCount, isOnline } = useSyncData();

  return (
    <>
      {!isOnline && <div>❌ بدون إنترنت</div>}
      {isSyncing && <div>🔄 جاري المزامنة...</div>}
      {offlineCount > 0 && <div>⏳ {offlineCount} عملية معلقة</div>}
      
      <SyncStatus />  {/* عرض حالة الاتصال */}
    </>
  );
}
```

### 3. عند الحفظ بدون إنترنت

```typescript
import { queueForSync } from '@/offline/offline';
import { syncOfflineData } from '@/offline/sync';

async function saveExpense(expenseData) {
  try {
    if (!navigator.onLine) {
      // حفظ محليًا فقط
      await queueForSync('create', '/api/expenses', expenseData);
      toast.info('تم الحفظ محليًا - سيتم المزامنة عند الاتصال');
    } else {
      // إرسال فوري
      const response = await api.post('/api/expenses', expenseData);
      toast.success('تم الحفظ بنجاح');
    }
  } catch (error) {
    // حفظ محليًا كـ backup
    await queueForSync('create', '/api/expenses', expenseData);
    toast.warning('حدث خطأ - تم الحفظ محليًا');
  }
}
```

---

## 🔄 Lifecycle

```
User Action
    ↓
[Check Online]
    ├─ Online  → API + Save Local + Update UI
    └─ Offline → Save Local + Add Queue + Update UI
                    ↓
            [Wait for Connection]
                    ↓
            [User Returns Online]
                    ↓
            [auto-trigger syncOfflineData]
                    ↓
            [Retry Queue Items]
                    ├─ Success → Remove from Queue
                    └─ Failure → Retry (max 3x)
                    ↓
            [Update UI + Notify User]
```

---

## 📊 Data Flow

### عند الحفظ

1. المستخدم يحفظ بيانات
2. تتحقق من الاتصال:
   - **Online**: إرسال مباشر + حفظ محلي
   - **Offline**: حفظ محلي + إضافة للـ Queue

3. إذا فشل الإرسال:
   - إضافة للـ Queue للمحاولة لاحقاً
   - إشعار للمستخدم

### عند العودة للإنترنت

1. Window 'online' event يُطلق
2. `syncOfflineData()` يبدأ تلقائياً
3. لكل عملية في الـ Queue:
   - محاولة الإرسال
   - إذا نجح: حذف من الـ Queue
   - إذا فشل: إعادة المحاولة (حد أقصى 3)
4. إخطار المستخدم بالنتيجة

---

## ⚙️ Configuration

### Max Retries
```typescript
// في sync.ts
const MAX_RETRIES = 3;
```
تغيير هذا الرقم لزيادة/تقليل عدد المحاولات.

### Retry Delay
```typescript
const RETRY_DELAY = 2000; // 2 ثوان
```

### Periodic Sync Interval
```typescript
schedulePeriodicSync(30000) // كل 30 ثانية
```

---

## 🔍 Debugging

### عرض حالة المزامنة

```typescript
import { getSyncState } from '@/offline/sync';

const state = getSyncState();
console.log('Current sync state:', state);
```

### عرض العمليات المعلقة

```typescript
import { getPendingSyncQueue } from '@/offline/offline';

const pending = await getPendingSyncQueue();
console.log('Pending operations:', pending);
```

### في DevTools

```
F12 → Console
await (await import('@/offline/offline')).getPendingSyncQueue()
```

### تفعيل/تعطيل Offline

```
F12 → Network tab → Offline (checkbox)
```

---

## 🛠️ Troubleshooting

### العمليات لا تمزامن

1. تحقق من `initSyncListener()` مستدعاة
2. تحقق من النت متصل: `console.log(navigator.onLine)`
3. تحقق من الـ token محفوظ
4. افتح DevTools Console للأخطاء

### الأخطاء في الـ Console

```typescript
[Sync] مزامنة أخرى قيد التقدم
// → انتظر انتهاء المزامنة الأولى

[Sync] خطأ في الشبكة
// → تحقق من الاتصال وحاول مرة أخرى

[Sync] فشلت العملية بعد 3 محاولات
// → يدويًا: retrySyncItem(itemId)
```

---

## 📝 Checklist للتطبيق

- [ ] استدعاء `initSyncListener()` عند تحميل التطبيق
- [ ] استخدام `useSyncData()` في الصفحات المناسبة
- [ ] عرض `<SyncStatus />` في مكان واضح
- [ ] اختبار بـ Offline mode
- [ ] اختبار إعادة الاتصال
- [ ] التعامل مع الأخطاء بشكل صحيح

---

**آخر تحديث**: 24 ديسمبر 2025
