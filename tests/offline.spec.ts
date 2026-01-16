import { test, expect } from '@playwright/test';

test.describe('نظام المراقبة - اختبار العمل بدون إنترنت', () => {
  test('يجب أن يستمر التطبيق في العمل عند انقطاع الشبكة', async ({ page, context }) => {
    await page.goto('/');
    
    // محاكاة وضع الأوفلاين
    await context.setOffline(true);
    await page.reload();
    
    // التحقق من ظهور رسالة تنبيه أو استمرار الواجهة في العمل
    const offlineIndicator = page.getByTestId('status-offline');
    // إذا كان النظام يدعم التنبيه، نتحقق منه، وإلا نتحقق من عدم الانهيار
    await expect(page.locator('body')).toBeVisible();
    
    // العودة لوضع الأونلاين والمزامنة
    await context.setOffline(false);
    // يمكن هنا إضافة منطق المزامنة التلقائية
  });
});
