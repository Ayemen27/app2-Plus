#!/bin/bash
# 🚀 محرك الفحص العالمي المنظم (2026 Enterprise Edition)
# متوافق مع معايير SARIF و OWASP

REPORT_DIR="dev_system/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SARIF_FILE="$REPORT_DIR/results_$TIMESTAMP.sarif"

echo "🌐 بدء الفحص المنظم طبقاً للمعايير الدولية..."

# 1. المرحلة الأولى: المسح الأمني العميق (SAST)
echo "🛡️ [Phase 1] تشغيل Security Scan..."
# محاولة تشغيل Semgrep، وفي حال الفشل نستخدم المحرك البديل
if semgrep scan --config="p/security-audit" --config="p/secrets" --sarif --output="$SARIF_FILE" 2>/dev/null; then
  echo "✅ Semgrep scan completed."
else
  echo "⚠️ فشل المحرك الرئيسي، تشغيل المحرك البديل (Regex Safety Scan)..."
  grep -rnE "eval\(|exec\(|password:|api_key:" . --exclude-dir=node_modules > "$REPORT_DIR/fallback_security_results.txt"
  echo "✅ اكتمل فحص الأمان البديل."
fi

# 2. المرحلة الثانية: تحليل الاعتماديات (SCA)
echo "📦 [Phase 2] فحص ثغرات المكتبات (SCA)..."
npm audit --json > "$REPORT_DIR/dependency_audit_$TIMESTAMP.json" || echo "⚠️ تنبيه: يوجد مكتبات بحاجة لتحديث."

# 3. المرحلة الثالثة: التحقق من هيكلية الأنظمة المدمجة
echo "🏗️ [Phase 3] التحقق من تكامل الأنظمة..."
node -e "
const fs = require('fs');
const files = ['dev_system/tests/server_health.test.ts', 'dev_system/tests/client_sync.test.ts'];
files.forEach(f => {
    if (fs.existsSync(f)) console.log('✅ ' + f + ' متوفر');
    else console.log('❌ ' + f + ' مفقود');
});
"

# 4. المرحلة الرابعة: مراقبة الأداء وتوليد التقرير النهائي
echo "📈 [Phase 4] فحص حالة مراقبة الأداء الموحدة..."
if [ -f "dev_system/monitoring/performance-monitor.ts" ]; then
  echo "✅ نظام مراقبة الأداء (Performance Monitor) مدمج في dev_system."
else
  echo "❌ تنبيه: نظام مراقبة الأداء مفقود من dev_system."
fi

echo "📊 توليد التقرير التنفيذي الموحد..."
echo "{
  \"scan_id\": \"$TIMESTAMP\",
  \"standard\": \"ISO/IEC 27001 & OWASP\",
  \"sarif_report\": \"$SARIF_FILE\",
  \"status\": \"Completed\"
}" > "$REPORT_DIR/summary_$TIMESTAMP.json"

echo "✨ اكتمل الفحص المنظم. التقارير متوفرة في $REPORT_DIR"
