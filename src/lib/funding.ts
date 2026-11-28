/**
 * Capital & Funding Intelligence Center (founder directive 29). Educational planning tools: The Art of Connect is not a lender,
 * broker or investment adviser. Every figure a member enters is self-reported unless verified, and estimates stay labeled.
 */
export const PROJECT_KINDS: Record<string, string> = {
  startup: "Starting a business", acquisition: "Acquiring a business", expansion: "Expansion", equipment: "Equipment",
  real_estate: "Commercial real estate", franchise: "Franchise", working_capital: "Working capital", other: "Other",
};
export const STAGES: Record<string, string> = {
  assessment: "Assessment", strategy: "Capital strategy", research: "Funding research", package: "Funding package",
  applications: "Applications", funded: "Funded", improvement: "Improvement plan", paused: "Paused", closed: "Closed",
};
export const POSITION_LABEL: Record<string, string> = {
  declared: "Declared funds (self-reported)", verified_balance: "Verified balance", approved_financing: "Approved financing", committed: "Committed funds (your attestation)",
};
export const POSITION_STATUS: Record<string, string> = {
  recorded: "Recorded", pending_review: "Awaiting review", verified: "Verified", not_verified: "Not verified", expired: "Expired", withdrawn: "Withdrawn",
};
export const APP_STATUS: Record<string, string> = {
  researching: "Researching financing", preparing_documents: "Preparing documentation", ready_for_professional_review: "Ready for professional review",
  ready_to_apply: "Ready to apply", submitted_by_member: "Application submitted by you", awaiting_lender: "Awaiting lender response",
  documents_requested: "Additional documentation requested", under_lender_review: "Under lender review", conditionally_approved: "Conditionally approved",
  approved: "Approved", declined: "Declined", withdrawn: "Withdrawn", funded: "Funded",
};
export const EVIDENCE_REQUIRED: Record<string, string> = {
  conditionally_approved: "the lender's conditional approval or commitment letter",
  approved: "the lender's approval or commitment letter",
  funded: "the lender's disbursement confirmation (an approval letter alone isn't enough)",
};
export const COMM_KINDS: Record<string, string> = {
  inquiry: "Funding inquiry", preparation: "Loan preparation correspondence", information_request: "Request for financing information",
  clarification: "Request for clarification", meeting_preparation: "Meeting preparation", follow_up: "Application follow-up", document_response: "Response to a document request",
};

/** Assessment questions (directive 29 §1). Answers are always self-reported. */
export const ASSESSMENT: { key: string; label: string; hint?: string }[] = [
  { key: "concept", label: "Business concept" }, { key: "industry", label: "Industry" }, { key: "structure", label: "Business structure" },
  { key: "requirements", label: "Startup or acquisition requirements" }, { key: "operations", label: "Existing business operations" },
  { key: "revenue", label: "Revenue and profitability", hint: "Approximate is fine; say so." }, { key: "total_cost", label: "Total project cost" },
  { key: "owner_capital", label: "Available owner capital" }, { key: "obligations", label: "Existing financial obligations" },
  { key: "credit", label: "Credit information you choose to share (optional)", hint: "Never enter account numbers or Social Security numbers." },
  { key: "collateral", label: "Available collateral" }, { key: "need", label: "Funding requirements" }, { key: "repayment", label: "Repayment capacity" },
  { key: "preferences", label: "Ownership and operational preferences" }, { key: "timeline", label: "Funding timeline" },
];

/** Standard amortizing payment (an estimate only; lenders' terms, fees and rates vary). */
export function monthlyPayment(principal: number, annualRatePct: number, months: number) {
  if (!(principal > 0) || !(months > 0)) return 0;
  const r = annualRatePct / 100 / 12;
  return r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));
}

export type Line = { label: string; amount: number; kind?: string; rate?: number; months?: number };
/** Parses "Label | 25000 | rate% | months" lines (rate and months optional, for financing sources). */
export function parseLines(text: string): Line[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 25).map((l) => {
    const [label, amount, rate, months] = l.split("|").map((x) => x.trim());
    const n = Number((amount ?? "").replace(/[$,\s]/g, ""));
    const line: Line = { label: (label ?? "").slice(0, 120), amount: Number.isFinite(n) && n > 0 ? Math.round(n) : 0 };
    const rr = Number((rate ?? "").replace(/%/g, "")); const mm = Number(months);
    if (Number.isFinite(rr) && rr >= 0 && rr < 100 && Number.isFinite(mm) && mm > 0 && mm <= 600) { line.rate = rr; line.months = Math.round(mm); }
    return line;
  }).filter((x) => x.label && x.amount > 0);
}

export function summarize(uses: Line[], sources: Line[]) {
  const totalUses = uses.reduce((n, x) => n + x.amount, 0);
  const totalSources = sources.reduce((n, x) => n + x.amount, 0);
  const monthly = sources.reduce((n, x) => n + (x.rate !== undefined && x.months ? monthlyPayment(x.amount, x.rate, x.months) : 0), 0);
  const totalRepaid = sources.reduce((n, x) => n + (x.rate !== undefined && x.months ? monthlyPayment(x.amount, x.rate, x.months) * x.months : 0), 0);
  const borrowed = sources.reduce((n, x) => n + (x.rate !== undefined && x.months ? x.amount : 0), 0);
  return { totalUses, totalSources, gap: totalUses - totalSources, monthly, interest: totalRepaid - borrowed };
}

export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const FUNDING_NOTICE = "Educational planning only. The Art of Connect is not a lender, loan broker or investment adviser, never guarantees financing, and never decides credit. Payment figures are estimates; actual terms, rates and fees come only from lenders.";
