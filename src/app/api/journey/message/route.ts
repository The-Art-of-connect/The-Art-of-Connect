import { NextResponse } from "next/server";
import { z } from "zod";
import { sendJourneyMessage } from "@/lib/journey-server";

export const dynamic = "force-dynamic";

const Body = z.object({
  mode: z.enum(["business", "life", "love", "concierge"]),
  message: z.string().trim().min(1).max(20000),
  // Generated once per message by the browser; resending it can never be charged twice.
  requestKey: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  conversationId: z.uuid().nullish(),
  homeChat: z.boolean().optional(),
  ownerTest: z.boolean().optional(),
  sessionId: z.uuid().nullish(),
  model: z.string().regex(/^[A-Za-z0-9._:-]{2,80}$/).nullish(),
  instructionVersion: z.number().int().positive().nullish(),
  comparisonId: z.uuid().nullish(),
  discovery: z.object({ sessionId: z.uuid(), summarize: z.boolean().optional(), skip: z.boolean().optional() }).nullish(),
  lesson: z.string().regex(/^[a-z0-9-]{2,60}(\/[a-z0-9-]{2,60})?$/).nullish(),
  guide: z.object({ ref: z.string().regex(/^[a-z0-9-]{2,60}(\/[a-z0-9-]{2,60})?$/), draft: z.boolean().optional(), transcript: z.string().max(60000).nullish(), assist: z.boolean().optional() }).nullish(),
  page: z.string().max(200).nullish(),
});

/** Journey written conversations. Every permission and spending check runs on the server before OpenAI is called. */
export async function POST(req: Request) {
  if (req.headers.get("content-type")?.includes("multipart/form-data"))
    return NextResponse.json({ ok: false, message: "Journey can't read attachments yet." }, { status: 415 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Please check your message and try again." }, { status: 400 });
  const result = await sendJourneyMessage(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status, headers: { "Cache-Control": "no-store" } });
}
