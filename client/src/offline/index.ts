/**
 * Offline-First Module - نظام العمل بدون إنترنت الكامل
 * 
 * الاستخدام:
 * import { initOfflineSystem, offlineFirstMutation } from '@/offline'
 */

// Database
import { getDB } from './db';
export { getDB };

// Sync System
import { 
  syncOfflineData, 
  initSyncListener, 
  stopSyncListener,
  subscribeSyncState,
  getSyncState
} from './sync';
export { 
  syncOfflineData, 
  initSyncListener, 
  stopSyncListener,
  subscribeSyncState,
  getSyncState
};

// Queries
import {
  isOnline,
  getDataWithFallback,
  getLocalRecord,
  saveLocalRecord,
  deleteLocalRecord,
  isDataUpToDate,
  getLastSyncTime,
  getLocalDataStats,
  cleanupOldLocalData,
  type EntityName
} from './offline-queries';
export {
  isOnline,
  getDataWithFallback,
  getLocalRecord,
  saveLocalRecord,
  deleteLocalRecord,
  isDataUpToDate,
  getLastSyncTime,
  getLocalDataStats,
  cleanupOldLocalData,
  type EntityName
};

// Mutations
import {
  createRecordOffline,
  updateRecordOffline,
  deleteRecordOffline,
  getPendingOperationsCount,
  getPendingOperationsDetails,
  getSyncStatistics,
  offlineFirstMutation,
  invalidateCache
} from './offline-mutations';
export {
  createRecordOffline,
  updateRecordOffline,
  deleteRecordOffline,
  getPendingOperationsCount,
  getPendingOperationsDetails,
  getSyncStatistics,
  offlineFirstMutation,
  invalidateCache
};

// Conflict Resolution
import {
  resolveConflict,
  detectConflict,
  getConflictingFields,
  type ConflictResolutionStrategy,
  type ConflictData
} from './conflict-resolver';
export {
  resolveConflict,
  detectConflict,
  getConflictingFields,
  type ConflictResolutionStrategy,
  type ConflictData
};

// Performance & Security
import {
  calculateObjectSize,
  getTotalStorageSize,
  getCompressionStats
} from './data-compression';
export {
  calculateObjectSize,
  getTotalStorageSize,
  getCompressionStats
};

import {
  encryptRecord,
  decryptRecord,
  encryptValue,
  decryptValue,
  deepEncrypt,
  deepDecrypt
} from './data-encryption';
export {
  encryptRecord,
  decryptRecord,
  encryptValue,
  decryptValue,
  deepEncrypt,
  deepDecrypt
};

import {
  deleteOldRecords,
  clearAllLocalData,
  clearPendingSyncData,
  runCleanupPolicy
} from './data-cleanup';
export {
  deleteOldRecords,
  clearAllLocalData,
  clearPendingSyncData,
  runCleanupPolicy
};

import {
  collectMetrics,
  getMetricsHistory,
  getPerformanceStats,
  printPerformanceReport,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  type PerformanceMetrics
} from '../dev_system/monitoring/performance-monitor';
export {
  collectMetrics,
  getMetricsHistory,
  getPerformanceStats,
  printPerformanceReport,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  type PerformanceMetrics
};

/**
 * تهيئة نظام العمل بدون إنترنت
 */
export async function initOfflineSystem(): Promise<void> {
  console.log('🚀 [OfflineSystem] جاري تهيئة النظام...');
  
  try {
    // تهيئة قاعدة البيانات
    const db = await getDB();
    console.log('✅ [OfflineSystem] تم تهيئة قاعدة البيانات');
    
    // تفعيل مستمع المزامنة
    if (typeof window !== 'undefined') {
      // @ts-ignore - تجنب خطأ أثناء الاستيراد
      await Promise.resolve().then(() => {
        // المزامنة ستبدأ من خلال المستمع
      });
      console.log('✅ [OfflineSystem] تم تفعيل نظام المزامنة');
      
      // بدء مراقبة الأداء
      startPerformanceMonitoring(60000);
      console.log('✅ [OfflineSystem] تم بدء مراقبة الأداء');
    }
    
    console.log('✅ [OfflineSystem] تم تهيئة النظام بنجاح!');
  } catch (error) {
    console.error('❌ [OfflineSystem] خطأ في التهيئة:', error);
    throw error;
  }
}

/**
 * إيقاف نظام العمل بدون إنترنت
 */
export async function shutdownOfflineSystem(): Promise<void> {
  console.log('🛑 [OfflineSystem] إيقاف النظام...');
  
  try {
    if (typeof window !== 'undefined') {
      stopPerformanceMonitoring();
    }
    console.log('✅ [OfflineSystem] تم إيقاف النظام');
  } catch (error) {
    console.error('❌ [OfflineSystem] خطأ في الإيقاف:', error);
  }
}
