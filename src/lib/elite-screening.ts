/**
 * Elite preliminary screening questions. Answers are ranges and categories only, never exact amounts.
 * The database (elite_screen_v2) is the authority on the result; this file only drives the form.
 *
 * Results:
 *   pass          meets every objective criterion against an APPROVED threshold, with documents available
 *   owner_review  plausible, but subjective (executive, professional, retiree) or the threshold isn't approved yet
 *   not_yet       doesn't meet the pathway today
 * Expedited verification unlocks only after "pass" (or the founder approving an owner_review),
 * and only once identity is verified.
 */
export const AMOUNT_BANDS = [
  { value: 0, label: "Under $250,000" },
  { value: 250000, label: "$250,000 – $499,999" },
  { value: 500000, label: "$500,000 – $999,999" },
  { value: 1000000, label: "$1M – $1.99M" },
  { value: 2000000, label: "$2M – $4.99M" },
  { value: 5000000, label: "$5M – $9.99M" },
  { value: 10000000, label: "$10M – $24.99M" },
  { value: 25000000, label: "$25M or more" },
] as const;

type Opt = { value: string | number; label: string };
export type ScreenQuestion = { id: string; label: string; kind: "band" | "choice"; options?: readonly Opt[] };
const YES_NO: Opt[] = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const band = (id: string, label: string): ScreenQuestion => ({ id, label, kind: "band" });
const choice = (id: string, label: string, options: Opt[]): ScreenQuestion => ({ id, label, kind: "choice", options });

export const SCREENING: Record<string, ScreenQuestion[]> = {
  personal_income: [
    band("income_recent", "Your personal income in the most recent full year"),
    band("income_prior", "Your personal income in the year before"),
    choice("docs", "Can you provide tax returns, W-2s/1099s or a CPA letter confirming this?", YES_NO),
  ],
  business_owner: [
    choice("own_pct", "Your ownership share of the business", [{ value: "under25", label: "Under 25%" }, { value: "25to50", label: "25% – 50%" }, { value: "over50", label: "Over 50%" }]),
    band("revenue", "The business's annual revenue (most recent full year)"),
    choice("profitable", "Was the business profitable in its most recent full year?", YES_NO),
    choice("years", "How long has the business operated?", [{ value: "under2", label: "Under 2 years" }, { value: "2to5", label: "2 – 5 years" }, { value: "over5", label: "Over 5 years" }]),
    choice("docs", "Can you provide registration, ownership records and financial statements?", YES_NO),
  ],
  executive: [
    choice("level", "Your current or most recent position", [
      { value: "c_suite", label: "C-suite (CEO, CFO, COO…)" }, { value: "president", label: "President" }, { value: "evp_svp", label: "EVP / SVP" },
      { value: "managing_partner", label: "Managing partner" }, { value: "vp", label: "Vice president" }, { value: "director", label: "Director" }, { value: "other", label: "Other" }]),
    choice("org", "Size of the organization", [{ value: "under50", label: "Under 50 people" }, { value: "50to500", label: "50 – 500 people" }, { value: "over500", label: "Over 500 people" }]),
    choice("role_years", "Time in this role", [{ value: "under1", label: "Under 1 year" }, { value: "1to3", label: "1 – 3 years" }, { value: "over3", label: "Over 3 years" }]),
    band("comp", "Your total annual compensation"),
    choice("docs", "Can you provide employment verification or public filings?", YES_NO),
  ],
  net_worth: [
    band("net_worth", "Your net worth, excluding your primary residence"),
    choice("docs", "Can you provide a CPA or attorney letter, or asset and liability statements?", YES_NO),
  ],
  investor: [
    band("investable", "Your investable assets (cash and investments)"),
    choice("docs", "Can you provide brokerage or investment statements?", YES_NO),
  ],
  professional: [
    choice("prof_years", "Years in your profession", [{ value: "under10", label: "Under 10" }, { value: "10to20", label: "10 – 20" }, { value: "over20", label: "Over 20" }]),
    choice("licensed", "Do you hold a professional license or board certification?", YES_NO),
    choice("distinctions", "Documented distinctions (awards, publications, patents, board seats)", [{ value: "none", label: "None yet" }, { value: "one_two", label: "1 – 2" }, { value: "three_plus", label: "3 or more" }]),
    choice("docs", "Can you provide licenses, publications or public records?", YES_NO),
  ],
  retiree: [
    choice("prior", "Your career before retirement", [{ value: "executive", label: "Executive" }, { value: "business_owner", label: "Business owner" }, { value: "professional", label: "Distinguished professional" }, { value: "other", label: "Other" }]),
    band("net_worth", "Your net worth, excluding your primary residence"),
    choice("docs", "Can you provide financial, business or professional records?", YES_NO),
  ],
};

export const ATTESTATIONS = [
  { id: "att_truth", label: "My answers are accurate. I understand that false or misleading answers permanently end Elite consideration." },
  { id: "att_verify", label: "I understand that every answer must be verified before any invitation, and that preliminary screening is not admission." },
] as const;
