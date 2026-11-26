/**
 * Elite Concierge Society: by invitation only. Shared labels and helpers (no server access here).
 */
export const ELITE_TAGLINE = "Distinction. Intention. Influence.";

export const ELITE_QUALIFICATIONS = [
  { id: "personal_income", label: "High-income individual", detail: "Annual personal income above the approved threshold.", threshold: "personal_income" },
  { id: "business_owner", label: "Elite business owner", detail: "Verified ownership of a profitable business above the revenue threshold. Ownership alone isn't enough.", threshold: "business_revenue" },
  { id: "executive", label: "Corporate executive", detail: "Verified executive leadership, substantial compensation or exceptional documented accomplishments.", threshold: null },
  { id: "net_worth", label: "High-net-worth individual", detail: "Verified net worth above the threshold, excluding a primary residence.", threshold: "net_worth" },
  { id: "investor", label: "Established investor", detail: "Investable assets above the threshold.", threshold: "investable_assets" },
  { id: "professional", label: "Distinguished professional", detail: "Exceptional documented professional accomplishments.", threshold: null },
  { id: "retiree", label: "Accomplished retiree", detail: "Verified financial, business or professional accomplishments.", threshold: null },
] as const;
export type EliteQualification = (typeof ELITE_QUALIFICATIONS)[number]["id"] | "founder_selected";

export const ELITE_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  preliminary: "Preliminary eligibility established",
  verification_pending: "Verification pending",
  info_required: "Additional information required",
  automated_verified: "Automated verification successful",
  owner_verified: "Owner verification successful",
  manual_review: "Manual review required",
  qualification_approved: "Qualification approved",
  invitation_issued: "Invitation issued",
  invitation_accepted: "Invitation accepted",
  membership_activated: "Membership activated",
  expired: "Verification expired",
  revoked: "Revoked",
};

export const EVIDENCE_KINDS = [
  { id: "identity", label: "Government-issued identity" },
  { id: "business_registration", label: "Business registration and ownership" },
  { id: "business_financials", label: "Business revenue and profitability" },
  { id: "employment", label: "Executive position or employment" },
  { id: "license", label: "Professional license" },
  { id: "financial_verification", label: "Financial verification (income, assets or net worth)" },
  { id: "accomplishment", label: "Documented accomplishment" },
  { id: "other", label: "Other supporting information" },
] as const;

export type Thresholds = Record<string, { amount: number; approved: boolean }>;
export const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Members whose accepted invitation or active membership lets them choose Elite Concierge. */
export const eliteCanChoose = (status: string | null | undefined) => status === "invitation_accepted" || status === "membership_activated";

/**
 * How each requirement is verified. Stripe establishes identity and supporting bank facts; anything Stripe
 * can't conclusively verify goes to private documents and the owner's manual verification.
 */
export const VERIFICATION_METHODS: Record<string, { stripe: string; documents: string; never: string }> = {
  identity: { stripe: "Stripe Identity: government-issued ID, date of birth and a live selfie match.", documents: "Owner review of an ID document only if Stripe can't complete it.", never: "ID documents are never shown to other members." },
  personal_income: { stripe: "Supporting only: bank ownership and 12-month deposit totals via Stripe Financial Connections.", documents: "Tax return transcript, W-2/1099s, or a CPA or attorney letter, verified by the owner.", never: "Bank deposits are never treated as verified income." },
  business_owner: { stripe: "Supporting only: business bank ownership and deposits via Financial Connections.", documents: "Business registration, ownership records (operating agreement, cap table, K-1) and financial statements, verified by the owner.", never: "Ownership alone, or deposits alone, never qualify." },
  executive: { stripe: "Identity only.", documents: "Employment verification, offer letter or public filings, verified by the owner.", never: "Titles are never accepted without verification." },
  net_worth: { stripe: "Supporting only: balances on linked accounts.", documents: "CPA or attorney net-worth letter, or brokerage and asset statements with liabilities, verified by the owner.", never: "Bank balances are never treated as net worth." },
  investor: { stripe: "Supporting only: balances on linked accounts.", documents: "Brokerage or investment statements, or a CPA or attorney letter, verified by the owner.", never: "Balances alone never establish investable assets." },
  professional: { stripe: "Identity only.", documents: "Licenses, publications, awards or public records, verified by the owner.", never: "Accomplishments are never accepted without verification." },
  retiree: { stripe: "Supporting only: balances on linked accounts.", documents: "Financial, business or professional records, verified by the owner.", never: "Balances alone never qualify." },
};

export const OWNERSHIP_LABEL: Record<string, string> = {
  pending: "Checking…", match: "Account holder matches verified identity", partial: "Last name matches; first name differs",
  no_match: "Account holder does not match verified identity", unavailable: "Holder name unavailable (or identity not yet verified)",
};

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);

/** Compares a bank account holder name with the Identity-verified first and last name. Exported for tests. */
export function compareNames(verified: { first?: string | null; last?: string | null } | null, owners: string[]): "match" | "partial" | "no_match" | "unavailable" {
  const first = norm(verified?.first), last = norm(verified?.last);
  if (!last.length || !owners.length) return "unavailable";
  let best: "match" | "partial" | "no_match" = "no_match";
  for (const o of owners) {
    const w = new Set(norm(o));
    const lastOk = last.every((x) => w.has(x));
    const firstOk = first.some((x) => w.has(x));
    if (lastOk && firstOk) return "match";
    if (lastOk) best = "partial";
  }
  return best;
}

