/**
 * Brand Terminology Registry (founder directives 37 and 41, November 28, 2026). PERMANENT REQUIREMENT.
 * "One feature. One official name. One consistent experience."
 *
 * Every approved feature, experience, division, membership and service has ONE official name, used everywhere:
 * navigation, page titles and headings, search results, Home cards, membership benefits, upgrade pop-ups, Journey text and
 * voice, emails and notifications, the Owner Portal, the Help Center, and reports and downloadable documents.
 *
 *  • `name` is the official name. Use `brandName(key)` (or copy it exactly) — never a variation.
 *  • `aliases` are everyday words search understands; search always returns the official name.
 *  • `avoid` lists incorrect variants. tests/brand.test.ts fails the build if any appears in the site's source.
 *  • Names are taken from the founder directives. Do not rename an approved name or add alternative branding without
 *    founder approval; questions for the founder are listed in PENDING_DECISIONS.
 *
 * Pure module: safe for server, client, tests and the Journey instructions.
 */
export type TermKind = "brand" | "destination" | "experience" | "society" | "division" | "feature" | "membership" | "service" | "portal";
export type BrandTerm = { key: string; name: string; kind: TermKind; aliases?: string[]; avoid?: RegExp[]; href?: string; note?: string };

export const BRAND_TERMS = [
  // The brand and the four destinations (directive 35)
  { key: "brand", name: "The Art of Connect", kind: "brand", avoid: [/\bArt of Connection\b/, /\bArtofConnect\b/] },
  { key: "home", name: "Home", kind: "destination", href: "/app" },
  { key: "connect", name: "Connect", kind: "destination", href: "/app/connections", aliases: ["people", "community", "social"] },
  { key: "journey", name: "Journey", kind: "service", href: "/app/journey", aliases: ["ai", "assistant", "concierge", "chat", "guide"], note: "The Art of Connect's personal connection concierge." },
  { key: "my-world", name: "My World", kind: "destination", href: "/app/world", aliases: ["my stuff", "saved", "my account", "dashboard"] },

  // The three foundational experiences
  { key: "in-life", name: "In Life", kind: "experience", href: "/app/life", aliases: ["personal growth", "self development", "self improvement"] },
  { key: "in-love", name: "In Love", kind: "experience", href: "/app/relationships", aliases: ["dating", "love", "relationships", "romance", "matchmaking"] },
  { key: "in-business", name: "In Business", kind: "experience", href: "/app/business", aliases: ["business", "networking", "career", "professional"] },

  // Societies
  { key: "art-of-becoming", name: "The Art of Becoming", kind: "society", href: "/app/counseling", aliases: ["becoming", "wellness", "growth"] },
  // Founder naming decision (November 28, 2026, final): "The Art of Knowing Yourself" is the official name; "The Art of Self" is retired.
  // Part of The Art of Becoming, within In Life.
  { key: "art-of-knowing-yourself", name: "The Art of Knowing Yourself", kind: "feature", href: "/app/know-yourself", aliases: ["know yourself", "who am i", "art of self", "self awareness", "lessons", "curriculum"],
    avoid: [/\bArt of Self\b(?!-)/], note: "Part of The Art of Becoming, within In Life." },
  { key: "personal-society", name: "The Personal Society", kind: "society", aliases: ["singles", "couples", "dating society"] },
  { key: "professional-society", name: "The Professional Society", kind: "society", aliases: ["business society", "professionals"] },

  // CONNECT 360 and the Global Intelligence Division
  { key: "connect360", name: "CONNECT 360", kind: "division", href: "/app/connect360", aliases: ["connect 360", "connect360", "business workspace", "business collaborators", "collaboration"],
    avoid: [/\bConnect ?360\b/, /\bCONNECT360\b/, /\bConnect-360\b/i, /\bC360\b/] },
  { key: "intelligence-office", name: "My Intelligence Office", kind: "feature", href: "/app/connect360/intelligence", aliases: ["intelligence office", "research", "research assignment", "market research", "opportunity research"],
    avoid: [/(?<!My )\bIntelligence Office\b/, /\bResearch Office\b/, /\bIntel Office\b/] },
  { key: "global-intelligence-division", name: "Global Intelligence Division", kind: "division" },
  { key: "deal-rooms", name: "Business Deal Rooms", kind: "feature", href: "/app/connect360/rooms", aliases: ["deal room", "deal rooms", "project room", "data room"], avoid: [/(?<!Business )\bDeal Rooms?\b/] },
  { key: "proposals", name: "Strategic Proposal Builder", kind: "feature", href: "/app/connect360/proposals", aliases: ["proposal", "proposals", "business proposal", "pitch"] },
  { key: "funding", name: "Capital & Funding Intelligence Center", kind: "feature", href: "/app/connect360/funding", aliases: ["funding", "capital", "financing", "loan", "lender", "proof of funds"],
    avoid: [/\bCapital (?:&|and) Funding Center\b/, /(?<!Intelligence )\bFunding Center\b/] },
  { key: "opportunity-radar", name: "Opportunity Radar", kind: "feature", aliases: ["opportunities", "radar", "alerts"] },
  { key: "application-center", name: "Application Center", kind: "feature", aliases: ["applications", "apply"] },
  { key: "capital-marketplace", name: "Capital Marketplace", kind: "feature", aliases: ["lenders", "lending marketplace"] },

  // Career and business tools
  { key: "resume-builder", name: "Professional Résumé Builder", kind: "feature", href: "/app/career/resume", aliases: ["resume", "résumé", "cv", "cover letter"], avoid: [/\bResume Builder\b/] },
  { key: "launch-center", name: "Business Launch Center", kind: "feature", href: "/app/launch", aliases: ["start a business", "llc", "formation", "ein", "incorporate", "career and business launch center"], avoid: [/\bComplimentary Career (?:&|and) Business Launch Center\b/] },
  { key: "business-board", name: "Business Connection Board", kind: "feature", href: "/app/business/board", aliases: ["board", "business board"] },
  { key: "knowledge-exchange", name: "The Knowledge Exchange", kind: "feature", aliases: ["webinars", "classes", "learning"] },

  // Personal development
  { key: "daily-sanctuary", name: "My Daily Sanctuary", kind: "feature", href: "/app/sanctuary", aliases: ["daily sanctuary", "sanctuary", "affirmations", "daily practice", "gratitude"], avoid: [/(?<!My )\bDaily Sanctuary\b/] },
  { key: "discover-possible", name: "Discover What's Possible", kind: "feature" },
  { key: "portfolio", name: "My Personal Discovery Portfolio", kind: "feature", href: "/app/know-yourself/portfolio", aliases: ["portfolio", "discovery portfolio", "personal discovery portfolio"], avoid: [/(?<!My )\bPersonal Discovery Portfolio\b/] },
  { key: "becoming-circle", name: "The Becoming Circle", kind: "feature", aliases: ["circle", "support circle", "group conversation"] },
  { key: "find-your-circle", name: "Find Your Circle", kind: "feature", href: "/app/connect/circles", aliases: ["circles", "groups", "clubs"] },

  { key: "vision-board", name: "My Vision Board", kind: "feature", href: "/app/sanctuary/vision", aliases: ["vision board", "goals board"] },
  { key: "who-am-i-becoming", name: "Who Am I Becoming?", kind: "feature", href: "/app/sanctuary/becoming", aliases: ["future self", "becoming statement"] },
  { key: "professional-readiness", name: "My Professional Readiness", kind: "feature", href: "/app/career", aliases: ["readiness", "professional profile"] },
  { key: "counseling-center", name: "Counseling & Wellness Center", kind: "service", href: "/app/wellness", aliases: ["counseling", "therapy", "counselor", "wellness"] },
  { key: "customize-journey", name: "Customize Your Journey", kind: "feature", aliases: ["journey voice", "journey avatar", "journey language"] },
  { key: "journey-live", name: "Journey Live", kind: "service", aliases: ["voice", "talk to journey", "speak with journey"] },
  { key: "private-sessions", name: "Private Sessions", kind: "service", aliases: ["private session", "coaching session"] },
  { key: "journey-library", name: "The Journey Library", kind: "feature", aliases: ["library", "articles"] },
  { key: "discovery-sessions", name: "Discovery Sessions", kind: "feature", aliases: ["discovery session", "adaptive discovery"] },
  { key: "our-calendar", name: "Our Calendar", kind: "feature", href: "/app/relationships/calendar", aliases: ["couples calendar", "date nights", "shared calendar"], avoid: [/\bJust us\b/] },
  { key: "exclusive-connection", name: "The Exclusive Connection", kind: "feature", href: "/app/relationships/exclusive", aliases: ["exclusive", "exclusivity"] },
  { key: "connect-calendar", name: "The Connect Calendar", kind: "feature", aliases: ["calendar", "events calendar"] },
  { key: "connection-feed", name: "The Connection Feed", kind: "feature", aliases: ["feed", "posts", "updates"] },
  { key: "find-people", name: "Find People Like Me", kind: "feature", aliases: ["find people", "people search", "members like me"] },

  // Memberships (the five levels; directive 20)
  { key: "level-free", name: "Complimentary", kind: "membership", aliases: ["free", "free membership"] },
  { key: "level-one", name: "One Society", kind: "membership" },
  { key: "level-complete", name: "Complete Society", kind: "membership" },
  { key: "executive-private", name: "Executive Private", kind: "membership", aliases: ["executive"] },
  { key: "executive-member", name: "Executive Member", kind: "membership", note: "An active Executive Private membership holder. Champagne-gold and charcoal shield emblem." },
  { key: "elite-concierge", name: "Elite Concierge", kind: "membership", aliases: ["elite", "concierge", "elite concierge society"], avoid: [/\bElite Concierge Society\b/] },
  { key: "elite-member", name: "Elite Member", kind: "membership", note: "An active Elite Concierge membership holder. Signature orange-gold and black crown shield emblem." },
  { key: "identity-verified", name: "Identity Verified", kind: "feature", note: "The orange checkmark: identity verification only, regardless of membership level." },

  // Owner side
  { key: "owner-portal", name: "Owner Portal", kind: "portal", href: "/admin", avoid: [/\bAdmin Portal\b/] },
  { key: "journey-intelligence-center", name: "Journey Intelligence Center", kind: "portal", href: "/admin/journey" },
] as const satisfies readonly BrandTerm[];

export type BrandKey = (typeof BRAND_TERMS)[number]["key"];
const BY_KEY = new Map<string, BrandTerm>(BRAND_TERMS.map((t) => [t.key, t]));

/** The official name. */
export const brandName = (key: BrandKey): string => BY_KEY.get(key)!.name;
export const brandTerm = (key: BrandKey): BrandTerm => BY_KEY.get(key)!;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Terms whose official name or everyday alias appears in the query (search, Journey routing). */
export function matchTerms(query: string): BrandTerm[] {
  const q = ` ${norm(query)} `;
  if (q.trim().length < 2) return [];
  return BRAND_TERMS.filter((t: BrandTerm) => [t.name, ...(t.aliases ?? [])].some((a) => { const n = norm(a); return n.length > 1 && q.includes(` ${n} `); }));
}

/** Every incorrect variant found in a piece of text (used by the naming test and the Owner Portal audit). */
export function findMisnamings(text: string): { key: string; official: string; found: string }[] {
  const out: { key: string; official: string; found: string }[] = [];
  for (const t of BRAND_TERMS as readonly BrandTerm[]) for (const re of t.avoid ?? []) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of text.matchAll(g)) out.push({ key: t.key, official: t.name, found: m[0] });
  }
  return out;
}

/** Journey's standing instruction (text and voice): always the official names. */
export function brandInstructions(): string {
  const lines = (BRAND_TERMS as readonly BrandTerm[]).filter((t) => t.kind !== "portal").map((t) => `- ${t.name}${t.aliases?.length ? ` (members may say: ${t.aliases.slice(0, 4).join(", ")})` : ""}`);
  return `# Membership guidance (directive 42)\nWhen a member asks which membership fits, explain the recommendation in plain language: what they already receive, what a membership would add, and that their current benefits stay included. Recommend the lowest membership that meets their goals; mention a higher-value option only when it genuinely fits. Point them to the comparison at /app/membership#compare for current prices. Elite Concierge is invitation-only; never offer Elite Members an upgrade. Never purchase, upgrade, downgrade or change a membership: only the member can, by confirming it themselves.\n\n# Official names\nAlways use these exact official names, spelled and capitalized as written, in text and when speaking. Understand everyday words members use, but answer with the official name. Never invent, shorten or rebrand a feature name.\n${lines.join("\n")}`;
}

/** Naming questions awaiting the founder. All resolved November 28, 2026 (directive 41). */
export const PENDING_DECISIONS: readonly string[] = [];

/** Founder-approved naming decisions (directive 41, final). Former names stay searchable; members only ever see the official name. */
export const RESOLVED_DECISIONS = [
  { official: "Business Deal Rooms", discontinued: "Deal Rooms" },
  { official: "My Daily Sanctuary", discontinued: "Daily Sanctuary" },
  { official: "My Personal Discovery Portfolio", discontinued: "Personal Discovery Portfolio" },
  { official: "Elite Concierge", discontinued: "Elite Concierge Society" },
  { official: "Business Launch Center", discontinued: "Complimentary Career & Business Launch Center" },
  { official: "The Art of Knowing Yourself", discontinued: "The Art of Self" },
] as const;
