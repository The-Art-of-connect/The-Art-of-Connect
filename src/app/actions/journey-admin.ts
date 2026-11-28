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
  if (!["enabled", "paid_usage_authorized", "owner_testing_enabled", "message_packages_published", "attachments_enabled", "voice_enabled", "memory_enabled", "sessions_published"].includes(key)) return fail("Unknown switch.");
  if (on && key === "sessions_published" && f.get("confirm") !== "PUBLISH") return fail("Type PUBLISH to show Private Session prices to members.");
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
    person_monthly_limit_cents: cents(f.get("personCap")),
    max_output_tokens: int(f.get("maxOutput")) ?? 700, model: String(f.get("model") ?? "") || null,
    monthly_voice_minutes: int(f.get("voiceMinutes")),
    unlimited_messages: f.get("unlimited") === "on",
    fair_use_daily: int(f.get("fairDaily")) ?? 300, fair_use_hourly: int(f.get("fairHourly")) ?? 60,
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
  if (String(f.get("confirm") ?? "").trim().toUpperCase() !== "PUBLISH") return fail("Type PUBLISH to make this version live for Journey.");
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

export async function saveVoiceSettings(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const row = {
    voice_model: String(f.get("voiceModel") ?? "").trim() || null,
    voice_cents_per_minute: cents(f.get("voiceRate")),
    voice_inactivity_seconds: int(f.get("inactivity")) ?? 120,
    voice_max_session_minutes: int(f.get("maxMinutes")) ?? 30,
    auto_reload_max_per_day: int(f.get("reloadDay")) ?? 3,
    auto_reload_max_per_month: int(f.get("reloadMonth")) ?? 10,
  };
  if (Object.values(row).some((x) => typeof x === "number" && Number.isNaN(x))) return fail("Check the numbers.");
  if (row.voice_model && !/^[A-Za-z0-9._:-]{2,80}$/.test(row.voice_model)) return fail("Enter the realtime model name exactly as OpenAI lists it.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_settings").update({ ...row, updated_by: viewer.id }).eq("id", true);
  if (error) return fail("One of the values is outside the allowed range.");
  await done("journey.voice_settings", "settings", row);
  return ok("Voice and Auto-Reload safeguards saved.");
}

export async function saveSessionProduct(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "finance"]);
  const slug = String(f.get("slug"));
  const price = cents(f.get("price"));
  const max = int(f.get("maxMessages"));
  if (Number.isNaN(price) || Number.isNaN(max)) return fail("Check the price and message limit.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_session_products").update({ price_cents: price === null ? null : Math.round(price), max_messages: max ?? 40, is_active: f.get("active") === "on" }).eq("slug", slug);
  if (error) return fail("Not saved.");
  await done("journey.session_product", slug, { price, max });
  return ok("Saved.");
}

export async function saveEvalRun(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "executive"]);
  const parsed = z.object({ scenario: z.uuid(), reply: z.string().max(20000), rating: z.coerce.number().int().min(1).max(5), notes: z.string().max(2000).optional() })
    .safeParse({ scenario: f.get("scenario"), reply: f.get("reply"), rating: f.get("rating"), notes: String(f.get("notes") ?? "") || undefined });
  if (!parsed.success) return fail("Run the scenario and choose a rating.");
  const supabase = (await createClient())!;
  const { data: v } = await supabase.from("journey_instruction_versions").select("version").eq("status", "published").maybeSingle();
  const { error } = await supabase.from("journey_eval_runs").insert({ scenario_id: parsed.data.scenario, reply: parsed.data.reply, rating: parsed.data.rating, notes: parsed.data.notes ?? null, instruction_version: v?.version ?? null, created_by: viewer.id });
  if (error) return fail("Not saved.");
  revalidatePath("/admin/journey/evaluations");
  return ok("Rating saved.");
}

export async function saveTrackerItem(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "executive"]);
  const key = String(f.get("key"));
  const owner = viewer.roles.includes("owner");
  const patch: Record<string, unknown> = { next_step: String(f.get("next_step") ?? "").slice(0, 500) || null, updated_by: viewer.id, updated_at: new Date().toISOString() };
  // Only the owner records owner testing and approval (the database enforces this too).
  if (owner) { patch.owner_tested = f.get("owner_tested") === "on"; patch.owner_approved = f.get("owner_approved") === "on" && f.get("owner_tested") === "on"; }
  const supabase = (await createClient())!;
  const { error } = await supabase.from("dev_tracker").update(patch).eq("key", key);
  if (error) return fail("Not saved. Approval needs owner testing first.");
  revalidatePath("/admin/development");
  return ok("Updated.");
}

export async function decideAppeal(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "admin", "moderator"]);
  const id = z.uuid().safeParse(f.get("id"));
  const status = z.enum(["reviewing", "upheld", "reversed"]).safeParse(f.get("status"));
  if (!id.success || !status.success) return fail("Choose a decision.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("account_appeals").update({ status: status.data, reviewer_id: viewer.id, reviewer_note: String(f.get("note") ?? "").slice(0, 2000) || null, decided_at: status.data === "reviewing" ? null : new Date().toISOString() }).eq("id", id.data);
  if (error) return fail("Not saved.");
  await audit(`appeal.${status.data}`, "account_appeals", id.data);
  revalidatePath("/admin/safety");
  return ok("Saved.");
}

/** Owner Portal: verify the OpenAI connection on the server (no tokens used) and record the result. */
export async function verifyOpenAI(_p: ActionResult): Promise<ActionResult> {
  await requireStaff(["owner", "executive", "finance"]);
  const { checkOpenAIConnection } = await import("@/lib/openai");
  const c = await checkOpenAIConnection();
  await audit(c.reachable ? "journey.openai.connected" : "journey.openai.failed", "journey", "openai", { status: c.status, models: c.models.length, error: c.error ?? null });
  revalidatePath(PATH);
  if (!c.configured) return fail("The OpenAI key isn’t visible to the website yet. Check OPENAI_API_KEY in Netlify and redeploy.");
  if (!c.reachable) return fail(`OpenAI connection failed${c.status ? ` (${c.status})` : ""}: ${c.error ?? "please try again"}.`);
  return ok(`Connected securely. ${c.models.length} chat models available to your account.`);
}

/** The master personality, written in sections, saved as a new draft version (rollback = publish an earlier version). */
export async function savePersonality(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "executive"]);
  const { PERSONALITY_SECTIONS, composePersonality } = await import("@/lib/journey-personality");
  const values = Object.fromEntries(PERSONALITY_SECTIONS.map((s) => [s.key, String(f.get(s.key) ?? "").slice(0, 6000)]));
  const body = composePersonality(values);
  if (!body.trim()) return fail("Write at least one section first.");
  const supabase = (await createClient())!;
  const { data, error } = await supabase.from("journey_instruction_versions").insert({ body: body.slice(0, 20000), note: String(f.get("note") ?? "").slice(0, 300) || null, created_by: viewer.id }).select("id, version").single();
  if (error || !data) return fail("Not saved.");
  await done("journey.instructions.draft", "personality", { version: data.version });
  revalidatePath("/admin/journey/personality");
  if (f.get("publish") === "1" && viewer.roles.includes("owner") && String(f.get("confirm") ?? "").trim().toUpperCase() === "PUBLISH") {
    await supabase.from("journey_instruction_versions").update({ status: "retired" }).eq("status", "published");
    await supabase.from("journey_instruction_versions").update({ status: "published", published_at: new Date().toISOString() }).eq("id", data.id);
    await done("journey.instructions.publish", data.id);
    return ok(`Version ${data.version} saved and published. Journey uses it from the next message.`);
  }
  return ok(`Saved as draft version ${data.version}. Test it privately, then publish.`);
}

/** Owner: choose which approved model Journey uses (can be changed any time). */
export async function setJourneyModel(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const id = String(f.get("id") ?? "");
  const supabase = (await createClient())!;
  const { data: m } = await supabase.from("journey_models").select("id, enabled, input_cents_per_million, output_cents_per_million").eq("id", id).maybeSingle();
  if (!m || !m.enabled || m.input_cents_per_million == null || m.output_cents_per_million == null) return fail("Approve the model and enter its rates first.");
  const { error } = await supabase.from("journey_settings").update({ default_model: id, updated_by: viewer.id }).eq("id", true);
  if (error) return fail("Not saved.");
  await done("journey.model.default", id);
  revalidatePath("/admin/journey/models");
  return ok(`Journey now uses ${id}. You can switch back any time.`);
}

/** Owner: rate a private test reply (1–5) on quality, comprehension and emotional awareness. */
export async function rateTestRun(input: { id: string; ratings: Record<string, number>; note?: string }): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const id = z.uuid().safeParse(input.id);
  if (!id.success) return fail("Unknown test.");
  const ratings = Object.fromEntries(Object.entries(input.ratings).filter(([k, v]) => ["quality", "comprehension", "emotion"].includes(k) && Number.isInteger(v) && v >= 1 && v <= 5));
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_test_runs").update({ ratings, rating_note: input.note?.slice(0, 2000) || null }).eq("id", id.data);
  if (error) return fail("Rating not saved.");
  revalidatePath("/admin/journey/models");
  return ok("Rating saved.");
}

/**
 * One-step private activation for owner testing. Verifies the OpenAI connection FIRST and changes nothing
 * if it fails. Never touches registration, live payments, society launches or any published price:
 * members remain blocked until live payments are switched on separately.
 */
export async function activateJourney(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  const { data: cur } = await supabase.from("journey_settings").select("paid_usage_authorized, owner_test_monthly_limit_cents, company_monthly_limit_cents, default_model").maybeSingle();
  if (!cur) return fail("Journey settings weren't found.");
  if (!cur.paid_usage_authorized && String(f.get("confirm") ?? "").trim().toUpperCase() !== "AUTHORIZE") return fail("Type AUTHORIZE to allow billable OpenAI usage within your budgets.");
  if (cur.owner_test_monthly_limit_cents == null || cur.company_monthly_limit_cents == null) return fail("Set your owner testing and company budgets first.");
  const wantVoice = f.get("voice") === "on";
  const voiceModel = String(f.get("voiceModel") ?? "").trim();
  const rate = cents(f.get("voiceRate"));
  if (wantVoice && (!/^[A-Za-z0-9._:-]{2,80}$/.test(voiceModel) || rate === null || Number.isNaN(rate))) return fail("Enter the voice model and its cost per minute to turn on live voice.");

  const { checkOpenAIConnection } = await import("@/lib/openai");
  const c = await checkOpenAIConnection();
  await audit(c.reachable ? "journey.openai.connected" : "journey.openai.failed", "journey", "openai", { status: c.status, models: c.models.length, error: c.error ?? null });
  if (!c.configured) { revalidatePath(PATH); return fail("Nothing was changed: the OpenAI key isn't visible to the website. Add OPENAI_API_KEY in Netlify (Site configuration → Environment variables), redeploy, then press Activate again."); }
  if (!c.reachable) { revalidatePath(PATH); return fail(`Nothing was changed: OpenAI didn't accept the connection${c.status ? ` (${c.status})` : ""}. ${c.error ?? "Please check the key and try again."}`); }

  if (wantVoice) {
    const { openAIModelAvailable } = await import("@/lib/openai");
    if ((await openAIModelAvailable(voiceModel)) === false) return fail(`Nothing was changed: the voice model "${voiceModel}" isn't available to your OpenAI account. Try gpt-realtime-mini or gpt-realtime.`);
  }
  const row: Record<string, unknown> = { enabled: true, paid_usage_authorized: true, owner_testing_enabled: true, updated_by: viewer.id };
  if (voiceModel && rate !== null && !Number.isNaN(rate)) Object.assign(row, { voice_model: voiceModel, voice_cents_per_minute: rate });
  row.voice_enabled = wantVoice;
  const { error, count } = await supabase.from("journey_settings").update(row, { count: "exact" }).eq("id", true);
  if (error || !count) return fail("OpenAI is connected, but the settings couldn't be saved. Please try again.");
  await done("journey.owner_activation", "settings", { voice: wantVoice, voice_model: voiceModel || null });
  return ok(`Journey is on for your private testing${wantVoice ? ", with live voice" : ""}. OpenAI connected. Members remain blocked while live payments are off. Test below.`);
}

/** Immediately stops all Journey AI use (written and voice). */
export async function pauseJourney(_p: ActionResult): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_settings").update({ enabled: false, voice_enabled: false, updated_by: viewer.id }).eq("id", true);
  if (error) return fail("Not saved.");
  await done("journey.enabled.off", "enabled");
  return ok("Journey is off. No AI usage can occur until you activate it again.");
}

/** Additional Journey usage is priced at cost: OpenAI rates plus card processing, no markup. */
export async function saveUsagePricing(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "finance"]);
  const num = (k: string, max: number) => { const n = Number(String(f.get(k) ?? "").trim()); return Number.isFinite(n) && n >= 0 && n <= max ? n : NaN; };
  const row = {
    text_cost_cents_per_message: num("textCost", 100), voice_cost_cents_per_minute: num("voiceCost", 500),
    card_fee_percent: num("feePct", 20), card_fee_fixed_cents: Math.round(num("feeFixed", 500)),
  };
  if (Object.values(row).some((x) => Number.isNaN(x))) return fail("Check the numbers.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_settings").update(row).eq("id", true);
  if (error) return fail("Not saved.");
  const { error: rp } = await supabase.rpc("journey_reprice_at_cost");
  if (rp) return fail("Saved, but packages couldn't be re-priced.");
  await done("journey.usage_pricing", "at_cost", row);
  return ok("Saved. Every additional message and voice-minute package is now priced at cost.");
}
