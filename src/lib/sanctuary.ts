/**
 * My Daily Sanctuary and Discover What's Possible (founder directives 17 and 18). Pure logic shared by pages, server
 * actions, the reminder cron and tests. Free accounts receive owner-approved prewritten content only: nothing here calls
 * an AI service. Recommendations use standard, explainable, preference-based rules.
 */

export const TOPICS = [
  ["identity", "Identity"], ["self-love", "Self-love"], ["emotional-intelligence", "Emotional intelligence"],
  ["communication", "Communication"], ["boundaries", "Boundaries"], ["relationships", "Relationships"],
  ["work-ethic", "Work ethic"], ["financial-mindset", "Financial mindset"], ["values", "Personal values"],
  ["confidence", "Confidence"], ["intentional-living", "Intentional living"],
] as const;
export const TOPIC_LABEL: Record<string, string> = Object.fromEntries(TOPICS);

export const KINDS = [
  ["manifestation", "Morning manifestation"], ["affirmation", "Daily affirmation"], ["intention", "Morning intention"],
  ["checkin", "Emotional check-in"], ["question", "Reflection question"], ["lesson", "Life lesson"],
  ["scenario", "Self-discovery scenario"], ["gratitude", "Gratitude"], ["challenge", "Growth challenge"],
  ["accomplishment", "Accomplishments"], ["evening", "Evening reflection"], ["weekly", "Weekly reflection"], ["monthly", "Monthly reflection"],
] as const;
export type Kind = (typeof KINDS)[number][0];
export const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS);

export const MOODS = [
  ["joyful", "Joyful"], ["calm", "Calm"], ["grateful", "Grateful"], ["hopeful", "Hopeful"], ["tired", "Tired"],
  ["anxious", "Anxious"], ["sad", "Sad"], ["frustrated", "Frustrated"], ["overwhelmed", "Overwhelmed"], ["mixed", "Mixed"],
] as const;
export const MOOD_LABEL: Record<string, string> = Object.fromEntries(MOODS);

export const VISION_CATEGORIES = [
  ["career", "Career"], ["business", "Business"], ["financial-freedom", "Financial freedom"], ["relationships", "Relationships"],
  ["travel", "Travel"], ["personal-growth", "Personal growth"], ["wellness", "Wellness"], ["lifestyle", "Lifestyle"],
] as const;
export const VISION_LABEL: Record<string, string> = Object.fromEntries(VISION_CATEGORIES);

export type Content = { id: string; kind: string; topic: string | null; title: string | null; body: string; example: string | null;
  reflection: string | null; activity: string | null; options: ScenarioOption[] | null; course: string | null; course_order: number | null; publish_on: string | null };
export type ScenarioOption = { key: string; label: string; insight?: string; signals?: string[] };

/** A stable daily choice: the same member sees the same item all day and something new tomorrow. */
export function dailyPick<T>(items: T[], seed: string): T | undefined {
  if (!items.length) return undefined;
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return items[h % items.length];
}

/** Today's item of a kind: anything the owner scheduled for today first, otherwise the daily rotation. */
export function itemFor(all: Content[], kind: string, day: string, seed: string): Content | undefined {
  const ofKind = all.filter((c) => c.kind === kind);
  const scheduled = ofKind.filter((c) => c.publish_on === day);
  if (scheduled.length) return dailyPick(scheduled, `${seed}:${day}:${kind}`);
  return dailyPick(ofKind.filter((c) => !c.publish_on), `${seed}:${day}:${kind}`);
}

/** The next scenario the member hasn't answered. Questions never repeat unless the member chooses to revisit. */
export function nextScenario(all: Content[], answered: Set<string>): Content | undefined {
  return all.filter((c) => c.kind === "scenario" && !answered.has(c.id)).sort((a, b) => (a.publish_on ?? "").localeCompare(b.publish_on ?? "") || a.id.localeCompare(b.id))[0];
}

export const weekStart = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
};
export const monthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);

/** Deterministic weekly/monthly summary of the member's own entries (no AI, no judgments). */
export function summarize(entries: { kind: string; mood: string | null; day: string }[]) {
  const moods: Record<string, number> = {};
  for (const e of entries) if (e.kind === "checkin" && e.mood) moods[e.mood] = (moods[e.mood] ?? 0) + 1;
  const topMood = Object.entries(moods).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    daysPresent: new Set(entries.map((e) => e.day)).size,
    checkins: entries.filter((e) => e.kind === "checkin").length,
    gratitude: entries.filter((e) => e.kind === "gratitude").length,
    accomplishments: entries.filter((e) => e.kind === "accomplishment").length,
    challenges: entries.filter((e) => e.kind === "challenge").length,
    lessons: entries.filter((e) => e.kind === "lesson").length,
    moods, topMood,
  };
}

// ─── Discover What's Possible ──────────────────────────────────────────────────────────────

/** What a member may explore. Each maps to genuine areas of the platform. */
export const EXPLORE = {
  business: { title: "Business ideas and professional networking", body: "Discussion topics, the Business Connection Board and introductions within The Professional Society.", href: "/business/explore", membership: "The Professional Society" },
  webinars: { title: "Educational webinars", body: "Live sessions in The Knowledge Exchange, hosted by business owners for business owners.", href: "/webinars", membership: "The Professional Society" },
  friendship: { title: "Like-minded friendship communities", body: "Circles built around shared interests, where friendships form naturally.", href: "/membership#build", membership: "Any paid membership" },
  social: { title: "Social conversations and events", body: "The Connection Feed, member-shared events and The Connect Calendar.", href: "/membership#build", membership: "Any paid membership" },
  travel: { title: "Travel communities", body: "Circles for travel, adventure and shared trips, with privacy-first event planning.", href: "/membership#build", membership: "Any paid membership" },
  singles: { title: "Singles experiences", body: "Intentional, values-based introductions for singles 30 and older in The Personal Society.", href: "/love", membership: "The Personal Society" },
  couples: { title: "Couples communities", body: "Couples circles, shared tools and experiences for growing together.", href: "/love", membership: "Couples Membership" },
  growth: { title: "Personal growth circles", body: "Members focused on growth, wellness and conscious living.", href: "/membership#build", membership: "Any paid membership" },
  wellness: { title: "Wellness communities", body: "Circles and events centered on wellbeing and balance.", href: "/membership#build", membership: "Any paid membership" },
  elite: { title: "Elite qualification", body: "Elite Concierge is by application, qualification and verification. Learn how the pathways work.", href: "/elite", membership: "Elite Concierge (qualification required)" },
} as const;
export type ExploreKey = keyof typeof EXPLORE;

/** Interests a member can choose (the same list Connect uses) and the areas they relate to. */
const INTEREST_TO_EXPLORE: Record<string, ExploreKey[]> = {
  business: ["business", "webinars"], entrepreneurship: ["business", "webinars"], leadership: ["business", "webinars"], investing: ["business"],
  mentorship: ["business", "growth"], technology: ["business"], travel: ["travel"], outdoors: ["travel"], friendship: ["friendship"],
  social: ["social"], community: ["friendship", "social"], dining: ["social"], wine: ["social"], arts: ["social"], music: ["social"], culture: ["social"],
  personal_growth: ["growth"], conscious_living: ["growth"], manifestation: ["growth"], wellness: ["wellness"], fitness: ["wellness"],
  books: ["growth"], faith: ["growth"], family: ["friendship"], philanthropy: ["social"], fashion: ["social"], golf: ["social"], cooking: ["social"],
};

/**
 * The private Connection Readiness indicator (directive 16): how much authorized information we have, never a measure of a
 * person's worth or emotional maturity. Interests the member chose for this purpose always count; scenario answers and
 * self-discovery progress count only with the member's consent.
 */
export function readiness(input: { interests: number; scenariosAnswered: number; discoveryPercent: number; consent: boolean }) {
  const parts = [
    { key: "interests", label: "Choose what you'd like to explore", done: Math.min(input.interests, 3), of: 3, points: Math.min(input.interests, 3) * 10 },
    { key: "scenarios", label: "Answer self-discovery scenarios", done: input.consent ? Math.min(input.scenariosAnswered, 6) : 0, of: 6, points: input.consent ? Math.min(input.scenariosAnswered, 6) * 7 : 0 },
    { key: "discovery", label: "Continue your Who Am I? discovery", done: input.consent ? Math.round(input.discoveryPercent) : 0, of: 100, points: input.consent ? Math.round(Math.min(100, input.discoveryPercent) * 0.28) : 0 },
  ];
  const percent = Math.min(100, parts.reduce((s, p) => s + p.points, 0));
  return { percent, parts, sufficient: percent >= 40, needsConsent: !input.consent };
}

/**
 * Which areas to invite a member to explore, with the reason, from their own choices and (with consent) scenario signals.
 * Elite appears only when the member shows interest in business or leadership; it never implies they qualify.
 */
export function opportunities(input: { interests: string[]; signals: string[]; society: string | null; age: number | null }) {
  const score = new Map<ExploreKey, { n: number; why: Set<string> }>();
  const bump = (k: ExploreKey, why: string, n = 1) => {
    const cur = score.get(k) ?? { n: 0, why: new Set<string>() };
    cur.n += n; cur.why.add(why); score.set(k, cur);
  };
  for (const i of input.interests) for (const k of INTEREST_TO_EXPLORE[i] ?? []) bump(k, "an interest you chose", 2);
  for (const s of input.signals) if (s.startsWith("explore:")) {
    const k = s.slice(8) as ExploreKey;
    if (k in EXPLORE) bump(k, "your self-discovery answers");
  }
  if (input.society === "business") bump("business", "your interest when you joined");
  if (input.society === "singles") bump("singles", "your interest when you joined");
  if (input.society === "couples") bump("couples", "your interest when you joined");
  if (input.age !== null && input.age < 30) score.delete("singles");
  const business = score.get("business")?.n ?? 0;
  if (business >= 2) bump("elite", "your interest in business and leadership", 0);
  else score.delete("elite");
  return [...score.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, ...EXPLORE[key], why: [...v.why] }));
}

/** Insights a member chose to share with their Discovery Portfolio (from scenario answers). */
export function scenarioInsights(answers: { choice: string; content: { title: string | null; options: ScenarioOption[] | null } }[]) {
  return answers
    .map((a) => ({ title: a.content.title ?? "Scenario", option: a.content.options?.find((o) => o.key === a.choice) }))
    .filter((x) => x.option?.insight)
    .map((x) => ({ title: x.title, insight: x.option!.insight! }));
}

// ─── Optional reminders ───────────────────────────────────────────────────────────────────

/** Whether a reminder is due now in the member's own time zone. Gentle: at most one per period, never a streak. */
export function reminderDue(s: { reminder_frequency: string; reminder_time: string; reminder_weekday: number; time_zone: string; last_reminded_at: string | null }, now: Date) {
  if (s.reminder_frequency === "off") return false;
  let local: { date: string; minutes: number; weekday: number; day: number };
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: s.time_zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
      .formatToParts(now).map((p) => [p.type, p.value]));
    local = { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute),
      weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday), day: Number(parts.day) };
  } catch {
    return false;
  }
  const [h, m] = s.reminder_time.split(":").map(Number);
  if (local.minutes < h * 60 + m) return false;
  if (s.reminder_frequency === "weekly" && local.weekday !== s.reminder_weekday) return false;
  if (s.reminder_frequency === "monthly" && local.day !== 1) return false;
  if (!s.last_reminded_at) return true;
  return now.getTime() - Date.parse(s.last_reminded_at) > 20 * 3600_000;
}
