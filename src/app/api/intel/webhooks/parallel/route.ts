import { NextResponse } from "next/server";
import { serverSecret } from "@/lib/env";
import { verifyParallelSignature } from "@/lib/intel-providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeParallelRun } from "@/lib/intel-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Parallel task, FindAll and Monitor deliveries (Standard Webhooks signatures). Duplicates are acknowledged once (dedupe on webhook-id). */
export async function POST(req: Request) {
  const secret = serverSecret("PARALLEL_WEBHOOK_SECRET").trim();
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await req.text();
  const h = { id: req.headers.get("webhook-id"), timestamp: req.headers.get("webhook-timestamp"), signature: req.headers.get("webhook-signature") };
  if (raw.length > 2_000_000 || !verifyParallelSignature(h, raw, secret)) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  let body: { type?: string; data?: { run_id?: string; id?: string; status?: string } } = {};
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const db = createAdminClient();
  if (db) {
    await db.from("intel_webhook_deliveries").upsert(
      { provider: "parallel", delivery_id: String(h.id).slice(0, 200), event_type: String(body.type ?? "unknown").slice(0, 80), resource_id: String(body.data?.run_id ?? body.data?.id ?? "").slice(0, 200) || null },
      { onConflict: "provider,delivery_id", ignoreDuplicates: true },
    );
  }
  // A finished investigation: fetch its cited result and update the member's assignment.
  if (body.type === "task_run.status" && body.data?.run_id && ["completed", "failed", "cancelled"].includes(String(body.data.status))) {
    try { await completeParallelRun(String(body.data.run_id)); } catch { /* the member's page can refresh it */ }
  }
  return NextResponse.json({ received: true });
}
