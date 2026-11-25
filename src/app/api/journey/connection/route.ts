import { NextResponse } from "next/server";
import { checkOpenAIConnection } from "@/lib/openai";
import { allow } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Server-side OpenAI connection check. Never returns or logs the key, uses no
 * tokens (it only lists models) and is rate limited. Reveals only whether
 * Journey's connection works and which chat models are available.
 */
export async function GET() {
  if (!(await allow("openai-connection", 10, 3600))) return NextResponse.json({ ok: false, message: "Please try again later." }, { status: 429 });
  const c = await checkOpenAIConnection();
  return NextResponse.json({ configured: c.configured, reachable: c.reachable, status: c.status, models: c.models, checkedAt: c.checkedAt, error: c.error ?? null }, { headers: { "Cache-Control": "no-store" } });
}
