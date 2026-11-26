import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { reminderDue } from "@/lib/sanctuary";

const TYPE_LABEL: Record<string, string> = { morning: "morning practices", checkin: "your check-in", evening: "evening reflection", weekly: "weekly reflection", monthly: "monthly reflection" };

/**
 * Every 15 minutes: optional Sanctuary reminders (only for members who chose them, at their chosen local time, at most
 * once per period, never with their private content) and letters to future selves that have arrived.
 */
export async function sanctuaryCron(now = new Date()) {
  const db = createAdminClient();
  if (!db) return { reminders: 0, letters: 0 };
  let reminders = 0, letters = 0;
  const { data: settings } = await db.from("sanctuary_settings").select("user_id, reminder_frequency, reminder_time, reminder_weekday, reminder_types, time_zone, last_reminded_at").neq("reminder_frequency", "off").limit(500);
  for (const s of settings ?? []) {
    if (!reminderDue({ ...s, reminder_time: String(s.reminder_time).slice(0, 5) }, now)) continue;
    const { data: p } = await db.from("profiles").select("email, display_name, status").eq("id", s.user_id).maybeSingle();
    if (!p?.email || p.status !== "active") continue;
    const r = await sendEmail(p.email, templates.sanctuaryReminder({ name: p.display_name, types: (s.reminder_types ?? []).map((t: string) => TYPE_LABEL[t] ?? t) }), { category: "membership", idempotencyKey: `sanctuary-${s.user_id}-${now.toISOString().slice(0, 13)}` });
    if (r.ok) { reminders++; await db.from("sanctuary_settings").update({ last_reminded_at: now.toISOString() }).eq("user_id", s.user_id); }
  }
  const { data: due } = await db.from("future_letters").select("id, user_id, created_at").is("delivered_at", null).lte("deliver_on", now.toISOString().slice(0, 10)).limit(200);
  for (const l of due ?? []) {
    const { data: p } = await db.from("profiles").select("email, display_name, status").eq("id", l.user_id).maybeSingle();
    const written = new Date(l.created_at).toLocaleDateString("en-US", { dateStyle: "long" });
    if (p?.email && p.status === "active") await sendEmail(p.email, templates.futureLetter({ name: p.display_name, written }), { category: "membership", idempotencyKey: `letter-${l.id}` });
    await db.from("future_letters").update({ delivered_at: now.toISOString() }).eq("id", l.id);
    letters++;
  }
  return { reminders, letters };
}
