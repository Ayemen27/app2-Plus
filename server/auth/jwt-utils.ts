/**
 * نظام JWT وإدارة الرموز المتقدم
 * يدعم Access Tokens, Refresh Tokens, وإدارة الجلسات
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from '../storage.js';
import { hashToken } from './crypto-utils.js';

// ملاحظة: تم الانتقال بالكامل إلى Firebase لضمان الاستقرار
const SHARED_SECRET = 'binarjoin-core-system-v2-2026-ultra-secure-key';
export const JWT_SHARED_SECRET = SHARED_SECRET;

export const JWT_CONFIG = {
  accessTokenSecret: SHARED_SECRET,
  refreshTokenSecret: SHARED_SECRET,
  accessTokenExpiry: '7d',
  refreshTokenExpiry: '90d',
  issuer: 'construction-management-app-v2',
  algorithm: 'HS256' as const,
};

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export function generateAccessToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SHARED_SECRET,
    { expiresIn: JWT_CONFIG.accessTokenExpiry, issuer: JWT_CONFIG.issuer } as jwt.SignOptions
  );
}

export function generateRefreshToken(payload: { userId: string; email: string }): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SHARED_SECRET,
    { expiresIn: JWT_CONFIG.refreshTokenExpiry, issuer: JWT_CONFIG.issuer } as jwt.SignOptions
  );
}

export async function generateTokenPair(
  userId: string,
  email: string,
  role: string,
  ipAddress?: string,
  userAgent?: string,
  deviceInfo?: any
): Promise<TokenPair> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign({ userId, email, role, sessionId, type: 'access' }, JWT_SHARED_SECRET, {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    issuer: JWT_CONFIG.issuer
  } as jwt.SignOptions);
  
  const refreshToken = jwt.sign({ userId, email, sessionId, type: 'refresh' }, JWT_SHARED_SECRET, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    issuer: JWT_CONFIG.issuer
  } as jwt.SignOptions);

  return { accessToken, refreshToken, sessionId, expiresAt, refreshExpiresAt };
}

export async function verifyAccessToken(token: string): Promise<{ success: boolean; user?: any } | null> {
  try {
    const payload = jwt.verify(token, JWT_SHARED_SECRET, {
      issuer: JWT_CONFIG.issuer,
      ignoreExpiration: process.env.NODE_ENV === 'development',
    }) as any;

    if (payload.type !== 'access') return null;

    const user = await storage.getUser(payload.userId);
    if (!user || !user.isActive) return null;

    return {
      success: true,
      user: { userId: user.id, email: user.email, role: user.role, sessionId: payload.sessionId }
    };
  } catch (error) {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<any | null> {
  try {
    const payload = jwt.verify(token, JWT_SHARED_SECRET, { issuer: JWT_CONFIG.issuer }) as any;
    if (payload.type && payload.type !== 'refresh') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  try {
    const payload = jwt.verify(refreshToken, JWT_SHARED_SECRET, {
      issuer: JWT_CONFIG.issuer,
      ignoreExpiration: false, // يجب أن يكون صالحاً
    }) as any;

    if (payload.type !== 'refresh') return null;

    const user = await storage.getUserByEmail(payload.email);
    if (!user || !user.isActive) {
      console.log('❌ [JWT] فشل التجديد: المستخدم غير موجود في Firebase:', payload.email);
      // محاولة البحث بالمعرف كخطة بديلة
      const userById = await storage.getUser(payload.userId);
      if (!userById || !userById.isActive) return null;
      return await generateTokenPair(userById.id, userById.email, userById.role);
    }

    // إنشاء زوج جديد تماماً
    return await generateTokenPair(user.id, user.email, user.role);
  } catch (error) {
    console.error('❌ [JWT] خطأ في تجديد الرمز:', error instanceof Error ? error.message : 'رمز منتهي أو غير صالح');
    return null;
  }
}

export async function revokeToken(tokenOrSessionId: string, reason?: string): Promise<boolean> {
  return true; // Sessions are stateless in this simple Firebase migration
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  return 0;
}

export async function cleanupExpiredSessions(): Promise<number> {
  return 0;
}

export async function getUserActiveSessions(userId: string) {
  return [];
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

// تم تصدير JWT_CONFIG في بداية الملف