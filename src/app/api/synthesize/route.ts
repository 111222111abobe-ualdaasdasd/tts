import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ttsItems } from "@/db/schema";
import { desc, inArray, not, sql } from "drizzle-orm";
import { getVoices } from "@/lib/voices";
import { synthesize as synthesizeSpeech } from "@/lib/edge-tts";

export const dynamic = "force-dynamic";

const MAX_CHARS = 5000;
const MAX_HISTORY = 40;

function clampNum(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Percentage prosody value, e.g. rate/volume -> "+10%" / "-5%". */
function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n}%`;
}

/** Pitch value -> "+2Hz" / "-8Hz". */
function hz(n: number): string {
  return `${n >= 0 ? "+" : ""}${n}Hz`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const data = (body ?? {}) as Record<string, unknown>;
  const text = String(data.text ?? "").trim();
  const voice = String(data.voice ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "Введите текст для озвучки." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Текст слишком длинный (максимум ${MAX_CHARS} символов).` },
      { status: 400 },
    );
  }
  if (!voice) {
    return NextResponse.json({ error: "Выберите голос." }, { status: 400 });
  }

  const rate = clampNum(data.rate, -50, 200, 0);
  const volume = clampNum(data.volume, -100, 100, 0);
  const pitch = clampNum(data.pitch, -50, 50, 0);

  let audioBuffer: Buffer;
  let durationMs: number | null = null;
  try {
    const result = await synthesizeSpeech(text, {
      voice,
      rate: pct(rate),
      volume: pct(volume),
      pitch: hz(pitch),
    });
    audioBuffer = result.audio;
    durationMs = result.durationMs;
  } catch (err) {
    console.error("[/api/synthesize] edge-tts error:", err);
    return NextResponse.json(
      {
        error:
          "Не удалось связаться со службой синтеза речи. Попробуйте ещё раз через минуту.",
      },
      { status: 502 },
    );
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    return NextResponse.json(
      { error: "Служба вернула пустое аудио. Попробуйте другой текст или голос." },
      { status: 502 },
    );
  }

  const voiceName =
    (await getVoices()).find((v) => v.shortName === voice)?.name ?? voice;

  const [inserted] = await db
    .insert(ttsItems)
    .values({
      text,
      voice,
      voiceName,
      rate: String(rate),
      pitch: String(pitch),
      volume: String(volume),
      durationMs,
      audio: audioBuffer,
    })
    .returning({ id: ttsItems.id, createdAt: ttsItems.createdAt });

  // Keep history bounded — remove anything outside the most recent N entries.
  const keepIds = db
    .select({ id: ttsItems.id })
    .from(ttsItems)
    .orderBy(desc(ttsItems.id))
    .limit(MAX_HISTORY);
  await db.delete(ttsItems).where(not(inArray(ttsItems.id, keepIds)));

  return NextResponse.json({
    id: inserted!.id,
    text,
    voice,
    voiceName,
    rate: String(rate),
    pitch: String(pitch),
    volume: String(volume),
    durationMs,
    createdAt: inserted!.createdAt,
    size: audioBuffer.length,
  });
}

export async function GET() {
  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(ttsItems);
  return NextResponse.json({ count: count[0]?.n ?? 0 });
}
