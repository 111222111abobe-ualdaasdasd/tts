import { NextResponse } from "next/server";
import { db } from "@/db";
import { ttsItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Неверный идентификатор." }, { status: 400 });
  }

  await db.delete(ttsItems).where(eq(ttsItems.id, numId));
  return NextResponse.json({ ok: true });
}
