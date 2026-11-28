"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingError, bookingGate } from "@/lib/counseling-booking";

/** Counseling appointment booking. The database enforces launch gating, fictional-only testing and no double booking. No payment is taken. */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string, url?: string): R => ({ ok: true, message, url });
const fail = (message: string): R => ({ ok: false, message });
const PREVIEW = fail("Preview only: sign in with your own account to save.");

async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db, c: db.schema("counseling") } : null;
}
const refresh = () => { revalidatePath("/app/wellness/appointments"); revalidatePath("/app/wellness/practice"); revalidatePath("/app/wellness/counselors", "layout"); };

// ─── Members ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function requestAppointment(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const gate = await bookingGate(m.viewer);
  if (!gate.canBrowse) return fail(bookingError("BOOKING_NOT_OPEN"));
  const v = z.object({
    counselor: z.uuid(), fee: z.uuid(), slot: z.iso.datetime({ offset: true }), format: z.enum(["video", "phone", "in_person"]), name: z.string().trim().min(1).max(80),
  }).safeParse({ counselor: f.get("counselor"), fee: f.get("fee"), slot: f.get("slot"), format: f.get("format"), name: f.get("name") });
  if (!v.success) return fail("Choose a service, a time and a format, and add the name you'd like your counselor to use.");
  if (f.get("understand") !== "on") return fail("Please confirm you understand this is a request, not a confirmed appointment.");
  const { error } = await m.db.rpc("counseling_request_appointment", {
    p_counselor: v.data.counselor, p_fee: v.data.fee, p_starts: v.data.slot, p_format: v.data.format, p_name: v.data.name,
  });
  if (error) return fail(bookingError(error.message));
  refresh();
  return ok("Your request was sent. Your counselor will confirm or decline it, and you'll see the answer in My Appointments.", "/app/wellness/appointments?sent=1");
}

export async function cancelAppointment(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("That appointment wasn't found.");
  const { error } = await m.db.rpc("counseling_cancel_appointment", { p_id: id.data });
  if (error) return fail(bookingError(error.message));
  refresh();
  return ok("Canceled. Your counselor has been told, and the time is open again.");
}

// ─── Counselors (My Counseling Practice) ─────────────────────────────────────────────────────────────────────────────

async function counselor() {
  const m = await me(); if (!m) return null;
  const { data } = await m.c.from("counselors").select("user_id, is_verified").eq("user_id", m.viewer.id).maybeSingle();
  return data ? m : null;
}
const NOT_COUNSELOR = fail("This is available to approved counselors only.");

export async function respondAppointment(_p: R, f: FormData): Promise<R> {
  const m = await counselor(); if (!m) return NOT_COUNSELOR;
  const v = z.object({ id: z.uuid(), decision: z.enum(["confirm", "decline", "cancel", "completed", "no_show"]) }).safeParse({ id: f.get("id"), decision: f.get("decision") });
  if (!v.success) return fail("Choose what to do with this appointment.");
  const { error } = await m.db.rpc("counseling_respond_appointment", { p_id: v.data.id, p_decision: v.data.decision });
  if (error) return fail(bookingError(error.message));
  refresh();
  const done: Record<string, string> = {
    confirm: "Confirmed. The member has been told.", decline: "Declined. The member has been told and can choose another time.",
    cancel: "Canceled. The member has been told.", completed: "Recorded as completed.", no_show: "Recorded as missed.",
  };
  return ok(done[v.data.decision]);
}

const list = (v: FormDataEntryValue | null, n: number) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, n).map((s) => s.slice(0, 60));

export async function saveListing(_p: R, f: FormData): Promise<R> {
  const m = await counselor(); if (!m) return NOT_COUNSELOR;
  const v = z.object({
    professional_name: z.string().trim().min(2).max(120), bio: z.string().trim().max(2000), cancellation_policy: z.string().trim().max(2000),
  }).safeParse({ professional_name: f.get("professional_name"), bio: f.get("bio") ?? "", cancellation_policy: f.get("cancellation_policy") ?? "" });
  if (!v.success) return fail("Add your professional name (at least two characters).");
  const offers_virtual = f.get("offers_virtual") === "on", offers_in_person = f.get("offers_in_person") === "on";
  if (!offers_virtual && !offers_in_person) return fail("Choose at least one way you meet clients.");
  const { error } = await m.c.from("counselors").update({
    professional_name: v.data.professional_name, bio: v.data.bio || null, cancellation_policy: v.data.cancellation_policy || null,
    offers_virtual, offers_in_person, languages: list(f.get("languages"), 10), licensed_states: list(f.get("licensed_states"), 60),
    is_listed: f.get("is_listed") === "on",
  }).eq("user_id", m.viewer.id);
  if (error) return fail("Your listing couldn't be saved.");
  refresh();
  return ok(f.get("is_listed") === "on" ? "Saved. Verified counselors who are listed appear in the directory when booking is open." : "Saved. You're hidden from the directory.");
}

export async function addAvailability(_p: R, f: FormData): Promise<R> {
  const m = await counselor(); if (!m) return NOT_COUNSELOR;
  const v = z.object({
    weekday: z.coerce.number().int().min(0).max(6), start_time: z.string().regex(/^\d{2}:\d{2}$/), end_time: z.string().regex(/^\d{2}:\d{2}$/), timezone: z.string().trim().min(2).max(60),
  }).safeParse({ weekday: f.get("weekday"), start_time: f.get("start_time"), end_time: f.get("end_time"), timezone: f.get("timezone") });
  if (!v.success) return fail("Choose a day, a start and end time, and your time zone.");
  if (v.data.end_time <= v.data.start_time) return fail("The end time must be after the start time.");
  const { error } = await m.c.from("availability").insert({ counselor_id: m.viewer.id, ...v.data });
  if (error) return fail(error.message.includes("time zone") ? "Choose a valid time zone, such as America/New_York." : "That time couldn't be added.");
  refresh();
  return ok("Added to your weekly availability.");
}

export async function removeAvailability(_p: R, f: FormData): Promise<R> {
  const m = await counselor(); if (!m) return NOT_COUNSELOR;
  const { error } = await m.c.from("availability").delete().eq("id", String(f.get("id") ?? "")).eq("counselor_id", m.viewer.id);
  if (error) return fail("That time couldn't be removed.");
  refresh();
  return ok("Removed. Requests already made stay as they are.");
}

export async function addFee(_p: R, f: FormData): Promise<R> {
  const m = await counselor(); if (!m) return NOT_COUNSELOR;
  const v = z.object({
    service: z.enum(["individual", "couples", "family", "initial_consultation", "specialized"]), service_label: z.string().trim().max(120),
    format: z.enum(["virtual", "in_person", "any"]), duration_minutes: z.coerce.number().int().min(10).max(240),
    fee: z.coerce.number().min(0).max(100000), notes: z.string().trim().max(1000),
  }).safeParse({ service: f.get("service"), service_label: f.get("service_label") ?? "", format: f.get("format"), duration_minutes: f.get("duration_minutes"), fee: f.get("fee"), notes: f.get("notes") ?? "" });
  if (!v.success) return fail("Choose a service and format, a length between 10 and 240 minutes, and your fee in dollars.");
  const { error } = await m.c.from("fees").insert({
    counselor_id: m.viewer.id, service: v.data.service, service_label: v.data.service_label || null, format: v.data.format,
    duration_minutes: v.data.duration_minutes, fee_cents: Math.round(v.data.fee * 100), notes: v.data.notes || null,
  });
  if (error) return fail("That fee couldn't be saved.");
  refresh();
  return ok("Published. Members see your own fee before they request a time.");
}

export async function removeFee(_p: R, f: FormData): Promise<R> {
  const m = await counselor(); if (!m) return NOT_COUNSELOR;
  const { error } = await m.c.from("fees").delete().eq("id", String(f.get("id") ?? "")).eq("counselor_id", m.viewer.id);
  if (error) return fail("That fee couldn't be removed.");
  refresh();
  return ok("Removed. Requests already made keep the fee shown when they were sent.");
}
