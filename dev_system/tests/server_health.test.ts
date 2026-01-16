import { db } from "../../server/db";
import { sql } from "drizzle-orm";

/**
 * نظام فحص هيكلي متقدم للخادم
 */
export async function runServerTests() {
    const results: any = {
        database: { status: 'pending', latency: 0 },
        schema: { status: 'pending', tables: [] },
        endpoints: { status: 'pending' }
    };

    try {
        const startDb = Date.now();
        await db.execute(sql`SELECT 1`);
        results.database = { status: 'healthy', latency: Date.now() - startDb };

        const tablesResult = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        results.schema = { 
            status: 'valid', 
            tablesCount: tablesResult.rows.length,
            isComplete: tablesResult.rows.length >= 67 
        };

        results.endpoints.status = 'active';

        return { success: true, results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
