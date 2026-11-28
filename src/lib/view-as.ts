/**
 * Owner-only "View as": experience the site exactly as each membership sees it,
 * without purchasing memberships. Only an owner with two-step verification can
 * switch; the persona changes what the owner can see and do, never what any member can.
 */
import type { Experience } from "@/lib/experiences";

export type Society = "business" | "singles" | "couples";
export type Persona = { label: string; experiences: Experience[]; packageSlug: string | null; society: Society | null };

export const VIEW_AS_COOKIE = "aoc_view_as";

export const PERSONAS: Record<string, Persona> = {
  // Membership access v2: a free account is The Art of Becoming only (with The Art of Knowing Yourself).
  free: { label: "Free account (The Art of Becoming)", experiences: ["counseling"], packageSlug: null, society: null },
  "paid-individual": { label: "Individual paid member (The Personal Society)", experiences: ["counseling", "relationships"], packageSlug: "personal-society", society: "singles" },
  "paid-business": { label: "Individual paid member (The Professional Society)", experiences: ["business", "counseling"], packageSlug: "professional-society", society: "business" },
  "paid-bundle": { label: "Bundled paid member (Business + Love)", experiences: ["business", "counseling", "relationships"], packageSlug: "dual-society", society: null },
  "executive-private": { label: "Executive Private member", experiences: ["business", "counseling", "relationships"], packageSlug: "executive-private", society: null },
  "elite-concierge": { label: "Elite Concierge member", experiences: ["business", "counseling", "relationships"], packageSlug: "elite-concierge", society: null },
};
export const isPersona = (k: unknown): k is keyof typeof PERSONAS => typeof k === "string" && k in PERSONAS;
export const personaIsPaid = (k: string) => Boolean(PERSONAS[k]?.packageSlug);
