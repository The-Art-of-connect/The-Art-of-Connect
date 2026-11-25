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
  "free-business": { label: "Free Business member", experiences: ["business"], packageSlug: null, society: "business" },
  "free-singles": { label: "Free Singles member", experiences: ["relationships"], packageSlug: null, society: "singles" },
  "free-couples": { label: "Free Couples member", experiences: ["relationships"], packageSlug: null, society: "couples" },
  "paid-individual": { label: "Individual paid member (The Personal Society)", experiences: ["relationships"], packageSlug: "personal-society", society: "singles" },
  "paid-bundle": { label: "Bundled paid member (Complete Society)", experiences: ["business", "counseling", "relationships"], packageSlug: "complete-society", society: null },
  "executive-private": { label: "Executive Private member", experiences: ["business", "counseling", "relationships"], packageSlug: "executive-private", society: null },
  "elite-concierge": { label: "Elite Concierge member", experiences: ["business", "counseling", "relationships"], packageSlug: "elite-concierge", society: null },
};
export const isPersona = (k: unknown): k is keyof typeof PERSONAS => typeof k === "string" && k in PERSONAS;
export const personaIsPaid = (k: string) => Boolean(PERSONAS[k]?.packageSlug);
