/**
 * Strategic Business Proposal Builder (founder directive 28). Proposals are nonbinding discussion documents; every section states
 * whether it is fact, research, assumption, estimate or a proposed arrangement, and nothing is shared until the author authorizes it.
 */
export type Basis = "fact" | "research" | "assumption" | "estimate" | "proposed";
export type Section = { text: string; basis: Basis };
export type Sections = Record<string, Section>;

export const BASIS: Record<Basis, string> = {
  fact: "Fact (verifiable)", research: "From research (cited)", assumption: "Assumption", estimate: "Estimate", proposed: "Proposed arrangement",
};

export const SECTIONS: { key: string; title: string; prompt: string; core?: boolean; defaultBasis: Basis }[] = [
  { key: "executive_summary", title: "Executive summary", prompt: "The opportunity, why it matters, and what you propose, in a few sentences.", core: true, defaultBasis: "proposed" },
  { key: "opportunity", title: "Opportunity description", prompt: "What the opportunity is, where, and its current status.", core: true, defaultBasis: "fact" },
  { key: "objectives", title: "Business objectives", prompt: "What success looks like for each party.", core: true, defaultBasis: "proposed" },
  { key: "research", title: "Supporting research", prompt: "Findings with their sources and dates.", defaultBasis: "research" },
  { key: "market", title: "Market analysis", prompt: "Customers, competitors and demand, with sources.", defaultBasis: "research" },
  { key: "strategy", title: "Business development strategy", prompt: "How the opportunity would be pursued and grown.", defaultBasis: "proposed" },
  { key: "financial_requirements", title: "Financial requirements", prompt: "Total cost and what the funds would be used for.", core: true, defaultBasis: "estimate" },
  { key: "contributions", title: "Proposed contributions", prompt: "What each party would contribute: expertise, operations, relationships, capital.", core: true, defaultBasis: "proposed" },
  { key: "ownership", title: "Potential ownership structures", prompt: "Possible structures to discuss with your attorney and accountant.", defaultBasis: "proposed" },
  { key: "collaboration_options", title: "Collaboration options", prompt: "Operational partnership, management arrangement, joint venture concept, independent ownership with financing…", defaultBasis: "proposed" },
  { key: "management", title: "Management responsibilities", prompt: "Who would be responsible for what.", defaultBasis: "proposed" },
  { key: "revenue_model", title: "Revenue model", prompt: "How the business would earn revenue.", defaultBasis: "assumption" },
  { key: "projections", title: "Financial projections", prompt: "Projected revenue, costs and timing. Label every figure as an estimate.", defaultBasis: "estimate" },
  { key: "funding", title: "Funding considerations", prompt: "How the costs might be funded (self-funding, financing, seller financing…). No investor solicitation.", defaultBasis: "proposed" },
  { key: "risks", title: "Risk assessment", prompt: "What could go wrong and how it would be managed.", core: true, defaultBasis: "assumption" },
  { key: "regulatory", title: "Regulatory considerations", prompt: "Licenses, permits and rules that may apply, for professional review.", defaultBasis: "research" },
  { key: "timeline", title: "Development timeline", prompt: "Key milestones and target dates.", defaultBasis: "estimate" },
  { key: "legal", title: "Legal considerations", prompt: "Questions for each party's own attorney.", defaultBasis: "assumption" },
  { key: "exit", title: "Exit strategies", prompt: "How participants could step away or the arrangement could end.", defaultBasis: "proposed" },
  { key: "outstanding", title: "Outstanding requirements", prompt: "Information, documents and decisions still needed.", core: true, defaultBasis: "fact" },
  { key: "next_steps", title: "Recommended next steps", prompt: "What should happen next, and who does it.", core: true, defaultBasis: "proposed" },
];
const KEYS = new Set(SECTIONS.map((s) => s.key));
const BASES = new Set(Object.keys(BASIS));

export function normalizeSections(v: unknown): Sections {
  const out: Sections = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!KEYS.has(k) || !raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text.trim().slice(0, 6000) : "";
    const basis = typeof r.basis === "string" && BASES.has(r.basis) ? (r.basis as Basis) : SECTIONS.find((s) => s.key === k)!.defaultBasis;
    if (text) out[k] = { text, basis };
  }
  return out;
}

/** Administrative completeness only (never a judgment of legal or financial sufficiency). */
export function completeness(s: Sections) {
  const core = SECTIONS.filter((x) => x.core);
  const missing = core.filter((x) => !s[x.key]).map((x) => x.title);
  const optionalMissing = SECTIONS.filter((x) => !x.core && !s[x.key]).map((x) => x.title);
  const estimates = SECTIONS.filter((x) => s[x.key] && ["estimate", "assumption"].includes(s[x.key].basis)).map((x) => x.title);
  const flags: string[] = [];
  const fin = ["financial_requirements", "projections"].filter((k) => s[k]?.basis === "fact");
  if (fin.length) flags.push("Financial figures are marked as facts: attach supporting documents in the Business Deal Room or relabel them as estimates.");
  if (s.ownership || s.legal) flags.push("Ownership and legal sections should be reviewed by each party's own attorney before any agreement.");
  if (s.funding) flags.push("Funding sections are educational. Investor solicitation and securities offerings aren't permitted here.");
  return { done: core.length - missing.length, total: core.length, missing, optionalMissing, estimates, flags };
}

export const NONBINDING = "Preliminary nonbinding discussion document. It is not an offer, agreement, commitment or solicitation, and creates no legal or financial obligation. Any arrangement requires separate agreements prepared and reviewed by each party's own professionals.";

export const RESPONSES: Record<string, string> = {
  accept_discussion: "Accept to discuss", express_interest: "Express interest", request_information: "Request information",
  suggest_revision: "Suggest a revision", acknowledge_receipt: "Acknowledge receipt", decline: "Decline", withdraw_from_discussion: "Withdraw from discussion",
};
