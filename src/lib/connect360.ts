/**
 * CONNECT 360 member experience (founder directives 24–29): shared labels and friendly messages for the rules the database
 * enforces (Safety Shield, regulated-activity guard, readiness and entitlement checks).
 */
export const PURPOSES: Record<string, string> = {
  operational_partnership: "Operational partnership", strategic_collaboration: "Strategic collaboration", joint_venture_concept: "Joint venture concept",
  management_arrangement: "Management arrangement", acquisition: "Acquisition", expansion: "Expansion", leadership: "Leadership role",
  mentorship: "Mentorship", board_advisory: "Board or advisory", professional_services: "Professional services", other: "Other",
};
export const INTERESTS: Record<string, string> = {
  operational_partnership: "Operational partnerships", acquisition: "Business acquisitions", expansion: "Expansion", leadership: "Leadership roles",
  mentorship: "Mentorship", board_advisory: "Board and advisory", strategic_collaboration: "Strategic collaborations",
  joint_venture_concept: "Joint venture concepts", management_arrangement: "Management arrangements",
};
export const ADVISOR_TYPES: Record<string, string> = {
  attorney: "Attorney", accountant: "Accountant", business_advisor: "Business advisor", financing_professional: "Financing professional", other_professional: "Other professional",
};
export const STAGES: Record<string, string> = {
  exploring: "Exploring", proposal: "Proposal", due_diligence: "Due diligence", professional_review: "Professional review",
  established: "Established", ongoing_development: "Ongoing development",
};
export const ITEM_KINDS: Record<string, string> = {
  checklist: "Checklist", due_diligence: "Due diligence", milestone: "Milestone", action: "Action item", deadline: "Deadline", meeting: "Meeting",
  decision: "Decision", requirement: "Outstanding requirement", legal_question: "Question for counsel", financial_question: "Question for an accountant",
  consultation: "Professional consultation", progress_review: "Progress review",
};
export const DOC_CATEGORIES: Record<string, string> = {
  proposal: "Strategic proposal", business_plan: "Business plan", development_plan: "Business development plan", confidentiality_agreement: "Confidentiality agreement",
  letter_of_intent: "Letter of intent", memorandum_of_understanding: "Memorandum of understanding", formation_document: "Formation document",
  operating_agreement: "Operating agreement", partnership_agreement: "Partnership agreement", shareholder_agreement: "Shareholder agreement",
  personal_financial_statement: "Personal financial statement", business_financial_statement: "Business financial statement", tax_return: "Tax return",
  bank_statement: "Bank statement", proof_of_funds: "Proof of funds", debt_schedule: "Debt schedule", financing_application: "Financing application",
  financing_document: "Financing document", lender_correspondence: "Lender correspondence", conditional_approval: "Conditional approval",
  commitment_letter: "Commitment letter", disbursement_confirmation: "Disbursement confirmation", due_diligence: "Due diligence material",
  regulatory_approval: "Regulatory approval", purchase_agreement: "Purchase agreement", attorney_correspondence: "Attorney correspondence",
  final_executed_agreement: "Final executed agreement", projection: "Financial projection", other: "Other",
};
export const REVIEW_STATUS: Record<string, string> = {
  none: "Not submitted for review", awaiting_review: "Awaiting review", reviewed: "Reviewed", revision_requested: "Revision requested",
  addressed: "Addressed", final_authorized: "Authorized final document",
};
export const SCAN_STATUS: Record<string, string> = { pending: "Security check in progress", clean: "Passed security check", infected: "Failed security check (locked)", error: "Couldn't be checked (locked)" };

const REGULATED: Record<string, string> = {
  guaranteed_returns: "promises of guaranteed returns", pyramid: "pyramid or recruitment schemes", payment_request: "requests to send money or payment details",
  investor_matching: "investment solicitation", capital_raising: "capital raising", securities_offerings: "offers of shares, equity or other securities",
  crowdfunding: "crowdfunding", transaction_compensation: "finder's, placement or transaction fees", lending: "private lending between members",
};

/** Turns database refusals into respectful, specific messages; anything unrecognized falls back. */
export function friendly(err: string | undefined | null, fallback: string) {
  const e = err ?? "";
  const reg = /REGULATED_ACTIVITY:([a-z_,]+)/.exec(e);
  if (reg) {
    const items = reg[1].split(",").map((k) => REGULATED[k] ?? k).join(", ");
    return `The Art of Connect can't be used for ${items}. These remain restricted to protect members. Please rephrase, and speak with a licensed professional where appropriate.`;
  }
  if (/SAFETY_SHIELD/.test(e)) return "For your privacy, personal contact details, account numbers and login information can't be shared here. Please remove them and try again.";
  const known = /(Please approve your professional résumé[^.]*\.|This member is not accepting[^.]*\.|You have reached the number[^.]*\.|Invite someone to a Deal Room after[^.]*\.|Only the Deal Room owner[^.]*\.|Business participants must be members\.|part of Executive Private and Elite Concierge\.|This Deal Room has reached its advisor limit\.|Only an attorney[^.]*\.|Reviews are recorded[^.]*\.|This invitation (?:is no longer valid|has expired)\.|You cannot accept your own invitation\.|Please sign in to accept this invitation\.|Waiting for the other member[^.]*|This conversation is closed|Daily connection request limit reached)/.exec(e);
  return known ? known[1].replace(/^part of/, "This is part of") : fallback;
}
