/**
 * The Personal Discovery Portfolio: a living, cross-category picture assembled
 * from the member's own discoveries. Free members get this rule-based version
 * (no AI); paid members may ask Journey to write a personalized one on request.
 *
 * Every line is labeled: "shared" (the member's own words or choices) or
 * "reflection" (an interpretation). Nothing is invented, nothing is a label,
 * and nothing here is ever used for matchmaking.
 */
import { assembleAnalysis, lessonDone, pickedChoice, type Answers, type Curriculum } from "./curricula/core.ts";
import { IDENTITY_SELF_LOVE } from "./curricula/identity-self-love.ts";
import { EMOTIONAL_INTELLIGENCE } from "./curricula/emotional-intelligence.ts";
import { LOVE_LANGUAGES, isLanguage } from "./love-languages.ts";
import { DISCOVERY_CATEGORIES } from "./journey-discovery.ts";

export type Line = { kind: "shared" | "reflection"; text: string; source?: string };
export type PortfolioSection = { key: string; title: string; subtitle: string; lines: Line[] };
export type CategoryStatus = "completed" | "in_progress" | "skipped" | "not_started";

export const PORTFOLIO_SECTIONS = [
  { key: "identity", title: "Your Personal Identity", subtitle: "Who you are beyond your roles and responsibilities." },
  { key: "emotional", title: "Your Emotional Blueprint", subtitle: "What helps you feel loved, secure and understood." },
  { key: "patterns", title: "Your Behavioral Patterns", subtitle: "Recurring themes across your personal discoveries." },
  { key: "values", title: "Your Values & Boundaries", subtitle: "What matters to you and what you are unwilling to compromise." },
  { key: "relationships", title: "Your Relationship Alignment", subtitle: "How your needs, expectations and communication preferences connect." },
  { key: "growth", title: "Your Growth Opportunities", subtitle: "Areas you may choose to explore and develop." },
  { key: "action", title: "Your Personalized Action Plan", subtitle: "Practical next steps aligned with your individual goals." },
  { key: "manifestations", title: "Your Personal Manifestations", subtitle: "Affirmations inspired by your discoveries and aspirations." },
] as const;

export type PortfolioInput = {
  answers: Answers;
  love: { receive_rank: string[]; express_rank: string[]; feel_connected: string | null } | null;
  boundariesWritten: number;
  journeySummaries: Record<string, string>; // category key -> latest Journey summary date (ISO)
  activeSessions: string[];
  skipped: string[];
};

const said = (a: Answers, k: string) => a[k]?.answer?.trim() || "";
const clip = (t: string, n = 180) => (t.length > n ? t.slice(0, t.lastIndexOf(" ", n)) + "…" : t);
const quote = (lead: string, t: string): Line => ({ kind: "shared", text: `${lead} “${clip(t)}”` });

/** Category status across free and Journey experiences. */
export function categoryStatuses(p: PortfolioInput): Record<string, CategoryStatus> {
  const curriculum = (c: Curriculum): CategoryStatus | null =>
    c.lessons.every((l) => lessonDone(c, l, p.answers)) ? "completed" : assembleAnalysis(c, p.answers) ? "in_progress" : null;
  const free: Record<string, CategoryStatus | null> = {
    "love-languages": p.love?.receive_rank?.length ? "completed" : null,
    "emotional-intelligence": curriculum(EMOTIONAL_INTELLIGENCE),
    "personal-development": curriculum(IDENTITY_SELF_LOVE) ?? (said(p.answers, "beyond_titles") ? "in_progress" : null),
    boundaries: p.boundariesWritten >= 4 ? "completed" : p.boundariesWritten > 0 ? "in_progress" : null,
    communication: lessonDone(IDENTITY_SELF_LOVE, IDENTITY_SELF_LOVE.lessons[5], p.answers) ? "completed" : IDENTITY_SELF_LOVE.lessons[5].questions.some((q) => pickedChoice(IDENTITY_SELF_LOVE, q, p.answers)) ? "in_progress" : null,
  };
  return Object.fromEntries(DISCOVERY_CATEGORIES.map((c) => {
    const s: CategoryStatus = p.journeySummaries[c.key] || free[c.key] === "completed" ? "completed"
      : p.activeSessions.includes(c.key) || free[c.key] === "in_progress" ? "in_progress"
      : p.skipped.includes(c.key) ? "skipped" : "not_started";
    return [c.key, s];
  }));
}

const readings = (c: Curriculum, a: Answers, kinds: string[]) =>
  c.lessons.flatMap((l) => l.questions.flatMap((q) => { const ch = pickedChoice(c, q, a); return ch && kinds.includes(ch.reading.kind) ? [ch.reading.text] : []; }));

/** The rule-based portfolio (free; no AI). Sections with nothing to say are returned empty, never filled with invention. */
export function assemblePortfolio(p: PortfolioInput): PortfolioSection[] {
  const a = p.answers;
  const L: Record<string, Line[]> = Object.fromEntries(PORTFOLIO_SECTIONS.map((s) => [s.key, []]));
  const reflect = (key: string, texts: string[], n = 3) => { for (const t of texts.slice(0, n)) L[key].push({ kind: "reflection", text: t }); };

  // Identity
  if (said(a, "beyond_titles")) L.identity.push(quote("Beyond your roles, you describe yourself as", said(a, "beyond_titles")));
  if (said(a, "true_self")) L.identity.push(quote("You feel most like yourself:", said(a, "true_self")));
  if (said(a, "others_see")) L.identity.push(quote("Those who know you best appreciate", said(a, "others_see")));
  if (said(a, "strengths")) L.identity.push(quote("Strengths you recognize in yourself:", said(a, "strengths")));
  reflect("identity", readings(IDENTITY_SELF_LOVE, a, ["strength"]), 2);

  // Emotional blueprint
  const rcv = (p.love?.receive_rank ?? []).filter(isLanguage);
  if (rcv.length) L.emotional.push({ kind: "shared", text: `You feel most loved through ${LOVE_LANGUAGES[rcv[0]].name.toLowerCase()}${rcv[1] ? ` and ${LOVE_LANGUAGES[rcv[1]].name.toLowerCase()}` : ""}.` });
  if (p.love?.feel_connected) L.emotional.push(quote("You feel connected when", p.love.feel_connected));
  if (said(a, "feel_valued")) L.emotional.push(quote("You feel valued, safe and respected through", said(a, "feel_valued")));
  if (said(a, "under_stress")) L.emotional.push(quote("Under stress, what you need most:", said(a, "under_stress")));
  if (said(a, "recharge")) L.emotional.push(quote("What restores you:", said(a, "recharge")));

  // Patterns
  if (said(a, "repeat_situations")) L.patterns.push(quote("A situation you notice recurring:", said(a, "repeat_situations")));
  if (said(a, "conflict_style")) L.patterns.push(quote("In disagreement, you described:", said(a, "conflict_style")));
  reflect("patterns", readings(EMOTIONAL_INTELLIGENCE, a, ["pattern"]), 4);

  // Values & boundaries
  const values = a.core_values?.choices ?? [];
  if (values.length) L.values.push({ kind: "shared", text: `The values you hold closest: ${values.join(", ")}.` });
  if (said(a, "beliefs")) L.values.push(quote("Beliefs that guide you:", said(a, "beliefs")));
  if (p.boundariesWritten) L.values.push({ kind: "shared", text: `You have written ${p.boundariesWritten} private boundary reflection${p.boundariesWritten === 1 ? "" : "s"} in Boundaries & Self-Worth.` });
  reflect("values", IDENTITY_SELF_LOVE.lessons[4].questions.flatMap((q) => { const ch = pickedChoice(IDENTITY_SELF_LOVE, q, a); return ch ? [ch.reading.text] : []; }), 2);
  const money = pickedChoice(IDENTITY_SELF_LOVE, IDENTITY_SELF_LOVE.lessons[5].questions.find((q) => q.key === "l6_money")!, a);
  if (money) L.values.push({ kind: "reflection", text: `Financial mindset: ${money.reading.text}` });

  // Relationships
  const exp = (p.love?.express_rank ?? []).filter(isLanguage);
  if (exp.length) L.relationships.push({ kind: "shared", text: `You naturally show love through ${LOVE_LANGUAGES[exp[0]].name.toLowerCase()}.` });
  if (said(a, "intentional_connections")) L.relationships.push(quote("You want to welcome", said(a, "intentional_connections")));
  reflect("relationships", [...readings(IDENTITY_SELF_LOVE, a, ["strength"]).filter((t) => /listen|communicat|express/i.test(t)), ...readings(EMOTIONAL_INTELLIGENCE, a, ["strength"]).filter((t) => /listen|empathy|perspective|apolog/i.test(t))], 3);

  // Growth
  if (said(a, "growth_areas")) L.growth.push(quote("Where you would love to grow:", said(a, "growth_areas")));
  reflect("growth", [...readings(IDENTITY_SELF_LOVE, a, ["develop"]), ...readings(EMOTIONAL_INTELLIGENCE, a, ["develop"])], 4);
  reflect("growth", readings(EMOTIONAL_INTELLIGENCE, a, ["growth"]).map((t) => `Growth you described: ${t}`), 2);

  // Action plan
  if (said(a, "first_step")) L.action.push(quote("Your intentional step:", said(a, "first_step")));
  for (const c of [IDENTITY_SELF_LOVE, EMOTIONAL_INTELLIGENCE]) {
    const fwd = assembleAnalysis(c, a)?.find((b) => b.title === "Moving Forward")?.paras ?? [];
    reflect("action", fwd.filter((t) => !c.analysis.some((s) => s.empty === t)), 2);
  }

  // Manifestations: gentle affirmations built only from what the member shared
  for (const v of values.slice(0, 3)) L.manifestations.push({ kind: "reflection", text: `I honor ${v.toLowerCase()} in the choices I make today.` });
  if (rcv.length) L.manifestations.push({ kind: "reflection", text: `I deserve to receive love in the way I most feel it, and I can ask for it with grace.` });
  if (said(a, "aspirations")) L.manifestations.push({ kind: "reflection", text: `I move with intention toward ${clip(said(a, "aspirations"), 90).replace(/[.…]$/, "")}.` });

  return PORTFOLIO_SECTIONS.map((s) => ({ ...s, lines: L[s.key] }));
}

/** What Journey receives when a paid member asks it to write their portfolio: only the member's own data, labeled. */
export function portfolioContext(sections: PortfolioSection[], statuses: Record<string, CategoryStatus>, summaries: { category: string; content: string }[], maxChars = 9000) {
  let t = "# The member's Personal Discovery data (private; use only this, never invent)\n";
  t += `Category status: ${Object.entries(statuses).map(([k, v]) => `${k}=${v}`).join(", ")}\n`;
  for (const s of sections) if (s.lines.length) t += `\n## ${s.title}\n${s.lines.map((l) => `- (${l.kind === "shared" ? "member shared" : "reflection"}) ${l.text}`).join("\n")}\n`;
  for (const s of summaries) {
    const block = `\n## Journey discovery summary: ${s.category}\n${s.content.slice(0, 1500)}\n`;
    if ((t + block).length > maxChars) break;
    t += block;
  }
  return t.slice(0, maxChars);
}

export const PORTFOLIO_REQUEST = "Please create my Personal Discovery Portfolio.";
export const portfolioInstructions = (context: string) => [
  "# Personal Discovery Portfolio",
  `Write the member's portfolio using exactly these headings, in order: ${PORTFOLIO_SECTIONS.map((s) => s.title).join("; ")}.`,
  "Connect meaningful themes across categories only where the member's data supports them. Never invent information, assume trauma, or present unsupported causal conclusions. Mention childhood and family influences only if the member disclosed them.",
  "Begin sentences about the member's own words with \"You shared\"; everything else is your reflection. Note which categories are incomplete or skipped, without pressure.",
  "Under Your Personal Manifestations, offer 2-3 optional affirmations grounded in their values and aspirations, respecting spiritual, religious and nonreligious perspectives.",
  "Keep the whole portfolio under 450 words. This is educational and reflective, never a clinical assessment or a permanent label.",
  context,
].join("\n");
