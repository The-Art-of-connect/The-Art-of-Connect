"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Owner Portal pricing controls. Every value customers see — names,
 * descriptions, prices, discounts, fees, benefits, eligibility — is set here.
 * Owner or Finance may edit; only the Owner may publish. Row-level security
 * and database triggers enforce the same rules independently.
 */
const EDITORS = ["owner", "finance"] as const;
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

/** "$49.00" / "49" → 4900; blank → null (not yet priced). */
const money = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount." });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });
const percent = z.string().trim().transform((v, ctx) => {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 90) {
    ctx.addIssue({ code: "custom", message: "Discounts must be between 0 and 90%." });
    return z.NEVER;
  }
  return n;
});
const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12);
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, "Use 2–40 lowercase letters, numbers or dashes.");

async function done(action: string, table: string, id: string, details: Record<string, unknown> = {}) {
  await audit(action, table, id, details);
  revalidatePath("/admin/pricing");
  revalidatePath("/membership");
  revalidatePath("/professionals");
}

export async function saveGeneralPricing(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const parsed = z
    .object({
      currency: z.string().trim().toLowerCase().regex(/^[a-z]{3}$/, "Use a 3-letter currency code, e.g. usd."),
      annual: percent,
      couplesName: z.string().trim().min(1).max(60),
      couplesDescription: z.string().trim().max(400),
      couplesPrice: money,
      referral: z.string().trim().max(300),
    })
    .safeParse({ currency: str(f, "currency"), annual: str(f, "annual"), couplesName: str(f, "couplesName"), couplesDescription: str(f, "couplesDescription"), couplesPrice: str(f, "couplesPrice"), referral: str(f, "referral") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("pricing_config")
    .update({ currency: d.currency, annual_discount_percent: d.annual ?? 0, couples_upgrade_name: d.couplesName, couples_upgrade_description: d.couplesDescription, couples_upgrade_monthly_cents: d.couplesPrice, referral_reward_description: d.referral || null }, { count: "exact" })
    .eq("id", true);
  if (error || !count) return fail("Not saved.");
  await done("pricing.general", "pricing_config", "config", { annual: d.annual, couples: d.couplesPrice });
  return ok("Saved.");
}

export async function saveExperienceOffering(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const parsed = z
    .object({ experience: z.enum(["business", "counseling", "relationships"]), name: z.string().trim().min(1).max(60), subtitle: z.string().trim().max(80), description: z.string().trim().max(600), price: money })
    .safeParse({ experience: f.get("experience"), name: str(f, "name"), subtitle: str(f, "subtitle"), description: str(f, "description"), price: str(f, "price") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("experience_offerings")
    .update({ name: d.name, subtitle: d.subtitle, description: d.description, monthly_price_cents: d.price, benefits: lines(f.get("benefits")), is_active: f.get("active") === "on" }, { count: "exact" })
    .eq("experience", d.experience);
  if (error || !count) return fail("Not saved.");
  await done("pricing.experience", "experience_offerings", d.experience, { price: d.price });
  return ok(`${d.name} saved.`);
}

export async function saveTier(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const parsed = z
    .object({ slug, name: z.string().trim().min(1).max(60), description: z.string().trim().max(300), bundle: percent, annual: percent, setup: money, eligibility: z.string().trim().max(300) })
    .safeParse({ slug: str(f, "slug"), name: str(f, "name"), description: str(f, "description"), bundle: str(f, "bundle"), annual: str(f, "annual"), setup: str(f, "setup"), eligibility: str(f, "eligibility") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("membership_tiers")
    .update({ name: d.name, description: d.description, bundle_discount_percent: d.bundle ?? 0, annual_discount_percent: d.annual, setup_fee_cents: d.setup, benefits: lines(f.get("benefits")), eligibility: d.eligibility || null, is_active: f.get("active") === "on" }, { count: "exact" })
    .eq("slug", d.slug);
  if (error || !count) return fail("Not saved.");
  await done("pricing.tier", "membership_tiers", d.slug, { bundle: d.bundle, annual: d.annual, setup: d.setup });
  return ok(`${d.name} saved.`);
}

export async function saveAddon(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const parsed = z
    .object({
      slug,
      name: z.string().trim().min(1).max(60),
      description: z.string().trim().max(300),
      billing: z.enum(["monthly", "one_time"]),
      price: money,
      audience: z.enum(["member", "professional"]),
      requires: z.enum(["", "business", "counseling", "relationships"]),
      eligibility: z.string().trim().max(300),
    })
    .safeParse({ slug: str(f, "slug"), name: str(f, "name"), description: str(f, "description"), billing: f.get("billing"), price: str(f, "price"), audience: f.get("audience"), requires: str(f, "requires"), eligibility: str(f, "eligibility") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error } = await supabase.from("membership_addons").upsert({
    slug: d.slug, name: d.name, description: d.description, billing: d.billing, price_cents: d.price, audience: d.audience,
    requires_experience: d.requires || null, eligibility: d.eligibility || null, is_active: f.get("active") === "on",
  });
  if (error) return fail("Not saved.");
  await done("pricing.addon", "membership_addons", d.slug, { price: d.price });
  return ok(`${d.name} saved.`);
}

export async function deleteAddon(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const s = slug.safeParse(str(f, "slug"));
  if (!s.success) return fail("Invalid add-on.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("membership_addons").delete().eq("slug", s.data);
  if (error) return fail("Not removed.");
  await done("pricing.addon.delete", "membership_addons", s.data);
  return ok("Removed.");
}

export async function savePackage(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const types = f.getAll("types").map(String).filter((t) => ["licensed_clinical", "coach", "mentor", "other_nonclinical"].includes(t));
  const parsed = z
    .object({ slug, name: z.string().trim().min(1).max(60), description: z.string().trim().max(400), price: money, onboarding: money, eligibility: z.string().trim().max(300) })
    .safeParse({ slug: str(f, "slug"), name: str(f, "name"), description: str(f, "description"), price: str(f, "price"), onboarding: str(f, "onboarding"), eligibility: str(f, "eligibility") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  if (!types.length) return fail("Choose at least one eligible professional type.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error } = await supabase.from("professional_packages").upsert({
    slug: d.slug, name: d.name, description: d.description, monthly_price_cents: d.price, onboarding_fee_cents: d.onboarding,
    eligible_types: types, benefits: lines(f.get("benefits")), eligibility: d.eligibility || null, is_active: f.get("active") === "on",
  });
  if (error) return fail("Not saved.");
  await done("pricing.package", "professional_packages", d.slug, { price: d.price, onboarding: d.onboarding });
  return ok(`${d.name} saved.`);
}

/** Owner only: makes prices visible to the public (requires typing PUBLISH). */
export async function setPricingPublished(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const publish = f.get("publish") === "true";
  if (publish && f.get("confirm") !== "PUBLISH") return fail("Type PUBLISH to confirm.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("pricing_config").update({ is_published: publish }).eq("id", true);
  if (error) return fail(error.message.includes("before publishing") ? error.message : "Not changed.");
  await done(publish ? "pricing.publish" : "pricing.unpublish", "pricing_config", "config");
  return ok(publish ? "Pricing is now public." : "Pricing hidden from the public.");
}

/** Owner only: minimum ages for members and professionals. */
export async function saveEligibility(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const parsed = z
    .object({ member: z.coerce.number().int().min(18).max(99), professional: z.coerce.number().int().min(18).max(99) })
    .safeParse({ member: f.get("memberAge"), professional: f.get("professionalAge") });
  if (!parsed.success) return fail("Ages must be between 18 and 99.");
  const supabase = (await createClient())!;
  const r1 = await supabase.from("platform_settings").update({ value: parsed.data.member }).eq("key", "minimum_member_age");
  const r2 = await supabase.from("platform_settings").update({ value: parsed.data.professional }).eq("key", "minimum_professional_age");
  if (r1.error || r2.error) return fail("Not saved.");
  await audit("eligibility.update", "platform_settings", "minimum_ages", parsed.data);
  revalidatePath("/", "layout");
  return ok(`Members ${parsed.data.member}+ · professionals ${parsed.data.professional}+.`);
}
