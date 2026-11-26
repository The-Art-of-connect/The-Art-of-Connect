/**
 * Membership levels (founder directive 20, section 1). One central definition used by the feature directory, dashboards
 * and permission checks. Pure: the server helper supplies the facts.
 *
 * Founder decision (November 26, 2026): "Complete Society" means both paid societies, In Business (The Professional
 * Society) and In Love (The Personal Society), with The Art of Becoming remaining complimentary.
 */
export type Level = "free" | "one" | "complete" | "executive" | "elite";
export const LEVEL_ORDER: Level[] = ["free", "one", "complete", "executive", "elite"];
export const LEVEL_LABEL: Record<Level, string> = {
  free: "Complimentary", one: "One Society", complete: "Complete Society", executive: "Executive Private", elite: "Elite Concierge",
};
export const LEVEL_PROMISE: Record<Level, string> = {
  free: "Discover Yourself.", one: "Discover Your People.", complete: "Experience Life Across All Three Societies.",
  executive: "Exceptional Access and Private Experiences.", elite: "Our Highest Level of Membership Service.",
};

export type MembershipFacts = { packageSlug: string | null; status: string | null; experiences: readonly string[]; eliteBadge: boolean; staff?: boolean };

/** Paid access counts only while active or on an active trial (a failed payment pauses it). */
export function levelOf(f: MembershipFacts): Level {
  if (f.eliteBadge || (f.packageSlug === "elite-concierge" && isCurrent(f.status))) return "elite";
  if (f.packageSlug === "executive-private" && isCurrent(f.status)) return "executive";
  const paid = ["business", "relationships"].filter((e) => f.experiences.includes(e)).length;
  if (paid >= 2) return "complete";
  if (paid === 1) return "one";
  return "free";
}
const isCurrent = (s: string | null) => s === "active" || s === "trialing";

export const atLeast = (have: Level, need: Level) => LEVEL_ORDER.indexOf(have) >= LEVEL_ORDER.indexOf(need);
