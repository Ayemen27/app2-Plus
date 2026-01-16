import { test, expect } from '@playwright/test';

test.describe('نظام المراقبة - اختبار المصادقة', () => {
  test('يجب أن يتمكن المستخدم من محاكاة تسجيل الدخول', async ({ page }) => {
    // محاكاة فتح التطبيق
    await page.goto('/');
    
    // التحقق من وجود عناصر الإدخال (بناءً على المعايير الافتراضية)
    const loginButton = page.getByTestId('button-login');
    if (await loginButton.isVisible()) {
      await page.fill('[data-testid="input-email"]', 'test@example.com');
      await page.fill('[data-testid="input-password"]', 'password123');
      await loginButton.click();
      
      // التوقع: ظهور لوحة التحكم أو الصفحة الرئيسية
      await expect(page).toHaveURL(/.*dashboard/);
    }
  });
});
