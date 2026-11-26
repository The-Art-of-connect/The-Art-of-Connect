/**
 * Quality Assurance Center: departments, feature state and launch-readiness grouping.
 * Pure functions, shared by the Owner Portal pages and unit tests.
 */

export const QA_DEPARTMENTS = [
  { key: "account", title: "Account and Registration" },
  { key: "art-of-self", title: "The Art of Self" },
  { key: "journey", title: "Journey Intelligence" },
  { key: "professional", title: "The Professional Society" },
  { key: "singles", title: "Singles Experience" },
  { key: "couples", title: "Couples Experience" },
  { key: "counseling", title: "Counseling & Wellness" },
  { key: "financial", title: "Financial Operations" },
  { key: "admin", title: "Owner Administration" },
  { key: "security", title: "Security and Privacy" },
] as const;
export type QaDepartment = (typeof QA_DEPARTMENTS)[number]["key"];
export const departmentTitle = (k: string) => QA_DEPARTMENTS.find((d) => d.key === k)?.title ?? k;

export type Tracker = { built: boolean; tests_passed: boolean; merged: boolean; deployed: boolean; operational: boolean; awaiting: string | null } | null;
export type QaFeature = {
  key: string; department: string; title: string; href: string | null; tracker_key: string | null;
  peace_status: "not_tested" | "passed" | "failed" | "blocked";
  owner_status: "not_started" | "in_progress" | "passed" | "failed" | "needs_changes";
  retest_required: boolean; owner_approved: boolean;
};

/** How finished the feature is, from the Development Tracker: never "operational" just because tests pass. */
export function featureState(t: Tracker): { key: "operational" | "partial" | "unfinished"; label: string } {
  if (!t || !t.built) return { key: "unfinished", label: "Unfinished" };
  if (t.operational) return { key: "operational", label: "Operational" };
  return { key: "partial", label: t.deployed ? "Built, not yet operational" : "Partly built" };
}

export const READINESS = [
  { key: "development", title: "Awaiting development" },
  { key: "technical", title: "Awaiting Peace's technical testing" },
  { key: "review", title: "Awaiting your review" },
  { key: "correction", title: "Needs correction" },
  { key: "retest", title: "Awaiting your retest" },
  { key: "approved", title: "Approved by you" },
  { key: "external", title: "Requires legal or professional approval" },
] as const;
export type ReadinessKey = (typeof READINESS)[number]["key"];

/**
 * Where a feature stands on the road to launch. A feature waiting on legal or professional review is listed
 * there (and also wherever its testing stands) because that approval is outside the owner's and Peace's hands.
 */
export function readiness(f: QaFeature, t: Tracker, openCorrections: number): ReadinessKey[] {
  const out: ReadinessKey[] = [];
  if (f.owner_approved) out.push("approved");
  else if (openCorrections > 0) out.push("correction");
  else if (!t || !t.built) out.push("development");
  else if (f.retest_required) out.push("retest");
  else if (f.peace_status !== "passed") out.push("technical");
  else out.push("review");
  if (t && (t.awaiting === "legal" || t.awaiting === "professional")) out.push("external");
  return out;
}

export const OWNER_STATUS_LABEL: Record<QaFeature["owner_status"], string> = {
  not_started: "Not started", in_progress: "In progress", passed: "Passed", failed: "Failed", needs_changes: "Needs changes",
};
export const PEACE_STATUS_LABEL: Record<QaFeature["peace_status"], string> = {
  not_tested: "Peace hasn't tested yet", passed: "Peace's technical tests passed", failed: "Peace found problems", blocked: "Blocked (needs a setting or approval)",
};
