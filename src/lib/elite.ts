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
