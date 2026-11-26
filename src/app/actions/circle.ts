"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { serverSecret } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, screen, shieldMessage } from "@/lib/circle";
import { VISION_CATEGORIES } from "@/lib/sanctuary";

/** The Becoming Circle (founder directive 19): written participation, polls, suggestions, reports and moderation. */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string): R => ({ ok: true, message });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const uuid = (v: unknown) => z.string().uuid().safeParse(v);

async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
const PREVIEW = fail("Preview only: sign in with your own account to take part.");
const refresh = (topic?: string) => { revalidatePath("/app/circle"); if (topic) revalidatePath(`/app/circle/${topic}`); };

/** Optional contextual screening (OpenAI moderation, no charge) — only when the owner has switched it on. */
async function aiFlagged(text: string) {
  const db = createAdminClient();
  const key = serverSecret("OPENAI_API_KEY");
  if (!db || !key) return false;
  const { data } = await db.from("platform_settings").select("value").eq("key", "circle_ai_screening").maybeSingle();
  if (data?.value !== true) return false;
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "omni-moderation-latest", input: text }), signal: AbortSignal.timeout(5000) });
    const j = (await res.json()) as { results?: { flagged: boolean }[] };
    return Boolean(j.results?.[0]?.flagged);
  } catch {
    return false;
  }
}

/** Records something the Shield blocked so moderators can follow up (the content never appears in the discussion). */
async function recordBlocked(topicId: string, userId: string, reason: "threat" | "fraud" | "harassment", text: string) {
  const db = createAdminClient();
  if (!db) return;
  await db.from("circle_reports").insert({ topic_id: topicId, reporter_id: userId, reason, details: `Automatic (Safety Shield) — blocked before posting: ${text.slice(0, 900)}` });
}

export async function postToCircle(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const topic = uuid(f.get("topic_id"));
  const kind = z.enum(["perspective", "question", "comment"]).safeParse(f.get("kind") ?? "perspective");
  const body = str(f, "body", 1500);
  if (!topic.success || !kind.success || body.length < 2) return fail("Write a few words first.");
  const confirmed = f.get("confirm_respectful") === "on";
  const s = screen(body, { confirmedRespectful: confirmed });
  if (!s.ok) {
    if (s.kind === "threat" || s.kind === "fraud") await recordBlocked(topic.data, m.viewer.id, s.kind, body);
    return fail(s.kind === "disrespect" ? `${s.message} If you're sure it is respectful, tick "My words are respectful" and post again.` : s.message);
  }
  if (await aiFlagged(body)) {
    await recordBlocked(topic.data, m.viewer.id, "harassment", body);
    return fail("This may not meet our community standards, so it wasn't posted. Please rephrase it respectfully.");
  }
  const replyTo = uuid(f.get("reply_to"));
  const { error } = await m.db.from("circle_posts").insert({ topic_id: topic.data, author_id: m.viewer.id, kind: kind.data, body, reply_to: replyTo.success ? replyTo.data : null });
  if (error) return fail(shieldMessage(error.message) ?? error.message.replace(/^.*?:\s*/, "") ?? "That couldn't be posted.");
  // Posted after a respectful-wording warning: a moderator takes a look (it stays visible unless they decide otherwise).
  if (confirmed && screen(body).ok === false) await recordBlocked(topic.data, m.viewer.id, "harassment", `(posted after a wording reminder) ${body}`);
  refresh(topic.data);
  return ok("Shared. Thank you for your perspective.");
}

export async function deleteMyPost(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = uuid(f.get("id")), topic = uuid(f.get("topic_id"));
  if (!id.success) return fail("Not found.");
  await m.db.from("circle_posts").delete().eq("id", id.data).eq("author_id", m.viewer.id);
  refresh(topic.success ? topic.data : undefined);
  return ok("Removed.");
}

export async function votePoll(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const poll = uuid(f.get("poll_id")), topic = uuid(f.get("topic_id"));
  const option = z.coerce.number().int().min(0).max(5).safeParse(f.get("option"));
  if (!poll.success || !option.success) return fail("Choose an answer.");
  const { error } = await m.db.from("circle_poll_votes").upsert({ poll_id: poll.data, user_id: m.viewer.id, option_index: option.data });
  if (error) return fail("This poll is closed.");
  refresh(topic.success ? topic.data : undefined);
  return ok("Thank you for voting.");
}

export async function suggestTopic(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const title = str(f, "title", 160);
  const category = z.enum(CATEGORIES.map(([k]) => k) as [string, ...string[]]).safeParse(f.get("category"));
  if (title.length < 5 || !category.success) return fail("Write your topic and choose a category.");
  const s = screen(`${title} ${str(f, "note", 1000)}`);
  if (!s.ok) return fail(s.message);
  const { error } = await m.db.from("circle_suggestions").insert({ user_id: m.viewer.id, title, category: category.data, note: str(f, "note", 1000) || null });
  if (error) return fail(shieldMessage(error.message) ?? (/three topics/.test(error.message) ? "You can suggest up to three topics a day." : "Your suggestion couldn't be saved."));
  revalidatePath("/app/circle");
  return ok("Thank you. Our team reviews every suggestion for future discussions.");
}

export async function reportCircle(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const topic = uuid(f.get("topic_id")), post = uuid(f.get("post_id"));
  const reason = z.enum(["harassment", "threat", "discrimination", "personal-information", "fraud", "misinformation", "other"]).safeParse(f.get("reason"));
  if (!topic.success || !reason.success) return fail("Choose a reason.");
  const { error } = await m.db.from("circle_reports").insert({ topic_id: topic.data, post_id: post.success ? post.data : null, reporter_id: m.viewer.id, reason: reason.data, details: str(f, "details", 1000) || null });
  if (error) return fail("Your report couldn't be sent. Please try again.");
  return ok("Thank you. A moderator will review this.");
}

// ─── Moderators ───────────────────────────────────────────────────────────────────────────
export async function moderateCircle(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const action = z.enum(["hide_post", "restore_post", "remove_post", "highlight_post", "remove_user", "warn_user", "pause", "resume", "close", "reopen", "escalate"]).safeParse(f.get("action"));
  const topic = uuid(f.get("topic_id"));
  if (!action.success || !topic.success) return fail("Unknown action.");
  const post = uuid(f.get("post_id")), user = uuid(f.get("user_id"));
  const { error } = await m.db.rpc("circle_moderate", { p_action: action.data, p_topic: topic.data, p_post: post.success ? post.data : null, p_user: user.success ? user.data : null, p_reason: str(f, "reason", 500) || null });
  if (error) return fail(/authorized moderators/.test(error.message) ? "Only authorized moderators can do this." : "That couldn't be done.");
  refresh(topic.data);
  revalidatePath("/admin/circle");
  return ok("Done. The action has been recorded.");
}

export async function createPoll(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const topic = uuid(f.get("topic_id"));
  const question = str(f, "question", 300);
  const options = str(f, "options", 600).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6);
  if (!topic.success || question.length < 3 || options.length < 2) return fail("Write a question and at least two answers (one per line).");
  const { error } = await m.db.from("circle_polls").insert({ topic_id: topic.data, question, options, created_by: m.viewer.id });
  if (error) return fail("Only authorized moderators can create polls.");
  refresh(topic.data);
  return ok("Poll created.");
}

export async function moderatorHeartbeat(topicId: string): Promise<boolean> {
  const m = await me(); if (!m || !uuid(topicId).success) return false;
  const { data } = await m.db.rpc("circle_heartbeat", { p_topic: topicId });
  return Boolean(data);
}

// ─── Who Am I Becoming? (private) ───────────────────────────────────────────────────────────
export async function saveBecomingPlan(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return fail("Preview only: sign in with your own account to save.");
  const { error } = await m.db.from("becoming_plans").upsert({ user_id: m.viewer.id, becoming: str(f, "becoming", 3000) || null, future_self: str(f, "future_self", 3000) || null, growth_plan: str(f, "growth_plan", 3000) || null, updated_at: new Date().toISOString() });
  if (error) return fail("That couldn't be saved.");
  revalidatePath("/app/sanctuary/becoming");
  return ok("Saved privately.");
}

export async function addBecomingGoal(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return fail("Preview only: sign in with your own account to save.");
  const horizon = z.enum(["1y", "5y", "10y"]).safeParse(f.get("horizon"));
  const area = z.enum(VISION_CATEGORIES.map(([k]) => k) as [string, ...string[]]).safeParse(f.get("area"));
  const title = str(f, "title", 200);
  if (!horizon.success || !area.success || !title) return fail("Choose a time frame and area, and name your goal.");
  const { error } = await m.db.from("becoming_goals").insert({ user_id: m.viewer.id, horizon: horizon.data, area: area.data, title, why: str(f, "why", 1000) || null, first_step: str(f, "first_step", 300) || null });
  if (error) return fail(/60 goals/.test(error.message) ? "You can keep up to 60 goals." : "That couldn't be saved.");
  revalidatePath("/app/sanctuary/becoming");
  return ok("Goal added.");
}

export async function updateBecomingGoal(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return fail("Preview only.");
  const id = uuid(f.get("id"));
  const action = z.enum(["achieved", "released", "active", "delete"]).safeParse(f.get("action"));
  if (!id.success || !action.success) return fail("Not found.");
  if (action.data === "delete") await m.db.from("becoming_goals").delete().eq("id", id.data).eq("user_id", m.viewer.id);
  else await m.db.from("becoming_goals").update({ status: action.data }).eq("id", id.data).eq("user_id", m.viewer.id);
  revalidatePath("/app/sanctuary/becoming");
  return ok(action.data === "achieved" ? "Achieved. Well done." : "Updated.");
}
