/**
 * Membership-aware access decisions (founder directive 36). Pure: shared by pages, the pop-up and tests.
 *
 * Restricted features never silently redirect or appear broken. Every decision is one of:
 *   allowed         — open it
 *   membership      — outside the member's membership: explain, show the price, offer the 15-day trial where eligible
 *   verification    — needs a qualification or verification step (Elite Concierge is invitation-only), not a purchase
 *   opening_soon    — included, but not open to members yet (launch switch off)
 *   in_development  — the feature itself is still being built
 *   error           — the system couldn't decide (shown as a real error, never as an upsell)
 * Elite Members receive every In Life, In Love and In Business service and are never shown an upgrade prompt.
 */
import { atLeast, type Level } from "./membership-level.ts";

export type Need = { experience?: "business" | "relationships"; level?: Level; elite?: boolean; status?: "available" | "preview" | "in-development" | "planned" };
export type GateFacts = {
  signedIn: boolean;
  level: Level;
  experiences: readonly string[];
  society: "business" | "singles" | "couples" | null;
  live: { business: boolean; relationships: boolean };
  /** Staff, an owner preview or the owner-listed QA account may look inside areas that aren't open yet. */
  preview: boolean;
};
export type GateDecision =
  | { kind: "allowed" }
  | { kind: "membership"; packageSlug: string }
  | { kind: "verification"; packageSlug: "elite-concierge" }
  | { kind: "opening_soon"; experience: "business" | "relationships" | null }
  | { kind: "in_development" }
  | { kind: "error" };

/** The single membership that unlocks a need, for this member (lowest level that includes it). */
export function packageFor(need: Need, facts: Pick<GateFacts, "society" | "experiences">): string {
  if (need.elite || need.level === "elite") return "elite-concierge";
  if (need.level === "executive") return "executive-private";
  if (need.level === "complete") return "complete-society";
  const want = need.experience ?? (facts.society === "business" ? "business" : "relationships");
  const has = (e: string) => facts.experiences.includes(e);
  // Already holds one society and needs the other: the bundle with both.
  if ((want === "business" && has("relationships")) || (want === "relationships" && has("business"))) return "dual-society";
  if (want === "business") return "professional-society";
  return facts.society === "couples" ? "couples-membership" : "personal-society";
}

export function decide(need: Need, facts: GateFacts): GateDecision {
  if (!facts.signedIn) return { kind: "error" };
  if (need.status === "in-development" || need.status === "planned") return { kind: "in_development" };
  const elite = facts.level === "elite";
  const entitled =
    elite ||
    ((!need.experience || facts.experiences.includes(need.experience)) &&
      (!need.level || atLeast(facts.level, need.level)) &&
      !need.elite);
  if (!entitled) {
    if (need.elite || need.level === "elite") return { kind: "verification", packageSlug: "elite-concierge" };
    return { kind: "membership", packageSlug: packageFor(need, facts) };
  }
  if (need.experience && !facts.live[need.experience] && !facts.preview) return { kind: "opening_soon", experience: need.experience };
  if (need.status === "preview" && !facts.preview) return { kind: "opening_soon", experience: null };
  return { kind: "allowed" };
}

/** What a member page needs, by address. Used for menus and links that don't carry their own requirement. */
export function needForHref(href: string): Need | null {
  if (href.startsWith("/app/connect360")) return { level: "executive" };
  if (href.startsWith("/app/elite/") || href === "/app/elite") return { elite: true };
  if (href.startsWith("/app/relationships") || href.startsWith("/app/readiness")) return { experience: "relationships" };
  if (href.startsWith("/app/business")) return { experience: "business" };
  return null;
}

/** Only member pages may be a return destination after checkout (never another site). */
export function safeReturn(path: unknown): string | null {
  if (typeof path !== "string") return null;
  return /^\/app(\/[A-Za-z0-9\-_/]*)?$/.test(path) && !path.includes("//") ? path : null;
}
