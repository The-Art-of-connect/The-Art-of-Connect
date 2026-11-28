"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type R = { ok: boolean; message: string } | null;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Owner controls for Live Q&A (directive 43). Saved to the database: no deployment needed. */
export async function saveLiveSettings(_p: R, f: FormData): Promise<R> {
  const viewer = await requireStaff(["owner"]);
  const times = String(f.get("start_times") ?? "").split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
  if (!times.length || times.length > 6 || !times.every((t) => TIME.test(t))) return { ok: false, message: "Enter one to six start times like 10:00, 19:00." };
  const tz = String(f.get("timezone") ?? "America/New_York").trim();
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { return { ok: false, message: "Choose a valid time zone, for example America/New_York." }; }
  const duration = Number(f.get("duration_minutes"));
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) return { ok: false, message: "Choose a length between 15 and 240 minutes." };
  const host = String(f.get("default_host") ?? "");
  const db = (await createClient())!;
  const { error } = await db.from("circle_live_settings").update({
    enabled: f.get("enabled") === "on", start_times: [...new Set(times)].sort(), timezone: tz, duration_minutes: duration,
    eligibility: f.get("eligibility") === "paid_members" ? "paid_members" : "all_members",
    popup_invitations: f.get("popup_invitations") === "on", message_center_invitations: f.get("message_center_invitations") === "on",
    default_host: /^[0-9a-f-]{36}$/.test(host) ? host : null, updated_by: viewer.id, updated_at: new Date().toISOString(),
  }).eq("id", true);
  revalidatePath("/admin/circle/live");
  return error ? { ok: false, message: "The schedule couldn't be saved." } : { ok: true, message: `Saved: ${times.length} live session${times.length > 1 ? "s" : ""} a day. New sessions follow this schedule from the next check (within 15 minutes).` };
}
