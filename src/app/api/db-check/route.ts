import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Диагностический эндпоинт: проверяет, подключается ли база данных.
// Открой в браузере:  https://<твой-сайт>.netlify.app/api/db-check
export async function GET() {
  const maskedUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")
    : "(не задана)";

  try {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    const ok = (result as unknown as Array<{ ok?: number }>)?.[0]?.ok;
    return NextResponse.json({
      database: "connected",
      testValue: ok,
      databaseUrl: maskedUrl,
    });
  } catch (err) {
    console.error("[/api/db-check] error:", err);
    return NextResponse.json(
      {
        database: "FAILED",
        error: err instanceof Error ? err.message : String(err),
        databaseUrl: maskedUrl,
      },
      { status: 500 },
    );
  }
}
