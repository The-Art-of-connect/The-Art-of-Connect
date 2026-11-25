/**
 * Couples calendar — pure functions (no network, no database).
 *
 *   • parseBusyTimes(): reads a member's private calendar feed (iCalendar /
 *     .ics, as published by Google Calendar, Apple iCloud and Outlook) and
 *     returns ONLY start and end times. Titles, locations, attendees and
 *     notes are deliberately never read into the result.
 *   • validateCalendarUrl(): accepts only the providers' own calendar hosts,
 *     so the server can never be pointed at an internal address.
 *   • buildIcs(): the couple's shared calendar as a subscription feed that
 *     works in Apple Calendar, Google Calendar and Outlook on any device.
 *   • Interval helpers for "available / not available" without details.
 */

export type Interval = { start: Date; end: Date };
export type Provider = "google" | "apple" | "outlook";

// ─── Linked calendar addresses ──────────────────────────────────────
const HOSTS: { provider: Provider; test: (h: string) => boolean }[] = [
  { provider: "google", test: (h) => h === "calendar.google.com" },
  { provider: "apple", test: (h) => /^p\d{1,3}-caldav\.icloud\.com$/.test(h) || /^p\d{1,3}-calendars\.icloud\.com$/.test(h) },
  { provider: "outlook", test: (h) => h === "outlook.office365.com" || h === "outlook.live.com" || h === "outlook.office.com" },
];

/** Normalizes webcal:// to https:// and accepts only known calendar providers. */
export function validateCalendarUrl(raw: string): { ok: true; url: string; provider: Provider } | { ok: false; error: string } {
  const v = raw.trim().replace(/^webcals?:\/\//i, "https://");
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return { ok: false, error: "That doesn't look like a calendar link. Copy the full link and try again." };
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443"))
    return { ok: false, error: "Please use the secure calendar link from Google, Apple or Outlook." };
  const host = u.hostname.toLowerCase();
  const match = HOSTS.find((h) => h.test(host));
  if (!match) return { ok: false, error: "We can link Google, Apple (iCloud) and Outlook calendars." };
  if (v.length > 2000) return { ok: false, error: "That link is too long." };
  return { ok: true, url: u.toString(), provider: match.provider };
}

// ─── iCalendar parsing ──────────────────────────────────────────────
type Prop = { name: string; params: Record<string, string>; value: string };

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function parseLine(line: string): Prop | null {
  const colon = line.indexOf(":");
  if (colon < 1) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

/** Offset in minutes between UTC and a time zone at a given instant. */
function tzOffsetMinutes(timeZone: string, at: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
    return Math.round((asUtc - at.getTime()) / 60000);
  } catch {
    return null;
  }
}

/** A wall-clock time in a named zone, converted to the real instant. */
export function zonedTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const off1 = tzOffsetMinutes(timeZone, new Date(guess));
  if (off1 === null) return new Date(guess);
  const first = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(timeZone, new Date(first));
  return new Date(off2 === null || off2 === off1 ? first : guess - off2 * 60000);
}

type When = { date: Date; allDay: boolean };

function parseWhen(p: Prop, fallbackZone: string): When | null {
  const v = p.value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly || p.params.VALUE === "DATE") {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(v);
    if (!m) return null;
    // All-day events block the whole day in the member's own time zone.
    return { date: zonedTimeToUtc(+m[1], +m[2], +m[3], 0, 0, 0, fallbackZone), allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]];
  if (m[7] === "Z") return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)), allDay: false };
  return { date: zonedTimeToUtc(y, mo, d, h, mi, s, p.params.TZID || fallbackZone), allDay: false };
}

function parseDuration(v: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return null;
  const ms = ((+(m[2] ?? 0) * 7 + +(m[3] ?? 0)) * 86400 + +(m[4] ?? 0) * 3600 + +(m[5] ?? 0) * 60 + +(m[6] ?? 0)) * 1000;
  return m[1] === "-" ? -ms : ms;
}

const DAY = 86_400_000;
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

/** Expands a recurring event's start times inside [from, to]. Supports the rules calendar apps actually use. */
function expand(start: Date, rrule: string | null, exdates: Set<number>, from: Date, to: Date, durationMs: number): Date[] {
  const out: Date[] = [];
  const push = (d: Date) => {
    if (!exdates.has(d.getTime()) && d.getTime() + durationMs > from.getTime() && d < to) out.push(d);
  };
  if (!rrule) {
    push(start);
    return out;
  }
  const r = Object.fromEntries(rrule.split(";").map((kv) => kv.split("=")).filter((kv) => kv.length === 2).map(([k, v]) => [k.toUpperCase(), v]));
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL ?? 1) || 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const untilProp = r.UNTIL ? parseWhen({ name: "UNTIL", params: {}, value: r.UNTIL }, "UTC") : null;
  const until = untilProp ? new Date(untilProp.date.getTime() + (untilProp.allDay ? DAY - 1 : 0)) : null;
  const end = until && until < to ? until : to;
  const byDay = r.BYDAY ? r.BYDAY.split(",").map((x) => WEEKDAYS.indexOf(x.replace(/^[+-]?\d+/, ""))).filter((x) => x >= 0) : null;
  let n = 0;
  const MAX = 2000;

  if (freq === "WEEKLY" && byDay?.length) {
    // Walk week by week from the week of the first occurrence.
    const weekStart = new Date(start.getTime() - start.getUTCDay() * DAY);
    for (let w = 0; n < count && n < MAX; w += interval) {
      const base = weekStart.getTime() + w * 7 * DAY;
      if (base > end.getTime()) break;
      for (const wd of [...byDay].sort((a, b) => a - b)) {
        const t = new Date(base + wd * DAY);
        if (t < start) continue;
        if (t > end || n >= count) break;
        n++;
        push(t);
      }
    }
    return out;
  }
  for (let i = 0, t = start; t <= end && n < count && i < MAX; i++) {
    n++;
    push(t);
    if (freq === "DAILY") t = new Date(t.getTime() + interval * DAY);
    else if (freq === "WEEKLY") t = new Date(t.getTime() + interval * 7 * DAY);
    else if (freq === "MONTHLY") t = addMonths(start, interval * (i + 1));
    else if (freq === "YEARLY") t = addMonths(start, 12 * interval * (i + 1));
    else break;
  }
  return out;
}

/**
 * Busy times from a calendar feed, inside [from, to]. Free ("transparent")
 * and cancelled events are skipped. Nothing but times leaves this function.
 */
export function parseBusyTimes(ics: string, from: Date, to: Date, memberZone = "America/Chicago"): Interval[] {
  const lines = unfold(ics);
  const calZone = lines.map(parseLine).find((p) => p?.name === "X-WR-TIMEZONE")?.value.trim() || memberZone;
  const events: Prop[][] = [];
  let cur: Prop[] | null = null;
  let depth = 0;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = []; depth = 0; continue; }
    if (!cur) continue;
    if (line.startsWith("BEGIN:")) { depth++; continue; } // nested VALARM etc.
    if (line.startsWith("END:") && depth > 0) { depth--; continue; }
    if (line === "END:VEVENT") { events.push(cur); cur = null; continue; }
    if (depth === 0) { const p = parseLine(line); if (p) cur.push(p); }
  }

  const overridden = new Set<string>();
  for (const ev of events) {
    const rid = ev.find((p) => p.name === "RECURRENCE-ID");
    const uid = ev.find((p) => p.name === "UID")?.value;
    if (rid && uid) {
      const w = parseWhen(rid, calZone);
      if (w) overridden.add(`${uid}|${w.date.getTime()}`);
    }
  }

  const out: Interval[] = [];
  for (const ev of events) {
    const get = (n: string) => ev.find((p) => p.name === n);
    if (get("STATUS")?.value.trim().toUpperCase() === "CANCELLED") continue;
    if (get("TRANSP")?.value.trim().toUpperCase() === "TRANSPARENT") continue;
    const dtstart = get("DTSTART");
    if (!dtstart) continue;
    const s = parseWhen(dtstart, calZone);
    if (!s) continue;
    const dtend = get("DTEND");
    const e = dtend ? parseWhen(dtend, calZone) : null;
    const dur = get("DURATION") ? parseDuration(get("DURATION")!.value) : null;
    let durationMs = e ? e.date.getTime() - s.date.getTime() : dur ?? (s.allDay ? DAY : 0);
    if (durationMs <= 0) durationMs = s.allDay ? DAY : 30 * 60_000;
    durationMs = Math.min(durationMs, 31 * DAY);

    const exdates = new Set<number>();
    for (const p of ev.filter((x) => x.name === "EXDATE"))
      for (const part of p.value.split(",")) {
        const w = parseWhen({ ...p, value: part }, calZone);
        if (w) exdates.add(w.date.getTime());
      }
    const uid = get("UID")?.value;
    const isOverride = Boolean(get("RECURRENCE-ID"));
    for (const st of expand(s.date, isOverride ? null : get("RRULE")?.value ?? null, exdates, from, to, durationMs)) {
      if (!isOverride && uid && get("RRULE") && overridden.has(`${uid}|${st.getTime()}`)) continue;
      out.push({ start: st, end: new Date(st.getTime() + durationMs) });
    }
  }
  return mergeIntervals(out);
}

// ─── Intervals ──────────────────────────────────────────────────────
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].filter((i) => i.end > i.start).sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = new Date(Math.max(last.end.getTime(), i.end.getTime()));
    else out.push({ start: new Date(i.start), end: new Date(i.end) });
  }
  return out;
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** The only answer a partner ever gets about a proposed time. */
export function availability(proposed: Interval, busy: Interval[]): "available" | "unavailable" {
  return busy.some((b) => overlaps(proposed, b)) ? "unavailable" : "available";
}

export const UNAVAILABLE_MESSAGE = "That day doesn't work. Please choose another date.";

// ─── Shared calendar feed ───────────────────────────────────────────
export type SharedEvent = { id: string; title: string; location?: string | null; notes?: string | null; start: Date; end: Date; allDay: boolean; updated: Date };

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateOnly = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Folds long lines at 75 octets as the iCalendar standard requires. */
const bytes = (s: string) => new TextEncoder().encode(s).length;

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (bytes(rest) > 75) {
    let cut = 75;
    while (bytes(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(events: SharedEvent[], calendarName = "Just us · The Art of Connect"): string {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Art of Connect//Just us//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calendarName)}`, "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@theartofconnect.com`, `DTSTAMP:${stamp(e.updated)}`);
    if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.start)}`, `DTEND;VALUE=DATE:${dateOnly(e.end)}`);
    else lines.push(`DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
