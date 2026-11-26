"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { INTERESTS } from "@/lib/social";
import { MOODS, VISION_CATEGORIES } from "@/lib/sanctuary";

/**
 * My Daily Sanctuary (founder directive 17). Every record is private to the member (database policies enforce it).
 * Nothing here calls an AI service.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string): R => ({ ok: true, message });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);

async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
const PREVIEW = fail("Preview only: sign in with your own account to save.");
const refresh = () => { for (const p of ["/app/sanctuary", "/app/sanctuary/week", "/app/sanctuary/discover", "/app/discover", "/app"]) revalidatePath(p); };

const DAILY = ["manifestation", "affirmation", "intention", "checkin", "question", "lesson", "challenge", "evening", "weekly", "monthly"] as const;

/** One entry per practice per day (weekly and monthly reflections are kept by week and month). */
export async function saveEntry(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const kind = z.enum(DAILY).safeParse(f.get("kind"));
  if (!kind.success) return fail("Unknown practice.");
  const mood = z.enum(MOODS.map(([k]) => k) as [string, ...string[]]).nullable().safeParse(f.get("mood") || null);
  if (!mood.success) return fail("Choose a feeling from the list.");
  if (kind.data === "checkin" && !mood.data) return fail("Choose the feeling closest to how you are.");
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(f.get("day"));
  const row = {
    user_id: m.viewer.id, kind: kind.data, day: day.success ? day.data : today(), mood: mood.data,
    content_id: z.string().uuid().safeParse(f.get("content_id")).success ? String(f.get("content_id")) : null,
    response: str(f, "response", 4000) || null,
  };
  const { data: existing } = await m.db.from("sanctuary_entries").select("id").eq("user_id", m.viewer.id).eq("day", row.day).eq("kind", row.kind).maybeSingle();
  const { error } = existing
    ? await m.db.from("sanctuary_entries").update({ mood: row.mood, response: row.response, content_id: row.content_id }).eq("id", existing.id)
    : await m.db.from("sanctuary_entries").insert(row);
  if (error) return fail("That couldn't be saved. Please try again.");
  refresh();
  return ok(kind.data === "checkin" ? "Thank you for checking in with yourself." : "Saved privately.");
}

/** Gratitude and accomplishments: as many as the member likes. */
export async function addNote(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const kind = z.enum(["gratitude", "accomplishment"]).safeParse(f.get("kind"));
  const response = str(f, "response", 4000);
  if (!kind.success || !response) return fail("Write a few words first.");
  const { error } = await m.db.from("sanctuary_entries").insert({ user_id: m.viewer.id, kind: kind.data, day: today(), response });
  if (error) return fail("That couldn't be saved. Please try again.");
  refresh();
  return ok(kind.data === "gratitude" ? "Gratitude noted." : "Accomplishment recorded. It counts.");
}

export async function deleteEntry(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Not found.");
  await m.db.from("sanctuary_entries").delete().eq("id", id.data).eq("user_id", m.viewer.id);
  refresh();
  return ok("Removed.");
}

/** Scenario answers are kept once; answering again (Revisit) replaces the earlier answer. */
export async function answerScenario(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.string().uuid().safeParse(f.get("content_id"));
  const choice = z.string().regex(/^[a-z0-9_-]{1,20}$/).safeParse(f.get("choice"));
  if (!id.success || !choice.success) return fail("Choose the answer closest to you.");
  const { data: c } = await m.db.from("sanctuary_content").select("options").eq("id", id.data).eq("kind", "scenario").maybeSingle();
  if (!c || !(c.options as { key: string }[] | null)?.some((o) => o.key === choice.data)) return fail("Choose one of the answers shown.");
  const { error } = await m.db.from("sanctuary_scenario_answers").upsert({ user_id: m.viewer.id, content_id: id.data, choice: choice.data, note: str(f, "note", 2000) || null, answered_at: new Date().toISOString() });
  if (error) return fail("That couldn't be saved. Please try again.");
  refresh();
  return ok("Thank you. There are no right or wrong answers, only what's true for you.");
}

export async function forgetScenario(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.string().uuid().safeParse(f.get("content_id"));
  if (!id.success) return fail("Not found.");
  await m.db.from("sanctuary_scenario_answers").delete().eq("user_id", m.viewer.id).eq("content_id", id.data);
  refresh();
  return ok("Removed. You can answer it again whenever you like.");
}

/** Consent, what to explore, and optional reminders (off by default). */
export async function saveSanctuarySettings(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const interestKeys = new Set(INTERESTS.map(([k]) => k as string));
  const interests = [...new Set(f.getAll("interests").map(String).filter((x) => interestKeys.has(x)))].slice(0, 12);
  const freq = z.enum(["off", "daily", "weekly", "monthly"]).safeParse(f.get("reminder_frequency") ?? "off");
  const time = z.string().regex(/^\d{2}:\d{2}$/).safeParse(f.get("reminder_time") ?? "08:00");
  const weekday = z.coerce.number().int().min(0).max(6).safeParse(f.get("reminder_weekday") ?? 1);
  const types = f.getAll("reminder_types").map(String).filter((t) => ["morning", "checkin", "evening", "weekly", "monthly"].includes(t));
  const tz = str(f, "time_zone", 60) || "America/New_York";
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { return fail("Choose a valid time zone."); }
  if (!freq.success || !time.success || !weekday.success) return fail("Please check your reminder choices.");
  const section = str(f, "section", 20);
  const patch: Record<string, unknown> = { user_id: m.viewer.id, updated_at: new Date().toISOString() };
  if (section === "consent" || section === "all") patch.share_with_portfolio = f.get("share_with_portfolio") === "on";
  if (section === "interests" || section === "all") patch.explore_interests = interests;
  if (section === "reminders" || section === "all") Object.assign(patch, { reminder_frequency: freq.data, reminder_time: time.data, reminder_weekday: weekday.data, reminder_types: types.length ? types : ["morning"], time_zone: tz });
  const { error } = await m.db.from("sanctuary_settings").upsert(patch);
  if (error) return fail("Your settings couldn't be saved.");
  refresh();
  revalidatePath("/app/sanctuary/settings");
  revalidatePath("/app/know-yourself/portfolio");
  return ok("Saved.");
}

export async function writeLetter(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const body = str(f, "body", 8000);
  const when = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(f.get("deliver_on"));
  if (!body) return fail("Write your letter first.");
  if (!when.success || when.data <= today()) return fail("Choose a delivery date in the future.");
  const { count } = await m.db.from("future_letters").select("id", { count: "exact", head: true }).eq("user_id", m.viewer.id).is("delivered_at", null);
  if ((count ?? 0) >= 24) return fail("You have 24 letters waiting. You can write more once some arrive.");
  const { error } = await m.db.from("future_letters").insert({ user_id: m.viewer.id, body, deliver_on: when.data });
  if (error) return fail("Your letter couldn't be saved.");
  refresh();
  return ok("Sealed. It will open on the date you chose, and we'll email you when it does.");
}

export async function deleteLetter(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Not found.");
  await m.db.from("future_letters").delete().eq("id", id.data).eq("user_id", m.viewer.id);
  refresh();
  return ok("Removed.");
}

// ─── My Vision Board ──────────────────────────────────────────────────────────────────────
/** Re-encodes photographs (removing location and camera details) and keeps them under 5 MB, in the member's own folder. */
async function cleanImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Please choose a JPEG, PNG or WebP photograph.";
  if (file.size > 5 * 1024 * 1024) return "Please choose a photograph under 5 MB.";
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    return "That photograph couldn't be processed. Please try another.";
  }
}

export async function addVisionItem(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const category = z.enum(VISION_CATEGORIES.map(([k]) => k) as [string, ...string[]]).safeParse(f.get("category"));
  const kind = z.enum(["goal", "intention", "photo", "accomplishment"]).safeParse(f.get("kind"));
  const title = str(f, "title", 160);
  if (!category.success || !kind.success || !title) return fail("Choose a category and give it a title.");
  const file = f.get("photo");
  let photo_path: string | null = null;
  if (file instanceof File && file.size > 0) {
    const img = await cleanImage(file);
    if (typeof img === "string") return fail(img);
    photo_path = `u/${m.viewer.id}/${randomUUID()}.webp`;
    const { error } = await m.db.storage.from("vision-board").upload(photo_path, img, { contentType: "image/webp", upsert: false });
    if (error) return fail("The photograph couldn't be uploaded. Please try again.");
  } else if (kind.data === "photo") return fail("Choose a photograph to add.");
  const target = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(f.get("target_date"));
  const { error } = await m.db.from("vision_items").insert({
    user_id: m.viewer.id, category: category.data, kind: kind.data, title, body: str(f, "body", 2000) || null, photo_path,
    target_date: target.success ? target.data : null, achieved_at: kind.data === "accomplishment" ? new Date().toISOString() : null,
  });
  if (error) {
    if (photo_path) await m.db.storage.from("vision-board").remove([photo_path]);
    return fail(/holds up to/.test(error.message) ? error.message : "That couldn't be added. Please try again.");
  }
  revalidatePath("/app/sanctuary/vision");
  return ok("Added to your vision board.");
}

export async function updateVisionItem(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.string().uuid().safeParse(f.get("id"));
  const action = z.enum(["achieve", "reopen", "delete"]).safeParse(f.get("action"));
  if (!id.success || !action.success) return fail("Not found.");
  if (action.data === "delete") {
    const { data: item } = await m.db.from("vision_items").select("photo_path").eq("id", id.data).maybeSingle();
    await m.db.from("vision_items").delete().eq("id", id.data).eq("user_id", m.viewer.id);
    if (item?.photo_path) await m.db.storage.from("vision-board").remove([item.photo_path]);
  } else {
    await m.db.from("vision_items").update({ achieved_at: action.data === "achieve" ? new Date().toISOString() : null }).eq("id", id.data).eq("user_id", m.viewer.id);
  }
  revalidatePath("/app/sanctuary/vision");
  return ok(action.data === "achieve" ? "Achieved. Take a moment to enjoy it." : action.data === "delete" ? "Removed." : "Reopened.");
}
