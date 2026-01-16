/**
 * مسارات إدارة أنواع المشاريع
 * Project Types Management Routes
 */

import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import { db } from '../../db';
import { projectTypes, projects, insertProjectTypeSchema } from '../../../shared/schema';
import { requireAuth } from '../../middleware/auth';

export const projectTypeRouter = express.Router();

// Middleware للتحقق من الأدوار المتعددة
const requireRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول',
        code: 'UNAUTHORIZED'
      });
    }

    if (!roles.includes(user.role)) {
      console.log(`🚫 [AUTH] محاولة وصول غير مصرح بها من: ${user.email} للأدوار: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `تحتاج صلاحيات ${roles.join(' أو ')} للوصول لهذا المحتوى`,
        code: 'ROLE_REQUIRED'
      });
    }

    next();
  };
};

// تطبيق المصادقة على جميع المسارات
projectTypeRouter.use(requireAuth);

/**
 * 📋 جلب قائمة أنواع المشاريع
 * GET /api/project-types
 */
projectTypeRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, activeOnly } = req.query;
    console.log('📋 [API] جلب قائمة أنواع المشاريع', { search, activeOnly });

    let query = db.select().from(projectTypes);
    
    // فلترة حسب الحالة
    if (activeOnly === 'true') {
      query = query.where(eq(projectTypes.isActive, true)) as any;
    }

    const typesList = await query.orderBy(desc(projectTypes.createdAt));

    // فلترة البحث في الـ application layer
    let filteredList = typesList;
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredList = typesList.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
      );
    }

    console.log(`✅ [API] تم جلب ${filteredList.length} نوع مشروع`);

    res.json({
      success: true,
      data: filteredList,
      message: `تم جلب ${filteredList.length} نوع مشروع بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب أنواع المشاريع:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'PROJECT_TYPES_FETCH_ERROR',
      message: 'فشل في جلب قائمة أنواع المشاريع'
    });
  }
});

/**
 * 🔍 جلب نوع مشروع محدد
 * GET /api/project-types/:id
 */
projectTypeRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🔍 [API] جلب نوع مشروع محدد:', id);

    const typeId = parseInt(id);
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'معرف نوع المشروع غير صحيح'
      });
    }

    const typeResult = await db.select()
      .from(projectTypes)
      .where(eq(projectTypes.id, typeId))
      .limit(1);

    if (typeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'PROJECT_TYPE_NOT_FOUND',
        message: 'نوع المشروع غير موجود'
      });
    }

    res.json({
      success: true,
      data: typeResult[0],
      message: 'تم جلب نوع المشروع بنجاح'
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب نوع المشروع:', error);
    res.status(500).json({
      success: false,
      error: 'PROJECT_TYPE_FETCH_ERROR',
      message: 'فشل في جلب نوع المشروع'
    });
  }
});

/**
 * ➕ إضافة نوع مشروع جديد
 * POST /api/project-types
 * الصلاحية: المسؤول والمشرف فقط
 */
projectTypeRouter.post('/', requireRoles(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    console.log('➕ [API] طلب إضافة نوع مشروع جديد من:', req.user?.email);
    console.log('📋 [API] البيانات:', req.body);

    // التحقق من صحة البيانات
    const validationResult = insertProjectTypeSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error('❌ [API] فشل التحقق من البيانات:', validationResult.error.flatten());
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'بيانات نوع المشروع غير صحيحة',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    // التحقق من عدم وجود نوع بنفس الاسم
    const existingType = await db.select()
      .from(projectTypes)
      .where(eq(projectTypes.name, validationResult.data.name))
      .limit(1);

    if (existingType.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'PROJECT_TYPE_EXISTS',
        message: 'نوع المشروع موجود مسبقاً'
      });
    }

    // إدراج نوع المشروع الجديد
    const newType = await db.insert(projectTypes)
      .values(validationResult.data)
      .returning();

    console.log(`✅ [API] تم إنشاء نوع المشروع "${newType[0].name}" بنجاح`);

    res.status(201).json({
      success: true,
      data: newType[0],
      message: `تم إنشاء نوع المشروع "${newType[0].name}" بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في إنشاء نوع المشروع:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'PROJECT_TYPE_EXISTS',
        message: 'نوع المشروع موجود مسبقاً'
      });
    }

    res.status(500).json({
      success: false,
      error: 'PROJECT_TYPE_CREATE_ERROR',
      message: 'فشل في إنشاء نوع المشروع'
    });
  }
});

/**
 * ✏️ تعديل نوع مشروع
 * PUT /api/project-types/:id
 * الصلاحية: المسؤول والمشرف فقط
 */
projectTypeRouter.put('/:id', requireRoles(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('✏️ [API] طلب تعديل نوع مشروع:', id);

    const typeId = parseInt(id);
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'معرف نوع المشروع غير صحيح'
      });
    }

    // التحقق من وجود نوع المشروع
    const existingType = await db.select()
      .from(projectTypes)
      .where(eq(projectTypes.id, typeId))
      .limit(1);

    if (existingType.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'PROJECT_TYPE_NOT_FOUND',
        message: 'نوع المشروع غير موجود'
      });
    }

    // التحقق من صحة البيانات
    const validationResult = insertProjectTypeSchema.partial().safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'بيانات التعديل غير صحيحة',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    // التحقق من عدم تكرار الاسم إذا تم تغييره
    if (validationResult.data.name && validationResult.data.name !== existingType[0].name) {
      const duplicateName = await db.select()
        .from(projectTypes)
        .where(and(
          eq(projectTypes.name, validationResult.data.name),
          sql`${projectTypes.id} != ${typeId}`
        ))
        .limit(1);

      if (duplicateName.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'PROJECT_TYPE_EXISTS',
          message: 'اسم نوع المشروع موجود مسبقاً'
        });
      }
    }

    // تحديث نوع المشروع
    const updatedType = await db.update(projectTypes)
      .set(validationResult.data)
      .where(eq(projectTypes.id, typeId))
      .returning();

    console.log(`✅ [API] تم تعديل نوع المشروع "${updatedType[0].name}" بنجاح`);

    res.json({
      success: true,
      data: updatedType[0],
      message: `تم تعديل نوع المشروع "${updatedType[0].name}" بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في تعديل نوع المشروع:', error);
    res.status(500).json({
      success: false,
      error: 'PROJECT_TYPE_UPDATE_ERROR',
      message: 'فشل في تعديل نوع المشروع'
    });
  }
});

/**
 * 🗑️ حذف نوع مشروع
 * DELETE /api/project-types/:id
 * الصلاحية: المسؤول فقط
 */
projectTypeRouter.delete('/:id', requireRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🗑️ [API] طلب حذف نوع مشروع:', id);

    const typeId = parseInt(id);
    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'معرف نوع المشروع غير صحيح'
      });
    }

    // التحقق من وجود نوع المشروع
    const existingType = await db.select()
      .from(projectTypes)
      .where(eq(projectTypes.id, typeId))
      .limit(1);

    if (existingType.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'PROJECT_TYPE_NOT_FOUND',
        message: 'نوع المشروع غير موجود'
      });
    }

    // التحقق من عدم استخدام النوع في مشاريع
    const projectsUsingType = await db.select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.projectTypeId, typeId));

    const usageCount = Number(projectsUsingType[0]?.count || 0);

    if (usageCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'PROJECT_TYPE_IN_USE',
        message: `لا يمكن حذف نوع المشروع لأنه مستخدم في ${usageCount} مشروع`
      });
    }

    // حذف نوع المشروع
    await db.delete(projectTypes).where(eq(projectTypes.id, typeId));

    console.log(`✅ [API] تم حذف نوع المشروع "${existingType[0].name}" بنجاح`);

    res.json({
      success: true,
      message: `تم حذف نوع المشروع "${existingType[0].name}" بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في حذف نوع المشروع:', error);
    res.status(500).json({
      success: false,
      error: 'PROJECT_TYPE_DELETE_ERROR',
      message: 'فشل في حذف نوع المشروع'
    });
  }
});

/**
 * 📊 إحصائيات أنواع المشاريع
 * GET /api/project-types/stats/summary
 */
projectTypeRouter.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    console.log('📊 [API] جلب إحصائيات أنواع المشاريع');

    const stats = await db.execute(sql`
      SELECT 
        pt.id,
        pt.name,
        pt.description,
        pt.is_active,
        COUNT(p.id) as projects_count
      FROM project_types pt
      LEFT JOIN projects p ON p.project_type_id = pt.id
      GROUP BY pt.id, pt.name, pt.description, pt.is_active
      ORDER BY projects_count DESC, pt.name
    `);

    const totalTypes = await db.select({ count: sql<number>`count(*)` }).from(projectTypes);
    const activeTypes = await db.select({ count: sql<number>`count(*)` })
      .from(projectTypes)
      .where(eq(projectTypes.isActive, true));

    res.json({
      success: true,
      data: {
        types: stats.rows,
        summary: {
          totalTypes: Number(totalTypes[0]?.count || 0),
          activeTypes: Number(activeTypes[0]?.count || 0)
        }
      },
      message: 'تم جلب الإحصائيات بنجاح'
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب إحصائيات أنواع المشاريع:', error);
    res.status(500).json({
      success: false,
      error: 'PROJECT_TYPE_STATS_ERROR',
      message: 'فشل في جلب إحصائيات أنواع المشاريع'
    });
  }
});

export default projectTypeRouter;
