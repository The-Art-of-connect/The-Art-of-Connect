/**
 * Journey Knowledge & Training Library: pure helpers shared by the Owner Portal
 * and the Journey server. Only APPROVED entries are ever given to Journey, and
 * they teach principles and tone, never scripts to repeat word for word.
 */

export type TrainingEntry = {
  id?: string; category: string; topic: string; scenario: string;
  founder_principles: string[]; interpretation: string; approach: string;
  example_response: string; follow_ups: string[]; safety: string;
  founder_question?: string | null;
};
export type TrainingCategory = { key: string; title: string; description: string; founder_decisions: string[]; learning_objectives?: string[]; response_standards?: string[] };

export const TRAINING_CATEGORY_KEYS = [
  "love-languages", "childhood", "emotional-intelligence", "dating", "marriage", "communication",
  "boundaries", "divorce", "consciousness", "manifestations", "personal-development",
  "conflict-resolution", "financial-mindset", "business-leadership",
] as const;

/** Words that point a member's message toward a category. */
const CATEGORY_WORDS: Record<string, string[]> = {
  "love-languages": ["love language", "affirmation", "quality time", "acts of service", "gift", "touch", "feel loved", "appreciated"],
  childhood: ["child", "childhood", "parent", "mother", "father", "mom", "dad", "grew up", "raised", "family"],
  "emotional-intelligence": ["trigger", "react", "angry", "anger", "upset", "emotion", "feel", "regulate", "empathy", "calm"],
  dating: ["date", "dating", "match", "single", "attracted", "first date", "texting", "ghost"],
  marriage: ["marriage", "married", "husband", "wife", "spouse", "partner", "anniversary"],
  communication: ["talk", "conversation", "argue", "argument", "tone", "listen", "said", "told", "communicat", "message"],
  boundaries: ["boundar", "say no", "saying no", "respect", "disrespect", "limit", "guilt", "obligat", "people pleas"],
  divorce: ["divorce", "separat", "ex-", "ex ", "former", "co-parent", "custody", "breakup", "break up"],
  consciousness: ["conscious", "aware", "awareness", "level", "pattern", "life happens", "spiritual"],
  manifestations: ["manifest", "affirmation", "intention", "gratitude", "vision", "universe", "attract"],
  "conflict-resolution": ["conflict", "fight", "argument", "disagree", "apolog", "resolve", "repair", "blame"],
  "financial-mindset": ["money", "finance", "spend", "save", "debt", "budget", "income", "afford", "pay"],
  "business-leadership": ["business", "leader", "team", "employee", "client", "career", "boss", "manager", "company"],
  "personal-development": ["purpose", "identity", "self-love", "self love", "confidence", "grow", "goal", "who am i", "worth"],
};

/** Curriculum sections and Journey experiences that imply a category. */
const LESSON_CATEGORY: Record<string, string> = { "identity-self-love": "personal-development", "emotional-intelligence": "emotional-intelligence" };

const words = (t: string) => t.toLowerCase();

/** Chooses the few approved entries most relevant to this message (never more than `max`). */
export function selectTraining(entries: TrainingEntry[], message: string, opts: { lesson?: string | null; mode?: string; max?: number } = {}) {
  const msg = words(message);
  const lessonCat = opts.lesson ? LESSON_CATEGORY[opts.lesson.split("/")[0]] : undefined;
  const scored = entries.map((e) => {
    let score = 0;
    for (const w of CATEGORY_WORDS[e.category] ?? []) if (msg.includes(w)) score += 2;
    for (const w of words(`${e.topic} ${e.scenario}`).match(/[a-z]{5,}/g) ?? []) if (msg.includes(w)) score += 1;
    if (lessonCat && e.category === lessonCat) score += 3;
    if (opts.mode === "love" && ["dating", "marriage", "love-languages", "divorce"].includes(e.category)) score += 1;
    return { e, score };
  }).filter((x) => x.score >= 3).sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: TrainingEntry[] = [];
  for (const { e } of scored) {
    if (out.length >= (opts.max ?? 3)) break;
    if (seen.has(e.topic)) continue;
    seen.add(e.topic); out.push(e);
  }
  return out;
}

/** The block added to Journey's instructions: principles and tone to apply, never to copy. */
export function formatTraining(entries: TrainingEntry[], decisions: { title: string; decisions: string[] }[] = [], maxChars = 6000) {
  let text = "";
  const dec = decisions.filter((d) => d.decisions.length);
  if (dec.length) text += `# Founder decisions (authoritative)\n${dec.map((d) => `${d.title}:\n${d.decisions.map((x) => `- ${x}`).join("\n")}`).join("\n")}\n\n`;
  if (!entries.length) return text.trim();
  text += "# Founder-reviewed training examples\nApply these principles and this tone to the member's own circumstances. Never copy an example word for word, and never assume this member's situation matches the example.\n";
  for (const e of entries) {
    const block = `\n## ${e.topic}\nPrinciples: ${e.founder_principles.join(" ")}\nApproach: ${e.approach}\nExample of the tone: ${e.example_response}\nHelpful follow-up questions: ${e.follow_ups.join(" | ")}\nSafety: ${e.safety}\n`;
    if ((text + block).length > maxChars) break;
    text += block;
  }
  return text.trim();
}

/** The request for new draft entries in one category, grounded in founder-approved principles. */
export function draftRequest(category: TrainingCategory, principles: string[], existingTopics: string[], hint: string, count = 2) {
  return [
    `Owner training task (not a member conversation). Draft ${count} NEW training entries for Journey's Knowledge & Training Library in the category "${category.title}" (${category.description}).`,
    hint ? `Focus: ${hint}` : "",
    `Use ONLY these founder-approved principles as the foundation, quoting them verbatim in "founder_principles":\n${principles.map((p) => `- ${p}`).join("\n")}`,
    category.founder_decisions.length ? `Founder decisions for this category (follow them):\n${category.founder_decisions.map((p) => `- ${p}`).join("\n")}` : "",
    `Avoid these existing topics: ${existingTopics.join("; ") || "none"}.`,
    `If a scenario would require a genuinely new philosophical decision the principles don't answer, put that question in "founder_question"; otherwise use null.`,
    `Reply with ONLY a JSON array, no other text. Each item: {"topic": string, "scenario": string, "founder_principles": string[], "interpretation": string, "approach": string, "example_response": string, "follow_ups": string[], "safety": string, "founder_question": string|null}.`,
    `Keep each example_response under 120 words, warm and invitational. Never diagnose, label, guarantee outcomes or assign blame. Include professional or emergency referral guidance in "safety" where relevant.`,
  ].filter(Boolean).join("\n\n");
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strs = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, n).map((x: string) => x.trim().slice(0, max)) : []);

/** Validates drafts returned by Journey. Anything malformed is dropped; founder quotes must be genuine. */
export function parseDrafts(reply: string, category: string, allowedPrinciples: string[]): TrainingEntry[] {
  const start = reply.indexOf("["); const end = reply.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let raw: unknown;
  try { raw = JSON.parse(reply.slice(start, end + 1)); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(allowedPrinciples.map((p) => p.trim()));
  return raw.slice(0, 5).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const e: TrainingEntry = {
      category, topic: str(o.topic, 200), scenario: str(o.scenario, 3000),
      // Only verbatim founder principles survive; anything else the model labels as "founder" is moved to interpretation.
      founder_principles: strs(o.founder_principles, 1000, 6).filter((p) => allowed.has(p)),
      interpretation: [str(o.interpretation, 2500), ...strs(o.founder_principles, 400, 6).filter((p) => !allowed.has(p))].filter(Boolean).join(" ").slice(0, 3000),
      approach: str(o.approach, 3000), example_response: str(o.example_response, 6000),
      follow_ups: strs(o.follow_ups, 300, 6), safety: str(o.safety, 2000),
      founder_question: str(o.founder_question, 1000) || null,
    };
    return e.topic.length > 1 && e.scenario.length >= 10 && e.example_response.length >= 10 ? [e] : [];
  });
}
