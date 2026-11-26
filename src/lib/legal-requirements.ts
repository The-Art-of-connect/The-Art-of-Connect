/**
 * Which agreements must be accepted where. Shared by the browser (what the
 * member sees next to the checkbox) and the server (what is recorded). The
 * server records acceptance only of versions actually in effect.
 */
import type { Experience } from "@/lib/experiences";

export const LEGAL_TITLES: Record<string, string> = {
  "terms-of-service": "Terms of Service",
  "privacy-policy": "Privacy Policy",
  "electronic-communications": "Electronic Communications and Consent Agreement",
  "community-standards": "Community Standards and Code of Conduct",
  "membership-agreement": "Membership Agreement",
  "subscription-auto-renewal": "Subscription and Automatic Renewal Policy",
  "refund-policy": "Cancellation and Refund Policy",
  "couples-agreement": "Couples Membership Agreement",
  "business-networking-disclaimer": "Business Networking Disclaimer",
  "counseling-disclaimer": "Counseling, Coaching and Wellness Disclaimer",
  "matchmaking-disclaimer": "Dating and Matchmaking Disclaimer",
  "professional-agreement": "Professional Provider Agreement",
};

export const REGISTRATION_DOCS = ["terms-of-service", "privacy-policy", "electronic-communications", "community-standards"];
export const PROFESSIONAL_DOCS = ["professional-agreement", "terms-of-service", "privacy-policy", "electronic-communications", "community-standards", "subscription-auto-renewal", "refund-policy", "counseling-disclaimer"];
const CHECKOUT_BASE = ["membership-agreement", "subscription-auto-renewal", "refund-policy"];
const DISCLAIMER: Record<Experience, string> = {
  business: "business-networking-disclaimer",
  counseling: "counseling-disclaimer",
  relationships: "matchmaking-disclaimer",
};

/** Documents accepted at checkout for a membership with these experiences. */
export function checkoutDocs(experiences: Experience[], couples: boolean) {
  const docs = [...CHECKOUT_BASE, ...experiences.map((e) => DISCLAIMER[e])];
  if (couples) docs.push("couples-agreement");
  return [...new Set(docs)];
}

export function titlesFor(slugs: string[]) {
  return slugs.map((s) => LEGAL_TITLES[s] ?? s);
}

/** The exact wording beside the checkbox; the same text is stored as evidence. */
export function acceptanceStatement(slugs: string[]) {
  const t = titlesFor(slugs);
  const list = t.length > 1 ? `${t.slice(0, -1).join(", ")} and ${t.at(-1)}` : t[0];
  return `I have read and agree to the ${list}.`;
}

/** Automatic-renewal disclosure shown and recorded at checkout. */
export function autoRenewalStatement(opts: { packageName: string; amount: string; interval: "month" | "year"; trialDays?: number; firstCharge?: string }) {
  const period = opts.interval === "year" ? "year" : "month";
  if (opts.trialDays) {
    return `I understand my ${opts.packageName} begins with a ${opts.trialDays}-day free trial. A valid card is required. Unless I cancel before ${opts.firstCharge ?? `the end of the trial`}, ${opts.amount} (plus any applicable tax) will be charged to my card on ${opts.firstCharge ?? "the day the trial ends"} and every ${period} after that until I cancel. I can cancel online at any time in My membership, and I will not be charged if I cancel during the trial. Only one trial is available per member.`;
  }
  return `I understand my ${opts.packageName} renews automatically every ${period} at ${opts.amount} (plus any applicable tax) until I cancel, and that I can cancel online at any time in My membership.`;
}
