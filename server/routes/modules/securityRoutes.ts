import { Router } from "express";
import { db } from "../../db";
import { securityPolicies, securityPolicySuggestions, securityPolicyViolations } from "../../../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// الحصول على كل السياسات
router.get("/policies", async (req, res) => {
  try {
    const policies = await db.select().from(securityPolicies).orderBy(desc(securityPolicies.createdAt));
    res.json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch policies" });
  }
});

// الحصول على الاقتراحات
router.get("/suggestions", async (req, res) => {
  try {
    const suggestions = await db.select().from(securityPolicySuggestions).orderBy(desc(securityPolicySuggestions.createdAt));
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch suggestions" });
  }
});

// الحصول على الانتهاكات
router.get("/violations", async (req, res) => {
  try {
    const violations = await db.select().from(securityPolicyViolations).orderBy(desc(securityPolicyViolations.createdAt));
    res.json({ success: true, data: violations });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch violations" });
  }
});

export default router;
