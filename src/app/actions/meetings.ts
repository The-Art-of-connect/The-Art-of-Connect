"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { sendJourneyMessage } from "@/lib/journey-server";
import { MINUTES_SECTIONS, NOT_BINDING, itemLine, parseSection, type Minutes } from "@/lib/meetings";

/** Business Deal Room meetings (directive 48). The database enforces host control, consent and access. */
type R = { ok: boolean; message: string; url?: string; draft?: string } | null;
const ok = (message: string, extra: Partial<NonNullable<R>> = {}): R => ({ ok: true, message, ...extra });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const UUID = /^[0-9a-f-]{36}$/;

async function ctx() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, b: db.schema("business") } : null;
}
const page = (room: string, meeting?: string) => { revalidatePath(`/app/connect360/rooms/${room}`); if (meeting) revalidatePath(`/app/connect360/rooms/${room}/meetings/${meeting}`); };
const clean = (e: { message: string } | null, fallback: string) => (e?.message && !/permission|violates|syntax/i.test(e.message) ? e.message : fallback);

export async function startMeeting(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only.");
  const room = str(f, "room", 40), title = str(f, "title", 160);
  if (!UUID.test(room) || title.length < 3) return fail("Give the meeting a title.");
  const mode = ["none", "manual", "journey_assisted"].includes(str(f, "mode", 20)) ? str(f, "mode", 20) : "manual";
  const { data, error } = await c.b.rpc("start_meeting", { p_room: room, p_title: title, p_purpose: str(f, "purpose", 1000), p_mode: mode });
  if (error || !data) return fail(clean(error, "The meeting couldn't be started."));
  page(room);
  return ok("Your meeting has started. Recording is off.", { url: `/app/connect360/rooms/${room}/meetings/${data}` });
}

export async function joinMeeting(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only.");
  const { error } = await c.b.rpc("join_meeting", { p_meeting: str(f, "meeting", 40), p_recording_consent: f.get("consent") === "on" });
  page(str(f, "room", 40), str(f, "meeting", 40));
  return error ? fail(clean(error, "You couldn't join this meeting.")) : ok("You've joined.");
}

export async function setRecording(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only.");
  const { error } = await c.b.rpc("set_recording", { p_meeting: str(f, "meeting", 40), p_state: str(f, "state", 20) });
  page(str(f, "room", 40), str(f, "meeting", 40));
  return error ? fail(clean(error, "Recording couldn't be changed.")) : ok("Updated.");
}

export async function endMeeting(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only.");
  const { error } = await c.b.rpc("end_meeting", { p_meeting: str(f, "meeting", 40) });
  page(str(f, "room", 40), str(f, "meeting", 40));
  return error ? fail(clean(error, "The meeting couldn't be ended.")) : ok("Meeting ended. Finish and approve the minutes whenever you're ready.");
}

export async function saveMinutes(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only: nothing is saved.");
  const sections: Minutes = {};
  for (const s of MINUTES_SECTIONS) {
    const items = parseSection(s.key, str(f, s.key, 6000));
    if (items.length) sections[s.key] = items;
  }
  const { data, error } = await c.b.rpc("save_minutes", { p_meeting: str(f, "meeting", 40), p_sections: sections, p_drafted_by: f.get("from_journey") === "1" ? "journey" : "host" });
  page(str(f, "room", 40), str(f, "meeting", 40));
  return error ? fail(clean(error, "The minutes couldn't be saved.")) : ok(`Saved as version ${data}. Review, then approve when ready.`);
}

export async function approveMinutes(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only.");
  const { error } = await c.b.rpc("approve_minutes", { p_meeting: str(f, "meeting", 40), p_version: Number(f.get("version")) });
  page(str(f, "room", 40), str(f, "meeting", 40));
  return error ? fail(clean(error, "The minutes couldn't be approved.")) : ok("Approved. Participants can now read them, and decisions and action items were added to the room.");
}

export async function grantAccess(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only.");
  const { error } = await c.b.rpc("grant_meeting_access", { p_meeting: str(f, "meeting", 40), p_user: str(f, "user", 40) });
  page(str(f, "room", 40), str(f, "meeting", 40));
  return error ? fail(clean(error, "Access couldn't be shared.")) : ok("Shared. They can now read this meeting's approved minutes.");
}

/** Journey organizes the host's own notes into a draft for the host to review (draft only; nothing is stored). */
export async function journeyDraft(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only.");
  const notes = str(f, "notes", 12000);
  if (notes.length < 20) return fail("Add your notes first; Journey only organizes what you wrote.");
  const r = await sendJourneyMessage({ mode: "business", message: notes, requestKey: randomUUID(), minutes: { title: str(f, "title", 160), notes } });
  if (!r.ok) return fail(r.message ?? "Journey couldn't prepare a draft just now. You can write the minutes yourself.");
  return ok("Journey prepared a draft from your notes. Review and edit it before saving.", { draft: r.reply });
}

/** Email the approved, typed minutes to the meeting's participants (text messages need an approved SMS provider). */
export async function emailMinutes(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c) return fail("Preview only: nothing is sent.");
  const meeting = str(f, "meeting", 40), room = str(f, "room", 40);
  const [{ data: m }, { data: mm }] = await Promise.all([
    c.b.from("room_meetings").select("id, title, purpose, started_at, host_id").eq("id", meeting).maybeSingle(),
    c.b.from("meeting_minutes").select("sections, version").eq("meeting_id", meeting).eq("status", "approved").order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!m || m.host_id !== c.viewer.id) return fail("Only the meeting host sends the minutes.");
  if (!mm) return fail("Approve the minutes first.");
  const admin = createAdminClient();
  const { data: people } = admin ? await admin.schema("business").from("meeting_attendees").select("user_id").eq("meeting_id", meeting) : { data: [] };
  const { data: emails } = admin && people?.length ? await admin.from("profiles").select("email").in("id", people.map((p) => p.user_id)) : { data: [] };
  const sec = mm.sections as Minutes;
  const paragraphs = [
    `Meeting date: ${new Date(m.started_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" })} (Eastern)`,
    ...(m.purpose ? [`Purpose: ${m.purpose}`] : []),
    ...MINUTES_SECTIONS.filter((s) => sec[s.key]?.length).map((s) => `${s.label}: ${sec[s.key]!.map(itemLine).join("; ")}`),
    NOT_BINDING,
  ];
  const link = `${env.siteUrl.replace(/\/$/, "")}/app/connect360/rooms/${room}/meetings/${meeting}`;
  let sent = 0;
  for (const e of emails ?? []) {
    const r = await sendEmail(String(e.email), { subject: `Meeting minutes: ${m.title}`, preheader: "Approved minutes from your Business Deal Room", heading: m.title, paragraphs, action: { label: "Open the typed copy", url: `${link}/print` } }, { category: "membership", idempotencyKey: `minutes-${meeting}-${mm.version}-${e.email}` });
    if (r.ok) sent++;
  }
  return sent ? ok(`Sent to ${sent} participant${sent > 1 ? "s" : ""}.`) : ok("Prepared. Email delivery is limited before launch; participants can read the approved minutes in the room.");
}
