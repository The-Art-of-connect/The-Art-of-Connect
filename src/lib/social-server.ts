import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { memberMarks } from "@/lib/member-marks";

export type Person = { user_id: string; display_name: string | null; headline: string | null; bio: string | null; city: string | null; region: string | null; country: string | null;
  interests: string[] | null; seeking: string[] | null; avatar_path: string | null; elite: boolean; connection_status: string | null; connection_direction: string | null;
  shared_interests: number; shared_circles: number;
  /** Membership distinction and identity verification (directive 39). */
  distinction?: "executive" | "elite" | null; verified?: boolean };

export type FeedPost = { id: string; author_id: string; kind: string; body: string | null; photo_path: string | null; audience: string; circle_id: string | null; event_id: string | null; created_at: string };

/** Short-lived links for photos the viewer is allowed to open (storage policies decide; nothing else is signed). */
export async function signPhotos(db: SupabaseClient, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter(Boolean) as string[])];
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await db.storage.from("member-photos").createSignedUrls(unique, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && !d.error).map((d) => [d.path!, d.signedUrl as string])) as Record<string, string>;
}

export async function people(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return {} as Record<string, Person>;
  const [{ data }, marks] = await Promise.all([
    db.rpc("social_directory", { p_ids: [...new Set(ids)], p_seeking: null, p_limit: 200 }),
    memberMarks(db, ids),
  ]);
  return Object.fromEntries(((data ?? []) as Person[]).map((p) => [p.user_id, { ...p, distinction: marks[p.user_id]?.distinction ?? null, verified: marks[p.user_id]?.verified ?? false }]));
}

/** Loads a feed page with authors, photos, counts, the viewer's reactions and any shared events. */
export async function loadFeed(db: SupabaseClient, viewerId: string, opts: { circleId?: string; filter?: "all" | "connections" | "circles" | "saved"; limit?: number }) {
  let q = db.from("social_posts").select("id, author_id, kind, body, photo_path, audience, circle_id, event_id, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(opts.limit ?? 40);
  if (opts.circleId) q = q.eq("circle_id", opts.circleId);
  else if (opts.filter === "circles") q = q.not("circle_id", "is", null);
  else if (opts.filter === "saved") {
    const { data: saved } = await db.from("social_saves").select("post_id").eq("user_id", viewerId);
    q = q.in("id", (saved ?? []).map((x) => x.post_id).concat(["00000000-0000-0000-0000-000000000000"]));
  } else if (opts.filter === "connections") {
    const { data: conns } = await db.from("social_connections").select("requester_id, addressee_id").eq("status", "accepted");
    const ids = (conns ?? []).map((c) => (c.requester_id === viewerId ? c.addressee_id : c.requester_id));
    q = q.in("author_id", ids.concat([viewerId]));
  }
  const { data: posts } = await q;
  const list = (posts ?? []) as FeedPost[];
  const ids = list.map((p) => p.id);
  const eventIds = list.map((p) => p.event_id).filter(Boolean) as string[];
  const circleIds = list.map((p) => p.circle_id).filter(Boolean) as string[];
  const [{ data: counts }, { data: mine }, { data: saves }, { data: events }, { data: circles }, authors] = await Promise.all([
    ids.length ? db.rpc("social_post_counts", { p_posts: ids }) : Promise.resolve({ data: [] }),
    ids.length ? db.from("social_reactions").select("post_id").eq("user_id", viewerId).in("post_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from("social_saves").select("post_id").eq("user_id", viewerId).in("post_id", ids) : Promise.resolve({ data: [] }),
    eventIds.length ? db.from("social_events").select("id, title, starts_at, timezone, city, country, mode, category, origin, photo_path").in("id", eventIds) : Promise.resolve({ data: [] }),
    circleIds.length ? db.from("social_circles").select("id, name, slug").in("id", circleIds) : Promise.resolve({ data: [] }),
    people(db, list.map((p) => p.author_id)),
  ]);
  const ev = Object.fromEntries(((events ?? []) as { id: string; photo_path: string | null }[]).map((e) => [e.id, e]));
  const urls = await signPhotos(db, [...list.map((p) => p.photo_path), ...Object.values(authors).map((a) => a.avatar_path), ...Object.values(ev).map((e) => e.photo_path)]);
  return {
    posts: list, authors, urls, events: ev as Record<string, { id: string; title: string; starts_at: string; timezone: string; city: string | null; country: string | null; mode: string; category: string; origin: string; photo_path: string | null }>,
    circles: Object.fromEntries(((circles ?? []) as { id: string; name: string; slug: string }[]).map((c) => [c.id, c])),
    counts: Object.fromEntries(((counts ?? []) as { post_id: string; appreciations: number; comments: number }[]).map((c) => [c.post_id, c])),
    appreciated: new Set(((mine ?? []) as { post_id: string }[]).map((r) => r.post_id)),
    saved: new Set(((saves ?? []) as { post_id: string }[]).map((r) => r.post_id)),
  };
}
export type Feed = Awaited<ReturnType<typeof loadFeed>>;

export function formatEventTime(iso: string, tz: string) {
  const d = new Date(iso);
  try {
    return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short" });
  } catch {
    return d.toUTCString();
  }
}
