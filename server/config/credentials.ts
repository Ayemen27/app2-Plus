/**
 * 🔐 مدير بيانات الاعتماد الآمن
 * جميع البيانات الحساسة يجب تحميلها من متغيرات البيئة (Secrets)
 */

// المفاتيح المطلوبة - يتم تحميلها من متغيرات البيئة فقط
type CredentialKey = 
  | 'JWT_ACCESS_SECRET'
  | 'JWT_REFRESH_SECRET'
  | 'ENCRYPTION_KEY'
  | 'DATABASE_URL'
  | 'SUPABASE_URL'
  | 'SUPABASE_ANON_KEY'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'SUPABASE_DATABASE_URL'
  | 'SUPABASE_DATABASE_PASSWORD'
  | 'NODE_ENV';

// القيم الافتراضية للإعدادات غير الحساسة فقط
const DEFAULT_VALUES: Partial<Record<CredentialKey, string>> = {
  NODE_ENV: 'development',
  SUPABASE_URL: '', // فارغ - سيتم تعطيل Supabase إذا لم يتم تكوينه
};

/**
 * الحصول على قيمة من متغيرات البيئة
 * @param key - اسم المفتاح
 * @returns قيمة المفتاح أو سلسلة فارغة
 */
export function getCredential(key: CredentialKey): string {
  // تحميل من متغيرات البيئة
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }
  
  // استخدام القيمة الافتراضية إذا كانت متاحة
  const defaultValue = DEFAULT_VALUES[key];
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  // للبيانات الحساسة، إرجاع سلسلة فارغة
  return '';
}

/**
 * التحقق من وجود جميع المتغيرات المطلوبة
 */
export function validateRequiredCredentials(): { 
  isValid: boolean; 
  missing: string[] 
} {
  const required: CredentialKey[] = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL'
  ];
  
  const missing = required.filter(key => !getCredential(key));
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * التحقق من تكوين Supabase
 */
export function isSupabaseConfigured(): boolean {
  const url = getCredential('SUPABASE_URL');
  const password = getCredential('SUPABASE_DATABASE_PASSWORD');
  
  return !!(url && password && url !== '' && !url.includes('placeholder'));
}