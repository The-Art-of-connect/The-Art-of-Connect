import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcs } from "@/lib/calendar";
import { hashToken } from "@/lib/calendar-server";

export const dynamic = "force-dynamic";

/**
 * The couple's shared "Our Calendar" as a subscription feed for Apple
 * Calendar, Google Calendar and Outlook on any phone or computer. Only shared
 * events are included — never either partner's private busy times.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(clean)) return new Response("Not found", { status: 404 });
  const db = createAdminClient();
  if (!db) return new Response("Not found", { status: 404 });
  const rel = db.schema("relationships");
  const { data: t } = await rel.from("calendar_feed_tokens").select("user_id").eq("token_hash", hashToken(clean)).maybeSingle();
  if (!t) return new Response("Not found", { status: 404 });
  const { data: m } = await rel.from("couple_members").select("couple_id").eq("user_id", t.user_id).maybeSingle();
  const { data: events } = m
    ? await rel.from("couple_events").select("id, title, location, notes, starts_at, ends_at, all_day, updated_at")
        .eq("couple_id", m.couple_id).gte("ends_at", new Date(Date.now() - 90 * 86_400_000).toISOString()).order("starts_at").limit(1000)
    : { data: [] };
  const ics = buildIcs((events ?? []).map((e) => ({
    id: e.id, title: e.title, location: e.location, notes: e.notes, start: new Date(e.starts_at), end: new Date(e.ends_at), allDay: e.all_day, updated: new Date(e.updated_at),
  })));
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="just-us.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
