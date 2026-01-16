import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { envLoader } from "./utils/env-loader";

const { Pool } = pg;

// دالة لجلب DATABASE_URL بشكل آمن وديناميكي
function getDatabaseUrl() {
  // Try to find the external DATABASE_URL from environment variables
  // We prioritize the one that doesn't point to localhost if possible, 
  // but usually DATABASE_URL is the standard.
  const dbUrl = (process.env.DATABASE_URL || "").replace(/["']/g, "").trim();
  
  if (!dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    console.warn("⚠️ [PostgreSQL] DATABASE_URL points to localhost or is missing. External connection might fail.");
  } else {
    console.log("✅ [PostgreSQL] External DATABASE_URL loaded correctly");
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
  // Ensure SSL is enabled for Neon/external Postgres providers often used in Replit
  ssl: dbUrl.includes('neon.tech') || dbUrl.includes('replit') ? { rejectUnauthorized: false } : false,
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
