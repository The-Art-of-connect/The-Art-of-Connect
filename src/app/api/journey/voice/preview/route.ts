import { NextResponse } from "next/server";
import { z } from "zod";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { voiceById } from "@/lib/journey-customize";

export const dynamic = "force-dynamic";

const Body = z.object({
  voice: z.string().regex(/^[a-z]{2,20}$/),
  mime: z.literal("audio/wav"),
  audio: z.string().min(1000).max(1_900_000).regex(/^[A-Za-z0-9+/=]+$/),
});

/** Owner only: saves a GPT-Live voice sample recorded in the owner's browser, so members can preview voices with no AI cost. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!hasRole(viewer, ["owner"]) || viewer?.viewAs) return NextResponse.json({ ok: false, message: "Only the owner can save voice previews." }, { status: 403 });
  if (!(await getMfaStatus()).verified) return NextResponse.json({ ok: false, message: "Please complete two-step verification first." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !voiceById(parsed.data.voice)) return NextResponse.json({ ok: false, message: "That sample couldn't be saved." }, { status: 400 });
  const db = createAdminClient();
  if (!db) return NextResponse.json({ ok: false, message: "Not available right now." }, { status: 503 });
  const { error } = await db.from("journey_voice_previews").upsert({
    voice: parsed.data.voice, audio_base64: parsed.data.audio, mime: parsed.data.mime, source: "gpt-live", created_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ ok: false, message: "That sample couldn't be saved." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
