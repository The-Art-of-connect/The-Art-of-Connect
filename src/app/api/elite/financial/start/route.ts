import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { FC_CONSENT_VERSION, startFinancialSession } from "@/lib/elite-verification";

/** Starts a Stripe Financial Connections session for an Elite candidate who has given express consent. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { consent?: boolean; version?: string };
  if (body.consent !== true || body.version !== FC_CONSENT_VERSION) return NextResponse.json({ error: "Please read and accept the authorization first." }, { status: 400 });
  if (!(await allow(`elite-fc:${viewer.id}`, 5, 86400))) return NextResponse.json({ error: "Please try again tomorrow." }, { status: 429 });
  const db = createAdminClient();
  const { data: c } = db ? await db.from("elite_candidates").select("id, status, screening_meets, screening_result").eq("user_id", viewer.id).maybeSingle() : { data: null };
  if (!c || !(c.screening_meets || c.screening_result === "owner_review") || ["revoked", "not_started", "membership_activated"].includes(c.status)) {
    return NextResponse.json({ error: "Bank verification is offered after preliminary eligibility." }, { status: 403 });
  }
  try {
    const r = await startFinancialSession({ userId: viewer.id, email: viewer.email, candidateId: c.id });
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.message }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Stripe couldn't start the connection. Nothing was shared." }, { status: 502 });
  }
}
