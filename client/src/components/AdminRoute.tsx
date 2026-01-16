/**
 * مكون حماية صفحات المسؤولين - يحمي الصفحات الخاصة بالمسؤولين فقط
 */

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { ProfessionalLoader } from "./ui/professional-loader";
import { Redirect } from "wouter";
import { Alert, AlertDescription } from "./ui/alert";
import { ShieldX } from "lucide-react";

interface AdminRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function AdminRoute({ children, requiredRole = "admin" }: AdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // إظهار شاشة التحميل أثناء التحقق من المصادقة
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ProfessionalLoader />
      </div>
    );
  }

  // إذا لم يكن مصادق عليه، إعادة توجيه لصفحة تسجيل الدخول
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // التحقق من دور المستخدم
  if (!user || user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        <div className="max-w-lg w-full">
          {/* البطاقة الرئيسية */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* الهيدر */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                <ShieldX className="h-12 w-12 text-white" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                غير مصرح لك بالوصول
              </h1>
              <p className="text-white/90 text-sm">
                عذراً، ليس لديك صلاحية الوصول لهذه الصفحة
              </p>
            </div>

            {/* المحتوى */}
            <div className="p-8 space-y-6">
              {/* معلومات الصلاحية */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      متطلبات الصفحة
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      هذه الصفحة مخصصة للمسؤولين فقط
                    </p>
                  </div>
                </div>
              </div>

              {/* معلومات المستخدم الحالي */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      دورك الحالي
                    </p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                      {user?.role === 'user' ? 'مستخدم عادي' : user?.role || "غير محدد"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  للحصول على صلاحيات إضافية، يرجى التواصل مع مسؤول النظام
                </p>
              </div>

              {/* الأزرار */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a 
                  href="/" 
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  العودة للصفحة الرئيسية
                </a>
                <button 
                  onClick={() => window.history.back()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium border border-gray-300 dark:border-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  رجوع
                </button>
              </div>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              إذا كنت تعتقد أنك يجب أن تملك صلاحية الوصول، يرجى التواصل مع الدعم الفني
            </p>
          </div>
        </div>
      </div>
    );
  }

  // إذا كان مسؤول، إظهار المحتوى
  return <>{children}</>;
}

/**
 * مكون تحقق من الدور بدون إعادة توجيه
 */
export function useRequireRole(requiredRole: string = "admin"): { hasAccess: boolean; user: any } {
  const { user, isAuthenticated } = useAuth();
  
  const hasAccess = !!(isAuthenticated && user && user.role === requiredRole);
  
  return { hasAccess, user };
}