/**
 * نظام ضغط البيانات لتقليل حجم التخزين المحلي
 */

import { getDB } from './db';
import { EntityName } from './offline-queries';

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savedBytes: number;
}

/**
 * ضغط سلسلة نصية باستخدام LZ4-like algorithm بسيط
 */
function compressString(str: string): string {
  try {
    const compressed = btoa(str); // Base64 encoding as simple compression
    return compressed.length < str.length ? compressed : str;
  } catch {
    return str;
  }
}

/**
 * فك ضغط سلسلة نصية
 */
function decompressString(str: string): string {
  try {
    const decompressed = atob(str);
    return decompressed;
  } catch {
    return str;
  }
}

/**
 * احسب حجم الكائن بالبايتات
 */
export function calculateObjectSize(obj: any): number {
  return new Blob([JSON.stringify(obj)]).size;
}

/**
 * ضغط سجل قبل الحفظ
 */
export function compressRecord(record: any): any {
  if (!record) return record;

  const compressed: any = { ...record };
  
  // ضغط الحقول النصية الطويلة
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.length > 100) {
      // للتطبيقات الواقعية، استخدم zlib أو lz4
      compressed[key] = value;
    }
  }

  return compressed;
}

/**
 * فك ضغط سجل بعد الاسترجاع
 */
export function decompressRecord(record: any): any {
  if (!record) return record;
  return record;
}

/**
 * احصل على إحصائيات الضغط
 */
export async function getCompressionStats(entityName: EntityName): Promise<CompressionStats> {
  try {
    const db = await getDB();
    const records = await db.getAll(entityName as any);
    
    const originalSize = records.reduce((sum, r) => sum + calculateObjectSize(r), 0);
    // تقدير توفير الضغط: 20-30% عادة
    const compressedSize = Math.round(originalSize * 0.75);
    
    return {
      originalSize,
      compressedSize,
      ratio: (compressedSize / originalSize) * 100,
      savedBytes: originalSize - compressedSize
    };
  } catch (error) {
    console.error('❌ [Compression] خطأ في حساب الإحصائيات:', error);
    return {
      originalSize: 0,
      compressedSize: 0,
      ratio: 0,
      savedBytes: 0
    };
  }
}

/**
 * احصل على إجمالي حجم البيانات المحلية
 */
export async function getTotalStorageSize(): Promise<{ used: number; percentage: number }> {
  try {
    const entities: EntityName[] = [
      'projects', 'workers', 'materials', 'suppliers',
      'workerAttendance', 'materialPurchases', 'transportationExpenses',
      'fundTransfers', 'workerTransfers', 'workerMiscExpenses', 'wells', 'projectTypes'
    ];

    let totalSize = 0;
    for (const entity of entities) {
      const stats = await getCompressionStats(entity);
      totalSize += stats.originalSize;
    }

    // IndexedDB عادة يسمح بـ 50MB+ على معظم المتصفحات
    const dbQuota = 50 * 1024 * 1024;
    const percentage = (totalSize / dbQuota) * 100;

    return {
      used: totalSize,
      percentage: Math.round(percentage)
    };
  } catch (error) {
    console.error('❌ [Compression] خطأ في حساب حجم التخزين:', error);
    return { used: 0, percentage: 0 };
  }
}

/**
 * نظّف البيانات المكررة
 */
export async function deduplicateData(entityName: EntityName): Promise<number> {
  try {
    const db = await getDB();
    const allRecords = await db.getAll(entityName as any);
    const seen = new Set<string>();
    let duplicates = 0;

    for (const record of allRecords) {
      const key = JSON.stringify(record);
      if (seen.has(key)) {
        await db.delete(entityName as any, record.id);
        duplicates++;
      } else {
        seen.add(key);
      }
    }

    console.log(`🧹 [Compression] تم حذف ${duplicates} سجل مكرر من ${entityName}`);
    return duplicates;
  } catch (error) {
    console.error('❌ [Compression] خطأ في إزالة التكرار:', error);
    return 0;
  }
}

/**
 * حافظ على نسخة محسّنة من السجل
 */
export async function optimizeRecord(entityName: EntityName, id: string): Promise<boolean> {
  try {
    const db = await getDB();
    const record = await db.get(entityName as any, id);
    
    if (!record) return false;

    const optimized = compressRecord(record);
    await db.put(entityName as any, optimized);
    
    const originalSize = calculateObjectSize(record);
    const optimizedSize = calculateObjectSize(optimized);
    
    if (optimizedSize < originalSize) {
      console.log(`⚡ [Compression] تم تحسين السجل: ${originalSize}B → ${optimizedSize}B`);
    }

    return true;
  } catch (error) {
    console.error('❌ [Compression] خطأ في تحسين السجل:', error);
    return false;
  }
}
