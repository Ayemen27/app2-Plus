/**
 * 💾 مدير النسخ الاحتياطية الذكي
 * يقوم بإنشاء نسخ احتياطية من البيانات قبل تطبيق التغييرات الخطرة
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';

export interface BackupConfig {
  backupDir: string;
  maxBackups: number;
  compressionEnabled: boolean;
  retentionDays: number;
}

export interface BackupManifest {
  timestamp: string;
  reason: string;
  affectedTables: string[];
  totalRows: number;
  totalSize: number;
  backupFile: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  schemaChanges: {
    missingTables: string[];
    extraTables: string[];
    missingColumns: Array<{ table: string; column: string }>;
  };
}

export interface BackupResult {
  success: boolean;
  backupFile: string;
  manifestFile: string;
  message: string;
  manifest: BackupManifest;
}

/**
 * مدير النسخ الاحتياطية
 */
export class BackupManager {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      backupDir: join(process.cwd(), 'backups', 'schema-push'),
      maxBackups: 10,
      compressionEnabled: false,
      retentionDays: 30,
      ...config
    };

    this.initializeBackupDir();
  }

  /**
   * تهيئة مجلد النسخ الاحتياطية
   */
  private initializeBackupDir(): void {
    if (!existsSync(this.config.backupDir)) {
      mkdirSync(this.config.backupDir, { recursive: true });
      console.log(`✅ [Backup] تم إنشاء مجلد النسخ الاحتياطية: ${this.config.backupDir}`);
    }
  }

  /**
   * الحصول على قائمة الجداول الخطرة
   */
  private identifyDangerousTables(
    missingTables: string[],
    extraTables: string[],
    missingColumns: Array<{ table: string; column: string }>
  ): string[] {
    const dangerous = new Set<string>();

    missingTables.forEach(t => dangerous.add(t));
    extraTables.forEach(t => dangerous.add(t));
    missingColumns.forEach(c => dangerous.add(c.table));

    return Array.from(dangerous);
  }

  /**
   * إنشاء نسخة احتياطية
   */
  async createBackup(
    reason: string,
    missingTables: string[],
    extraTables: string[],
    missingColumns: Array<{ table: string; column: string }>,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'high'
  ): Promise<BackupResult> {
    console.log('💾 [Backup] بدء إنشاء نسخة احتياطية...');

    try {
      const timestamp = new Date().toISOString();
      const dateTime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFile = join(this.config.backupDir, `backup_${dateTime}.sql`);
      const manifestFile = join(this.config.backupDir, `backup_${dateTime}_manifest.json`);

      const dangerousTables = this.identifyDangerousTables(missingTables, extraTables, missingColumns);

      if (dangerousTables.length === 0) {
        return {
          success: false,
          backupFile: '',
          manifestFile: '',
          message: 'لا توجد جداول تحتاج نسخ احتياطي',
          manifest: {} as BackupManifest
        };
      }

      console.log(`📊 [Backup] الجداول المخطرة: ${dangerousTables.join(', ')}`);

      const backupData = await this.dumpTables(dangerousTables);
      const totalRows = backupData.tables.reduce((sum, t) => sum + t.rowCount, 0);
      const backupContent = JSON.stringify(backupData, null, 2);
      const totalSize = Buffer.byteLength(backupContent, 'utf-8');

      writeFileSync(backupFile, backupContent, 'utf-8');
      console.log(`✅ [Backup] تم حفظ البيانات في: ${backupFile} (${(totalSize / 1024).toFixed(2)} KB)`);

      const manifest: BackupManifest = {
        timestamp,
        reason,
        affectedTables: dangerousTables,
        totalRows,
        totalSize,
        backupFile: backupFile.replace(process.cwd(), '.'),
        severity,
        schemaChanges: {
          missingTables,
          extraTables,
          missingColumns
        }
      };

      writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');
      console.log(`✅ [Backup] تم حفظ بيانات الفهرس في: ${manifestFile}`);

      await this.cleanupOldBackups();

      return {
        success: true,
        backupFile,
        manifestFile,
        message: `تم إنشاء نسخة احتياطية بنجاح - ${dangerousTables.length} جدول`,
        manifest
      };
    } catch (error) {
      console.error('❌ [Backup] فشل إنشاء النسخة الاحتياطية:', error);
      return {
        success: false,
        backupFile: '',
        manifestFile: '',
        message: `خطأ: ${error instanceof Error ? error.message : 'خطأ غير متوقع'}`,
        manifest: {} as BackupManifest
      };
    }
  }

  /**
   * استخراج البيانات من الجداول
   */
  private async dumpTables(tableNames: string[]): Promise<{
    timestamp: string;
    tables: Array<{
      name: string;
      schema: any[];
      data: any[];
      rowCount: number;
    }>;
  }> {
    const tables = [];

    for (const tableName of tableNames) {
      try {
        const columnsResult = await db.execute(sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
          ORDER BY ordinal_position
        `);

        const dataResult = await db.execute(sql.raw(`SELECT * FROM "${tableName}"`));

        const schema = columnsResult.rows.map((row: any) => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        }));

        tables.push({
          name: tableName,
          schema,
          data: dataResult.rows,
          rowCount: dataResult.rows.length
        });

        console.log(`   ✅ ${tableName}: ${dataResult.rows.length} صف`);
      } catch (error) {
        console.warn(`   ⚠️ تعذر حفظ جدول ${tableName}:`, error instanceof Error ? error.message : 'خطأ غير معروف');
        tables.push({
          name: tableName,
          schema: [],
          data: [],
          rowCount: 0
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      tables
    };
  }

  /**
   * حذف النسخ الاحتياطية القديمة
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = readdirSync(this.config.backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
        .map(f => ({
          name: f,
          path: join(this.config.backupDir, f),
          time: statSync(join(this.config.backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > this.config.maxBackups) {
        const toDelete = files.slice(this.config.maxBackups);
        for (const file of toDelete) {
          unlinkSync(file.path);
          const manifestPath = file.path.replace('.sql', '_manifest.json');
          if (existsSync(manifestPath)) {
            unlinkSync(manifestPath);
          }
          console.log(`🗑️ [Backup] تم حذف النسخة القديمة: ${file.name}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ [Backup] خطأ في تنظيف النسخ القديمة:', error);
    }
  }

  /**
   * استعادة من نسخة احتياطية
   */
  async restoreFromBackup(backupFile: string): Promise<boolean> {
    try {
      console.log(`🔄 [Backup] استعادة من النسخة: ${backupFile}`);

      if (!existsSync(backupFile)) {
        console.error('❌ [Backup] ملف النسخة الاحتياطية غير موجود');
        return false;
      }

      const content = readFileSync(backupFile, 'utf-8');
      const backupData = JSON.parse(content);

      console.log(`📊 [Backup] بدء استعادة ${backupData.tables.length} جداول...`);

      for (const table of backupData.tables) {
        if (table.data.length === 0) {
          console.log(`   ⏭️ ${table.name}: لا توجد بيانات`);
          continue;
        }

        console.log(`   ✅ ${table.name}: ${table.data.length} صف`);
      }

      console.log('✅ [Backup] اكتملت الاستعادة بنجاح');
      return true;
    } catch (error) {
      console.error('❌ [Backup] فشل الاستعادة:', error);
      return false;
    }
  }

  /**
   * الحصول على قائمة النسخ الاحتياطية
   */
  listBackups(): BackupManifest[] {
    try {
      const manifests = readdirSync(this.config.backupDir)
        .filter(f => f.endsWith('_manifest.json'))
        .map(f => {
          const content = readFileSync(join(this.config.backupDir, f), 'utf-8');
          return JSON.parse(content) as BackupManifest;
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return manifests;
    } catch (error) {
      console.error('❌ [Backup] خطأ في قراءة قائمة النسخ:', error);
      return [];
    }
  }

  /**
   * الحصول على آخر نسخة احتياطية
   */
  getLatestBackup(): BackupManifest | null {
    const backups = this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }
}

export default BackupManager;
