import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPublicWebinars } from "@/lib/webinars";

export type Preview = { id: string; kind: string; title: string; summary: string; interests: string[]; starts_at: string | null };
export type CirclePreview = { slug: string; name: string; description: string | null; kind: string; interests: string[]; members_band: string | null };

/**
 * What's Happening Inside Connect (founder directive 18): only owner-approved previews of genuine activity, real circle
 * descriptions (sizes only from 10 members up) and published public webinars. Never member names, photographs,
 * profiles, conversations or invented numbers.
 */
export async function connectHighlights(interests: string[]) {
  const db = await createClient();
  if (!db) return { previews: [] as Preview[], circles: [] as CirclePreview[], webinars: [] };
  const [{ data: previews }, { data: circles }, webinars] = await Promise.all([
    db.from("connect_previews").select("id, kind, title, summary, interests, starts_at").eq("status", "approved").order("starts_at", { ascending: true, nullsFirst: false }).limit(30),
    db.rpc("connect_preview_stats"),
    getPublicWebinars(),
  ]);
  const overlap = (xs: string[]) => xs.filter((x) => interests.includes(x)).length;
  const sortByFit = <T extends { interests: string[] }>(list: T[]) => [...list].sort((a, b) => overlap(b.interests) - overlap(a.interests));
  const upcoming = webinars.filter((w) => w.status === "approved" && new Date(w.starts_at).getTime() > Date.now()).slice(0, 3);
  return {
    previews: sortByFit(((previews ?? []) as Preview[]).filter((p) => !p.starts_at || Date.parse(p.starts_at) > Date.now() - 86_400_000)).slice(0, 8),
    circles: sortByFit(((circles ?? []) as CirclePreview[]).filter((c) => c.kind !== "elite")).slice(0, 6),
    webinars: upcoming,
  };
}
