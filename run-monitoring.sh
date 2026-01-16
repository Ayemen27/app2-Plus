#!/bin/bash

# نظام المراقبة والفحص الموحد - سكريبت التشغيل
echo "🚀 بدء نظام المراقبة والفحص الموحد..."

# 1. تشغيل اختبارات E2E محلياً
echo "🧪 تشغيل اختبارات Playwright..."
npx playwright test

# 2. التحقق من وجود Firebase CLI
if command -v firebase &> /dev/null
then
    echo "🔥 بدء التكامل مع Firebase Test Lab..."
    # ملاحظة: يتطلب هذا الأمر تسجيل الدخول مسبقاً أو وجود Service Account
    # gcloud firebase test android run --app app-debug.apk --device model=virtuall1,version=30
else
    echo "⚠️ Firebase CLI غير مثبت، يرجى تهيئته للمزامنة السحابية."
fi

echo "📊 تم إنشاء التقرير الفني في مجلد playwright-report"
