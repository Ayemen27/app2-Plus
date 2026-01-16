import { Router, Response, NextFunction } from "express";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import authenticate from "../../middleware/auth";

const router = Router();

router.use(authenticate);

// Middleware للتحقق من أن المستخدم مسؤول
async function requireAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "غير مصرح" });
  
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return next();
  }
  
  return res.status(403).json({ error: "هذه الميزة متاحة فقط للمسؤولين" });
}

// الحصول على قائمة المستخدمين
router.get("/", requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(users.createdAt);
    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// تحديث صلاحيات مستخدم
router.patch("/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'manager', 'user'].includes(role)) {
      return res.status(400).json({ error: "دور غير صالح" });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
