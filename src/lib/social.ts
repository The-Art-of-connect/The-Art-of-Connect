/**
 * The Art of Connect — Social Ecosystem (phase 1). Shared labels and the preference-based
 * Connection Intelligence Engine (v1). No server access here.
 *
 * The system recommends. The member decides. Alignment levels are opportunities, never rankings of people.
 */

export const INTERESTS = [
  ["travel", "Travel"], ["business", "Business"], ["entrepreneurship", "Entrepreneurship"], ["leadership", "Leadership"],
  ["investing", "Investing"], ["personal_growth", "Personal growth"], ["conscious_living", "Conscious living"],
  ["manifestation", "Manifestation & affirmations"], ["friendship", "Friendship"], ["social", "Social gatherings"],
  ["arts", "Arts"], ["music", "Music"], ["culture", "Culture"], ["dining", "Fine dining"], ["wine", "Wine"],
  ["fitness", "Fitness"], ["wellness", "Wellness"], ["outdoors", "Outdoors"], ["community", "Community"],
  ["philanthropy", "Philanthropy"], ["mentorship", "Mentorship"], ["faith", "Faith"], ["family", "Family"],
  ["books", "Books"], ["fashion", "Fashion"], ["golf", "Golf"], ["technology", "Technology"], ["cooking", "Cooking"],
] as const;
export const INTEREST_LABEL: Record<string, string> = Object.fromEntries(INTERESTS);

/** What a member is available for (members control this; mentorship is never required). Romance is never here:
 * it lives only in The Personal Society singles experience. */
export const SEEKING = [
  ["peers", "Meeting compatible peers"], ["friendship", "Friendships"], ["business", "Business networking & partnerships"],
  ["mentorship_seek", "Seeking a mentor"], ["mentorship_offer", "Offering mentorship"], ["travel", "Travel companionship"],
  ["hobbies", "Shared hobbies"], ["social", "Social experiences"], ["couples_friendship", "Couples friendships"], ["explore", "Exploring new experiences"],
] as const;
export const SEEKING_LABEL: Record<string, string> = Object.fromEntries(SEEKING);

export const CIRCLE_KIND_LABEL: Record<string, string> = { open: "Open circle", specialized: "Interest & lifestyle circle", elite: "Verified Elite circle" };
export const ELIGIBILITY_LABEL: Record<string, string> = {
  all: "Open to all members", couples: "Couples", singles: "Singles 30+", elite: "Elite Concierge members",
};

export const EVENT_CATEGORIES = [
  ["business_networking", "Business networking"], ["conference", "Conferences"], ["social", "Social gatherings"],
  ["singles", "Singles events"], ["couples", "Couples events"], ["travel", "Travel"], ["cruise", "Cruises"],
  ["concert", "Concerts"], ["festival", "Festivals"], ["education", "Education"], ["webinar", "Webinars"],
  ["wellness", "Wellness"], ["community_service", "Community service"], ["elite", "Elite experiences"],
] as const;
export const EVENT_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(EVENT_CATEGORIES);

export const EVENT_ORIGIN_LABEL: Record<string, string> = {
  member_organized: "Organized by a member",
  shared_external: "Shared by a member · organized externally",
  official: "The Art of Connect",
};

export const POST_KINDS = [
  ["thought", "Thought"], ["accomplishment", "Accomplishment"], ["life_update", "Life update"],
  ["education", "Something I learned"], ["recommendation", "Recommendation"],
] as const;

export const REPORT_REASONS = [
  ["harassment", "Harassment or disrespect"], ["spam", "Spam"], ["fraud", "Fraud or payment request"],
  ["inappropriate", "Inappropriate content"], ["misleading", "Misleading listing"], ["safety", "Safety concern"], ["other", "Something else"],
] as const;

export const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "America/Mexico_City", "America/Puerto_Rico", "Europe/London", "Europe/Paris", "Africa/Lagos", "Asia/Dubai", "Asia/Bangkok", "Asia/Tokyo", "Australia/Sydney",
] as const;

// ─── Connection Intelligence Engine v1 (preference-based) ─────────────
export type Alignment = "Naturally Aligned" | "Shared Interests" | "Growth Connections" | "Explore Beyond Your Circle" | "Open Community";
export const ALIGNMENT_ORDER: Alignment[] = ["Naturally Aligned", "Shared Interests", "Growth Connections", "Explore Beyond Your Circle", "Open Community"];
export const ALIGNMENT_NOTE: Record<Alignment, string> = {
  "Naturally Aligned": "Closely matches the interests you chose.",
  "Shared Interests": "Shares at least one of your interests.",
  "Growth Connections": "A space for growth many members find rewarding.",
  "Explore Beyond Your Circle": "Something different, if you're curious.",
  "Open Community": "Welcoming to everyone.",
};
const GROWTH = new Set(["personal_growth", "mentorship", "conscious_living", "wellness"]);

/** Recommends a circle and explains why. Never excludes: every eligible circle remains joinable. */
export function recommendCircle(circle: { slug: string; kind: string; interests: string[] }, mine: string[]): { level: Alignment; reason: string } {
  const shared = circle.interests.filter((i) => mine.includes(i));
  const names = shared.map((s) => INTEREST_LABEL[s] ?? s);
  if (shared.length >= 2) return { level: "Naturally Aligned", reason: `You chose ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.` };
  if (shared.length === 1) return { level: "Shared Interests", reason: `You chose ${names[0]}.` };
  if (circle.kind === "open") return { level: "Open Community", reason: "A welcoming place to meet members of every background." };
  if (circle.interests.some((i) => GROWTH.has(i))) return { level: "Growth Connections", reason: "Focused on growth and perspective, whatever your interests." };
  return { level: "Explore Beyond Your Circle", reason: "Outside your chosen interests: a chance to discover something new." };
}

/** Why a member appears in Find People Like Me (only from what both chose to share). */
export function peopleReason(p: { interests: string[] | null; shared_interests: number; shared_circles: number }, mine: string[]) {
  const shared = (p.interests ?? []).filter((i) => mine.includes(i)).map((s) => INTEREST_LABEL[s] ?? s);
  const parts: string[] = [];
  if (shared.length) parts.push(`You both chose ${shared.slice(0, 3).join(", ")}`);
  if (p.shared_circles) parts.push(`${p.shared_circles} circle${p.shared_circles === 1 ? "" : "s"} in common`);
  return parts.join(" · ") || "Open to the same kind of connection";
}

export const isEligibleCategoryForEvent = (cat: string) => EVENT_CATEGORIES.some(([k]) => k === cat);
export const cleanList = (values: FormDataEntryValue[], allowed: readonly (readonly [string, string])[], max: number) =>
  [...new Set(values.map(String).filter((v) => allowed.some(([k]) => k === v)))].slice(0, max);
