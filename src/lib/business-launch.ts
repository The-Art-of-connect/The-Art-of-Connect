/**
 * Business Launch Center (founder directive 31): education that is the same in every state. State-specific figures live in
 * public.formation_jurisdictions and are shown only after the owner approves each entry.
 */
export const IRS_EIN_URL = "https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number";
export const IRS_S_CORP_URL = "https://www.irs.gov/businesses/small-businesses-self-employed/s-corporations";
export const IRS_ENTITY_URL = "https://www.irs.gov/businesses/small-businesses-self-employed/business-structures";
export const SBA_STRUCTURE_URL = "https://www.sba.gov/business-guide/launch-your-business/choose-business-structure";
export const SBA_LICENSES_URL = "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits";

export const STRUCTURES = [
  { key: "sole_proprietorship", name: "Sole proprietorship", line: "You and the business are the same for legal purposes.", points: ["Simplest to start; often no state filing (a trade name may be required).", "No separation between personal and business liability.", "Business income is reported on your personal return."] },
  { key: "llc", name: "Limited liability company (LLC)", line: "A state-registered company that can separate business obligations from your personal assets.", points: ["Formed by filing with your state, usually called Articles of Organization or a Certificate of Formation.", "Flexible management by its members or managers, set out in an operating agreement.", "Taxed by default as a sole proprietorship (one owner) or partnership (two or more), unless it elects otherwise."] },
  { key: "corporation", name: "Corporation", line: "A separate legal entity owned by shareholders, with directors and officers.", points: ["Formed by filing Articles or a Certificate of Incorporation.", "More formalities: bylaws, board meetings, minutes and annual reports.", "Taxed as a C corporation by default; may elect S corporation status if eligible."] },
  { key: "nonprofit", name: "Nonprofit corporation", line: "A corporation organized for a charitable, educational or other public purpose.", points: ["Formed under your state's nonprofit law.", "State formation does not by itself make it tax-exempt.", "Federal tax exemption is a separate application to the IRS (for example Form 1023 or 1023-EZ)."] },
] as const;

export const TAX_ELECTIONS = [
  { name: "Legal structure is not the same as a tax election", body: "Your state creates the legal entity (an LLC or a corporation). The IRS decides how it is taxed. The two are separate decisions, made with separate filings." },
  { name: "S corporation election", body: "An eligible LLC or corporation can elect to be taxed as an S corporation by filing IRS Form 2553. It doesn't change the legal entity. Eligibility rules apply (for example limits on the number and type of shareholders, and one class of stock), as do deadlines." },
  { name: "C corporation election for an LLC", body: "An LLC can elect to be taxed as a corporation with IRS Form 8832. Many owners discuss this with a tax professional first." },
  { name: "Ask a qualified professional", body: "The right structure and tax election depend on your situation. This center is educational and is not legal or tax advice; consider speaking with an attorney or CPA." },
] as const;

export const STEPS = [
  { key: "structure", title: "Choose your structure", body: "Decide between a sole proprietorship, LLC, corporation or nonprofit." },
  { key: "name", title: "Check your business name", body: "Search your state's official business registry to see if the name is available." },
  { key: "agent", title: "Name a registered agent", body: "Most states require an in-state agent with a street address to receive legal papers. You may serve yourself in many states, or use a commercial service." },
  { key: "file", title: "File your formation document", body: "File with the state office shown below and pay the state's filing fee." },
  { key: "ein", title: "Get your free EIN", body: "Apply directly with the IRS. The IRS doesn't charge for an EIN." },
  { key: "licenses", title: "Licenses, permits and state tax registration", body: "Check state, county and city requirements, and register with your state revenue department if you'll collect sales tax or have employees." },
  { key: "agreement", title: "Prepare your internal documents", body: "An operating agreement (LLC) or bylaws (corporation)." },
  { key: "compliance", title: "Stay in good standing", body: "File annual or biennial reports and pay any state taxes on time. Set a reminder below." },
] as const;

export type EntityFacts = { document?: string | null; filing_fee_usd?: number | null; fee_notes?: string | null; annual_report?: { name?: string | null; fee_usd?: number | null; frequency?: string | null; due?: string | null } | null; tax_notes?: string | null };
export const money = (n: number | null | undefined) => (typeof n === "number" ? (n === 0 ? "No fee" : `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0 })}`) : null);
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
