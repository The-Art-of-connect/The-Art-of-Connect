/**
 * Universal Journey integration: any lesson, questionnaire or reflection can be completed
 * conversationally with Journey instead of by hand.
 *
 * One shape (GuideModule) describes every module on the platform, so Journey always knows
 * where the member is, what the lesson is for, what they've already answered and what's
 * left. Journey never saves anything by itself: at the end it drafts the member's answers
 * in their own words, the member reviews and corrects them, and only then are they saved,
 * exactly as if they'd typed them into the written form.
 */
import type { Curriculum, Lesson } from "./curricula/core.ts";
import { choiceKey, reflectionKey } from "./curricula/core.ts";

export type GuideOption = { id: string; label: string };
export type GuideQuestion = {
  key: string; prompt: string; hint?: string;
  /** text: their own words · choice: one option · multi: up to `max` options · rank: an ordering of every option */
  kind: "text" | "choice" | "multi" | "rank";
  options?: GuideOption[]; max?: number;
};
export type GuideModule = {
  ref: string; title: string;
  /** Where the member is, e.g. "The Art of Knowing Yourself · Who Am I? · Know Yourself". */
  place: string;
  objectives: string[];
  questions: GuideQuestion[];
  /** The page this module lives on (for "back to the lesson"). */
  href: string;
};
export type GuideAnswers = Record<string, string | string[]>;

/** Who is looking at a module, decided on the server. Free members always get the standardized, non-AI experience. */
export type GuideAccess =
  | { kind: "paid"; credits: number; available: boolean; reason?: string }
  | { kind: "owner"; available: boolean; reason?: string }
  | { kind: "free" };

export const GUIDE_REF = /^[a-z0-9-]{2,60}(\/[a-z0-9-]{2,60})?$/;
const TEXT_MAX = 4000;

/** Builds a guide module from a founder curriculum lesson (multiple-choice questions plus the lesson reflection). */
export function guideFromLesson(c: Curriculum, l: Lesson, href: string): GuideModule {
  return {
    ref: `${c.section}/${l.slug}`, title: l.title, place: `The Art of Knowing Yourself · ${c.title}`, href,
    objectives: [...l.focus, ...(l.principles ?? [])].slice(0, 12),
    questions: [
      ...l.questions.map((q) => ({ key: choiceKey(c, q.key), prompt: q.prompt, kind: "choice" as const, options: q.choices.map((ch) => ({ id: ch.key, label: ch.label })) })),
      { key: reflectionKey(c, l.slug), prompt: l.reflection, kind: "text" as const },
    ],
  };
}

const describe = (q: GuideQuestion) => {
  if (!q.options?.length) return "";
  const opts = q.options.map((o) => o.label).join(" | ");
  if (q.kind === "rank") return ` (they may put these in order, most to least meaningful: ${opts})`;
  if (q.kind === "multi") return ` (they may choose up to ${q.max ?? 5}: ${opts})`;
  return ` (possible answers you may offer naturally if helpful, though the member can answer in their own words: ${opts})`;
};
const show = (q: GuideQuestion, v: string | string[]) => {
  const ids = Array.isArray(v) ? v : [v];
  if (!q.options?.length) return ids.join(", ");
  return ids.map((id) => q.options!.find((o) => o.id === id)?.label ?? id).join(q.kind === "rank" ? " > " : ", ");
};

/** What Journey is told when a member chooses to complete a module conversationally. */
export function guideInstructions(m: GuideModule, answered: GuideAnswers, spoken = false, assist = false): string {
  if (assist) return assistInstructions(m, answered);
  const done = m.questions.filter((q) => answered[q.key] !== undefined && String(answered[q.key]).trim() !== "");
  const open = m.questions.filter((q) => !done.includes(q));
  return [
    `# Guided module: ${m.title}`,
    `The member is in: ${m.place}. They chose to complete this module ${spoken ? "by talking with you" : "in conversation with you"} instead of filling in the written questions, so you are guiding the whole module.`,
    m.objectives.length ? `Educational objectives:\n${m.objectives.map((o) => `- ${o}`).join("\n")}` : "",
    open.length
      ? `Questions still to explore, in this order. Ask ONE at a time, in your own warm words, never as a quiz. Listen, reflect back what you heard, and ask a gentle follow-up when it would deepen their understanding before moving on:\n${open.map((q, i) => `${i + 1}. ${q.prompt}${q.hint ? ` (${q.hint})` : ""}${describe(q)}`).join("\n")}`
      : "The member has already answered every question in this module. Help them go deeper, notice patterns, or revisit any answer they'd like to change.",
    done.length ? `Already answered by the member (don't ask again; you may build on these):\n${done.map((q) => `- ${q.prompt} → ${show(q, answered[q.key]).slice(0, 400)}`).join("\n")}` : "",
    `When the questions have been explored, briefly summarize what you heard and tell the member they can ${spoken ? "end the conversation and choose \"Review and save my answers\"" : "choose \"Review and save my answers\""} to see what you documented, correct anything, and save it to their private discoveries. You never save anything yourself, and you never claim that something has been saved.`,
    "This is personal reflection, never a diagnosis, label, score or verdict on their worth or their relationships. The member may skip any question.",
  ].filter(Boolean).join("\n\n");
}

/** The single request that turns the conversation into documented answers (the member reviews them before anything is saved). */
export function guideDraftRequest(m: GuideModule, transcript?: string): string {
  const spec = m.questions.map((q) => {
    const ids = q.options?.length ? ` options: ${q.options.map((o) => `${o.id}="${o.label}"`).join(", ")}` : "";
    const shape = q.kind === "text" ? "a string" : q.kind === "choice" ? "one option id" : q.kind === "multi" ? `an array of up to ${q.max ?? 5} option ids` : "an array of every option id, most to least meaningful";
    return `- "${q.key}" (${shape}): ${q.prompt}${ids}`;
  }).join("\n");
  return [
    transcript ? `Here is the transcript of my spoken conversation with you about "${m.title}":\n"""\n${transcript.slice(-24000)}\n"""` : `Please document my answers from our conversation about "${m.title}".`,
    "Using ONLY what I actually said (never invent, assume or add anything), write my answers to the questions below.",
    "For text answers, use my own words and voice in the first person, concise and faithful (at most 600 characters). For option questions, choose the option that genuinely matches what I said; leave the question out if it's unclear. Leave out any question I didn't answer.",
    `Questions:\n${spec}`,
    `Reply with ONLY a JSON object, no other words: {"answers": {"<key>": <answer>, ...}}`,
  ].join("\n\n");
}

/** Reads Journey's drafted answers, keeping only known questions and valid options. Never throws. */
export function parseGuideDraft(m: GuideModule, reply: string): GuideAnswers {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  let raw: unknown;
  try { raw = JSON.parse(reply.slice(start, end + 1)); } catch { return {}; }
  const answers = (raw && typeof raw === "object" && "answers" in raw ? (raw as { answers: unknown }).answers : raw) as Record<string, unknown> | null;
  if (!answers || typeof answers !== "object") return {};
  return cleanGuideAnswers(m, answers);
}

/** Validates answers from Journey's draft or the member's review form against the module definition. */
export function cleanGuideAnswers(m: GuideModule, input: Record<string, unknown>): GuideAnswers {
  const out: GuideAnswers = {};
  for (const q of m.questions) {
    const v = input[q.key];
    if (v === undefined || v === null) continue;
    const ids = new Set((q.options ?? []).map((o) => o.id));
    if (q.kind === "text") {
      const t = String(v).trim().slice(0, TEXT_MAX);
      if (t) out[q.key] = t;
    } else if (q.kind === "choice") {
      const t = String(Array.isArray(v) ? v[0] : v);
      if (ids.has(t)) out[q.key] = t;
    } else {
      const list = [...new Set((Array.isArray(v) ? v : [v]).map(String).filter((x) => ids.has(x)))];
      const kept = q.kind === "multi" ? list.slice(0, q.max ?? 5) : list;
      if (kept.length) out[q.key] = kept;
    }
  }
  return out;
}

/** Contextual help from the persistent Journey button: Journey knows the module, but follows the member's lead. */
function assistInstructions(m: GuideModule, answered: GuideAnswers): string {
  const done = m.questions.filter((q) => answered[q.key] !== undefined && String(answered[q.key]).trim() !== "");
  const open = m.questions.filter((q) => !done.includes(q));
  return [
    `# Where the member is: ${m.title} (${m.place})`,
    "The member opened Journey from this page for help. Answer what they ask, in the context of this module. If it would help, offer (don't insist) to guide them through the questions they haven't answered yet.",
    m.objectives.length ? `Educational objectives: ${m.objectives.join(" ")}` : "",
    `Progress: ${done.length} of ${m.questions.length} questions answered.${open.length ? ` Still open: ${open.map((q) => q.prompt).join(" | ")}` : ""}`,
    done.length ? `Their answers so far (private; use only to help them):\n${done.map((q) => `- ${q.prompt} → ${show(q, answered[q.key]).slice(0, 300)}`).join("\n")}` : "",
    "If they want their answers saved, tell them to use \"Chat With Journey\" on the page, where they can review and save what you document. You never save anything yourself.",
  ].filter(Boolean).join("\n\n");
}

/** The guided module a page belongs to, if any (used by the persistent Journey button). */
export function guideRefForPath(path: string): string | null {
  let m = path.match(/^\/app\/know-yourself\/who-am-i\/([a-z0-9-]{2,60})\/?$/);
  if (m) return `who-am-i/${m[1]}`;
  if (/^\/app\/know-yourself\/love-languages\/?$/.test(path)) return "love-languages";
  if (/^\/app\/know-yourself\/emotional-intelligence\/?$/.test(path)) return "ei/profile";
  m = path.match(/^\/emotional-intelligence\/([a-z-]{2,40})\/?$/);
  if (m) return `ei/${m[1]}`;
  return null;
}

/** Plain descriptions of where a member is (never page data). Longest matching prefix wins. */
const PAGE_CONTEXT: [string, string][] = [
  ["/app/know-yourself/identity-self-love", "The Art of Knowing Yourself · Identity & Self-Love founding curriculum"],
  ["/app/know-yourself/emotional-intelligence", "The Art of Knowing Yourself · Emotional Intelligence"],
  ["/app/know-yourself/boundaries", "The Art of Knowing Yourself · Boundaries & non-negotiables"],
  ["/app/know-yourself/portfolio", "The Art of Knowing Yourself · their Personal Discovery Portfolio"],
  ["/app/know-yourself/growth", "The Art of Knowing Yourself · their growth goals and history"],
  ["/app/know-yourself", "The Art of Knowing Yourself (self-discovery for every member)"],
  ["/emotional-intelligence", "The Art of Emotional Intelligence"],
  ["/app/business", "The Professional Society (business networking and growth)"],
  ["/app/relationships", "The Personal Society (dating and relationships)"],
  ["/app/counseling", "The Art of Becoming (personal growth and support)"],
  ["/app/wellness", "the Counseling & Wellness Center (Journey offers nonclinical support only)"],
  ["/app/journey", "Journey's own pages"],
  ["/app/membership", "their membership and account settings"],
  ["/app", "their member dashboard"],
];
export function pageContext(path: string): string | null {
  if (!/^\/[a-z0-9/-]{0,120}$/.test(path)) return null;
  const hit = PAGE_CONTEXT.filter(([p]) => path === p || path.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : null;
}
