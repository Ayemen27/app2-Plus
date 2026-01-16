import { Capacitor } from '@capacitor/core';
import { ENV } from './env';

// عميل API محسن لمعالجة الأخطاء والاتصالات
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = `${ENV.getApiBaseUrl()}/api`;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // استخراج التوكن من localStorage لضمان استخدامه في جميع الطلبات
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    // إذا كان التطبيق يعمل على أندرويد وكان الإنترنت مقطوعاً، نمنع طلبات الويب المباشرة
    if (Capacitor.getPlatform() !== 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn(`📡 [API] Offline mode on ${Capacitor.getPlatform()}: skipping direct request to ${endpoint}`);
      throw new Error('OFFLINE_MODE');
    }

    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`🔄 API Request: ${options.method || 'GET'} ${endpoint}`, options.body || '');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`✅ API Response: ${options.method || 'GET'} ${endpoint}`, data);
        return data;
      } else {
        const text = await response.text();
        console.log(`✅ API Response (non-JSON): ${options.method || 'GET'} ${endpoint}`);
        return text as unknown as T;
      }
    } catch (error) {
      console.error(`❌ API Error: ${options.method || 'GET'} ${endpoint}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// Helper for making API requests (for backward compatibility)
export async function apiRequest(
  endpoint: string,
  method: string = "GET",
  data?: any,
  timeoutMs: number = 30000
): Promise<any> {
  const baseURL = ENV.getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}
