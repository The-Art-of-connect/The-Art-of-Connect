import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getDiscovery } from "@/lib/know-yourself-server";
import { opportunities, readiness, type Content } from "@/lib/sanctuary";

export type SanctuarySettings = {
  share_with_portfolio: boolean; explore_interests: string[]; reminder_frequency: string; reminder_time: string; reminder_weekday: number;
  reminder_types: string[]; time_zone: string; last_reminded_at: string | null;
};
export const DEFAULT_SETTINGS: SanctuarySettings = {
  share_with_portfolio: false, explore_interests: [], reminder_frequency: "off", reminder_time: "08:00", reminder_weekday: 1,
  reminder_types: ["morning"], time_zone: "America/New_York", last_reminded_at: null,
};

/** Published content only (row security hides drafts from members). */
export async function publishedContent(kinds?: string[]) {
  const db = await createClient();
  if (!db) return [] as Content[];
  let q = db.from("sanctuary_content").select("id, kind, topic, title, body, example, reflection, activity, options, course, course_order, publish_on").eq("status", "published").order("course_order", { ascending: true, nullsFirst: false });
  if (kinds) q = q.in("kind", kinds);
  const { data } = await q.limit(2000);
  return (data ?? []) as Content[];
}

export async function sanctuarySettings(userId: string): Promise<SanctuarySettings> {
  const db = await createClient();
  if (!db) return DEFAULT_SETTINGS;
  const { data } = await db.from("sanctuary_settings").select("share_with_portfolio, explore_interests, reminder_frequency, reminder_time, reminder_weekday, reminder_types, time_zone, last_reminded_at").eq("user_id", userId).maybeSingle();
  return data ? { ...(data as SanctuarySettings), reminder_time: String(data.reminder_time).slice(0, 5) } : DEFAULT_SETTINGS;
}

/**
 * Everything Discover What's Possible needs, from the member's own authorized information only (no AI, no other members).
 * Scenario signals and Who Am I? progress count only with the member's consent.
 */
export async function discoverState(userId: string, society: string | null) {
  const db = await createClient();
  const settings = await sanctuarySettings(userId);
  if (!db) return { settings, readiness: readiness({ interests: 0, scenariosAnswered: 0, discoveryPercent: 0, consent: false }), opportunities: [], answered: 0 };
  const [{ data: answers }, discovery, { data: priv }] = await Promise.all([
    db.from("sanctuary_scenario_answers").select("choice, sanctuary_content(options)").eq("user_id", userId),
    getDiscovery(userId),
    db.from("member_private").select("date_of_birth").eq("user_id", userId).maybeSingle(),
  ]);
  const rows = (answers ?? []) as unknown as { choice: string; sanctuary_content: { options: { key: string; signals?: string[] }[] | null } | null }[];
  const signals = settings.share_with_portfolio
    ? rows.flatMap((a) => a.sanctuary_content?.options?.find((o) => o.key === a.choice)?.signals ?? [])
    : [];
  const dob = priv?.date_of_birth ? new Date(priv.date_of_birth) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.2425 * 86_400_000)) : null;
  const r = readiness({ interests: settings.explore_interests.length, scenariosAnswered: rows.length, discoveryPercent: discovery.percent, consent: settings.share_with_portfolio });
  return {
    settings,
    readiness: r,
    answered: rows.length,
    opportunities: r.sufficient ? opportunities({ interests: settings.explore_interests, signals, society, age }) : [],
  };
}
