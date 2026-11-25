"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, isInsidePreview, requireStaff } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { CHECKIN_KINDS } from "@/lib/checkins";
import type { ActionResult } from "@/app/actions/admin";

/** Journey check-ins. Each member's preferences and check-ins are private to them (enforced by the database). */
const PATH = "/app/journey/check-ins";
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

async function member() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return null;
  return { viewer, supabase: (await createClient())! };
}

export async function saveCheckinPrefs(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const parsed = z.object({
    morning_time: time, evening_time: time, quiet_start: time, quiet_end: time,
    time_zone: z.string().min(3).max(60), wellness_frequency: z.enum(["weekly", "biweekly", "monthly"]),
  }).safeParse({
    morning_time: f.get("morning_time"), evening_time: f.get("evening_time"), quiet_start: f.get("quiet_start"), quiet_end: f.get("quiet_end"),
    time_zone: f.get("time_zone"), wellness_frequency: f.get("wellness_frequency") ?? "weekly",
  });
  if (!parsed.success) return fail("Please check the times.");
  const on = (k: string) => f.get(k) === "on";
  const pause = String(f.get("paused_until") ?? "");
  const { error } = await m.supabase.from("journey_checkin_prefs").upsert({
    user_id: m.viewer.id, ...parsed.data,
    morning_manifestation: on("morning_manifestation"), evening_reflection: on("evening_reflection"),
    personal_reminders: on("personal_reminders"), wellness: on("wellness"),
    channel_email: on("channel_email"), show_details: on("show_details"),
    paused_until: /^\d{4}-\d{2}-\d{2}$/.test(pause) ? pause : null,
  }, { onConflict: "user_id" });
  if (error) return fail("Not saved. Please try again.");
  revalidatePath(PATH);
  return ok("Your check-in preferences are saved. You can change them any time.");
}

export async function createCheckin(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const parsed = z.object({
    kind: z.enum(Object.keys(CHECKIN_KINDS) as [string, ...string[]]),
    title: z.string().trim().min(2).max(120),
    detail: z.string().trim().max(1000),
    due_at: z.iso.datetime({ offset: true }),
  }).safeParse({ kind: f.get("kind"), title: f.get("title"), detail: f.get("detail") ?? "", due_at: f.get("due_at") });
  if (!parsed.success) return fail("Tell Journey what to check in about and when.");
  const { error } = await m.supabase.from("journey_checkins").insert({
    user_id: m.viewer.id, kind: parsed.data.kind, title: parsed.data.title, detail: parsed.data.detail || null,
    due_at: parsed.data.due_at, repeat_yearly: f.get("repeat_yearly") === "on" && parsed.data.kind === "milestone",
  });
  if (error) return fail("Not saved. Please try again.");
  revalidatePath(PATH);
  return ok("Journey will check in with you then.");
}

/** Birthdays and anniversaries return next year automatically. */
async function scheduleNextYear(m: NonNullable<Awaited<ReturnType<typeof member>>>, id: string) {
  const { data: c } = await m.supabase.from("journey_checkins").select("kind, title, detail, due_at, repeat_yearly").eq("id", id).maybeSingle();
  if (!c?.repeat_yearly) return;
  const next = new Date(c.due_at);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  await m.supabase.from("journey_checkins").insert({ user_id: m.viewer.id, kind: c.kind, title: c.title, detail: c.detail, due_at: next.toISOString(), repeat_yearly: true });
}

/** Reply privately, set aside for now, or snooze — never a penalty for not responding. */
export async function updateCheckin(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Unknown check-in.");
  const action = String(f.get("action") ?? "");
  const t = m.supabase.from("journey_checkins");
  if (action === "respond") {
    const response = String(f.get("response") ?? "").trim().slice(0, 2000);
    if (!response) return fail("Write a few words, or simply choose “Not now”.");
    await t.update({ status: "responded", response, responded_at: new Date().toISOString() }).eq("id", id.data);
    await scheduleNextYear(m, id.data);
  } else if (action === "dismiss") {
    await t.update({ status: "dismissed" }).eq("id", id.data);
    await scheduleNextYear(m, id.data);
  } else if (action === "snooze") {
    await t.update({ due_at: new Date(Date.now() + 86_400_000).toISOString(), emailed_at: null }).eq("id", id.data);
  } else if (action === "delete") {
    await t.delete().eq("id", id.data);
  } else return fail("Unknown action.");
  revalidatePath(PATH);
  return ok(action === "respond" ? "Thank you for sharing. It’s saved privately." : action === "snooze" ? "Journey will check in tomorrow instead." : "Done.");
}

/** Owner: global check-in settings (no member data). */
export async function saveCheckinSettings(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner"]);
  const max = Number(f.get("max_emails_per_week"));
  const subject = String(f.get("email_subject") ?? "").trim();
  if (!Number.isInteger(max) || max < 0 || max > 21) return fail("Emails per week must be between 0 and 21.");
  if (subject.length < 3 || subject.length > 80) return fail("The email subject should be 3–80 characters.");
  const supabase = (await createClient())!;
  const row = { enabled: f.get("enabled") === "on", email_enabled: f.get("email_enabled") === "on", max_emails_per_week: max, email_subject: subject, updated_by: viewer.id };
  const { error } = await supabase.from("journey_checkin_settings").update(row).eq("id", true);
  if (error) return fail("Not saved.");
  await audit("journey.checkins.settings", "journey_checkin_settings", "settings", row);
  revalidatePath("/admin/journey");
  return ok("Check-in settings saved.");
}
