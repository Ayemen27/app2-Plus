
/**
 * صفحة تسجيل الدخول المتطورة - نظام المصادقة المتقدم
 * مع تأثيرات بصرية احترافية ونظام التبويبات
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../components/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input, useFormMemory } from "../components/ui/input";
import { Button } from "../components/ui/button";
import ProfessionalLoader from "../components/ui/professional-loader";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import { showToast } from "../utils/toast";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Shield, 
  Mail, 
  User,
  UserPlus,
  KeyRound,
  ArrowRight,
  Sparkles,
  Lock,
  Phone
} from "lucide-react";

// مخططات التحقق من البيانات
const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  totpCode: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(50, "الاسم طويل جداً"),
  email: z.string().email("بريد إلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
  phone: z.string().min(9, "رقم الهاتف غير صحيح").optional(),
  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "كلمة المرور يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// واجهات الاستجابة
interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    mfaEnabled: boolean;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
  requireMFA?: boolean;
  requireVerification?: boolean;
  message: string;
}

interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  requireVerification?: boolean;
  requireEmailVerification?: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      fullName: string;
      createdAt: string;
    };
  };
  message: string;
}

// مكون الخلفية المتحركة
const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-blob"></div>
    <div className="absolute -bottom-32 -left-40 w-96 h-96 bg-gradient-to-tr from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
  </div>
);

// مكون شعار الشركة المحسّن للهواتف
const CompanyLogo = () => (
  <div className="flex items-center justify-center gap-3 sm:gap-4">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-50"></div>
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-2 sm:p-3">
        <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
      </div>
    </div>
    <div className="text-right">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent leading-tight">
        نظام إدارة المشاريع
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">الحل الشامل لإدارة المشاريع الإنشائية</p>
    </div>
  </div>
);

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa' | 'verification'>('credentials');

  // نماذج التحقق
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      totpCode: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // طفرة تسجيل الدخول
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      console.log('🚀 [AuthPage.loginMutation] بدء عملية تسجيل الدخول:', {
        email: data.email,
        hasPassword: !!data.password,
        timestamp: new Date().toISOString()
      });
      
      try {
        const result = await login(data.email, data.password);
        console.log('✅ [AuthPage.loginMutation] تمت عملية login بنجاح:', result);
        return result;
      } catch (error) {
        console.error('❌ [AuthPage.loginMutation] خطأ في login:', error);
        throw error;
      }
    },
    onSuccess: async (result: any) => {
      console.log('🎉 [AuthPage.loginMutation] نجح تسجيل الدخول:', result);
      
      // استخراج بيانات المستخدم مع حماية كاملة ضد القيم الفارغة
      const userData = result?.data?.user || result?.user || result;
      const userName = userData?.name || userData?.fullName || 'مستخدم';
      
      // 🔐 ترقية حاسمة: حفظ بيانات المستخدم في نظام الطوارئ (Offline Login) فوراً
      if (userData && (userData.id || userData.email)) {
        try {
          const { smartSave } = await import('../offline/storage-factory');
          await smartSave('emergencyUsers', [{
            id: userData.id.toString(),
            email: userData.email,
            password: userData.password || 'synced-from-server', // سيتم التحقق منه عبر التوكن أو Hash
            name: userData.name,
            role: userData.role || 'user'
          }]);
          console.log('💾 [AuthPage] تم حفظ بيانات المستخدم في نظام الطوارئ بنجاح');
        } catch (err) {
          console.error('❌ [AuthPage] فشل حفظ بيانات الطوارئ:', err);
        }
      }

      toast({
        title: `أهلاً وسهلاً ${userName ? userName : 'بك'}!`,
        description: "تم تسجيل الدخول بنجاح. مرحباً بعودتك إلى نظام إدارة المشاريع",
      });

      setTimeout(() => {
        navigate("/");
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.href = '/';
          }
        }, 1000);
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ [AuthPage.loginMutation] فشل تسجيل الدخول:', error);
      console.error('❌ [AuthPage.loginMutation] تفاصيل الخطأ:', {
        status: error?.status,
        message: error?.message,
        response: error?.response,
        data: error?.data,
        requireEmailVerification: error?.requireEmailVerification,
        userId: error?.userId,
        email: error?.email
      });
      
      // التحقق من حالة عدم تفعيل البريد الإلكتروني
      const isEmailNotVerified = 
        error?.status === 403 ||
        error?.requireEmailVerification === true ||
        error?.message?.includes('يجب التحقق من البريد') ||
        (error as any)?.response?.data?.requireEmailVerification;
      
      console.log('🔍 [AuthPage.loginMutation] فحص التحقق من البريد:', {
        isEmailNotVerified,
        statusCheck: error?.status === 403,
        flagCheck: error?.requireEmailVerification === true,
        messageCheck: error?.message?.includes('يجب التحقق من البريد')
      });
      
      if (isEmailNotVerified) {
        const userId = error?.userId || (error as any)?.response?.data?.userId;
        const email = error?.email || (error as any)?.response?.data?.email;
        const formEmail = loginForm.getValues('email');
        
        console.log('📧 [AuthPage.loginMutation] توجيه إلى صفحة التحقق:', {
          userId,
          email,
          formEmail,
          willNavigate: !!(userId && email) || !!formEmail
        });
        
        // عرض رسالة الخطأ
        toast({
          title: "التحقق من البريد الإلكتروني مطلوب",
          description: error.message || "بريدك الإلكتروني لم يتم التحقق منه بعد",
          variant: "destructive",
        });
        
        // توجيه إلى صفحة التحقق من البريد
        setTimeout(() => {
          if (userId && email) {
            console.log('✅ [AuthPage.loginMutation] توجيه باستخدام userId و email من الخطأ');
            navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(email)}`);
          } else if (formEmail) {
            console.log('✅ [AuthPage.loginMutation] توجيه باستخدام email من النموذج');
            navigate(`/verify-email?email=${encodeURIComponent(formEmail)}`);
          } else {
            console.log('❌ [AuthPage.loginMutation] لا توجد بيانات كافية للتوجيه');
          }
        }, 1500);
        return;
      }
      
      // رسالة خطأ عامة
      const isOffline = !navigator.onLine;
      toast({
        title: "فشل تسجيل الدخول",
        description: isOffline 
          ? "أنت تعمل في وضع الأوفلاين، يرجى التأكد من تسجيل الدخول مسبقاً أثناء الاتصال بالإنترنت لمزامنة بياناتك."
          : (error.message || "حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من بيانات الاعتماد."),
        variant: "destructive",
      });
    },
  });

  // طفرة التسجيل
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData): Promise<RegisterResponse> => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      });

      if (!response.ok && response.status !== 201 && response.status !== 202) {
        throw new Error(`خطأ في الشبكة: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ [RegisterMutation] استجابة التسجيل:', data);
      
      if (data.success) {
        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
        });

        // توجيه تلقائي إلى صفحة التحقق من البريد الإلكتروني
        // استخراج معرف المستخدم والإيميل من الاستجابة
        if (data.user?.id && data.user?.email) {
          const userId = data.user.id;
          const userEmail = data.user.email;
          console.log('🔄 [RegisterMutation] التوجيه إلى صفحة التحقق:', { userId, userEmail });
          
          setTimeout(() => {
            navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(userEmail)}`);
          }, 1500);
        } else if (data.data?.user?.id && data.data?.user?.email) {
          // احتياطي في حال كان في data.data
          const userId = data.data.user.id;
          const userEmail = data.data.user.email;
          console.log('🔄 [RegisterMutation] التوجيه إلى صفحة التحقق (احتياطي):', { userId, userEmail });
          
          setTimeout(() => {
            navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(userEmail)}`);
          }, 1500);
        } else {
          console.log('⚠️ [RegisterMutation] لم يتم العثور على بيانات المستخدم للتوجيه');
          setActiveTab('login');
        }
        
      } else {
        toast({
          title: "فشل إنشاء الحساب",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء الحساب",
        description: "حدث خطأ أثناء الاتصال بالخادم",
        variant: "destructive",
      });
      console.error('Register error:', error);
    },
  });

  // طفرة استرجاع كلمة المرور
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('فشل في إرسال طلب استرجاع كلمة المرور');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال رابط الاسترجاع",
        description: "يرجى التحقق من بريدك الإلكتروني",
      });
      setActiveTab('login');
    },
    onError: (error) => {
      toast({
        title: "خطأ في استرجاع كلمة المرور",
        description: "حدث خطأ أثناء المعالجة",
        variant: "destructive",
      });
    },
  });

  // دوال التحقق التفاعلي
  const emailValidator = useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return { isValid: false, message: "البريد الإلكتروني مطلوب" };
    if (!emailRegex.test(value)) return { isValid: false, message: "تنسيق البريد الإلكتروني غير صحيح" };
    return { isValid: true, message: "البريد الإلكتروني صحيح" };
  }, []);

  const passwordValidator = useCallback((value: string) => {
    if (!value) return { isValid: false, message: "كلمة المرور مطلوبة" };
    if (value.length < 8) return { isValid: false, message: "كلمة المرور قصيرة جداً" };
    
    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/\d/.test(value)) strength++;
    if (/[^A-Za-z0-9]/.test(value)) strength++;
    
    return { 
      isValid: true, 
      message: "كلمة المرور قوية", 
      strength: Math.min(strength, 4) 
    };
  }, []);

  // دوال التعامل مع النماذج
  const onLoginSubmit = (data: LoginFormData) => {
    console.log('🚀 [AuthPage.onLoginSubmit] تسجيل دخول:', { 
      email: data.email, 
      hasPassword: !!data.password,
      timestamp: new Date().toISOString()
    });
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };


  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-blue-50/80 via-white/90 to-purple-50/80" dir="rtl">
      {/* الخلفية المتحركة */}
      <AnimatedBackground />
      
      {/* المحتوى الرئيسي - تخطيط محسّن للهواتف والـ APK */}
      <div className="relative z-10 w-full min-h-screen flex flex-col justify-between py-3 px-3 sm:py-6 sm:px-6 md:py-8">
        {/* الجزء العلوي - الشعار */}
        <div className="flex-shrink-0 mb-3 sm:mb-4 md:mb-5">
          <CompanyLogo />
        </div>

        {/* الجزء الرئيسي - البطاقة مركزة بكفاءة */}
        <div className="flex-1 flex items-center justify-center w-full min-h-0 px-0">
          <Card className="glass-morphism border-0 shadow-xl backdrop-blur-xl w-full max-w-md mx-auto max-h-[calc(100vh-200px)] overflow-y-auto">
            <CardHeader className="space-y-1.5 text-center py-3 px-4 sm:py-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                مرحباً بك
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                اختر العملية المطلوبة
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6 pb-3 sm:pb-4">
              {/* نظام التبويبات المضغوط */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 glass-tabs gap-0.5 h-9 sm:h-10">
                  <TabsTrigger 
                    value="login" 
                    className="flex items-center gap-1 tab-trigger px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium"
                  >
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    دخول
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="flex items-center gap-1 tab-trigger px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium"
                  >
                    <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    تسجيل
                  </TabsTrigger>
                </TabsList>

                {/* محتوى تسجيل الدخول */}
                <TabsContent value="login" className="space-y-2 sm:space-y-2.5 tab-content mt-2 sm:mt-2.5">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-2 sm:space-y-2.5">
                      
                      {loginStep === 'credentials' && (
                        <>
                          <FormField
                            control={loginForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs sm:text-sm text-gray-700 font-medium">البريد الإلكتروني</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="email"
                                    placeholder="admin@example.com"
                                    leftIcon={<Mail className="h-4 w-4" />}
                                    validator={emailValidator}
                                    fieldType="email"
                                    validationContext="login"
                                    showValidation={true}
                                    enableMemory={true}
                                    memoryKey="login-email"
                                    className="enhanced-input"
                                    data-testid="input-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs sm:text-sm text-gray-700 font-medium">كلمة المرور</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="كلمة المرور"
                                    validator={passwordValidator}
                                    fieldType="password"
                                    showValidation={false}
                                    enableMemory={true}
                                    memoryKey="login-password"
                                    className="enhanced-input"
                                    data-testid="input-password"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* خيارات تسجيل الدخول */}
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="remember-me"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <label htmlFor="remember-me" className="text-gray-600">
                                تذكرني
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('forgot')}
                              className="text-blue-600 hover:text-blue-500 cursor-pointer transition-colors font-medium"
                            >
                              نسيت كلمة المرور؟
                            </button>
                          </div>
                        </>
                      )}

                      {loginStep === 'mfa' && (
                        <FormField
                          control={loginForm.control}
                          name="totpCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">رمز التحقق الثنائي</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="000000"
                                  maxLength={6}
                                  className="text-center text-2xl tracking-widest enhanced-input"
                                  data-testid="input-totp-code"
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-sm text-gray-500 text-center">
                                أدخل الرمز من تطبيق المصادقة
                              </p>
                            </FormItem>
                          )}
                        />
                      )}

                      {/* زر تسجيل الدخول */}
                      <div className="pt-2">
                        <Button
                          type="submit"
                          loading={loginMutation.isPending}
                          loadingText="جارِ تسجيل الدخول..."
                          enableRateLimit={true}
                          rateLimitDelay={2000}
                          className="w-full h-11 sm:h-12 text-base sm:text-lg font-medium"
                          data-testid="button-login"
                        >
                          <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                          {loginStep === 'credentials' && 'تسجيل الدخول'}
                          {loginStep === 'mfa' && 'تأكيد الرمز'}
                        </Button>
                      </div>

                    </form>
                  </Form>
                </TabsContent>

                {/* محتوى التسجيل */}
                <TabsContent value="register" className="space-y-2 sm:space-y-2.5 tab-content mt-2 sm:mt-2.5">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-2 sm:space-y-2.5">
                      
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base text-gray-700 font-medium">الاسم الكامل</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <User className="absolute right-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="text"
                                  placeholder="أحمد محمد"
                                  className="pr-10 enhanced-input"
                                  data-testid="input-name"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute right-2 top-2 h-3 w-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="email"
                                  placeholder="ahmed@example.com"
                                  className="pr-10 enhanced-input"
                                  validator={emailValidator}
                                  fieldType="email"
                                  validationContext="register"
                                  showValidation={true}
                                  data-testid="input-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">رقم الهاتف (اختياري)</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Phone className="absolute right-2 top-2 h-3 w-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="tel"
                                  placeholder="771234567"
                                  className="pr-10 enhanced-input"
                                  data-testid="input-phone"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">كلمة المرور</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="كلمة المرور"
                                  className="pl-10 enhanced-input"
                                  validator={passwordValidator}
                                  fieldType="password"
                                  showValidation={false}
                                  strengthIndicator={true}
                                  data-testid="input-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute left-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                                  data-testid="button-toggle-password"
                                >
                                  {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500">
                              يجب أن تحتوي على 8 أحرف، حروف كبيرة وصغيرة، وأرقام
                            </p>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">تأكيد كلمة المرور</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="تأكيد كلمة المرور"
                                  className="pl-10 enhanced-input"
                                  data-testid="input-confirm-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute left-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                                  data-testid="button-toggle-confirm-password"
                                >
                                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* زر التسجيل */}
                      <div className="pt-2">
                        <Button
                          type="submit"
                          className="w-full h-11 sm:h-12 text-base sm:text-lg font-medium enhanced-button"
                          disabled={registerMutation.isPending}
                          data-testid="button-register"
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="ml-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                              جارِ إنشاء الحساب...
                            </>
                          ) : (
                            <>
                              <UserPlus className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                              إنشاء حساب جديد
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                {/* محتوى استرجاع كلمة المرور - مضغوط */}
                <TabsContent value="forgot" className="space-y-1.5 tab-content mt-1.5">
                  <div className="text-center space-y-0.5">
                    <Lock className="w-6 h-6 text-blue-500 mx-auto" />
                    <h3 className="text-xs font-semibold text-gray-900">استرجاع كلمة المرور</h3>
                    <p className="text-[10px] text-gray-600">
                      أدخل بريدك الإلكتروني وسنرسل لك رابط الاسترجاع
                    </p>
                  </div>

                  <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-1.5">
                      
                      <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute right-2 top-2 h-3 w-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="email"
                                  placeholder="أدخل بريدك الإلكتروني"
                                  className="pr-10 enhanced-input"
                                  validator={emailValidator}
                                  fieldType="email"
                                  showValidation={true}
                                  data-testid="input-forgot-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* زر الاسترجاع - ثابت في الأسفل */}
                      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-2 -mx-2 px-2 pb-1">
                        <Button
                          type="submit"
                          className="w-full h-9 text-sm font-medium enhanced-button"
                          disabled={forgotPasswordMutation.isPending}
                          data-testid="button-forgot-password"
                        >
                          {forgotPasswordMutation.isPending ? (
                            <>
                              <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" />
                              جارِ الإرسال...
                            </>
                          ) : (
                            <>
                              <Mail className="ml-2 h-3.5 w-3.5" />
                              إرسال رابط الاسترجاع
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* التذييل المضغوط */}
        <div className="flex-shrink-0 mt-2 sm:mt-3 text-center pb-1">
          <p className="text-[10px] sm:text-xs text-gray-400">© 2025 جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}
