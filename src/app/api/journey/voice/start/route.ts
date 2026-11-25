import { NextResponse } from "next/server";
import { z } from "zod";
import { startVoice } from "@/lib/journey-voice";
import { allow } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
const Body = z.object({ mode: z.enum(["business", "life", "love", "concierge"]), style: z.enum(["warm", "calm", "confident", "soft", "friendly"]), ownerTest: z.boolean().optional(),
  lesson: z.string().regex(/^[a-z0-9-]{2,60}(\/[a-z0-9-]{2,60})?$/).nullish(),
  discovery: z.string().regex(/^[a-z-]{2,40}$/).nullish(),
});

/** Mints a short-lived voice key only after membership, minutes and budget checks pass. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Please try again." }, { status: 400 });
  if (!(await allow("journey-voice", 10, 600))) return NextResponse.json({ ok: false, message: "Please wait a moment before starting again." }, { status: 429 });
  const r = await startVoice(parsed.data);
  return NextResponse.json(r, { status: r.ok ? 200 : 403, headers: { "Cache-Control": "no-store" } });
}
