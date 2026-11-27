import { NextResponse } from "next/server";
import { serverSecret } from "@/lib/env";
import { verifyExaSignature } from "@/lib/intel-providers";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exa Websets and Monitors deliveries. Unsigned, stale or mis-signed requests are rejected; duplicates are acknowledged once. */
export async function POST(req: Request) {
  const secret = serverSecret("EXA_WEBHOOK_SECRET").trim();
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 2_000_000 || !verifyExaSignature(req.headers.get("exa-signature"), raw, secret)) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  let body: { id?: string; type?: string; data?: { id?: string } } = {};
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const db = createAdminClient();
  if (db && body.id && body.type) {
    await db.from("intel_webhook_deliveries").upsert(
      { provider: "exa", delivery_id: String(body.id).slice(0, 200), event_type: String(body.type).slice(0, 80), resource_id: body.data?.id ? String(body.data.id).slice(0, 200) : null },
      { onConflict: "provider,delivery_id", ignoreDuplicates: true },
    );
  }
  return NextResponse.json({ received: true });
}
