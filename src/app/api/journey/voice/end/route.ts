import { NextResponse } from "next/server";
import { z } from "zod";
import { endVoice } from "@/lib/journey-voice";

export const dynamic = "force-dynamic";
const Body = z.object({
  voiceSessionId: z.uuid(),
  lines: z.array(z.object({ role: z.enum(["member", "journey"]), text: z.string().max(8000) })).max(400).default([]),
  saveTranscript: z.boolean().default(false),
});

/** Ends a live conversation; the server measures the time used. Raw audio is never received or stored. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const seconds = await endVoice(parsed.data.voiceSessionId, parsed.data.lines, parsed.data.saveTranscript);
  return NextResponse.json({ ok: true, seconds }, { headers: { "Cache-Control": "no-store" } });
}
