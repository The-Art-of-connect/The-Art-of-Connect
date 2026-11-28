/**
 * My Global Watchlist, Opportunity Radar and the Application Center (directives 25, 32, 33; directive 51 item 4).
 * Pure module: shared labels and the matching rules. Every item a member sees comes from a real record: an opportunity the
 * owner entered from its official source, or a finding from the member's own research. Nothing here invents an opportunity.
 */
export const OPPORTUNITY_KINDS: Record<string, string> = {
  grant: "Grant", funding: "Funding", partnership: "Partnership", contract: "Contract", casting: "Casting and entertainment",
  employment: "Executive and professional role", board: "Board and advisory", speaking: "Speaking engagement", other: "Other",
};
export const WATCH_KINDS: Record<string, string> = { company: "Company or organization", topic: "Topic or industry", public_role: "Person in a public role" };
export const WATCH_FREQUENCY: Record<string, string> = { weekly: "Weekly", biweekly: "Every two weeks", monthly: "Monthly" };

/** The Application Center pipeline: preparing, submitted, then a decision. */
export const APPLICATION_STATUS: Record<string, string> = {
  preparing: "Preparing", submitted: "Submitted", in_review: "Interview or audition", accepted: "Accepted", not_selected: "Not selected", withdrawn: "Withdrawn",
};
export const PIPELINE: { key: string; label: string; statuses: string[] }[] = [
  { key: "preparing", label: "Preparing", statuses: ["preparing"] },
  { key: "submitted", label: "Submitted", statuses: ["submitted", "in_review"] },
  { key: "decision", label: "Decision", statuses: ["accepted", "not_selected", "withdrawn"] },
];

export type ChecklistItem = { label: string; done: boolean };
/** One required document or step per line (text only: documents themselves are never stored here). */
export function parseChecklist(text: string, keep: ChecklistItem[] = []): ChecklistItem[] {
  const done = new Map(keep.map((i) => [i.label.toLowerCase(), i.done]));
  const seen = new Set<string>();
  return text.split(/\r?\n/).map((l) => l.replace(/^[\s•*\-–]+/, "").trim().slice(0, 200)).filter((l) => {
    const k = l.toLowerCase();
    if (l.length < 2 || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 40).map((label) => ({ label, done: done.get(label.toLowerCase()) ?? false }));
}
export function normalizeChecklist(v: unknown): ChecklistItem[] {
  return Array.isArray(v) ? v.filter((i): i is ChecklistItem => Boolean(i) && typeof i.label === "string").map((i) => ({ label: i.label, done: Boolean(i.done) })) : [];
}

/** Whole days from today (local calendar date) until an ISO date; negative when past. */
export function daysUntil(isoDate: string, today = new Date()): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const a = Date.UTC(y, m - 1, d), b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}
export function deadlineLabel(isoDate: string | null, today = new Date()): string | null {
  if (!isoDate) return null;
  const n = daysUntil(isoDate, today);
  if (n < 0) return "Deadline passed";
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  return n <= 14 ? `Due in ${n} days` : `Due ${new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", { dateStyle: "medium" })}`;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
/** Words worth matching (three letters or more, without filler). */
export function terms(...texts: (string | null | undefined)[]): string[] {
  const STOP = new Set(["the", "and", "for", "with", "new", "any", "all", "from", "into", "about", "that", "this", "our", "your", "inc", "llc"]);
  return [...new Set(texts.flatMap((t) => norm(t ?? "").split(" ")).filter((w) => w.length >= 3 && !STOP.has(w)))];
}
/** Whether a text mentions a watched name (the whole name, not a fragment). */
export function mentions(text: string, name: string): boolean {
  const n = norm(name);
  return n.length >= 2 && ` ${norm(text)} `.includes(` ${n} `);
}

export type Opportunity = { id: string; title: string; organization: string; category: string; industries: string[]; region: string | null; summary: string; requirements: string | null; deadline: string | null };
export type RadarPrefs = { opted_in: boolean; categories: string[]; industries: string[]; keywords: string | null };
export type Watch = { subject: string | null; objective: string };
export type Match = { item: Opportunity; score: number; reasons: string[] };

/**
 * Matches owner-curated opportunities to the member's stated interests (only with the member's consent). Opportunities whose
 * deadline has passed are never shown. With matching off, nothing is matched.
 */
export function matchOpportunities(items: Opportunity[], prefs: RadarPrefs | null, watch: Watch[], opts: { fundingProjects?: number; industry?: string | null; today?: Date } = {}): Match[] {
  if (!prefs?.opted_in) return [];
  const today = opts.today ?? new Date();
  const cats = new Set(prefs.categories);
  if (cats.size && (opts.fundingProjects ?? 0) > 0) { cats.add("funding"); cats.add("grant"); }
  const inds = new Set([...prefs.industries, ...(opts.industry ? [opts.industry] : [])]);
  const keys = terms(prefs.keywords);
  return items.filter((o) => !o.deadline || daysUntil(o.deadline, today) >= 0).flatMap((o) => {
    const reasons: string[] = [];
    let score = 0;
    if (cats.size && !cats.has(o.category)) return [];
    if (cats.size) { score += 2; reasons.push(OPPORTUNITY_KINDS[o.category] ?? o.category); }
    if (inds.size && o.industries.length) {
      if (!o.industries.some((i) => inds.has(i))) return [];
      score += 2; reasons.push("Your industry");
    }
    const text = `${o.title} ${o.organization} ${o.summary} ${o.requirements ?? ""} ${o.region ?? ""}`;
    const watched = watch.find((w) => w.subject && mentions(text, w.subject));
    if (watched) { score += 3; reasons.push(`On your watchlist: ${watched.subject}`); }
    const hits = keys.filter((k) => ` ${norm(text)} `.includes(` ${k} `));
    if (hits.length) { score += hits.length; reasons.push(`Mentions ${hits.slice(0, 3).join(", ")}`); }
    if (o.deadline && daysUntil(o.deadline, today) <= 14) score += 1;
    return [{ item: o, score, reasons: reasons.length ? reasons : ["No interests chosen yet; add some to narrow your matches"] }];
  }).sort((a, b) => b.score - a.score || (a.item.deadline ?? "9999").localeCompare(b.item.deadline ?? "9999"));
}

/** Findings from the member's own research that mention a watched name. */
export function relatedFindings<T extends { title: string; detail: string | null }>(findings: T[], w: Watch): T[] {
  const names = w.subject ? [w.subject] : [];
  if (!names.length) return [];
  return findings.filter((f) => names.some((n) => mentions(`${f.title} ${f.detail ?? ""}`, n)));
}

/** How well a research finding is verified (the labels My Intelligence Office uses). */
export const VERIFICATION_LABEL: Record<string, string> = {
  confirmed: "Confirmed", corroborated: "Corroborated", unverified: "Unverified", suggestion: "Lead to explore", conflicting: "Conflicting",
  outdated: "Possibly outdated", self_reported: "Self-reported", unresolved_concern: "Unresolved concern", not_established: "Not established",
};
/** Research findings that can appear on the Opportunity Radar: opportunities and funding programs the member's own research found. */
export const RADAR_FINDING_KINDS = ["opportunity", "funding_program"];

/** Pipeline counts for the Application Center (each application counted once, in its stage). */
export function pipelineCounts(statuses: string[]): { key: string; label: string; count: number }[] {
  return PIPELINE.map((p) => ({ key: p.key, label: p.label, count: statuses.filter((s) => p.statuses.includes(s)).length }));
}
