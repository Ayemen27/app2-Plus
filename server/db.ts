import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { envLoader } from "./utils/env-loader";

const { Pool } = pg;

// دالة لجلب DATABASE_URL بشكل آمن وديناميكي
function getDatabaseUrl() {
  const dbUrl = (process.env.DATABASE_URL || envLoader.get("DATABASE_URL") || "").replace(/["']/g, "").trim();
  if (!dbUrl) {
    console.warn("⚠️ [PostgreSQL] DATABASE_URL is not defined or empty. Connection will fail.");
  } else {
    console.log("✅ [PostgreSQL] DATABASE_URL found and loaded");
  }
  return dbUrl;
}

// دالة لاستخراج كلمة المرور من DATABASE_URL بشكل آمن
function getPasswordFromUrl(url: string): string {
  try {
    if (!url) return "";
    // استخدام URL parser الرسمي لضمان الدقة وتجنب مشاكل SCRAM
    const parsed = new URL(url);
    const password = parsed.password ? decodeURIComponent(parsed.password) : "";
    console.log(`🔑 [PostgreSQL] Password extracted (length: ${password.length})`);
    return password;
  } catch (e) {
    // Fallback لـ Regex إذا فشل الـ URL parser (مثلاً في حالة عدم وجود بروتوكول)
    const match = url.match(/:([^:@]+)@/);
    return match ? decodeURIComponent(match[1]) : "";
  }
}

const dbUrl = getDatabaseUrl();

export const pool = new Pool({
  connectionString: dbUrl,
  // فرض تحويل كلمة المرور إلى String صريح لضمان توافق SASL SCRAM-SHA-256
  password: String(getPasswordFromUrl(dbUrl)),
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('⚠️ [PostgreSQL] Pool Error:', err.message);
});

export const db = drizzle(pool, { schema });

// دالة مساعدة للتحقق من حالة الاتصال
export async function checkDBConnection() {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    return false;
  }
}
