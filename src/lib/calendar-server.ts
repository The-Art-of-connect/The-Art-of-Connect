import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBusyTimes, validateCalendarUrl } from "@/lib/calendar";

/**
 * Reads a member's linked Google / Apple / Outlook calendar and stores ONLY
 * busy start and end times. Only the providers' own calendar hosts are ever
 * contacted (including after redirects), downloads are size- and
 * time-limited, and event titles, places and attendees are never stored.
 */

const MAX_BYTES = 3 * 1024 * 1024;
const WINDOW_DAYS = 180;

async function fetchCalendar(url: string): Promise<string> {
  let target = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(12_000), cache: "no-store", headers: { Accept: "text/calendar, text/plain;q=0.8" } });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      const v = next ? validateCalendarUrl(new URL(next, target).toString()) : null;
      if (!v?.ok) throw new Error("The calendar link redirected somewhere we can't follow.");
      target = v.url;
      continue;
    }
    if (!res.ok) throw new Error(res.status === 404 ? "That calendar link no longer works." : `The calendar service answered ${res.status}.`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("The calendar was empty.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error("That calendar is too large to read."); }
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That link isn't a calendar feed.");
    return text;
  }
  throw new Error("The calendar link redirected too many times.");
}

/** Refreshes every linked calendar for a member. Returns how many were updated. */
export async function syncMemberCalendars(userId: string, opts: { force?: boolean; zone?: string } = {}): Promise<{ synced: number; errors: string[] }> {
  const db = createAdminClient();
  if (!db) return { synced: 0, errors: ["Calendar linking opens soon."] };
  const { data: links } = await db.schema("relationships").from("calendar_links").select("id, provider, url, last_synced_at").eq("user_id", userId);
  const errors: string[] = [];
  let synced = 0;
  const from = new Date(Date.now() - DAY);
  const to = new Date(Date.now() + WINDOW_DAYS * DAY);
  for (const l of links ?? []) {
    if (!opts.force && l.last_synced_at && Date.now() - new Date(l.last_synced_at).getTime() < 15 * 60_000) continue;
    try {
      const v = validateCalendarUrl(l.url);
      if (!v.ok) throw new Error(v.error);
      const busy = parseBusyTimes(await fetchCalendar(v.url), from, to, opts.zone).slice(0, 3000);
      await db.schema("relationships").from("busy_blocks").delete().eq("link_id", l.id);
      if (busy.length) {
        await db.schema("relationships").from("busy_blocks").insert(
          busy.map((b) => ({ user_id: userId, source: l.provider, link_id: l.id, label: null, starts_at: b.start.toISOString(), ends_at: b.end.toISOString() })),
        );
      }
      await db.schema("relationships").from("calendar_links").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", l.id);
      synced++;
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 280) : "We couldn't read that calendar.";
      errors.push(msg);
      await db.schema("relationships").from("calendar_links").update({ last_error: msg }).eq("id", l.id);
    }
  }
  return { synced, errors };
}
const DAY = 86_400_000;

export const hashToken = (t: string) => createHash("sha256").update(`aoc-cal:${t}`).digest("hex");

/** A new private subscription address for the shared calendar (replaces any earlier one). */
export async function newFeedToken(userId: string): Promise<string | null> {
  const db = createAdminClient();
  if (!db) return null;
  const token = randomBytes(24).toString("base64url");
  const { error } = await db.schema("relationships").from("calendar_feed_tokens").upsert({ user_id: userId, token_hash: hashToken(token), created_at: new Date().toISOString() });
  return error ? null : token;
}
