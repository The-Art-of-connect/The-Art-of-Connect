import { NextResponse } from "next/server";
import { z } from "zod";
import { endVoice } from "@/lib/journey-voice";

export const dynamic = "force-dynamic";
const Body = z.object({ voiceSessionId: z.uuid(), transcript: z.string().max(100000).default(""), saveTranscript: z.boolean().default(false) });

/** Ends a voice conversation; the server measures the time used. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const seconds = await endVoice(parsed.data.voiceSessionId, parsed.data.transcript, parsed.data.saveTranscript);
  return NextResponse.json({ ok: true, seconds }, { headers: { "Cache-Control": "no-store" } });
}
