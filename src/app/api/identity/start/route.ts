import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { IDENTITY_PROVIDER } from "@/lib/identity";
import { getLaunchState } from "@/lib/launch";
import { allow } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Starts (or resumes) a Stripe Identity verification for the signed-in
 * member and returns the secure Stripe-hosted URL. Disabled until the owner
 * authorizes identity verification (each verification is billed by Stripe).
 */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await getLaunchState()).identity_verification_live) {
    return NextResponse.json({ error: "Identity verification opens at launch." }, { status: 403 });
  }
  if (viewer.accountType === "member" && !viewer.ageEligible) return NextResponse.json({ error: "Account not eligible." }, { status: 403 });
  if (!(await allow(`identity:${viewer.id}`, 3, 86400))) return NextResponse.json({ error: "Please try again tomorrow." }, { status: 429 });

  const { stripe, reason } = await getStripe();
  const db = createAdminClient();
  if (!stripe || !db) return NextResponse.json({ error: reason ?? "Verification is not configured." }, { status: 503 });

  // Resume an unfinished session instead of paying for a new one.
  const { data: open } = await db
    .from("identity_verifications")
    .select("provider_session_id")
    .eq("user_id", viewer.id)
    .in("status", ["pending", "requires_input"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) {
    const existing = await stripe.identity.verificationSessions.retrieve(open.provider_session_id);
    if (existing.url && (existing.status === "requires_input" || existing.status === "processing")) return NextResponse.json({ url: existing.url });
  }

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    options: { document: { require_matching_selfie: true, require_live_capture: true, allowed_types: ["driving_license", "passport", "id_card"] } },
    metadata: { user_id: viewer.id },
    provided_details: { email: viewer.email },
    return_url: `${env.siteUrl}/app/verify?returned=1`,
  });
  await db.from("identity_verifications").insert({ user_id: viewer.id, provider: IDENTITY_PROVIDER, provider_session_id: session.id, status: "pending" });
  return NextResponse.json({ url: session.url });
}
