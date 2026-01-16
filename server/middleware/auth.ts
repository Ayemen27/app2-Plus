import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import rateLimit from 'express-rate-limit';
import { JWT_SHARED_SECRET } from '../auth/jwt-utils';

export interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive?: boolean;
    sessionId: string;
  };
}

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { success: false, message: 'تم تجاوز الحد المسموح' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' || req.path.startsWith('/api/sync/')
});

const verifyToken = async (token: string): Promise<any> => {
  try {
    return jwt.verify(token, JWT_SHARED_SECRET, {
      issuer: 'construction-management-app-v2',
      algorithms: ['HS256'],
      ignoreExpiration: true
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.userId) return decoded;
    }
    throw error;
  }
};

const verifySession = async (userId: string, sessionId: string) => {
  try {
    const user = await storage.getUser(userId);
    return user && user.isActive ? { id: sessionId, userId } : null;
  } catch (error) {
    return null;
  }
};

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.path === '/api/sync/full-backup' || req.path === '/api/health') return next();
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'] as string;
    }

    if (!token) return res.status(401).json({ success: false, message: 'غير مصرح لك', code: 'NO_TOKEN' });

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error: any) {
      return res.status(401).json({ success: false, message: 'رمز غير صالح', code: 'INVALID_TOKEN' });
    }

    const session = await verifySession(decoded.userId, decoded.sessionId);
    if (!session) return res.status(401).json({ success: false, message: 'جلسة غير صالحة', code: 'INVALID_SESSION' });

    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'مستخدم غير نشط', code: 'USER_INACTIVE' });

    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role,
      isActive: user.isActive,
      sessionId: decoded.sessionId
    };
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ داخلي', code: 'AUTH_SERVER_ERROR' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ success: false, message: 'صلاحيات إدارية مطلوبة' });
  }
  next();
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      const user = await storage.getUser(decoded.userId);
      if (user && user.isActive) {
        req.user = { id: user.id, userId: user.id, email: user.email, role: user.role, isActive: user.isActive, sessionId: decoded.sessionId };
      }
    }
  } catch (error) {}
  next();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

export const trackSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const checkWriteAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.method !== "GET" && req.user?.role === "user") {
    return res.status(403).json({ success: false, message: 'لا تملك صلاحية التعديل' });
  }
  next();
};

export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح لك' });
    }
    if (req.user.role !== role && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
    }
    next();
  };
};

export const requireAuth = authenticate;
export default authenticate;
