/**
 * 🔐 خدمة المصادقة الموحدة - تضمن إرسال التوكن مع جميع الطلبات
 */

export class AuthService {
  private static readonly TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  /**
   * حفظ التوكن
   */
  static saveToken(token: string): void {
    if (!token) {
      console.warn('⚠️ محاولة حفظ توكن فارغ');
      return;
    }
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      console.log('✅ [AuthService] تم حفظ التوكن بنجاح');
    } catch (error) {
      console.error('❌ [AuthService] خطأ في حفظ التوكن:', error);
    }
  }

  /**
   * الحصول على التوكن
   */
  static getToken(): string | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (!token) {
        console.warn('⚠️ [AuthService] لا يوجد توكن محفوظ');
      }
      return token;
    } catch (error) {
      console.error('❌ [AuthService] خطأ في جلب التوكن:', error);
      return null;
    }
  }

  /**
   * حفظ التوكن المنعش
   */
  static saveRefreshToken(token: string): void {
    if (!token) return;
    try {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
      console.log('✅ [AuthService] تم حفظ Refresh Token');
    } catch (error) {
      console.error('❌ [AuthService] خطأ في حفظ Refresh Token:', error);
    }
  }

  /**
   * الحصول على التوكن المنعش
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('❌ [AuthService] خطأ في جلب Refresh Token:', error);
      return null;
    }
  }

  /**
   * مسح جميع التوكنات (تسجيل الخروج)
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      console.log('✅ [AuthService] تم مسح التوكنات');
    } catch (error) {
      console.error('❌ [AuthService] خطأ في مسح التوكنات:', error);
    }
  }

  /**
   * التحقق من وجود توكن
   */
  static hasToken(): boolean {
    const token = this.getToken();
    return !!token && token.length > 0;
  }

  /**
   * إضافة التوكن لـ headers
   */
  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 [AuthService] تم إضافة التوكن لـ headers');
    } else {
      console.warn('⚠️ [AuthService] لا يوجد توكن للإضافة');
    }

    return headers;
  }
}
