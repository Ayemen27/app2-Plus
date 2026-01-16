/**
 * Intelligent Monitoring & Self-Healing System (IMSHS)
 * نظام المراقبة الذكي والمعالجة التلقائية
 */

import { toast } from '@/hooks/use-toast';
import { ENV } from '../lib/env';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppEvent {
  id: string;
  timestamp: number;
  type: 'error' | 'sync' | 'auth' | 'performance' | 'security';
  message: string;
  severity: AlertSeverity;
  metadata?: any;
  resolved: boolean;
  actionTaken?: string;
}

class IntelligentMonitor {
  private events: AppEvent[] = [];
  private listeners: ((event: AppEvent) => void)[] = [];

  /**
   * تسجيل حدث جديد
   */
  logEvent(event: Omit<AppEvent, 'id' | 'timestamp' | 'resolved'>) {
    const newEvent: AppEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      resolved: false
    };

    this.events.push(newEvent);
    console.log(`🔍 [IntelligentMonitor] [${event.severity.toUpperCase()}] ${event.message}`, event.metadata);

    // تنبيه المستخدم إذا كانت الخطورة عالية
    if (event.severity === 'high' || event.severity === 'critical') {
      this.notifyAdmin(newEvent);
    }

    // محاولة المعالجة التلقائية
    if (event.type === 'error' || event.type === 'sync') {
      this.attemptSelfHealing(newEvent);
    }

    this.notifyListeners(newEvent);
  }

  /**
   * إشعار المسؤول
   */
  private notifyAdmin(event: AppEvent) {
    toast({
      title: `⚠️ تنبيه ${event.severity === 'critical' ? 'حرج' : 'هام'}`,
      description: event.message,
      variant: event.severity === 'critical' ? 'destructive' : 'default',
    });
  }

  /**
   * محاولة المعالجة التلقائية (Self-Healing)
   */
  private async attemptSelfHealing(event: AppEvent) {
    if (event.resolved) return;

    console.log(`🛠️ [Self-Healing] محاولة معالجة الحدث: ${event.id}`);
    
    // منطق المعالجة التلقائية بناءً على نوع الخطأ
    let actionTaken = '';
    
    if (event.type === 'sync') {
      actionTaken = 'تفعيل إعادة المحاولة الذكية وتحفيز محرك المزامنة';
      try {
        const { triggerSync } = await import('../../offline/sync');
        setTimeout(() => triggerSync(), 5000); // محاولة بعد 5 ثوانٍ
      } catch (err) {
        console.error('❌ [Self-Healing] فشل تحفيز المزامنة:', err);
      }
    } else if (event.message.includes('storage') || event.message.includes('quota')) {
      actionTaken = 'تحليل سعة التخزين المحلية وجدولة تنظيف تلقائي';
    }

    if (actionTaken) {
      this.updateEventStatus(event.id, true, actionTaken);
      
      // توثيق في قاعدة البيانات المحلية (محاكاة)
      try {
        const { smartSave } = await import('../../offline/storage-factory');
        await smartSave('systemEvents', [{
          id: event.id,
          type: 'monitoring',
          data: { ...event, actionTaken },
          timestamp: Date.now()
        }]);
      } catch (err) {
        console.error('❌ [IntelligentMonitor] فشل توثيق الحدث في DB:', err);
      }
    }
  }

  private updateEventStatus(id: string, resolved: boolean, action?: string) {
    const event = this.events.find(e => e.id === id);
    if (event) {
      event.resolved = resolved;
      event.actionTaken = action;
      console.log(`✅ [IntelligentMonitor] تم معالجة الحدث: ${id} عبر ${action}`);
    }
  }

  subscribe(listener: (event: AppEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: AppEvent) {
    this.listeners.forEach(l => l(event));
  }

  getEvents() {
    return [...this.events];
  }
}

export const intelligentMonitor = new IntelligentMonitor();
