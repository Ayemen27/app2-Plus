import express, { Response } from 'express';
import { storage } from '../FirebaseStorage';
import { db } from '../config/firebase-config';
import { users, projects, userProjectPermissions, permissionAuditLogs } from '@shared/schema';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const permissionsRouter = express.Router();

permissionsRouter.use(requireAuth);

interface UserPermissions {
  userId: string;
  projectId: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user.length > 0 && user[0].role === 'super_admin';
  } catch (error) {
    console.error('❌ [Permissions] خطأ في التحقق من المدير:', error);
    return false;
  }
}

async function getUserPermissionsForProject(userId: string, projectId: string): Promise<UserPermissions | null> {
  try {
    const permissions = await db
      .select()
      .from(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.userId, userId),
          eq(userProjectPermissions.projectId, projectId)
        )
      )
      .limit(1);

    if (permissions.length === 0) {
      return null;
    }

    return {
      userId: permissions[0].userId,
      projectId: permissions[0].projectId,
      canView: permissions[0].canView,
      canAdd: permissions[0].canAdd,
      canEdit: permissions[0].canEdit,
      canDelete: permissions[0].canDelete,
    };
  } catch (error) {
    console.error('❌ [Permissions] خطأ في جلب صلاحيات المستخدم:', error);
    return null;
  }
}

async function logAuditAction(entry: {
  action: string;
  actorId: string;
  targetUserId?: string;
  projectId?: string;
  oldPermissions?: any;
  newPermissions?: any;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}) {
  try {
    await db.insert(permissionAuditLogs).values({
      action: entry.action,
      actorId: entry.actorId,
      targetUserId: entry.targetUserId || null,
      projectId: entry.projectId || null,
      oldPermissions: entry.oldPermissions || null,
      newPermissions: entry.newPermissions || null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      notes: entry.notes || null,
    });
    console.log(`📋 [AuditLog] تم تسجيل العملية: ${entry.action}`);
  } catch (error) {
    console.error('❌ [AuditLog] خطأ في تسجيل السجل:', error);
  }
}

const requireSuperAdmin = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'غير مصرح' });
  }

  const superAdmin = await isSuperAdmin(req.user.userId);
  if (!superAdmin) {
    return res.status(403).json({ success: false, message: 'تحتاج صلاحيات المدير الأول' });
  }

  next();
};

permissionsRouter.get('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📋 [Permissions] جلب قائمة المستخدمين مع الصلاحيات');

    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    const usersWithPermissions = await Promise.all(
      usersList.map(async (user) => {
        const permissions = await db
          .select({
            projectId: userProjectPermissions.projectId,
            projectName: projects.name,
            canView: userProjectPermissions.canView,
            canAdd: userProjectPermissions.canAdd,
            canEdit: userProjectPermissions.canEdit,
            canDelete: userProjectPermissions.canDelete,
            assignedAt: userProjectPermissions.assignedAt,
          })
          .from(userProjectPermissions)
          .leftJoin(projects, eq(userProjectPermissions.projectId, projects.id))
          .where(eq(userProjectPermissions.userId, user.id));

        return {
          ...user,
          projectPermissions: permissions,
          projectCount: permissions.length,
        };
      })
    );

    res.json({
      success: true,
      data: usersWithPermissions,
      message: `تم جلب ${usersWithPermissions.length} مستخدم`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب المستخدمين:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/projects', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📋 [Permissions] جلب قائمة المشاريع');

    const projectsList = await db.select().from(projects).orderBy(projects.createdAt);

    const projectsWithUserCount = await Promise.all(
      projectsList.map(async (project) => {
        const userCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userProjectPermissions)
          .where(eq(userProjectPermissions.projectId, project.id));

        return {
          ...project,
          userCount: Number(userCount[0]?.count || 0),
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithUserCount,
      message: `تم جلب ${projectsList.length} مشروع`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب المشاريع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/user/:userId', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    console.log(`📋 [Permissions] جلب صلاحيات المستخدم: ${userId}`);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const permissions = await db
      .select({
        id: userProjectPermissions.id,
        projectId: userProjectPermissions.projectId,
        projectName: projects.name,
        projectStatus: projects.status,
        canView: userProjectPermissions.canView,
        canAdd: userProjectPermissions.canAdd,
        canEdit: userProjectPermissions.canEdit,
        canDelete: userProjectPermissions.canDelete,
        assignedAt: userProjectPermissions.assignedAt,
      })
      .from(userProjectPermissions)
      .leftJoin(projects, eq(userProjectPermissions.projectId, projects.id))
      .where(eq(userProjectPermissions.userId, userId));

    res.json({
      success: true,
      data: {
        user: {
          id: user[0].id,
          email: user[0].email,
          firstName: user[0].firstName,
          lastName: user[0].lastName,
          role: user[0].role,
          isActive: user[0].isActive,
        },
        permissions,
      },
      message: 'تم جلب صلاحيات المستخدم بنجاح',
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب صلاحيات المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.post('/assign', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] ربط المستخدم ${userId} بالمشروع ${projectId}`);

    const existingPermission = await db
      .select()
      .from(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.userId, userId),
          eq(userProjectPermissions.projectId, projectId)
        )
      )
      .limit(1);

    if (existingPermission.length > 0) {
      return res.status(400).json({ success: false, message: 'المستخدم مرتبط بالمشروع مسبقاً' });
    }

    const newPermission = await db.insert(userProjectPermissions).values({
      userId: userId,
      projectId: projectId,
      canView: canView ?? true,
      canAdd: canAdd ?? false,
      canEdit: canEdit ?? false,
      canDelete: canDelete ?? false,
      assignedBy: req.user!.userId,
    }).returning();

    await logAuditAction({
      action: 'assign',
      actorId: req.user!.userId,
      targetUserId: userId,
      projectId,
      newPermissions: { canView: canView ?? true, canAdd: canAdd ?? false, canEdit: canEdit ?? false, canDelete: canDelete ?? false },
      ipAddress: req.ip || undefined,
      userAgent: req.get('User-Agent'),
      notes: 'تم ربط المستخدم بالمشروع',
    });

    console.log(`✅ [Permissions] تم ربط المستخدم بالمشروع بنجاح`);

    res.status(201).json({
      success: true,
      message: 'تم ربط المستخدم بالمشروع بنجاح',
      data: newPermission[0],
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في ربط المستخدم بالمشروع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.delete('/unassign', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] فصل المستخدم ${userId} من المشروع ${projectId}`);

    const oldPermissions = await getUserPermissionsForProject(userId, projectId);

    const deleted = await db
      .delete(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.userId, userId),
          eq(userProjectPermissions.projectId, projectId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(400).json({ success: false, message: 'المستخدم غير مرتبط بهذا المشروع' });
    }

    if (oldPermissions) {
      await logAuditAction({
        action: 'unassign',
        actorId: req.user!.userId,
        targetUserId: userId,
        projectId,
        oldPermissions: {
          canView: oldPermissions.canView,
          canAdd: oldPermissions.canAdd,
          canEdit: oldPermissions.canEdit,
          canDelete: oldPermissions.canDelete,
        },
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent'),
        notes: 'تم فصل المستخدم من المشروع',
      });
    }

    console.log(`✅ [Permissions] تم فصل المستخدم من المشروع بنجاح`);

    res.json({ success: true, message: 'تم فصل المستخدم من المشروع بنجاح' });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في فصل المستخدم من المشروع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.put('/update', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] تحديث صلاحيات المستخدم ${userId} على المشروع ${projectId}`);

    const oldPermissions = await getUserPermissionsForProject(userId, projectId);

    if (!oldPermissions) {
      return res.status(400).json({ success: false, message: 'المستخدم غير مرتبط بهذا المشروع' });
    }

    const updated = await db
      .update(userProjectPermissions)
      .set({
        canView: canView ?? oldPermissions.canView,
        canAdd: canAdd ?? oldPermissions.canAdd,
        canEdit: canEdit ?? oldPermissions.canEdit,
        canDelete: canDelete ?? oldPermissions.canDelete,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userProjectPermissions.userId, userId),
          eq(userProjectPermissions.projectId, projectId)
        )
      )
      .returning();

    await logAuditAction({
      action: 'update_permissions',
      actorId: req.user!.userId,
      targetUserId: userId,
      projectId,
      oldPermissions: {
        canView: oldPermissions.canView,
        canAdd: oldPermissions.canAdd,
        canEdit: oldPermissions.canEdit,
        canDelete: oldPermissions.canDelete,
      },
      newPermissions: {
        canView: canView ?? oldPermissions.canView,
        canAdd: canAdd ?? oldPermissions.canAdd,
        canEdit: canEdit ?? oldPermissions.canEdit,
        canDelete: canDelete ?? oldPermissions.canDelete,
      },
      ipAddress: req.ip || undefined,
      userAgent: req.get('User-Agent'),
      notes: 'تم تحديث صلاحيات المستخدم',
    });

    console.log(`✅ [Permissions] تم تحديث الصلاحيات بنجاح`);

    res.json({
      success: true,
      message: 'تم تحديث الصلاحيات بنجاح',
      data: updated[0],
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في تحديث الصلاحيات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.post('/bulk-assign', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !projectId) {
      return res.status(400).json({ success: false, message: 'قائمة المستخدمين ومعرف المشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] ربط ${userIds.length} مستخدم بالمشروع ${projectId}`);

    let assigned = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const existingPermission = await db
          .select()
          .from(userProjectPermissions)
          .where(
            and(
              eq(userProjectPermissions.userId, userId),
              eq(userProjectPermissions.projectId, projectId)
            )
          )
          .limit(1);

        if (existingPermission.length === 0) {
          await db.insert(userProjectPermissions).values({
            userId,
            projectId,
            canView: canView ?? true,
            canAdd: canAdd ?? false,
            canEdit: canEdit ?? false,
            canDelete: canDelete ?? false,
            assignedBy: req.user!.userId,
          });
          assigned++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    if (assigned > 0) {
      await logAuditAction({
        action: 'bulk_assign',
        actorId: req.user!.userId,
        projectId,
        newPermissions: { canView: canView ?? true, canAdd: canAdd ?? false, canEdit: canEdit ?? false, canDelete: canDelete ?? false },
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent'),
        notes: `تم ربط ${assigned} مستخدم مجمع`,
      });
    }

    res.json({
      success: assigned > 0,
      message: `تم ربط ${assigned} مستخدم، فشل ${failed}`,
      assigned,
      failed,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في الربط المجمع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/audit-logs', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId, action, limit: limitStr, offset: offsetStr } = req.query;

    console.log('📋 [Permissions] جلب سجل التغييرات');

    const conditions = [];

    if (userId) {
      conditions.push(eq(permissionAuditLogs.targetUserId, userId as string));
    }
    if (projectId) {
      conditions.push(eq(permissionAuditLogs.projectId, projectId as string));
    }
    if (action) {
      conditions.push(eq(permissionAuditLogs.action, action as string));
    }

    let query = db
      .select({
        id: permissionAuditLogs.id,
        action: permissionAuditLogs.action,
        actorId: permissionAuditLogs.actorId,
        actorEmail: users.email,
        actorName: users.firstName,
        targetUserId: permissionAuditLogs.targetUserId,
        projectId: permissionAuditLogs.projectId,
        projectName: projects.name,
        oldPermissions: permissionAuditLogs.oldPermissions,
        newPermissions: permissionAuditLogs.newPermissions,
        ipAddress: permissionAuditLogs.ipAddress,
        notes: permissionAuditLogs.notes,
        createdAt: permissionAuditLogs.createdAt,
      })
      .from(permissionAuditLogs)
      .leftJoin(users, eq(permissionAuditLogs.actorId, users.id))
      .leftJoin(projects, eq(permissionAuditLogs.projectId, projects.id))
      .orderBy(desc(permissionAuditLogs.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const limitNum = limitStr ? parseInt(limitStr as string) : 100;
    const offsetNum = offsetStr ? parseInt(offsetStr as string) : 0;

    query = query.limit(limitNum).offset(offsetNum) as any;

    const logs = await query;

    res.json({
      success: true,
      data: logs,
      message: `تم جلب ${logs.length} سجل`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب سجل التغييرات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/my-projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    console.log(`📋 [Permissions] جلب مشاريع المستخدم: ${req.user.email}`);

    const superAdmin = await isSuperAdmin(req.user.userId);

    if (superAdmin) {
      const allProjects = await db.select().from(projects).orderBy(projects.createdAt);
      return res.json({
        success: true,
        data: allProjects,
        message: `تم جلب ${allProjects.length} مشروع (مدير أول)`,
      });
    }

    const userPermissions = await db
      .select({ projectId: userProjectPermissions.projectId })
      .from(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.userId, req.user.userId),
          eq(userProjectPermissions.canView, true)
        )
      );

    const projectIds = userPermissions.map(p => p.projectId);

    if (projectIds.length === 0) {
      return res.json({ success: true, data: [], message: 'لا توجد مشاريع مرتبطة' });
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(sql`${projects.id} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);

    res.json({
      success: true,
      data: userProjects,
      message: `تم جلب ${userProjects.length} مشروع`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب مشاريع المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/my-permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    console.log(`📋 [Permissions] جلب صلاحيات المستخدم الحالي: ${req.user.email}`);

    const superAdmin = await isSuperAdmin(req.user.userId);

    const permissions = await db
      .select({
        projectId: userProjectPermissions.projectId,
        projectName: projects.name,
        canView: userProjectPermissions.canView,
        canAdd: userProjectPermissions.canAdd,
        canEdit: userProjectPermissions.canEdit,
        canDelete: userProjectPermissions.canDelete,
      })
      .from(userProjectPermissions)
      .leftJoin(projects, eq(userProjectPermissions.projectId, projects.id))
      .where(eq(userProjectPermissions.userId, req.user.userId));

    res.json({
      success: true,
      data: {
        isSuperAdmin: superAdmin,
        role: req.user.role,
        permissions,
      },
      message: 'تم جلب الصلاحيات بنجاح',
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب صلاحيات المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.post('/make-super-admin', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
    }

    console.log(`📋 [Permissions] ترقية المستخدم ${userId} إلى مدير أول`);

    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const oldRole = existingUser[0]?.role;

    const updated = await db
      .update(users)
      .set({ role: 'super_admin', updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await logAuditAction({
      action: 'update_permissions',
      actorId: req.user!.userId,
      targetUserId: userId,
      oldPermissions: { role: oldRole },
      newPermissions: { role: 'super_admin' },
      ipAddress: req.ip || undefined,
      userAgent: req.get('User-Agent'),
      notes: 'ترقية إلى مدير أول',
    });

    res.json({
      success: true,
      message: 'تم ترقية المستخدم إلى مدير أول بنجاح',
      data: { id: updated[0].id, email: updated[0].email, role: updated[0].role },
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في ترقية المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default permissionsRouter;
