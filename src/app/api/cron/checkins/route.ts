import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { inQuietHours, localClock } from "@/lib/checkins";

export const dynamic = "force-dynamic";

/**
 * Sends gentle email reminders for check-ins that are due. Runs every 15 minutes
 * (Netlify scheduled function). Respects the owner's switches, each member's
 * channel choice, pause date, quiet hours and the weekly email limit. Emails
 * contain no personal details unless the member chose to include titles.
 */
export async function POST(req: Request) {
  if (!verifyCron(req, "checkins")) return NextResponse.json({ ok: false }, { status: 401 });
  const db = createAdminClient();
  if (!db) return NextResponse.json({ ok: false, reason: "no database" }, { status: 503 });
  // Elite retention: erase financial summaries whose review window has passed.
  await db.rpc("elite_purge_financials");
  // Connect Calendar: optional reminders, about a day before events members chose to be reminded of.
  try {
    const soon = new Date(Date.now() + 26 * 3600_000).toISOString();
    const { data: due } = await db.from("social_event_rsvps").select("event_id, user_id, social_events!inner(title, starts_at, status)")
      .eq("remind", true).is("reminded_at", null).in("status", ["interested", "attending"])
      .gte("social_events.starts_at", new Date().toISOString()).lte("social_events.starts_at", soon).eq("social_events.status", "active").limit(200);
    for (const r of (due ?? []) as unknown as { event_id: string; user_id: string; social_events: { title: string } }[]) {
      const { data: prof } = await db.from("profiles").select("email, status").eq("id", r.user_id).maybeSingle();
      if (!prof?.email || prof.status !== "active") continue;
      const link = `${env.siteUrl.replace(/\/$/, "")}/app/connect/events/${r.event_id}`;
      const sent = await sendEmail(prof.email, templates.journeyCheckin({ subject: "Coming up: an event on your Connect Calendar", topic: r.social_events.title, link }), { category: "membership", idempotencyKey: `event-reminder-${r.event_id}-${r.user_id}` });
      if (sent.ok) await db.from("social_event_rsvps").update({ reminded_at: new Date().toISOString() }).eq("event_id", r.event_id).eq("user_id", r.user_id);
    }
  } catch { /* reminders are best-effort */ }
  const { data: settings } = await db.from("journey_checkin_settings").select("*").maybeSingle();
  if (!settings?.enabled || !settings.email_enabled) return NextResponse.json({ ok: true, sent: 0, reason: "email check-ins off" });

  const { data: due } = await db.from("journey_checkins").select("id, user_id, title, due_at")
    .eq("status", "scheduled").is("emailed_at", null).lte("due_at", new Date().toISOString()).order("due_at").limit(200);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let sent = 0, skipped = 0;
  for (const c of due ?? []) {
    const { data: p } = await db.from("journey_checkin_prefs").select("*").eq("user_id", c.user_id).maybeSingle();
    const prefs = p ?? { channel_email: false };
    if (!prefs.channel_email || p?.personal_reminders === false || (p?.paused_until && p.paused_until >= today)) { skipped++; continue; }
    if (p && inQuietHours(localClock(p.time_zone), p.quiet_start, p.quiet_end)) { skipped++; continue; } // try again after quiet hours
    const { count } = await db.from("journey_checkins").select("id", { count: "exact", head: true }).eq("user_id", c.user_id).gte("emailed_at", weekAgo);
    if ((count ?? 0) >= settings.max_emails_per_week) { skipped++; continue; }
    const { data: prof } = await db.from("profiles").select("email, status").eq("id", c.user_id).maybeSingle();
    if (!prof?.email || prof.status !== "active") { skipped++; continue; }
    const link = `${env.siteUrl.replace(/\/$/, "")}/app/journey/check-ins`;
    const r = await sendEmail(prof.email, templates.journeyCheckin({ subject: settings.email_subject, topic: p?.show_details ? c.title : null, link }), { category: "membership", idempotencyKey: `checkin-${c.id}` });
    if (r.ok) { await db.from("journey_checkins").update({ emailed_at: new Date().toISOString() }).eq("id", c.id); sent++; } else skipped++;
  }
  return NextResponse.json({ ok: true, sent, skipped });
}
