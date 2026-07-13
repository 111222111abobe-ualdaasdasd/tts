import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Полная очистка истории. Номера записей НЕ сбрасываем (не делаем
// RESTART IDENTITY), чтобы избежать коллизий с закэшированным в браузере
// аудио по старым номерам.
export async function DELETE() {
  try {
    await db.execute(sql`TRUNCATE TABLE tts_items`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/history/all] error:", err);
    return NextResponse.json(
      { error: "Не удалось очистить историю." },
      { status: 500 },
    );
  }
}
