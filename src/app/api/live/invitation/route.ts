import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The live Q&A invitation for the signed-in member (once per session, only while live, only if they allow pop-ups). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return NextResponse.json({ invitation: null });
  const db = await createClient();
  const { data } = db ? await db.rpc("live_invitation") : { data: null };
  return NextResponse.json({ invitation: (data as unknown[] | null)?.[0] ?? null }, { headers: { "cache-control": "no-store" } });
}

/** "Maybe later" or "Join": never show this session's pop-up again (the Message Center keeps the invitation). */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return NextResponse.json({ ok: false });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const db = await createClient();
  if (!db || !id || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ ok: false });
  await db.from("member_notices").update({ popup_seen_at: new Date().toISOString() }).eq("id", id).eq("user_id", viewer.id);
  return NextResponse.json({ ok: true });
}
