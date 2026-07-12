import { NextResponse } from "next/server";
import { getVoices } from "@/lib/voices";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const voices = await getVoices();
    return NextResponse.json({ voices });
  } catch (err) {
    console.error("[/api/voices]", err);
    return NextResponse.json(
      { error: "Не удалось загрузить список голосов." },
      { status: 502 },
    );
  }
}
