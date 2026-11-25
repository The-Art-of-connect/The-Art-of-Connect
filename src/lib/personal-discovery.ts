/**
 * "Your Personal Discovery": the reflection a member receives at the end of a Who Am I? chapter.
 *
 * The self-guided version is composed only from the member's own words, with
 * The Art of Connect's written framing: no AI processing, and never the same
 * predetermined text for everyone. A paid member may instead ask Journey for a
 * deeper analysis (credits, explicit consent). Either way it is reflection only:
 * never a diagnosis, a permanent label or a measure of relationship suitability.
 */
import type { DiscoveryModule } from "@/lib/who-am-i";

export type ReflectionAnswer = { answer: string | null; choices: string[] | null };
export type PersonalDiscovery = { discovered: string[]; qualities: string[]; growth: string[]; forward: string[] };

export const DISCOVERY_CLOSING = "Self-discovery is not about becoming someone else. It is about understanding and embracing yourself.";
export const analysisKey = (slug: string) => `analysis_${slug.replace(/-/g, "_")}`.slice(0, 60);

/** How each answer is gently reflected back, in the member's own words. */
const LEAD: Record<string, string> = {
  beyond_titles: "Beyond every title and role, you describe yourself as",
  true_self: "You feel most like yourself in these moments:",
  others_see: "The people who know you best appreciate",
  values_in_action: "You see your values living in your life this way:",
  beliefs: "The beliefs that guide you:",
  feel_valued: "What helps you feel valued, safe and respected:",
  under_stress: "When life presses on you, what you need most:",
  recharge: "What restores your energy:",
  strengths: "You recognize these strengths in yourself:",
  growth_areas: "Where you would love to grow this year:",
  proud_of: "What you are proud of overcoming:",
  repeat_situations: "A situation you notice yourself returning to:",
  conflict_style: "In disagreement, you described your response as",
  pattern_change: "The pattern you are ready to change:",
  interests: "What is yours alone:",
  aspirations: "What you would love to learn, create or experience:",
  independence: "How you will keep your own identity:",
  happiness: "Happiness, on an ordinary day, looks like this:",
  success: "In your own words, success means",
  legacy: "You want your life to represent",
  intentional_connections: "The people and opportunities you want to welcome:",
  first_step: "Your intentional step this month:",
};

/** Words members often use, mapped to an invitation to look a little deeper (never a verdict). */
const THEMES: { match: RegExp; growth: string }[] = [
  { match: /\b(others|everyone|family|kids|children|help(ing)?|car(e|ing) for|giv(e|ing)|serv(e|ing))\b/i,
    growth: "Much of what you shared centers on caring for others. That is a gift. You may also enjoy discovering what brings you joy independently of your relationships and responsibilities." },
  { match: /\b(work|job|career|business|busy|achiev\w*|succe\w*)\b/i,
    growth: "Your work and ambitions are clearly important to you. Consider where rest, play and simply being belong in the life you are building." },
  { match: /\b(alone|quiet|peace|calm|nature|space)\b/i,
    growth: "Quiet and space seem to restore you. Protecting that time is not selfish. It is how you return to others as your best self." },
  { match: /\b(afraid|fear|anxious|worr\w*|overwhelm\w*|stress\w*|hurt)\b/i,
    growth: "You were honest about what weighs on you. Notice what you need in those moments, and allow yourself to ask for it without apology." },
  { match: /\b(people[- ]pleas\w*|say(ing)? no|guilt\w*|obligat\w*)\b/i,
    growth: "You named the pull to accommodate others. Practice one small, kind “no” this week, and notice how it feels to honor yourself too." },
];

/** What each value often says about a person, offered as an observation the member can accept or set aside. */
const VALUE_MEANING: Record<string, string> = {
  Honesty: "a commitment to truth", Family: "a deep devotion to the people you call yours", Faith: "a life anchored in faith",
  Freedom: "a spirit that needs room to choose", Growth: "a heart that keeps becoming", Security: "the wisdom to build a steady foundation",
  Adventure: "courage and curiosity", Loyalty: "a steadfast loyalty", Kindness: "a natural kindness", Achievement: "drive and determination",
  Peace: "a longing for peace", Creativity: "a creative imagination", Health: "care for your wellbeing", Respect: "a deep respect for people",
  Independence: "a strong sense of self", Community: "a gift for belonging and bringing people together", Wisdom: "a thoughtful, reflective mind",
  Generosity: "a generous spirit", Excellence: "high standards", Joy: "an openness to joy", Justice: "a strong sense of fairness",
  Legacy: "a desire to leave something meaningful", Balance: "a search for harmony", Humor: "a lightness that helps others breathe",
};

const MOVING_FORWARD: Record<string, string> = {
  "beyond-my-titles": "You are more than the roles you fulfill. Give yourself permission to meet the person beneath them, and to like who you find.",
  "values-and-beliefs": "Let your values become your compass. When a choice feels heavy, ask which option honors what matters most to you.",
  "emotional-needs": "Your needs are not too much. Knowing them helps you ask clearly, and recognize who is able to meet you there.",
  "strengths-and-growth": "Hold your strengths and your growing edges with the same kindness. Both are part of becoming.",
  "my-patterns": "Noticing a pattern is the beginning of choosing differently. Be patient with yourself as new habits take root.",
  "interests-and-aspirations": "Your individuality is worth protecting. Keep making room for what is yours alone.",
  "happiness-and-success": "No one else can define a good life for you. Return to your own definition whenever the world gets loud.",
  "what-my-life-represents": "Connection with intention begins here: knowing what you stand for, and welcoming what aligns with it.",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
/** A short, faithful excerpt of the member's own words. */
export function excerpt(text: string, max = 180) {
  const t = clean(text);
  if (t.length <= max) return t.replace(/[.!?]*$/, "");
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "));
  return (stop > 60 ? cut.slice(0, stop) : cut.slice(0, cut.lastIndexOf(" "))) + "…";
}
const quote = (lead: string, text: string) => `${lead} “${excerpt(text)}.”`.replace(/…\.”$/, "…”");

/**
 * Builds the self-guided reflection for one chapter from this member's answers.
 * `all` is every answer the member has saved, so qualities can draw on earlier chapters.
 */
export function composeReflection(mod: DiscoveryModule, all: Record<string, ReflectionAnswer>): PersonalDiscovery | null {
  const text = (k: string) => clean(all[k]?.answer ?? "");
  const answered = mod.questions.filter((q) => text(q.key) || all[q.key]?.choices?.length);
  if (!answered.length) return null;

  const discovered: string[] = [];
  for (const q of answered) {
    if (q.type === "values") {
      const v = all[q.key]!.choices!;
      discovered.push(`The values you hold closest are ${list(v)}.`);
    } else if (LEAD[q.key]) discovered.push(quote(LEAD[q.key], text(q.key)));
  }

  const qualities: string[] = [];
  const values = all.core_values?.choices ?? [];
  if (values.length) qualities.push(`Your values reveal ${list(values.slice(0, 3).map((v) => VALUE_MEANING[v] ?? v.toLowerCase()))}. These are meaningful strengths, and they deserve to be extended toward yourself as well.`);
  if (text("others_see")) qualities.push(`Others treasure you for “${excerpt(text("others_see"), 120)}.” Let that be something you see in yourself, too.`);
  if (text("strengths") && mod.slug !== "strengths-and-growth") qualities.push(`You bring ${excerpt(text("strengths"), 120)} to the people and work you care about.`);
  if (text("proud_of")) qualities.push(`Overcoming ${excerpt(text("proud_of"), 120)} shows a resilience worth honoring.`);
  if (!qualities.length) qualities.push("Taking time to look honestly at yourself is itself a quiet strength. Few people pause long enough to ask these questions.");

  const words = mod.questions.map((q) => text(q.key)).join(" ");
  const growth = THEMES.filter((t) => t.match.test(words)).slice(0, 2).map((t) => t.growth);
  if (text("growth_areas") && mod.slug !== "strengths-and-growth") growth.push(`You named ${excerpt(text("growth_areas"), 120)} as a growing edge. Choose one small, consistent practice to support it.`);
  if (!growth.length) growth.push("Return to these questions in a few weeks. Notice what has stayed the same and what has shifted. Both will teach you something.");

  const forward = [MOVING_FORWARD[mod.slug] ?? "Be gentle with yourself as you continue to discover who you are."];
  if (text("first_step")) forward.push(`And your first step, “${excerpt(text("first_step"), 140)},” is a beautiful place to begin.`);

  return { discovered, qualities, growth, forward };
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The request sent to Journey when a paid member chooses a deeper analysis (only their own answers for this chapter). */
export function journeyDiscoveryPrompt(mod: DiscoveryModule, all: Record<string, ReflectionAnswer>, maxChars: number) {
  const lines = mod.questions
    .map((q) => ({ q, a: q.type === "values" ? (all[q.key]?.choices ?? []).join(", ") : clean(all[q.key]?.answer ?? "") }))
    .filter((x) => x.a)
    .map((x) => `Q: ${x.q.prompt}\nA: ${x.a.slice(0, 700)}`);
  const head = `Personal Discovery: ${mod.title}. Please write my personal discovery for this chapter of Who Am I?, based only on my answers below. Use exactly four short sections with these headings: What You Discovered About Yourself; Your Personal Strengths; Areas for Personal Development; Moving Forward. Speak warmly to me as "you", invite rather than instruct, and offer observations I can accept or set aside. Do not diagnose, label me permanently or judge my suitability for relationships.\n\n`;
  let body = "";
  for (const l of lines) { if ((head + body + l).length + 2 > maxChars) break; body += l + "\n\n"; }
  return (head + body).trim();
}

/** Splits Journey's reply back into the four sections (falls back to one block if the headings are missing). */
export function parseJourneyDiscovery(reply: string): PersonalDiscovery | null {
  const heads = [/what you(['\u2019]ve)? discovered/i, /strengths|beautiful qualities/i, /development|opportunities/i, /moving forward/i];
  const out: PersonalDiscovery = { discovered: [], qualities: [], growth: [], forward: [] };
  const keys = ["discovered", "qualities", "growth", "forward"] as const;
  let cur: (typeof keys)[number] | null = null;
  for (const raw of reply.split(/\n+/)) {
    const line = raw.replace(/^[#*\s>-]+|[*#\s]+$/g, "").trim();
    if (!line) continue;
    const h = heads.findIndex((r) => r.test(line) && line.length < 60);
    if (h >= 0) { cur = keys[h]; continue; }
    if (cur) out[cur].push(line);
  }
  return keys.every((k) => out[k].length) ? out : null;
}
