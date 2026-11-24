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
const CRITICAL = new Set(["registrations_open", "payments_live", "counseling_live", "relationships_live", "business_live", "counselor_applications_open"]);

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

export async function updatePlan(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(rolesFor("/admin/pricing"));
  const parsed = z
    .object({
      id: z.uuid(),
      name: z.string().trim().min(1).max(60),
      price: z.coerce.number().min(0).max(100000),
      interval: z.enum(["month", "year"]),
      stripePriceId: z.string().trim().max(100).regex(/^(price_[A-Za-z0-9]+)?$/, "Stripe price IDs start with price_"),
      active: z.boolean(),
    })
    .safeParse({
      id: form.get("id"),
      name: form.get("name"),
      price: form.get("price"),
      interval: form.get("interval"),
      stripePriceId: form.get("stripePriceId") ?? "",
      active: form.get("active") === "on",
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the package details.");
  const p = parsed.data;
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("membership_plans")
    .update(
      { name: p.name, price_cents: Math.round(p.price * 100), billing_interval: p.interval, stripe_price_id: p.stripePriceId || null, is_active: p.active },
      { count: "exact" },
    )
    .eq("id", p.id);
  if (error || !count) return fail("The package was not saved.");
  await audit("plan.update", "membership_plans", p.id, { price_cents: Math.round(p.price * 100), active: p.active });
  revalidatePath("/admin/pricing");
  return done(`${p.name} saved.`);
}

export async function reviewApplication(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(rolesFor("/admin/counselors"));
  const parsed = z
    .object({ id: z.uuid(), decision: z.enum(["in_review", "approved", "rejected", "more_info"]), notes: z.string().max(2000) })
    .safeParse({ id: form.get("id"), decision: form.get("decision"), notes: String(form.get("notes") ?? "") });
  if (!parsed.success) return fail("Choose a decision.");
  const supabase = (await createClient())!;
  const counseling = supabase.schema("counseling");
  const { data: app, error } = await counseling
    .from("applications")
    .update({ status: parsed.data.decision, reviewer_notes: parsed.data.notes || null, reviewer_id: viewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("user_id, legal_name, license_type, specialties")
    .single();
  if (error || !app) return fail("The review was not saved.");

  if (parsed.data.decision === "approved") {
    // Verified, but not listed until the counselor completes their profile
    // and the counseling experience is launched.
    const { error: e2 } = await counseling.from("counselors").upsert({
      user_id: app.user_id,
      professional_name: app.legal_name,
      credentials: app.license_type,
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
      percentOff: z.coerce.number().int().min(1).max(100),
    })
    .safeParse({ code: form.get("code"), description: String(form.get("description") ?? ""), percentOff: form.get("percentOff") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the promotion.");
  const supabase = (await createClient())!;
  // Created inactive; promotions only take effect once payments launch.
  const { error } = await supabase.from("promotions").insert({ code: parsed.data.code, description: parsed.data.description || null, percent_off: parsed.data.percentOff });
  if (error) return fail(error.code === "23505" ? "That code already exists." : "Promotion not created.");
  await audit("promotion.create", "promotions", parsed.data.code);
  revalidatePath("/admin/marketing");
  return done(`${parsed.data.code} created (inactive).`);
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
