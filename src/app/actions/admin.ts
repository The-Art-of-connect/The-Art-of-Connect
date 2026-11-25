"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit, rolesFor } from "@/lib/admin";
import { LAUNCH_KEYS } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";

/**
 * Owner Portal actions. Each one re-checks the caller's role on the server,
 * then writes with the caller's own session so database row-level security
 * applies as a second, independent check. Every change is audited.
 */
export type ActionResult = { ok: boolean; message: string } | null;
const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message: string): ActionResult => ({ ok: true, message });

/** Switches that open the platform to the public need a typed confirmation. */
const CRITICAL = new Set(["registrations_open", "payments_live", "counseling_live", "relationships_live", "business_live", "counselor_applications_open", "identity_verification_live"]);

export async function setLaunchSetting(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(rolesFor("/admin/settings"));
  const key = String(form.get("key"));
  const enable = form.get("enable") === "true";
  if (!(LAUNCH_KEYS as readonly string[]).includes(key)) return fail("Unknown setting.");
  if (enable && CRITICAL.has(key) && form.get("confirm") !== "AUTHORIZE") return fail("Type AUTHORIZE to confirm.");

  const supabase = (await createClient())!;
  const { data: auth } = await supabase.auth.getUser();
  const { error, count } = await supabase
    .from("platform_settings")
    .update({ value: enable, updated_by: auth.user?.id, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("key", key);
  if (error || !count) return fail("The change was not saved.");
  await audit(enable ? "launch.enable" : "launch.disable", "platform_settings", key);
  revalidatePath("/", "layout");
  return done(`${key.replaceAll("_", " ")} ${enable ? "enabled" : "disabled"}.`);
}

export async function addToAllowlist(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(rolesFor("/admin/settings"));
  const parsed = z.object({ email: z.email(), note: z.string().max(200).optional() }).safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    note: String(form.get("note") ?? "") || undefined,
  });
  if (!parsed.success) return fail("Enter a valid email.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("signup_allowlist").upsert({ email: parsed.data.email, note: parsed.data.note ?? null });
  if (error) return fail("Could not add that email.");
  await audit("allowlist.add", "signup_allowlist", parsed.data.email);
  revalidatePath("/admin/settings");
  return done(`${parsed.data.email} can now create an account.`);
}

export async function reviewApplication(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(rolesFor("/admin/counselors"));
  const parsed = z
    .object({
      id: z.uuid(),
      decision: z.enum(["in_review", "approved", "rejected", "more_info"]),
      notes: z.string().max(2000),
      lookupUrl: z.union([z.literal(""), z.url().max(500)]),
    })
    .safeParse({ id: form.get("id"), decision: form.get("decision"), notes: String(form.get("notes") ?? ""), lookupUrl: String(form.get("lookupUrl") ?? "").trim() });
  if (!parsed.success) return fail("Choose a decision (and use a full https:// link for the license lookup).");
  const checklist = {
    identity_checked: form.get("identity_checked") === "on",
    license_verified: form.get("license_verified") === "on",
    disciplinary_check_clear: form.get("disciplinary_check_clear") === "on",
    insurance_confirmed: form.get("insurance_confirmed") === "on",
    references_checked: form.get("references_checked") === "on",
    license_lookup_url: parsed.data.lookupUrl || null,
  };
  const supabase = (await createClient())!;
  const counseling = supabase.schema("counseling");
  const { data: app, error } = await counseling
    .from("applications")
    .update({ ...checklist, status: parsed.data.decision, reviewer_notes: parsed.data.notes || null, reviewer_id: viewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("user_id, legal_name, license_type, certifications, specialties, professional_type")
    .single();
  // The database refuses approval until the credential checklist is complete.
  if (error || !app) return fail(error?.message?.match(/before approval/) ? error.message : "The review was not saved.");

  if (parsed.data.decision === "approved") {
    // Verified, but not listed until the counselor completes their profile
    // and the counseling experience is launched.
    const { error: e2 } = await counseling.from("counselors").upsert({
      user_id: app.user_id,
      professional_name: app.legal_name,
      credentials: app.license_type ?? app.certifications,
      professional_type: app.professional_type,
      specialties: app.specialties,
      is_verified: true,
    });
    if (e2) return fail("Application approved, but the counselor record could not be created.");
  }
  await audit(`counselor.${parsed.data.decision}`, "counseling.applications", parsed.data.id);
  revalidatePath("/admin/counselors");
  return done("Review saved.");
}

export async function setExperienceAccess(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(rolesFor("/admin/access"));
  const parsed = z
    .object({ email: z.email(), experience: z.enum(["relationships", "business", "counseling"]), grant: z.boolean() })
    .safeParse({ email: String(form.get("email") ?? "").trim().toLowerCase(), experience: form.get("experience"), grant: form.get("grant") === "true" });
  if (!parsed.success) return fail("Enter a member email and experience.");
  const supabase = (await createClient())!;
  const { data: member } = await supabase.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (!member) return fail("No member with that email.");

  const { error } = parsed.data.grant
    ? await supabase.from("experience_access").upsert({ user_id: member.id, experience: parsed.data.experience, status: "active", source: "owner_grant", granted_by: viewer.id })
    : await supabase.from("experience_access").update({ status: "revoked" }).eq("user_id", member.id).eq("experience", parsed.data.experience);
  if (error) return fail("Access was not changed.");
  await audit(parsed.data.grant ? "access.grant" : "access.revoke", "experience_access", member.id, { experience: parsed.data.experience });
  revalidatePath("/admin/access");
  return done(`${parsed.data.experience} access ${parsed.data.grant ? "granted to" : "revoked for"} ${parsed.data.email}.`);
}

export async function setAccountStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "admin"]);
  const parsed = z.object({ id: z.uuid(), status: z.enum(["active", "suspended", "closed"]) }).safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return fail("Invalid request.");
  if (parsed.data.id === viewer.id) return fail("You can’t change your own account status.");
  const supabase = (await createClient())!;
  const { error, count } = await supabase.from("profiles").update({ status: parsed.data.status }, { count: "exact" }).eq("id", parsed.data.id);
  if (error || !count) return fail("Status not changed.");
  await audit("account.status", "profiles", parsed.data.id, { status: parsed.data.status });
  revalidatePath("/admin/members");
  return done(`Account ${parsed.data.status}.`);
}

export async function updateTicket(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(rolesFor("/admin/support"));
  const parsed = z.object({ id: z.uuid(), status: z.enum(["open", "pending", "resolved", "closed"]) }).safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return fail("Invalid request.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("support_tickets").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return fail("Ticket not updated.");
  await audit("ticket.status", "support_tickets", parsed.data.id, { status: parsed.data.status });
  revalidatePath("/admin/support");
  return done("Ticket updated.");
}

export async function resolveReport(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(rolesFor("/admin/moderation"));
  const parsed = z.object({ id: z.uuid(), status: z.enum(["reviewing", "actioned", "dismissed"]) }).safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return fail("Invalid request.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("moderation_reports").update({ status: parsed.data.status, resolved_by: viewer.id }).eq("id", parsed.data.id);
  if (error) return fail("Report not updated.");
  await audit("moderation.status", "moderation_reports", parsed.data.id, { status: parsed.data.status });
  revalidatePath("/admin/moderation");
  return done("Report updated.");
}

export async function createPromotion(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(rolesFor("/admin/marketing"));
  const parsed = z
    .object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "Codes use 3–24 letters, numbers or dashes."),
      description: z.string().max(200),
      kind: z.enum(["percent", "amount"]),
      value: z.coerce.number().positive("Enter the discount."),
      startsAt: z.string().max(20),
      endsAt: z.string().max(20),
      maxRedemptions: z.string().max(9),
      tiers: z.array(z.string().max(40)).max(10),
    })
    .safeParse({
      code: form.get("code"),
      description: String(form.get("description") ?? ""),
      kind: form.get("kind"),
      value: form.get("value"),
      startsAt: String(form.get("startsAt") ?? ""),
      endsAt: String(form.get("endsAt") ?? ""),
      maxRedemptions: String(form.get("maxRedemptions") ?? ""),
      tiers: form.getAll("tiers").map(String),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the promotion.");
  const d = parsed.data;
  if (d.kind === "percent" && (d.value < 1 || d.value > 100)) return fail("Percent off must be 1–100.");
  const supabase = (await createClient())!;
  // Created inactive; switch it on when ready. Codes only apply once payments launch.
  const { error } = await supabase.from("promotions").insert({
    code: d.code,
    description: d.description || null,
    percent_off: d.kind === "percent" ? Math.round(d.value) : null,
    amount_off_cents: d.kind === "amount" ? Math.round(d.value * 100) : null,
    starts_at: d.startsAt ? new Date(d.startsAt).toISOString() : null,
    ends_at: d.endsAt ? new Date(d.endsAt).toISOString() : null,
    max_redemptions: d.maxRedemptions ? Number(d.maxRedemptions) : null,
    applies_to_tiers: d.tiers,
    is_public_offer: form.get("publicOffer") === "on",
  });
  if (error) return fail(error.code === "23505" ? "That code already exists." : "Promotion not created.");
  await audit("promotion.create", "promotions", d.code);
  revalidatePath("/admin/marketing");
  return done(`${d.code} created (inactive).`);
}

export async function togglePromotion(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(rolesFor("/admin/marketing"));
  const parsed = z.object({ id: z.uuid(), field: z.enum(["is_active", "is_public_offer"]), on: z.boolean() }).safeParse({ id: form.get("id"), field: form.get("field"), on: form.get("on") === "true" });
  if (!parsed.success) return fail("Invalid request.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("promotions").update({ [parsed.data.field]: parsed.data.on }).eq("id", parsed.data.id);
  if (error) return fail("Not updated.");
  await audit("promotion.toggle", "promotions", parsed.data.id, { [parsed.data.field]: parsed.data.on });
  revalidatePath("/admin/marketing");
  revalidatePath("/membership");
  return done("Updated.");
}

export async function reviewReferral(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(rolesFor("/admin/access"));
  const parsed = z.object({ id: z.uuid(), status: z.enum(["approved", "rejected"]) }).safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return fail("Invalid request.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("referrals").update({ status: parsed.data.status, reviewed_by: viewer.id }).eq("id", parsed.data.id);
  if (error) return fail("Referral not updated.");
  await audit(`referral.${parsed.data.status}`, "referrals", parsed.data.id);
  revalidatePath("/admin/access");
  return done("Referral updated.");
}

const SAFETY_TOGGLES = ["require_identity_for_matchmaking", "hide_flagged_from_matchmaking"] as const;
const SAFETY_NUMBERS = { report_flag_threshold: [1, 50], max_daily_connection_requests: [1, 500] } as const;

/** Owner-only safety settings (identity requirement, thresholds, caps). */
export async function saveSafetySettings(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  for (const key of SAFETY_TOGGLES) {
    await supabase.from("platform_settings").update({ value: form.get(key) === "on" }).eq("key", key);
  }
  for (const [key, [min, max]] of Object.entries(SAFETY_NUMBERS)) {
    const n = Number(form.get(key));
    if (!Number.isInteger(n) || n < min || n > max) return fail(`${key.replaceAll("_", " ")} must be between ${min} and ${max}.`);
    await supabase.from("platform_settings").update({ value: n }).eq("key", key);
  }
  await audit("safety.settings", "platform_settings", "safety");
  revalidatePath("/admin/safety");
  return done("Safety settings saved.");
}

export async function updateSafetyFlag(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "admin", "moderator"]);
  const parsed = z.object({ id: z.uuid(), status: z.enum(["reviewing", "resolved", "dismissed"]) }).safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return fail("Invalid request.");
  const supabase = (await createClient())!;
  const { error } = await supabase
    .from("safety_flags")
    .update({ status: parsed.data.status, resolved_by: viewer.id, resolved_at: parsed.data.status === "reviewing" ? null : new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return fail("Not updated.");
  await audit("safety.flag", "safety_flags", parsed.data.id, { status: parsed.data.status });
  revalidatePath("/admin/safety");
  return done("Flag updated.");
}

export async function flagAccount(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "admin", "moderator"]);
  const parsed = z
    .object({ email: z.email(), reason: z.enum(["payment_fraud", "spam", "manual"]), details: z.string().trim().max(1000) })
    .safeParse({ email: String(form.get("email") ?? "").trim().toLowerCase(), reason: form.get("reason"), details: String(form.get("details") ?? "") });
  if (!parsed.success) return fail("Enter the member’s email and a reason.");
  const supabase = (await createClient())!;
  const { data: member } = await supabase.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (!member) return fail("No member with that email.");
  const { error } = await supabase.from("safety_flags").insert({ user_id: member.id, reason: parsed.data.reason, details: parsed.data.details || null, created_by: viewer.id });
  if (error) return fail(error.code === "23505" ? "That member already has an open flag for this reason." : "Not flagged.");
  await audit("safety.flag.create", "safety_flags", member.id, { reason: parsed.data.reason });
  revalidatePath("/admin/safety");
  return done("Account flagged for review.");
}

/** Owner updates a Launch Readiness checklist item (status, note, approval). */
export async function updateChecklistItem(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const parsed = z
    .object({ key: z.string().regex(/^[a-z0-9:_-]{2,60}$/), status: z.enum(["pending", "in_progress", "done", "blocked", "not_applicable"]), note: z.string().trim().max(1000) })
    .safeParse({ key: form.get("key"), status: form.get("status"), note: String(form.get("note") ?? "") });
  if (!parsed.success) return fail("Invalid update.");
  const approve = form.get("approve") === "on";
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("launch_checklist")
    .update(
      {
        status: parsed.data.status,
        note: parsed.data.note || null,
        approved_by: approve ? viewer.id : null,
        approved_at: approve ? new Date().toISOString() : null,
      },
      { count: "exact" },
    )
    .eq("key", parsed.data.key);
  if (error || !count) return fail("Not saved.");
  await audit("launch.checklist", "launch_checklist", parsed.data.key, { status: parsed.data.status, approved: approve });
  revalidatePath("/admin/launch");
  return done("Saved.");
}

/** Full or partial refund of a recorded payment (owner or finance). */
export async function refundPayment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "finance"]);
  const parsed = z.object({ id: z.uuid(), amount: z.string().trim().max(12) }).safeParse({ id: form.get("id"), amount: String(form.get("amount") ?? "") });
  if (!parsed.success) return fail("Invalid request.");
  const supabase = (await createClient())!;
  const { data: p } = await supabase.from("payments").select("amount_cents, refunded_amount_cents, stripe_payment_ref, livemode").eq("id", parsed.data.id).maybeSingle();
  if (!p) return fail("Payment not found.");
  if (!p.stripe_payment_ref) return fail("This payment can’t be refunded automatically. Refund it in the Stripe Dashboard.");
  const remaining = p.amount_cents - p.refunded_amount_cents;
  const amount = parsed.data.amount ? Math.round(Number(parsed.data.amount.replace(/[$,]/g, "")) * 100) : remaining;
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) return fail(`Enter an amount up to ${(remaining / 100).toFixed(2)}.`);
  const { getStripe } = await import("@/lib/stripe");
  const { stripe, reason } = await getStripe();
  if (!stripe) return fail(reason ?? "Payments are not configured.");
  try {
    await stripe.refunds.create({ payment_intent: p.stripe_payment_ref, amount, metadata: { payment_id: parsed.data.id } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Stripe could not process the refund.");
  }
  await audit("payment.refund", "payments", parsed.data.id, { amount_cents: amount, livemode: p.livemode });
  revalidatePath("/admin/revenue");
  return done(`Refund of $${(amount / 100).toFixed(2)} sent to Stripe. The payment updates when Stripe confirms.`);
}
