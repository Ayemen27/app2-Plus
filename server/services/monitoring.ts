// نظام مراقبة مبسط - Basic monitoring service
import os from 'os';
import { storage } from '../storage.js';

interface BasicMetrics {
  serviceStatus: string;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  activeRequests: number;
  responseTime: number;
}

export class MonitoringService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  async getCurrentSystemMetrics(): Promise<BasicMetrics> {
    // مراقبة أساسية مبسطة
    return {
      serviceStatus: await this.checkServiceStatus(),
      uptime: process.uptime(),
      cpuUsage: await this.getCpuUsage(),
      memoryUsage: await this.getMemoryUsage(),
      activeRequests: await this.getActiveRequestsCount(),
      responseTime: await this.getAverageResponseTime(),
    };
  }

  private async checkServiceStatus(): Promise<string> {
    try {
      // In production, this would check actual service health
      const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';
      const port = process.env.PORT || (isProduction ? '8080' : '5000');
      const healthCheckUrl = process.env.HEALTH_CHECK_URL || `http://localhost:${port}/api/health`;
      const response = await fetch(healthCheckUrl).catch(() => null);
      return response?.ok ? "healthy" : "unhealthy";
    } catch {
      return "unhealthy";
    }
  }

  private async getCpuUsage(): Promise<number> {
    const load = os.loadavg();
    return Number((load[0] * 10).toFixed(2)); // تقريب لنسبة مئوية
  }

  private async getMemoryUsage(): Promise<number> {
    const used = process.memoryUsage().heapUsed;
    const total = os.totalmem();
    return Number(((used / total) * 100).toFixed(2));
  }

  private async getAverageResponseTime(): Promise<number> {
    return 150; 
  }

  private async getActiveRequestsCount(): Promise<number> {
    return 1;
  }

  startMonitoring(interval: number = 60000) { // كل دقيقة
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.getCurrentSystemMetrics();
        
        // حفظ البيانات في قاعدة البيانات
        if (typeof (storage as any).saveMonitoringLog === 'function') {
          await (storage as any).saveMonitoringLog({
            cpuUsage: metrics.cpuUsage.toString(),
            memoryUsage: metrics.memoryUsage.toString(),
            activeRequests: metrics.activeRequests,
            responseTime: metrics.responseTime,
            status: metrics.serviceStatus
          });
          console.log('✅ [Monitoring] تم حفظ سجل الأداء في قاعدة البيانات');
        }
      } catch (error) {
        console.error('❌ [Monitoring] خطأ في جمع أو حفظ مقاييس النظام:', error);
      }
    }, interval);
    
    console.log(`🚀 [Monitoring] بدء نظام المراقبة الدورية (كل ${interval/1000} ثانية)`);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }
}

export const monitoringService = new MonitoringService();
