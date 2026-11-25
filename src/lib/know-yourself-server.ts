import "server-only";
import { createClient } from "@/lib/supabase/server";
import { MODULES, QUESTION_KEYS } from "@/lib/who-am-i";

export type DiscoveryChoice = "begin" | "explore_first" | "later" | null;
export type Answer = { question_key: string; answer: string | null; choices: string[] | null; updated_at: string };

/** How many of the four boundary reflections this member has written (their own rows only). */
export async function reflectionsWritten(userId: string) {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data } = await supabase.from("self_discovery").select("area, will_do, wont_do").eq("user_id", userId);
  return (data ?? []).filter((r) => r.will_do || r.wont_do).length;
}

const filled = (a?: Answer) => Boolean(a && ((a.answer && a.answer.trim()) || (a.choices && a.choices.length)));

/** Modules with their own dedicated pages (progress measured there). */
export type Special = { boundaries: number; "love-languages": number };
const SPECIAL_TOTAL: Record<keyof Special, number> = { boundaries: 4, "love-languages": 1 };
export const moduleHref = (slug: string) =>
  slug === "boundaries" ? "/app/know-yourself/boundaries" : slug === "love-languages" ? "/app/know-yourself/love-languages" : `/app/know-yourself/who-am-i/${slug}`;

/** The member's own discovery profile. Row security guarantees only they can read it. */
export async function getDiscovery(userId: string) {
  const supabase = await createClient();
  const special: Special = { boundaries: 0, "love-languages": 0 };
  const empty = { answers: {} as Record<string, Answer>, choice: null as DiscoveryChoice, special, modulesDone: 0, modulesStarted: 0, totalModules: MODULES.length, percent: 0 };
  if (!supabase) return empty;
  const [{ data: rows }, { data: pref }, boundaries, { data: love }] = await Promise.all([
    supabase.from("discovery_answers").select("question_key, answer, choices, updated_at").eq("user_id", userId),
    supabase.from("discovery_preference").select("choice").eq("user_id", userId).maybeSingle(),
    reflectionsWritten(userId),
    supabase.from("love_language_profiles").select("receive_rank").eq("user_id", userId).maybeSingle(),
  ]);
  special.boundaries = boundaries;
  special["love-languages"] = love?.receive_rank?.length ? 1 : 0;
  const answers = Object.fromEntries(((rows ?? []) as Answer[]).map((r) => [r.question_key, r]));
  let modulesDone = 0, modulesStarted = 0;
  for (const m of MODULES) {
    const p = moduleProgress(m.slug, answers, special);
    if (p.done >= p.total) modulesDone++;
    else if (p.done > 0) modulesStarted++;
  }
  const specialDone = special.boundaries + special["love-languages"];
  const answered = QUESTION_KEYS.filter((k) => filled(answers[k])).length + specialDone;
  const percent = Math.round((100 * answered) / (QUESTION_KEYS.length + SPECIAL_TOTAL.boundaries + SPECIAL_TOTAL["love-languages"]));
  return { answers, choice: (pref?.choice as DiscoveryChoice) ?? null, special, modulesDone, modulesStarted, totalModules: MODULES.length, percent };
}

export const moduleProgress = (slug: string, answers: Record<string, Answer>, special: Special) => {
  if (slug in SPECIAL_TOTAL) return { done: special[slug as keyof Special], total: SPECIAL_TOTAL[slug as keyof Special] };
  const m = MODULES.find((x) => x.slug === slug)!;
  return { done: m.questions.filter((q) => filled(answers[q.key])).length, total: m.questions.length };
};

/** Where "Begin/Continue My Journey of Self-Discovery" should go: straight into the first unfinished module. */
export function nextModuleHref(answers: Record<string, Answer>, special: Special) {
  const next = MODULES.find((m) => { const p = moduleProgress(m.slug, answers, special); return p.done < p.total; }) ?? MODULES[0];
  return moduleHref(next.slug);
}
