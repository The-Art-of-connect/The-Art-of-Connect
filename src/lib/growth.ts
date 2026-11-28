/**
 * Lifelong growth, milestones and relationships (founder directives 45 with amendment, 46 and 47). Pure: shared by pages
 * and tests. Reports are written analysis built only from the member's real records, never scores, never invented.
 */
export const FREQUENCIES = [
  { key: "monthly", label: "Monthly", line: "Stay connected to your ongoing progress." },
  { key: "quarterly", label: "Every three months", line: "Reflect on meaningful changes throughout the year." },
  { key: "semiannual", label: "Every six months", line: "Explore your growth over a longer period." },
  { key: "annual", label: "Annually", line: "Celebrate a full year of becoming." },
  { key: "on_demand", label: "Whenever I request one", line: "Reflect at your own pace." },
] as const;
export const FREQUENCY_LABEL: Record<string, string> = Object.fromEntries(FREQUENCIES.map((f) => [f.key, f.label]));

export const MILESTONE_KINDS: Record<string, string> = {
  birthday: "Birthday", anniversary: "Anniversary", breakthrough: "Personal breakthrough", education: "Educational accomplishment",
  relationship: "Relationship transition", career: "Career achievement", business_launch: "Business launch", business_expansion: "Business expansion",
  funding: "Funding or project accomplishment", project: "Project milestone", goal_completed: "Completed goal", membership_anniversary: "Membership anniversary", other: "Something meaningful",
};

export const RELATIONSHIP_STATUS: Record<string, string> = {
  single: "Single", dating: "Dating", committed: "Committed relationship", engaged: "Engaged", married: "Married", separated: "Separated",
  divorce_in_progress: "Divorce in progress", divorced: "Divorced", relationship_ended: "Relationship ended", prefer_not_to_say: "Prefer not to say",
};
/** Stages where shared Couples activities fit; others receive individual support (never pressure either way). */
export const COUPLES_STAGES = ["committed", "engaged", "married"] as const;
export const TRANSITION_STAGES = ["separated", "divorce_in_progress", "divorced", "relationship_ended"] as const;

/** Couples ideas for each season of a relationship (directive 46). Rotates daily without repeating within a cycle. */
export const COUPLES_SEASONS: Record<string, { kind: "date" | "conversation" | "challenge" | "surprise"; title: string; body: string }[]> = {
  committed: [
    { kind: "date", title: "A first-favorites evening", body: "Each choose one favorite thing from childhood to share: a food, a song, a place." },
    { kind: "conversation", title: "What makes you feel safe with me?", body: "Listen without fixing. Ask one follow-up question." },
    { kind: "challenge", title: "Seven days of appreciation", body: "Each day, name one specific thing you appreciated about each other." },
    { kind: "surprise", title: "A note in an unexpected place", body: "Leave a few kind words where they'll find them midweek." },
  ],
  engaged: [
    { kind: "conversation", title: "The marriage we want", body: "Describe an ordinary Tuesday five years from now. What feels right? What surprised you?" },
    { kind: "date", title: "Plan-free evening", body: "One night with no wedding talk at all. Just the two of you." },
    { kind: "challenge", title: "Money conversations, gently", body: "Share one belief about money you learned growing up." },
    { kind: "conversation", title: "Traditions to keep and begin", body: "Which family traditions will you carry forward, and which will you create?" },
  ],
  married: [
    { kind: "date", title: "Return to where it began", body: "Revisit a meaningful early place, or recreate it at home." },
    { kind: "conversation", title: "What has changed in how you love me?", body: "Notice the ways you've both grown." },
    { kind: "challenge", title: "A love language week", body: "Practice your partner's love language once each day." },
    { kind: "surprise", title: "Their favorite things", body: "A small collection of things they love: a song, a treat, a memory." },
  ],
};
export function seasonIdeas(stage: string | null, day = new Date(), count = 2) {
  const list = COUPLES_SEASONS[stage ?? "committed"] ?? COUPLES_SEASONS.committed;
  const start = Math.floor(day.getTime() / 86_400_000) % list.length;
  return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i) % list.length]);
}

type Activity = Partial<Record<"sanctuary_entries" | "discovery_updates" | "goals_achieved" | "goals_active" | "shared_goals_achieved" | "resume_versions" | "businesses" | "funding_projects", number>>;
type Reported = { milestones?: { title: string; kind: string; on: string }[]; relationship_changes?: { status: string; since: string | null }[] };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Written analysis from facts only. Each line says where it comes from: platform activity or what the member recorded.
 * Nothing is inferred about feelings, diagnosed or invented; quiet periods are described kindly, never judged.
 */
export function reportNarrative(a: Activity, r: Reported, began: string | null) {
  const activity: string[] = [];
  if (a.sanctuary_entries) activity.push(`You returned to My Daily Sanctuary ${plural(a.sanctuary_entries, "time")}.`);
  if (a.discovery_updates) activity.push(`You updated ${plural(a.discovery_updates, "personal discovery answer")}; your earlier answers are preserved so you can compare.`);
  if (a.goals_achieved) activity.push(`You have achieved ${plural(a.goals_achieved, "personal goal")} so far.`);
  if (a.shared_goals_achieved) activity.push(`Together, you and your partner achieved ${plural(a.shared_goals_achieved, "shared goal")}.`);
  if (a.resume_versions) activity.push(`You refined your professional résumé ${plural(a.resume_versions, "time")}.`);
  if (a.businesses) activity.push(`You are building ${plural(a.businesses, "business", "businesses")}.`);
  if (a.funding_projects) activity.push(`You have ${plural(a.funding_projects, "funding project")} underway.`);
  const reported = [
    ...(r.milestones ?? []).map((m) => `You recorded a milestone: ${m.title}.`),
    ...(r.relationship_changes ?? []).map((c) => `Your relationship status became ${RELATIONSHIP_STATUS[c.status]?.toLowerCase() ?? c.status}.`),
  ];
  const explore: string[] = [];
  if (!a.sanctuary_entries) explore.push("A few quiet minutes in My Daily Sanctuary, whenever it suits you.");
  if ((a.goals_active ?? 0) === 0) explore.push("Setting one meaningful goal in Who Am I Becoming?");
  if (!a.discovery_updates) explore.push("Revisiting a discovery question to see how your perspective has changed.");
  const quiet = activity.length === 0 && reported.length === 0;
  return {
    began: began ? `You began with The Art of Connect on ${new Date(began).toLocaleDateString("en-US", { dateStyle: "long" })}.` : null,
    activity, reported, explore,
    summary: quiet ? "This has been a quieter period, and that is all right. Growth has its own seasons." : "Here is what your records show since your last reflection.",
  };
}
