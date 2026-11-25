"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startAutoReloadSetup, startPurchase } from "@/lib/journey-commerce";
import { membershipFor } from "@/lib/journey-server";
import { createResponse } from "@/lib/openai";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Member actions for Journey and The Personal Society. Every write uses the
 * member's own session, so the database's row security applies; money and
 * access changes go through the server functions that enforce safeguards.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string, url?: string): R => ({ ok: true, message, url });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return null;
  const supabase = await createClient();
  return supabase ? { viewer, supabase } : null;
}

// ─── Voice preferences ─────────────────────────────────────────────
export async function saveVoicePrefs(prefs: { style: string; transcripts: boolean; speed?: number; manual?: boolean; retentionDays?: number | null }): Promise<void> {
  const m = await me();
  if (!m || !["warm", "calm", "confident", "soft", "friendly", "journey"].includes(prefs.style)) return;
  const speed = Math.min(1.3, Math.max(0.7, Number(prefs.speed ?? 1)));
  const retention = prefs.retentionDays === null ? null : Math.min(3650, Math.max(1, Math.round(Number(prefs.retentionDays ?? 90))));
  await m.supabase.from("journey_voice_preferences").upsert({
    user_id: m.viewer.id, voice_style: prefs.style === "journey" ? "warm" : prefs.style, save_transcripts: prefs.transcripts,
    speed, manual_mode: Boolean(prefs.manual), transcript_retention_days: retention, updated_at: new Date().toISOString(),
  });
}

/** Erase saved voice transcripts (one conversation or all). */
export async function deleteVoiceTranscripts(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only — nothing is saved.");
  const id = String(f.get("id") ?? "");
  const { data, error } = await m.supabase.rpc("journey_delete_voice_transcripts", { p_session: /^[0-9a-f-]{36}$/.test(id) ? id : null });
  if (error) return fail("Not deleted. Please try again.");
  return ok(Number(data) ? "Your voice transcripts have been permanently erased." : "There were no saved transcripts to erase.");
}

// ─── Memory ────────────────────────────────────────────────────────
export async function setMemoryEnabled(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only — nothing is saved.");
  const on = f.get("on") === "true";
  const { error } = await m.supabase.from("journey_memory_settings").upsert({ user_id: m.viewer.id, enabled: on, updated_at: new Date().toISOString() });
  if (error) return fail("Not saved.");
  revalidatePath("/app/journey/memory");
  return ok(on ? "Journey will remember what you save here." : "Personal memory is off. Nothing you've saved is used.");
}

export async function addMemory(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only — nothing is saved.");
  const parsed = z.object({ kind: z.enum(["goal", "preference", "milestone", "progress", "highlight"]), content: z.string().trim().min(1).max(600) })
    .safeParse({ kind: f.get("kind"), content: f.get("content") });
  if (!parsed.success) return fail("Write what you'd like Journey to remember.");
  const { count } = await m.supabase.from("journey_memories").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 100) return fail("You can keep up to 100 memories. Remove one to add another.");
  const { error } = await m.supabase.from("journey_memories").insert({ user_id: m.viewer.id, ...parsed.data });
  if (error) return fail("Not saved.");
  revalidatePath("/app/journey/memory");
  return ok("Saved. Only you and Journey (for you) use this.");
}

export async function deleteMemory(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  if (f.get("all") === "1") await m.supabase.from("journey_memories").delete().eq("user_id", m.viewer.id);
  else { const id = z.uuid().safeParse(f.get("id")); if (!id.success) return fail("Unknown."); await m.supabase.from("journey_memories").delete().eq("id", id.data); }
  revalidatePath("/app/journey/memory");
  return ok(f.get("all") === "1" ? "Everything Journey remembered has been deleted." : "Deleted.");
}

export async function setApproach(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  const a = z.enum(["spiritual", "secular", "practical", "blend"]).safeParse(f.get("approach"));
  if (!a.success) return fail("Choose an approach.");
  await m.supabase.from("journey_memory_settings").upsert({ user_id: m.viewer.id, approach: a.data, updated_at: new Date().toISOString() });
  revalidatePath("/app/journey/daily");
  return ok("Your daily journey will follow this approach.");
}

// ─── Goals and daily practice ──────────────────────────────────────
export async function saveGoal(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only — nothing is saved.");
  const parsed = z.object({ title: z.string().trim().min(1).max(160), why: z.string().trim().max(1000).optional(), next_step: z.string().trim().max(300).optional(), target_date: z.iso.date().optional() })
    .safeParse({ title: f.get("title"), why: str(f, "why", 1000) || undefined, next_step: str(f, "next_step", 300) || undefined, target_date: str(f, "target_date", 10) || undefined });
  if (!parsed.success) return fail("Give your goal a name.");
  const { error } = await m.supabase.from("journey_goals").insert({ user_id: m.viewer.id, ...parsed.data });
  if (error) return fail("Not saved.");
  revalidatePath("/app/journey/daily");
  return ok("Goal saved.");
}

export async function updateGoal(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  const id = z.uuid().safeParse(f.get("id"));
  const progress = Math.max(0, Math.min(100, Number(f.get("progress") ?? 0)));
  if (!id.success) return fail("Unknown goal.");
  const achieved = progress >= 100;
  await m.supabase.from("journey_goals").update({ progress, status: achieved ? "achieved" : "active", achieved_at: achieved ? new Date().toISOString() : null }).eq("id", id.data);
  revalidatePath("/app/journey/daily");
  return ok(achieved ? "Milestone reached — beautifully done." : "Progress saved.");
}

export async function logPractice(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  const practice = z.enum(["manifestation", "affirmation", "intention", "awareness", "journal", "evening", "weekly"]).safeParse(f.get("practice"));
  if (!practice.success) return fail("Unknown practice.");
  const day = new Date().toISOString().slice(0, 10);
  await m.supabase.from("journey_practice_log").upsert({ user_id: m.viewer.id, day, practice: practice.data, note: str(f, "note", 2000) || null });
  revalidatePath("/app/journey/daily");
  return ok("Noted for today.");
}

// ─── Purchases and Auto-Reload ─────────────────────────────────────
export async function buy(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only — nothing is charged.");
  const kind = z.enum(["messages", "voice_minutes", "session"]).safeParse(f.get("kind"));
  const slug = str(f, "slug", 40);
  if (!kind.success || !slug) return fail("Choose a package.");
  const db = createAdminClient();
  const holder = db ? (await membershipFor(db, m.viewer.id))?.holderId ?? m.viewer.id : m.viewer.id;
  const r = await startPurchase({ userId: m.viewer.id, holderId: holder, email: m.viewer.email, kind: kind.data, slug, staff: isStaff(m.viewer) });
  return r.ok ? ok(r.message, r.url) : fail(r.message);
}

export async function enableAutoReload(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only — nothing is charged.");
  if (f.get("agree") !== "on") return fail("Please confirm you authorize these charges.");
  const slug = str(f, "package", 40);
  const capRaw = str(f, "cap", 12).replace(/[$,]/g, "");
  const noCap = f.get("noCap") === "on";
  const cap = noCap ? null : Math.round(Number(capRaw) * 100);
  if (!noCap && (!Number.isFinite(cap) || (cap ?? 0) <= 0)) return fail("Enter a monthly limit, or choose no personal limit.");
  const consent = `I authorize The Art of Connect to charge my saved payment method for the selected Journey message package each time my allowance runs out, ${noCap ? "with no personal monthly limit" : `up to $${(cap! / 100).toFixed(2)} per month`}, subject to company safeguards. I can turn this off at any time. Agreed ${new Date().toISOString()}.`;
  const r = await startAutoReloadSetup({ userId: m.viewer.id, email: m.viewer.email, packageSlug: slug, capCents: cap, consentText: consent, staff: isStaff(m.viewer) });
  return r.ok ? ok(r.message, r.url) : fail(r.message);
}

export async function disableAutoReload(_p: R): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  await m.supabase.from("journey_auto_reload").update({ enabled: false }).eq("user_id", m.viewer.id);
  revalidatePath("/app/journey/plus");
  return ok("Auto-Reload is off. Nothing further will be charged automatically.");
}

// ─── Private Sessions ──────────────────────────────────────────────
export async function setSessionObjective(_p: R, f: FormData): Promise<R> {
  const db = createAdminClient();
  const m = await me();
  if (!m || !db) return fail("Preview only.");
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Unknown session.");
  await db.from("journey_sessions").update({ objective: str(f, "objective", 500) || null, format: f.get("format") === "voice" ? "voice" : "text" })
    .eq("id", id.data).eq("user_id", m.viewer.id).eq("status", "purchased");
  revalidatePath("/app/journey/sessions");
  return ok("Saved. Your session time begins with your first message.");
}

export async function summarizeSession(_p: R, f: FormData): Promise<R> {
  const db = createAdminClient();
  const m = await me();
  if (!m || !db) return fail("Preview only.");
  const id = z.uuid().safeParse(f.get("id"));
  const notes = str(f, "notes", 12000);
  if (!id.success || !notes) return fail("Nothing to summarize yet.");
  const { data: s } = await db.from("journey_settings").select("enabled, paid_usage_authorized, default_model").maybeSingle();
  if (!s?.enabled || !s.paid_usage_authorized || !s.default_model) return fail("Summaries are available once Journey is live.");
  const r = await createResponse({
    model: s.default_model, maxOutputTokens: 500, history: [],
    instructions: "Write a short, warm, private summary of this Journey Private Session for the member: their objective, key reflections, and 2–4 practical next steps. No diagnosis. Address the member as 'you'.",
    message: notes,
  });
  if (!r.ok) return fail("The summary couldn't be created right now.");
  await db.from("journey_sessions").update({ summary: r.text.slice(0, 6000), status: "completed" }).eq("id", id.data).eq("user_id", m.viewer.id);
  revalidatePath("/app/journey/sessions");
  return ok("Your private summary is saved.");
}

// ─── The Exclusive Connection ──────────────────────────────────────
export async function exclusiveAction(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only — nothing is sent.");
  const rel = m.supabase.schema("relationships");
  const action = String(f.get("action"));
  const id = String(f.get("id") ?? "");
  const map: Record<string, () => PromiseLike<{ error: { message: string } | null }>> = {
    request: () => rel.rpc("request_exclusive", { p_recipient: id }),
    accept: () => rel.rpc("respond_exclusive", { p_request: id, p_accept: true }),
    decline: () => rel.rpc("respond_exclusive", { p_request: id, p_accept: false }),
    end: () => rel.rpc("end_exclusive", { p_request: id }),
    reactivate: () => rel.from("profiles").update({ is_visible: true }).eq("user_id", m.viewer.id),
  };
  if (!map[action]) return fail("Unknown action.");
  const { error } = await map[action]();
  if (error) return fail(error.message.length < 160 ? error.message : "That didn't go through.");
  revalidatePath("/app/relationships/exclusive");
  return ok({ request: "Your invitation was sent privately.", accept: "You're now in an Exclusive Connection. Your shared space is open.", decline: "Declined privately.", end: "Ended. Your profile stays paused until you choose to return.", reactivate: "Welcome back — your profile is visible for introductions again." }[action]!);
}

// ─── Appeals ───────────────────────────────────────────────────────
export async function fileAppeal(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await me();
  if (!m) return { ok: false, message: "Preview only." };
  const parsed = z.object({ regarding: z.string().trim().min(1).max(200), explanation: z.string().trim().min(10).max(4000) })
    .safeParse({ regarding: f.get("regarding"), explanation: f.get("explanation") });
  if (!parsed.success) return { ok: false, message: "Tell us what happened in a sentence or two." };
  const { error } = await m.supabase.from("account_appeals").insert({ user_id: m.viewer.id, ...parsed.data });
  if (error) return { ok: false, message: "Your appeal wasn't sent. Please email info@theartofconnect.com." };
  revalidatePath("/app/safety");
  return { ok: true, message: "Your appeal was received. Someone not involved in the original decision will review it." };
}
