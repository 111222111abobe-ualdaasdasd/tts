import { NextResponse } from "next/server";
import { db } from "@/db";
import { ttsItems } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await db
      .select({
        id: ttsItems.id,
        text: ttsItems.text,
        voice: ttsItems.voice,
        voiceName: ttsItems.voiceName,
        rate: ttsItems.rate,
        pitch: ttsItems.pitch,
        volume: ttsItems.volume,
        durationMs: ttsItems.durationMs,
        createdAt: ttsItems.createdAt,
      })
      .from(ttsItems)
      .orderBy(desc(ttsItems.id))
      .limit(50);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[/api/history] database error:", err);
    return NextResponse.json(
      {
        error: "Не удалось подключиться к базе данных.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
