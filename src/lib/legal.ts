import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Legal documents live as version-controlled Markdown in content/legal/.
 * Each has a version string; consents record the exact version accepted.
 * Every document is marked as a draft until counsel approves it.
 */
export type LegalDoc = { slug: string; title: string; version: string; consent: string; summary: string; body: string };

const DIR = path.join(process.cwd(), "content", "legal");

export const LEGAL_ORDER = [
  "terms-of-service",
  "privacy-policy",
  "membership-agreement",
  "community-standards",
  "refund-policy",
  "safety-policy",
  "matchmaking-disclaimer",
  "counseling-disclaimer",
  "professional-agreement",
];

function parse(slug: string, raw: string): LegalDoc {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = Object.fromEntries((m?.[1] ?? "").split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  return { slug, title: meta.title ?? slug, version: meta.version ?? "draft", consent: meta.consent ?? "", summary: meta.summary ?? "", body: (m?.[2] ?? raw).trim() };
}

export function getLegalDocs(): LegalDoc[] {
  const files = new Set(readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")));
  return LEGAL_ORDER.filter((s) => files.has(s)).map((s) => parse(s, readFileSync(path.join(DIR, `${s}.md`), "utf8")));
}

export function getLegalDoc(slug: string) {
  return getLegalDocs().find((d) => d.slug === slug) ?? null;
}

/** Versions accepted at registration/onboarding, keyed by consent type. */
export function consentVersions(types: string[]) {
  return getLegalDocs().filter((d) => types.includes(d.consent)).map((d) => ({ consent_type: d.consent, version: d.version }));
}

export const isDraft = (d: LegalDoc) => d.version.includes("draft");
