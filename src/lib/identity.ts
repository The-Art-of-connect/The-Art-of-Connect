import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Identity & age verification through Stripe Identity. Stripe collects and
 * holds the government ID and selfie; this platform stores only the outcome
 * (verified or not, and whether the person meets the minimum age).
 */
export const IDENTITY_PROVIDER = "stripe_identity";

/** Whole years between a date of birth and today (UTC). */
export function ageFromDob(dob: { day?: number | null; month?: number | null; year?: number | null } | null | undefined, today = new Date()) {
  if (!dob?.year || !dob.month || !dob.day) return null;
  let age = today.getUTCFullYear() - dob.year;
  const m = today.getUTCMonth() + 1 - dob.month;
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.day)) age--;
  return age;
}

/** Applies a verification session's outcome (called from the signed Stripe webhook). */
export async function recordVerification(stripe: Stripe, sessionId: string, minimumAge: number) {
  const db = createAdminClient();
  if (!db) return;
  const session = await stripe.identity.verificationSessions.retrieve(sessionId, { expand: ["verified_outputs"] });
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const status =
    session.status === "verified" ? "verified" : session.status === "requires_input" ? "requires_input" : session.status === "canceled" ? "canceled" : "processing";
  const age = ageFromDob(session.verified_outputs?.dob);
  const ageOk = age == null ? null : age >= minimumAge;

  await db
    .from("identity_verifications")
    .update({
      status: status === "verified" && ageOk === false ? "failed" : status,
      age_meets_minimum: ageOk,
      failure_reason: ageOk === false ? `Below minimum age of ${minimumAge}` : session.last_error?.code ?? null,
      verified_at: status === "verified" && ageOk ? new Date().toISOString() : null,
    })
    .eq("provider_session_id", session.id);

  if (status === "verified" && ageOk) {
    await db.from("profiles").update({ identity_verified_at: new Date().toISOString() }).eq("id", userId);
    // Elite: a verified identity may complete a conclusive candidacy automatically.
    await db.rpc("elite_auto_assess", { p_user: userId });
  }
  if (status === "verified" && ageOk === false) {
    await db.from("safety_flags").insert({ user_id: userId, reason: "identity_mismatch", details: "Verified identity is below the minimum membership age" });
  }
}
