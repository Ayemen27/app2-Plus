/**
 * نظام مراقبة الأداء والإحصائيات
 */

import { getSyncState } from '../../offline/sync';
import { getTotalStorageSize } from '../../offline/data-compression';
import { getPendingOperationsCount, getSyncStatistics } from '../../offline/offline-mutations';

export interface PerformanceMetrics {
  timestamp: number;
  syncStatus: {
    isSyncing: boolean;
    lastSync: number;
    pendingCount: number;
    isOnline: boolean;
  };
  storage: {
    used: number;
    usagePercentage: number;
  };
  operations: {
    pending: number;
    creates: number;
    updates: number;
    deletes: number;
    failedOps: number;
  };
  timing: {
    lastSyncDuration?: number;
  };
}

const metrics: PerformanceMetrics[] = [];
const MAX_METRICS_HISTORY = 100;
let lastSyncStartTime: number | null = null;

/**
 * ابدأ قياس المزامنة
 */
export function startSyncMeasurement(): void {
  lastSyncStartTime = Date.now();
}

/**
 * انتهي من قياس المزامنة
 */
export function endSyncMeasurement(): number {
  if (!lastSyncStartTime) return 0;
  const duration = Date.now() - lastSyncStartTime;
  lastSyncStartTime = null;
  return duration;
}

/**
 * احمّع مقاييس الأداء الحالية
 */
export async function collectMetrics(): Promise<PerformanceMetrics> {
  const syncState = getSyncState();
  const storage = await getTotalStorageSize();
  const pendingOps = await getPendingOperationsCount();
  const syncStats = await getSyncStatistics();

  const metric: PerformanceMetrics = {
    timestamp: Date.now(),
    syncStatus: {
      isSyncing: syncState.isSyncing,
      lastSync: syncState.lastSync,
      pendingCount: syncState.pendingCount,
      isOnline: syncState.isOnline
    },
    storage: {
      used: storage.used,
      usagePercentage: storage.percentage
    },
    operations: {
      pending: pendingOps,
      creates: syncStats.creates,
      updates: syncStats.updates,
      deletes: syncStats.deletes,
      failedOps: syncStats.failedOperations
    },
    timing: {
      lastSyncDuration: lastSyncStartTime ? Date.now() - lastSyncStartTime : undefined
    }
  };

  metrics.push(metric);
  if (metrics.length > MAX_METRICS_HISTORY) {
    metrics.shift();
  }

  return metric;
}

/**
 * احصل على المقاييس المحفوظة
 */
export function getMetricsHistory(): PerformanceMetrics[] {
  return [...metrics];
}

/**
 * احصل على إحصائيات الأداء
 */
export function getPerformanceStats() {
  if (metrics.length === 0) {
    return null;
  }

  const avgStorageUsage = metrics.reduce((sum, m) => sum + m.storage.usagePercentage, 0) / metrics.length;
  const avgPendingOps = metrics.reduce((sum, m) => sum + m.operations.pending, 0) / metrics.length;
  const maxStorageUsage = Math.max(...metrics.map(m => m.storage.usagePercentage));
  const maxPendingOps = Math.max(...metrics.map(m => m.operations.pending));
  const onlineTime = metrics.filter(m => m.syncStatus.isOnline).length;
  const uptime = (onlineTime / metrics.length) * 100;

  return {
    avgStorageUsage: Math.round(avgStorageUsage),
    maxStorageUsage,
    avgPendingOps: Math.round(avgPendingOps),
    maxPendingOps,
    uptime: Math.round(uptime),
    metricsCollected: metrics.length,
    periodMs: metrics[metrics.length - 1]?.timestamp - metrics[0]?.timestamp
  };
}

/**
 * اطبع تقرير الأداء
 */
export async function printPerformanceReport(): Promise<void> {
  const metric = await collectMetrics();
  const stats = getPerformanceStats();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   📊 تقرير الأداء                          ║
╠════════════════════════════════════════════════════════════╣
║ حالة المزامنة:
║   - جاري المزامنة: ${metric.syncStatus.isSyncing ? 'نعم' : 'لا'}
║   - آخر مزامنة: ${new Date(metric.syncStatus.lastSync).toLocaleTimeString('ar-SA')}
║   - عمليات معلقة: ${metric.syncStatus.pendingCount}
║   - الاتصال: ${metric.syncStatus.isOnline ? '✅ متصل' : '❌ غير متصل'}
║
║ التخزين:
║   - الحجم المستخدم: ${(metric.storage.used / 1024 / 1024).toFixed(2)}MB
║   - النسبة المستخدمة: ${metric.storage.usagePercentage}%
║
║ العمليات:
║   - الإنشاء: ${metric.operations.creates}
║   - التحديث: ${metric.operations.updates}
║   - الحذف: ${metric.operations.deletes}
║   - فاشلة: ${metric.operations.failedOps}
║
${stats ? `║ الإحصائيات:
║   - متوسط الاستخدام: ${stats.avgStorageUsage}%
║   - أقصى استخدام: ${stats.maxStorageUsage}%
║   - وقت التشغيل: ${stats.uptime}%
║   - المدة المراقبة: ${Math.round(stats.periodMs / 1000)}s
` : ''}║
╚════════════════════════════════════════════════════════════╝
  `);
}

/**
 * مراقب الأداء الدوري
 */
let monitorInterval: NodeJS.Timeout | null = null;

export function startPerformanceMonitoring(intervalMs: number = 60000): void {
  if (monitorInterval) {
    console.warn('⚠️ [PerformanceMonitor] المراقبة جارية بالفعل');
    return;
  }

  monitorInterval = setInterval(async () => {
    const metric = await collectMetrics();
    
    if (metric.storage.usagePercentage > 80) {
      console.warn(`⚠️ [PerformanceMonitor] استخدام التخزين عالي: ${metric.storage.usagePercentage}%`);
    }

    if (metric.operations.failedOps > 5) {
      console.warn(`⚠️ [PerformanceMonitor] عمليات فاشلة: ${metric.operations.failedOps}`);
    }
  }, intervalMs);

  console.log('✅ [PerformanceMonitor] بدء المراقبة الدورية');
}

export function stopPerformanceMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('🛑 [PerformanceMonitor] توقف المراقبة');
  }
}
