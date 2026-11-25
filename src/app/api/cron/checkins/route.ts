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
