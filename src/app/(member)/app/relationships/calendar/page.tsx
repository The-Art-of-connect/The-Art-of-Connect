import { isInsidePreview, isStaff, requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { syncMemberCalendars } from "@/lib/calendar-server";
import { CouplesCalendar, type Busy, type CalEvent, type Link, type MyBusy } from "@/components/CouplesCalendar";
import { SafetyFooter } from "@/components/Lux";

export const metadata = { title: "Just us — our calendar" };

export default async function CalendarPage() {
  const { viewer } = await requireExperience("relationships");
  const preview = isInsidePreview(viewer);
  const supabase = await createClient();
  const from = new Date(Date.now() - 31 * 86_400_000).toISOString();
  const to = new Date(Date.now() + 366 * 86_400_000).toISOString();
  let events: CalEvent[] = [], busy: Busy[] = [], mine: MyBusy[] = [], links: Link[] = [], paired = false;

  if (supabase && !preview) {
    await syncMemberCalendars(viewer.id).catch(() => null); // refreshes linked calendars at most every 15 minutes
    const rel = supabase.schema("relationships");
    const [c, e, a, m, l] = await Promise.all([
      rel.from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle(),
      rel.from("couple_events").select("id, title, kind, location, starts_at, ends_at, all_day").gte("ends_at", from).lte("starts_at", to).order("starts_at"),
      rel.rpc("couple_availability", { p_from: from, p_to: to }),
      rel.from("busy_blocks").select("id, label, starts_at, ends_at, source").eq("user_id", viewer.id).gte("ends_at", from).order("starts_at").limit(3000),
      rel.from("calendar_links").select("id, provider, last_synced_at, last_error"),
    ]);
    paired = Boolean(c.data);
    events = (e.data ?? []).map((x) => ({ id: x.id, title: x.title, kind: x.kind, location: x.location, start: x.starts_at, end: x.ends_at, allDay: x.all_day }));
    busy = ((a.data ?? []) as { starts_at: string; ends_at: string; mine: boolean }[]).map((x) => ({ start: x.starts_at, end: x.ends_at, mine: x.mine }));
    // Unpaired members still see their own busy times.
    if (!paired) busy = (m.data ?? []).map((x) => ({ start: x.starts_at, end: x.ends_at, mine: true }));
    mine = (m.data ?? []).map((x) => ({ id: x.id, label: x.label, start: x.starts_at, end: x.ends_at, source: x.source }));
    links = l.data ?? [];
  }
  if (preview || (isStaff(viewer) && !paired)) {
    // Owner preview: a fictional couple's month, so the design can be reviewed.
    const d = (day: number, h: number) => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), day, h).toISOString(); };
    paired = true;
    events = [
      { id: "p1", title: "Date night", kind: "date_night", location: "Our favorite rooftop", start: d(12, 19), end: d(12, 21), allDay: false },
      { id: "p2", title: "Weekend trip", kind: "trip", location: null, start: d(19, 0), end: d(22, 0), allDay: true },
    ];
    busy = [{ start: d(6, 9), end: d(6, 17), mine: false }, { start: d(13, 9), end: d(13, 17), mine: false }, { start: d(9, 9), end: d(9, 17), mine: true }];
    mine = [{ id: "m1", label: "Work", start: d(9, 9), end: d(9, 17), source: "manual" }];
  }

  return (
    <>
      <CouplesCalendar events={events} busy={busy} mine={mine} links={links} paired={paired} preview={preview} />
      <SafetyFooter />
    </>
  );
}
