/**
 * 🔗 Unified API Endpoints
 * Used by both app2 (Web) and App2-Android (Expo)
 */

// ============================================================
// 🔐 المصادقة
// ============================================================
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',
  VERIFY_EMAIL: '/api/auth/verify-email',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  REFRESH_TOKEN: '/api/auth/refresh-token',
  ME: '/api/auth/me',
} as const;

// ============================================================
// 📊 المشاريع
// ============================================================
export const PROJECT_ENDPOINTS = {
  GET_ALL: '/api/projects',
  GET_BY_ID: (id: string) => `/api/projects/${id}`,
  CREATE: '/api/projects',
  UPDATE: (id: string) => `/api/projects/${id}`,
  DELETE: (id: string) => `/api/projects/${id}`,
  GET_WITH_STATS: '/api/projects/with-stats',
  GET_STATS: (id: string) => `/api/projects/${id}/stats`,
} as const;

// ============================================================
// 👥 العمال
// ============================================================
export const WORKER_ENDPOINTS = {
  GET_ALL: '/api/workers',
  GET_BY_ID: (id: string) => `/api/workers/${id}`,
  CREATE: '/api/workers',
  UPDATE: (id: string) => `/api/workers/${id}`,
  DELETE: (id: string) => `/api/workers/${id}`,
  GET_BY_PROJECT: (projectId: string) => `/api/projects/${projectId}/workers`,
} as const;

// ============================================================
// 💰 المالية
// ============================================================
export const FINANCIAL_ENDPOINTS = {
  GET_SUMMARY: '/api/financial-summary',
  GET_PROJECT_SUMMARY: (projectId: string) => `/api/financial-summary?projectId=${projectId}`,
  GET_EXPENSES: '/api/daily-expenses',
  GET_TRANSACTIONS: '/api/project-transactions',
  GET_LEDGER: '/api/expense-ledger',
} as const;

// ============================================================
// 🔔 الإشعارات
// ============================================================
export const NOTIFICATION_ENDPOINTS = {
  GET_ALL: '/api/notifications',
  GET_UNREAD: '/api/notifications/unread',
  MARK_READ: (id: string) => `/api/notifications/${id}/read`,
  MARK_ALL_READ: '/api/notifications/mark-all-read',
  DELETE: (id: string) => `/api/notifications/${id}`,
  SUBSCRIBE: '/api/notifications/subscribe',
} as const;

// ============================================================
// 📈 النقارير والإحصائيات
// ============================================================
export const REPORT_ENDPOINTS = {
  GET_DASHBOARD: '/api/reports/dashboard',
  GET_PROJECT_REPORT: (projectId: string) => `/api/reports/project/${projectId}`,
  GET_WORKER_REPORT: (workerId: string) => `/api/reports/worker/${workerId}`,
  EXPORT_EXCEL: '/api/reports/export/excel',
  EXPORT_PDF: '/api/reports/export/pdf',
} as const;

// ============================================================
// ⚙️ النظام
// ============================================================
export const SYSTEM_ENDPOINTS = {
  HEALTH_CHECK: '/api/health',
  VERSION: '/api/version',
  CONFIG: '/api/config',
  SERVER_TIME: '/api/server-time',
} as const;
