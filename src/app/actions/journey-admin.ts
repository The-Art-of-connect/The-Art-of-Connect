"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Journey Intelligence Center and Financial Control Center. Each action
 * re-checks the role on the server and writes with the caller's own session,
 * so the database's row security and audit triggers apply as well.
 */
const PATH = "/admin/journey";
const ok = (m: string): ActionResult => ({ ok: true, message: m });
const fail = (m: string): ActionResult => ({ ok: false, message: m });
const cents = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? Math.round(n * 100 * 10_000) / 10_000 : NaN;
};
const int = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim(); if (!s) return null; const n = Number(s); return Number.isInteger(n) && n >= 0 ? n : NaN; };
const done = async (action: string, target: string, details: Record<string, unknown> = {}) => { await audit(action, "journey", target, details); revalidatePath(PATH); };

export async function setJourneySwitch(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const key = String(f.get("key"));
  const on = f.get("on") === "true";
  if (!["enabled", "paid_usage_authorized", "owner_testing_enabled", "message_packages_published", "attachments_enabled"].includes(key)) return fail("Unknown switch.");
  if (on && key === "paid_usage_authorized" && f.get("confirm") !== "AUTHORIZE") return fail("Type AUTHORIZE to allow billable AI usage.");
  if (on && key === "message_packages_published" && f.get("confirm") !== "PUBLISH") return fail("Type PUBLISH to show package prices to members.");
  const supabase = (await createClient())!;
  const { error, count } = await supabase.from("journey_settings").update({ [key]: on, updated_by: viewer.id }, { count: "exact" }).eq("id", true);
  if (error || !count) return fail("Not saved.");
  await done(`journey.${key}.${on ? "on" : "off"}`, key);
  return ok(on ? "Switched on." : "Switched off.");
}

export async function saveJourneyLimits(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const v = {
    company_monthly_limit_cents: cents(f.get("company")),
    owner_test_monthly_limit_cents: cents(f.get("testing")),
    per_minute_requests: int(f.get("perMinute")),
    max_input_chars: int(f.get("maxInput")),
    max_history_messages: int(f.get("historyMessages")),
    max_history_chars: int(f.get("historyChars")),
    purchased_message_expiry_days: int(f.get("expiry")),
    default_model: String(f.get("defaultModel") ?? "") || null,
    alert_thresholds: String(f.get("alerts") ?? "").split(",").map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n > 0 && n <= 100),
  };
  if (Object.values(v).some((x) => typeof x === "number" && Number.isNaN(x))) return fail("Check the numbers and try again.");
  const clean = Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== null || ["company_monthly_limit_cents", "owner_test_monthly_limit_cents", "default_model", "purchased_message_expiry_days"].includes(k)));
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_settings").update({ ...clean, updated_by: viewer.id }).eq("id", true);
  if (error) return fail(error.message.includes("check") ? "One of the values is outside the allowed range." : "Not saved.");
  await done("journey.limits", "settings", clean);
  return ok("Limits saved.");
}

export async function saveModel(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "finance"]);
  const id = String(f.get("id") ?? "").trim();
  if (!/^[A-Za-z0-9._:-]{2,80}$/.test(id)) return fail("Enter the OpenAI model name exactly as OpenAI lists it.");
  const input = cents(f.get("input")), output = cents(f.get("output"));
  if (Number.isNaN(input) || Number.isNaN(output)) return fail("Enter prices in dollars per million tokens.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_models").upsert({ id, input_cents_per_million: input, output_cents_per_million: output, enabled: f.get("enabled") === "on", updated_at: new Date().toISOString() });
  if (error) return fail("Not saved.");
  await done("journey.model", id, { input, output });
  return ok(`${id} saved.`);
}

export async function saveTierLimit(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "finance"]);
  const slug = String(f.get("slug"));
  const row = {
    monthly_messages: int(f.get("monthly")), daily_messages: int(f.get("daily")),
    member_monthly_limit_cents: cents(f.get("memberCap")), tier_monthly_limit_cents: cents(f.get("tierCap")),
    max_output_tokens: int(f.get("maxOutput")) ?? 700, model: String(f.get("model") ?? "") || null,
  };
  if (Object.values(row).some((x) => typeof x === "number" && Number.isNaN(x))) return fail("Check the numbers.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_tier_limits").upsert({ package_slug: slug, ...row, updated_at: new Date().toISOString() });
  if (error) return fail("Not saved.");
  await done("journey.tier", slug, row);
  return ok("Saved.");
}

export async function savePackage(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "finance"]);
  const slug = String(f.get("slug"));
  const price = cents(f.get("price"));
  const messages = int(f.get("messages"));
  if (Number.isNaN(price) || !messages) return fail("Check the price and message count.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_message_packages").update({ price_cents: price === null ? null : Math.round(price), messages, is_active: f.get("active") === "on", updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) return fail("Not saved.");
  await done("journey.package", slug, { price, messages });
  return ok("Saved.");
}

export async function saveInstructions(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "executive"]);
  const body = String(f.get("body") ?? "").trim();
  if (!body) return fail("Write Journey's instructions first.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_instruction_versions").insert({ body: body.slice(0, 20000), note: String(f.get("note") ?? "").slice(0, 300) || null, created_by: viewer.id });
  if (error) return fail("Not saved.");
  await done("journey.instructions.draft", "instructions");
  return ok("Saved as a draft. Test it, then publish.");
}

export async function publishInstructions(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Unknown version.");
  const supabase = (await createClient())!;
  await supabase.from("journey_instruction_versions").update({ status: "retired" }).eq("status", "published");
  const { error } = await supabase.from("journey_instruction_versions").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id.data);
  if (error) return fail("Not published.");
  await done("journey.instructions.publish", id.data);
  return ok("Published. Journey uses this version from the next message.");
}

export async function saveKnowledge(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "executive"]);
  const parsed = z.object({
    mode: z.enum(["all", "business", "life", "love", "concierge"]), title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(20000),
    status: z.enum(["draft", "approved", "archived"]), review: z.string().trim().max(500).optional(),
  }).safeParse({ mode: f.get("mode"), title: f.get("title"), body: f.get("body"), status: f.get("status") ?? "draft", review: String(f.get("review") ?? "") || undefined });
  if (!parsed.success) return fail("Add a title and the content.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_knowledge").insert({ mode: parsed.data.mode, title: parsed.data.title, body: parsed.data.body, status: parsed.data.status, professional_review: parsed.data.review ?? null, updated_by: viewer.id });
  if (error) return fail("Not saved.");
  await done("journey.knowledge", parsed.data.title);
  return ok("Saved to the knowledge library.");
}

export async function saveExample(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "executive"]);
  const parsed = z.object({ mode: z.enum(["business", "life", "love", "concierge"]), member: z.string().trim().min(1).max(4000), reply: z.string().trim().min(1).max(8000) })
    .safeParse({ mode: f.get("mode"), member: f.get("member"), reply: f.get("reply") });
  if (!parsed.success) return fail("Add both the member's message and Journey's ideal reply.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_examples").insert({ mode: parsed.data.mode, member_message: parsed.data.member, ideal_reply: parsed.data.reply, status: "approved", updated_by: viewer.id });
  if (error) return fail("Not saved.");
  await done("journey.example", parsed.data.mode);
  return ok("Example conversation saved.");
}
