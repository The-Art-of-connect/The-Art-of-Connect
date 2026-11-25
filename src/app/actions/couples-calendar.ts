"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, isInsidePreview, requireExperience } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UNAVAILABLE_MESSAGE, validateCalendarUrl } from "@/lib/calendar";
import { newFeedToken, syncMemberCalendars } from "@/lib/calendar-server";
import { env } from "@/lib/env";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Couples calendar. The database repeats every rule: only partners see
 * shared events, busy times belong to their owner alone, and a shared event
 * over either partner's busy time is refused with the same neutral message.
 */
const PATH = "/app/relationships/calendar";
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

async function member() {
  const { viewer } = await requireExperience("relationships");
  if (isInsidePreview(viewer)) return null;
  return { viewer, supabase: (await createClient())! };
}

const When = z.object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) })
  .refine((w) => new Date(w.end) > new Date(w.start), "The end must be after the start.");

export async function addSharedEvent(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const parsed = z.object({
    title: z.string().trim().min(1).max(120),
    kind: z.enum(["date_night", "trip", "anniversary", "activity", "other"]),
    location: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(2000).optional(),
    allDay: z.boolean(),
  }).and(When).safeParse({
    title: f.get("title"), kind: f.get("kind") ?? "date_night", location: String(f.get("location") ?? "") || undefined,
    notes: String(f.get("notes") ?? "") || undefined, allDay: f.get("allDay") === "on", start: f.get("start"), end: f.get("end"),
  });
  if (!parsed.success) return fail("Add a title, a start and an end.");
  const { data: couple } = await m.supabase.schema("relationships").from("couple_members").select("couple_id").eq("user_id", m.viewer.id).maybeSingle();
  if (!couple) return fail("Your shared calendar opens when your partner accepts your invitation.");
  const { error } = await m.supabase.schema("relationships").from("couple_events").insert({
    couple_id: couple.couple_id, created_by: m.viewer.id, kind: parsed.data.kind, title: parsed.data.title,
    location: parsed.data.location ?? null, notes: parsed.data.notes ?? null,
    starts_at: parsed.data.start, ends_at: parsed.data.end, all_day: parsed.data.allDay,
  });
  if (error) return fail(error.message.includes("choose another date") ? UNAVAILABLE_MESSAGE : "That wasn't saved. Please try again.");
  revalidatePath(PATH);
  return ok("Added to your shared calendar.");
}

export async function removeSharedEvent(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Unknown event.");
  await m.supabase.schema("relationships").from("couple_events").delete().eq("id", id.data);
  revalidatePath(PATH);
  return ok("Removed.");
}

export async function addBusyTime(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const parsed = z.object({ label: z.string().trim().max(80).optional() }).and(When).safeParse({
    label: String(f.get("label") ?? "") || undefined, start: f.get("start"), end: f.get("end"),
  });
  if (!parsed.success) return fail("Add a start and an end.");
  const { error } = await m.supabase.schema("relationships").from("busy_blocks").insert({
    user_id: m.viewer.id, source: "manual", label: parsed.data.label ?? null, starts_at: parsed.data.start, ends_at: parsed.data.end,
  });
  if (error) return fail("That wasn't saved.");
  revalidatePath(PATH);
  return ok("Saved privately. Your partner will only see that you're unavailable.");
}

export async function removeBusyTime(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Unknown time.");
  await m.supabase.schema("relationships").from("busy_blocks").delete().eq("id", id.data).eq("source", "manual");
  revalidatePath(PATH);
  return ok("Removed.");
}

export async function linkCalendar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  if (!(await allow("calendar-link", 10, 3600))) return fail("Please wait a little before linking another calendar.");
  const v = validateCalendarUrl(String(f.get("url") ?? ""));
  if (!v.ok) return fail(v.error);
  const db = createAdminClient();
  if (!db) return fail("Calendar linking opens soon.");
  const { count } = await db.schema("relationships").from("calendar_links").select("id", { count: "exact", head: true }).eq("user_id", m.viewer.id);
  if ((count ?? 0) >= 3) return fail("You can link up to three calendars.");
  const { error } = await db.schema("relationships").from("calendar_links").insert({ user_id: m.viewer.id, provider: v.provider, url: v.url });
  if (error) return fail(error.code === "23505" ? "That calendar is already linked." : "That calendar wasn't linked.");
  const zone = String(f.get("zone") ?? "") || undefined;
  const r = await syncMemberCalendars(m.viewer.id, { force: true, zone });
  revalidatePath(PATH);
  return r.errors.length ? fail(`Linked, but: ${r.errors[0]}`) : ok("Linked. Only your busy times are used — never what the events are.");
}

export async function unlinkCalendar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Unknown calendar.");
  await m.supabase.schema("relationships").from("calendar_links").delete().eq("id", id.data);
  revalidatePath(PATH);
  return ok("Unlinked, and its busy times were removed.");
}

export async function refreshCalendars(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return fail("Preview only.");
  if (!(await allow("calendar-sync", 12, 3600))) return fail("Please wait a few minutes before refreshing again.");
  const r = await syncMemberCalendars(viewer.id, { force: true, zone: String(f.get("zone") ?? "") || undefined });
  revalidatePath(PATH);
  return r.errors.length ? fail(r.errors[0]) : ok(r.synced ? "Your calendars are up to date." : "No linked calendars yet.");
}

type LinkResult = { ok: boolean; message: string; url?: string } | null;

export async function createSubscribeLink(_p: LinkResult): Promise<LinkResult> {
  const m = await member();
  if (!m) return { ok: false, message: "Preview only." };
  const token = await newFeedToken(m.viewer.id);
  if (!token) return { ok: false, message: "That isn't available yet." };
  const base = env.siteUrl.replace(/^https?:\/\//, "");
  return { ok: true, message: "Your private link is ready. Anyone with it can see your shared plans, so keep it to yourself.", url: `webcal://${base}/api/couples/calendar/${token}` };
}
