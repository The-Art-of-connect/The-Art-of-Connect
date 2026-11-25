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
      annualMonths: z.string().trim().transform((v, ctx) => {
        const n = Number(v || "12");
        if (!Number.isFinite(n) || n <= 0 || n > 12) {
          ctx.addIssue({ code: "custom", message: "Annual billing: enter the months charged for a 12-month year (1–12; 12 = no incentive)." });
          return z.NEVER;
        }
        return Math.round(n * 10) / 10;
      }),
      couplesName: z.string().trim().min(1).max(60),
      couplesDescription: z.string().trim().max(400),
      couplesPrice: money,
      referral: z.string().trim().max(300),
    })
    .safeParse({ currency: str(f, "currency"), annualMonths: str(f, "annualMonths"), couplesName: str(f, "couplesName"), couplesDescription: str(f, "couplesDescription"), couplesPrice: str(f, "couplesPrice"), referral: str(f, "referral") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("pricing_config")
    .update({ currency: d.currency, annual_months_charged: d.annualMonths, couples_upgrade_name: d.couplesName, couples_upgrade_description: d.couplesDescription, couples_upgrade_monthly_cents: d.couplesPrice, referral_reward_description: d.referral || null }, { count: "exact" })
    .eq("id", true);
  if (error || !count) return fail("Not saved.");
  await done("pricing.general", "pricing_config", "config", { annual_months: d.annualMonths, couples: d.couplesPrice });
  return ok("Saved.");
}

export async function saveExperienceOffering(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const parsed = z
    .object({ experience: z.enum(["business", "counseling", "relationships"]), name: z.string().trim().min(1).max(60), subtitle: z.string().trim().max(80), description: z.string().trim().max(600) })
    .safeParse({ experience: f.get("experience"), name: str(f, "name"), subtitle: str(f, "subtitle"), description: str(f, "description") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("experience_offerings")
    .update({ name: d.name, subtitle: d.subtitle, description: d.description, benefits: lines(f.get("benefits")), is_active: f.get("active") === "on" }, { count: "exact" })
    .eq("experience", d.experience);
  if (error || !count) return fail("Not saved.");
  await done("pricing.experience", "experience_offerings", d.experience);
  return ok(`${d.name} saved.`);
}

/**
 * Create or update a named membership package: its name, wording, the
 * experiences it covers, prices, onboarding fee, annual incentive and whether
 * it is offered. Prices remain hidden until the owner publishes.
 */
export async function saveMembershipPackage(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const months = z.string().trim().transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 12) {
      ctx.addIssue({ code: "custom", message: "Annual months must be between 1 and 12 (blank = general setting)." });
      return z.NEVER;
    }
    return Math.round(n * 10) / 10;
  });
  const parsed = z
    .object({
      slug,
      isNew: z.boolean(),
      name: z.string().trim().min(1, "Enter a name.").max(80),
      tagline: z.string().trim().max(160),
      description: z.string().trim().max(1000),
      category: z.enum(["single", "bundle", "exclusive"]),
      experiences: z.array(z.enum(["business", "counseling", "relationships"])).min(1, "Choose the experiences this membership includes.").max(3),
      loveTrack: z.enum(["", "single", "couple"]),
      price: money,
      annualPrice: money,
      annualMonths: months,
      onboarding: money,
      highlight: z.string().trim().max(40),
      sort: z.coerce.number().int().min(0).max(10000),
    })
    .safeParse({
      slug: str(f, "slug"), isNew: f.get("isNew") === "1", name: str(f, "name"), tagline: str(f, "tagline"), description: str(f, "description"),
      category: f.get("category"), experiences: f.getAll("experiences").map(String), loveTrack: str(f, "loveTrack"),
      price: str(f, "price"), annualPrice: str(f, "annualPrice"), annualMonths: str(f, "annualMonths"), onboarding: str(f, "onboarding"),
      highlight: str(f, "highlight"), sort: str(f, "sort") || "0",
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the values.");
  const d = parsed.data;
  if (d.category === "exclusive" && d.experiences.length !== 3) return fail("Exclusive memberships include all three experiences.");
  if (d.category === "single" && d.experiences.length !== 1) return fail("A single-experience package covers exactly one experience.");
  if (d.category === "bundle" && d.experiences.length < 2) return fail("A bundle covers two or three experiences.");
  if (d.loveTrack && !d.experiences.includes("relationships")) return fail("Singles/couples applies only to packages that include In Love.");
  const supabase = (await createClient())!;
  const row = {
    slug: d.slug, name: d.name, tagline: d.tagline, description: d.description, category: d.category,
    experiences: d.experiences, love_track: d.loveTrack || null,
    monthly_price_cents: d.price, annual_price_cents: d.annualPrice, annual_months_charged: d.annualMonths, onboarding_fee_cents: d.onboarding,
    benefits: lines(f.get("benefits")), highlight: d.highlight || null, sort_order: d.sort, is_active: f.get("active") === "on",
  };
  const { error } = d.isNew
    ? await supabase.from("membership_packages").insert(row)
    : await supabase.from("membership_packages").update(row).eq("slug", d.slug);
  if (error) return fail(error.code === "23505" ? "That code is already used by another package." : "Not saved.");
  await done(d.isNew ? "pricing.package.create" : "pricing.package", "membership_packages", d.slug, { price: d.price, annual_price: d.annualPrice, annual_months: d.annualMonths, onboarding: d.onboarding, active: row.is_active });
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

/** Owner only: minimum ages for members, Personal Society singles and professionals. */
export async function saveEligibility(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const parsed = z
    .object({ member: z.coerce.number().int().min(18).max(99), singles: z.coerce.number().int().min(18).max(99), professional: z.coerce.number().int().min(18).max(99) })
    .safeParse({ member: f.get("memberAge"), singles: f.get("singlesAge") ?? 30, professional: f.get("professionalAge") });
  if (!parsed.success) return fail("Ages must be between 18 and 99.");
  const supabase = (await createClient())!;
  const r1 = await supabase.from("platform_settings").update({ value: parsed.data.member }).eq("key", "minimum_member_age");
  const r2 = await supabase.from("platform_settings").update({ value: parsed.data.professional }).eq("key", "minimum_professional_age");
  const r3 = await supabase.from("platform_settings").upsert({ key: "minimum_singles_age", value: parsed.data.singles, description: "Minimum age for The Personal Society singles experience (matchmaking)" });
  if (r1.error || r2.error || r3.error) return fail("Not saved.");
  await audit("eligibility.update", "platform_settings", "minimum_ages", parsed.data);
  revalidatePath("/", "layout");
  return ok(`Members ${parsed.data.member}+ · singles ${parsed.data.singles}+ · professionals ${parsed.data.professional}+.`);
}
