/**
 * The shared engine behind every founder-written curriculum in The Art of Self.
 * Members answer interactive questions; each answer carries a prewritten
 * explanation and a prewritten interpretation that feeds the final written
 * analysis. Never scores, percentages, rankings or labels.
 */

export type ReadingKind = "strength" | "pattern" | "growth" | "develop";
export type Reading = { kind: ReadingKind; text: string };
export type Choice = { key: string; label: string; guidance: string; reading: Reading };
export type CurriculumQuestion = { key: string; prompt: string; choices: Choice[] };
export type Example = { who: string; text: string };
export type Lesson = {
  slug: string; title: string; focus: string[];
  principles?: string[]; principlesTitle?: string;
  questions: CurriculumQuestion[]; understanding: string[]; examples: Example[];
  exercise?: string; reflection: string; forward: string; journeyPrompt: string;
};
export type AnalysisKey = "discovered" | ReadingKind | "forward";
export type AnalysisSection = { key: AnalysisKey; title: string; empty: string };
export type Foundation = { title: string; text: string; href?: string };
export type Curriculum = {
  section: string; keyPrefix: string; banner: string; title: string; tagline: string;
  purpose: string[]; philosophy: string; closing: string; journeyInstructions: string;
  foundations?: Foundation[]; foundationsTitle?: string;
  lessons: Lesson[];
  scenarios?: Example[]; scenariosTitle?: string; exercises?: string[];
  analysisTitle: string; analysis: AnalysisSection[];
};
export type Answers = Record<string, { answer: string | null; choices: string[] | null }>;
export type AnalysisBlock = { title: string; paras: string[] };

export const choiceKey = (c: Curriculum, q: string) => `${c.keyPrefix}${q}`.slice(0, 60);
export const reflectionKey = (c: Curriculum, slug: string) => `${c.keyPrefix}${slug.replace(/-/g, "_")}`.slice(0, 60);
export const analysisStoreKey = (c: Curriculum) => `analysis_${c.section.replace(/-/g, "_")}`.slice(0, 60);
export const curriculumKeys = (c: Curriculum) => c.lessons.flatMap((l) => [...l.questions.map((q) => choiceKey(c, q.key)), reflectionKey(c, l.slug)]);
export const pickedChoice = (c: Curriculum, q: CurriculumQuestion, a: Answers) => q.choices.find((x) => x.key === a[choiceKey(c, q.key)]?.choices?.[0]) ?? null;
export const lessonDone = (c: Curriculum, l: Lesson, a: Answers) => l.questions.every((q) => pickedChoice(c, q, a));

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, t.lastIndexOf(" ", n)) + "…" : t);
const andList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0]);

/** The self-guided analysis: assembled only from prewritten interpretations of the member's chosen answers. */
export function assembleAnalysis(c: Curriculum, a: Answers): AnalysisBlock[] | null {
  const out: Record<AnalysisKey, string[]> = { discovered: [], strength: [], pattern: [], growth: [], develop: [], forward: [] };
  for (const l of c.lessons) {
    const picked = l.questions.flatMap((q) => { const ch = pickedChoice(c, q, a); return ch ? [ch] : []; });
    const own = a[reflectionKey(c, l.slug)]?.answer?.trim();
    if (!picked.length && !own) continue;
    if (picked.length) out.discovered.push(`Reflecting on “${l.title}”, you answered ${andList(picked.map((p) => `“${p.label}”`))}.`);
    if (own) out.discovered.push(`In your own words: “${clip(own, 220)}”`);
    for (const p of picked) out[p.reading.kind].push(p.reading.text);
    if (picked.some((p) => p.reading.kind === "develop" || p.reading.kind === "pattern")) out.forward.push(l.forward);
  }
  if (!out.discovered.length) return null;
  return c.analysis.map((s) => ({ title: s.title, paras: out[s.key].length ? out[s.key].slice(0, 7) : [s.empty] }));
}

/** Splits a Journey-written analysis back into the curriculum's own headings (null if they're missing). */
export function parseSections(reply: string, titles: string[]): AnalysisBlock[] | null {
  const norm = (t: string) => t.toLowerCase().replace(/[’']/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const cores = titles.map((t) => norm(t).replace(/^(your|what you) /, ""));
  const blocks = titles.map((title) => ({ title, paras: [] as string[] }));
  let cur = -1;
  for (const raw of reply.split(/\n+/)) {
    const line = raw.replace(/^[#*\s>-]+|[*#\s:]+$/g, "").trim();
    if (!line) continue;
    const n = norm(line);
    const h = cores.findIndex((core) => n.includes(core) && n.length <= core.length + 16);
    if (h >= 0) { cur = h; continue; }
    if (cur >= 0) blocks[cur].paras.push(line);
  }
  return blocks.every((b) => b.paras.length) ? blocks : null;
}

/** What a member's answers look like when they ask Journey for a personal analysis (their own answers only). */
export function journeyAnalysisRequest(c: Curriculum, a: Answers, maxChars: number) {
  let body = "";
  for (const l of c.lessons) {
    const lines = l.questions.flatMap((q) => { const ch = pickedChoice(c, q, a); return ch ? [`- ${q.prompt} ${ch.label}`] : []; });
    const own = a[reflectionKey(c, l.slug)]?.answer;
    if (lines.length || own) body += `\n${l.title}\n${lines.join("\n")}${own ? `\n- My reflection: ${own.slice(0, 400)}` : ""}\n`;
  }
  if (!body) return null;
  const head = `Personal analysis: ${c.title}. Based on my answers below, please write my personal analysis with exactly these headings, in this order: ${c.analysis.map((s) => s.title).join("; ")}. Speak warmly to me as "you". Only acknowledge growth I have actually described. No scores, labels or diagnoses.\n`;
  return (head + body).slice(0, maxChars);
}
