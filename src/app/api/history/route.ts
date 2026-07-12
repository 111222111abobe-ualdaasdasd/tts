import { NextResponse } from "next/server";
import { db } from "@/db";
import { ttsItems } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
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
}
