export function formatArabicTime(date: Date): string {
  // أرقام إنجليزية فقط بالصيغة البريطانية HH:MM:SS
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  // ضمان الأرقام الإنجليزية
  return timeStr.replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
}

export function formatArabicDate(date: Date | string): string {
  // صيغة بريطانية: DD/MM/YYYY مع أرقام إنجليزية
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const dateStr = dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // ضمان الأرقام الإنجليزية
  return dateStr.replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
}

export function formatArabicNumber(num: number): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}

export function formatEnglishNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function getArabicErrorLevel(level: string): string {
  const translations = {
    'CRITICAL': 'حرج',
    'ERROR': 'خطأ',
    'WARNING': 'تحذير',
    'INFO': 'معلومات',
    'SUCCESS': 'نجاح',
    'DEBUG': 'تشخيص'
  };
  
  return translations[level as keyof typeof translations] || level;
}

export function getArabicServiceStatus(status: string): string {
  const translations = {
    'operational': 'يعمل بكفاءة',
    'degraded': 'أداء متدهور', 
    'down': 'غير متاح',
    'maintenance': 'تحت الصيانة',
    'unknown': 'غير معروف'
  };
  
  return translations[status as keyof typeof translations] || status;
}

export function getRelativeTimeInArabic(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'الآن';
  } else if (diffMinutes < 60) {
    return `منذ ${diffMinutes} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else {
    return `منذ ${diffDays} يوم`;
  }
}

export function truncateArabicText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
