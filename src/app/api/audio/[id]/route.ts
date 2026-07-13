import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ttsItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Неверный идентификатор." }, { status: 400 });
  }

  const rows = await db
    .select({ audio: ttsItems.audio })
    .from(ttsItems)
    .where(eq(ttsItems.id, numId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Аудио не найдено." }, { status: 404 });
  }

  const audio = rows[0].audio;
  const headers = new Headers();
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Content-Length", String(audio.length));
  // Запрещаем кэширование: номера записей могут повторно использоваться
  // (например, после очистки базы), и браузер не должен подсовывать старый звук.
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Content-Disposition", `inline; filename="speech-${numId}.mp3"`);

  return new NextResponse(audio as unknown as BodyInit, { headers });
}
