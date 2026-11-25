/**
 * The Professional Society — shared option lists (browser and server).
 * Stored values are short keys; labels can change without migrating data.
 */
export const HELP_NEEDED: Record<string, string> = {
  growth: "Business growth and expansion",
  partner: "Finding a business partner",
  strategic: "Building strategic relationships",
  funding: "Business funding and capital readiness",
  leadership: "Leadership development",
  structure: "Business structure and organization",
  mentor: "Finding a mentor",
  technology: "Technology and automation",
  operations: "Scaling my operations",
  succession: "Succession, retirement or selling my business",
  expansion: "Expanding into new cities or states",
  marketing: "Marketing and brand development",
};

export const HELP_OFFERED: Record<string, string> = {
  industry: "Share my industry expertise",
  mentor: "Mentor other business owners",
  partnerships: "Explore strategic partnerships",
  resources: "Share business resources",
  leadership: "Offer leadership guidance",
  collaborate: "Collaborate on business opportunities",
  entrepreneurial: "Share my entrepreneurial experience",
  operating_partner: "Open to serving as an operating partner",
  technology: "Technology and automation know-how",
  expansion: "Experience expanding across cities or states",
  funding: "Experience with funding and capital",
  succession: "Succession and exit experience",
};

/** Needs that a given kind of help can answer (for two-sided matching). */
export const COMPLEMENTS: Record<string, string[]> = {
  growth: ["entrepreneurial", "collaborate", "expansion"],
  partner: ["partnerships", "operating_partner", "collaborate"],
  strategic: ["partnerships", "collaborate", "industry"],
  funding: ["funding"],
  leadership: ["leadership", "mentor"],
  structure: ["entrepreneurial", "leadership", "resources"],
  mentor: ["mentor"],
  technology: ["technology"],
  operations: ["operating_partner", "leadership", "technology"],
  succession: ["succession"],
  expansion: ["expansion", "entrepreneurial"],
  marketing: ["industry", "resources"],
};

export const STRUCTURES: Record<string, string> = {
  not_yet_formed: "Not yet formed", sole_proprietorship: "Sole proprietorship", llc: "LLC", partnership: "Partnership",
  s_corp: "S corporation", c_corp: "C corporation", nonprofit: "Nonprofit", other: "Other",
};
export const YEARS: Record<string, string> = { preparing: "I’m preparing to start", under_3: "Less than 3 years", "3_to_10": "3–10 years", over_10: "More than 10 years" };
export const STAGES: Record<string, string> = { idea: "Idea", early: "Early stage", growth: "Growth", established: "Established", enterprise: "Enterprise" };
export const RELATIONSHIPS: Record<string, string> = {
  peers: "Peer business owners", mentors: "Mentors", mentees: "Mentees", partners: "Strategic partners", collaborators: "Collaborators",
  advisors: "Advisors", successors: "Successors or buyers", acquisitions: "Businesses to acquire",
};
export const FUTURE: Record<string, string> = { expansion: "Expansion", succession: "Succession planning", exit: "Exit or sale", acquisition: "Acquisition", franchising: "Franchising" };
export const MENTORSHIP: Record<string, string> = { none: "Not right now", seeking: "I’d like a mentor", offering: "I’d like to mentor others", both: "Both" };
export const SCOPES: Record<string, string> = { local: "My city", state: "My state", national: "Nationwide" };
export const CONTACT: Record<string, string> = { members: "Any Professional Society member", same_state: "Members in my state", nobody: "Nobody (I’ll reach out myself)" };

export const INTENTS: Record<string, string> = {
  seeking_assistance: "Seeking Assistance",
  offering_assistance: "Offering Assistance",
  open_to_collaboration: "Open to Collaboration",
};
export const POST_STATUS: Record<string, string> = {
  open: "Open",
  connection_established: "Connection Established",
  assistance_received: "Assistance Received",
  completed: "Completed",
  closed: "Closed",
  archived: "Archived",
  removed: "Removed",
};

export const FEATURE_STATUS: Record<string, { label: string; tone: string }> = {
  available_now: { label: "Available Now", tone: "border-success/50 bg-success/10 text-success" },
  growing_community: { label: "Growing Community", tone: "border-champagne/60 bg-champagne/15 text-gold" },
  coming_soon: { label: "Coming Soon", tone: "border-line-strong text-muted" },
  future_development: { label: "Future Development", tone: "border-line text-faint" },
  temporarily_unavailable: { label: "Temporarily Unavailable", tone: "border-danger/40 text-danger" },
};

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/**
 * Basic development pathway: practical next steps from what the owner said
 * they need, plus unfinished readiness items. Guidance only — no outcomes promised.
 */
export function basicPathway(needs: string[], incompleteReadiness: { title: string; area: string }[]) {
  const steps: { title: string; why: string }[] = [];
  const add = (title: string, why: string) => steps.length < 6 && !steps.some((s) => s.title === title) && steps.push({ title, why });
  for (const r of incompleteReadiness.slice(0, 2)) add(r.title, `A ${r.area.toLowerCase()} foundation that supports everything else.`);
  if (needs.includes("funding")) add("Organize financial statements for funding conversations", "Lenders and investors usually ask for current P&L, balance sheet and cash-flow projections.");
  if (needs.includes("mentor") || needs.includes("leadership")) add("Post a mentorship request on the Connection Board", "Owners who offer mentorship can respond privately.");
  if (needs.includes("partner") || needs.includes("strategic")) add("Describe the partner you’re looking for", "A clear post helps complementary owners recognize the fit.");
  if (needs.includes("technology") || needs.includes("operations")) add("List the three processes that take most of your time", "These are usually the best candidates for systems and automation.");
  if (needs.includes("expansion") || needs.includes("growth")) add("Define your next market and what success looks like there", "Owners who have expanded can share what worked in that market.");
  if (needs.includes("succession")) add("Write down who could run the business without you", "Continuity planning starts with roles and documented processes.");
  if (needs.includes("structure")) add("Review your business structure with a qualified advisor", "Structure affects taxes, liability and future options.");
  if (needs.includes("marketing")) add("Clarify who you serve and what makes you different", "A focused message makes every other marketing decision easier.");
  if (!steps.length) add("Complete “How Can We Help Your Business?”", "Your answers shape your pathway and the owners you can help each other with.");
  return steps;
}
