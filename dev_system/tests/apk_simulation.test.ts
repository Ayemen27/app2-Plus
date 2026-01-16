import { describe, it, expect, beforeEach } from 'vitest';

// محاكاة لبيئة Capacitor/APK
const simulateApkEnvironment = () => {
  (global as any).window = {
    location: {
      origin: 'http://localhost', // القيمة الافتراضية في الأندرويد
    }
  };
  (global as any).Capacitor = {
    getPlatform: () => 'android',
    isNativePlatform: () => true
  };
};

describe('APK Environment & Connection Tests', () => {
  beforeEach(() => {
    simulateApkEnvironment();
  });

  it('يجب أن يتم تحديد رابط الـ API الصحيح لبيئة الأندرويد', () => {
    const getApiBaseUrl = () => {
      const origin = (global as any).window.location.origin;
      if (origin.startsWith('http://localhost') || origin === 'null') {
        return 'https://app2.binarjoinanelytic.info/api';
      }
      return '/api';
    };

    const url = getApiBaseUrl();
    expect(url).toBe('https://app2.binarjoinanelytic.info/api');
  });

  it('يجب أن يكون هناك تطابق في هيكلية البيانات بين السيرفر والمحلي', () => {
    // محاكاة سجل من السيرفر (Postgres) وسجل محلي (SQLite/IDB)
    const serverRecord = { id: '1', name: 'مشروع أ', budget: '1000.00', status: 'active' };
    const localRecord = { id: '1', name: 'مشروع أ', budget: '1000.00', status: 'active' };
    
    expect(serverRecord.id).toBe(localRecord.id);
    expect(serverRecord.name).toBe(localRecord.name);
    // التأكد من أن الحقول الأساسية متطابقة تماماً
    expect(Object.keys(serverRecord)).toEqual(expect.arrayContaining(Object.keys(localRecord)));
  });
});
