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

/** The member's own discovery profile. Row security guarantees only they can read it. */
export async function getDiscovery(userId: string) {
  const supabase = await createClient();
  const empty = { answers: {} as Record<string, Answer>, choice: null as DiscoveryChoice, boundaries: 0, modulesDone: 0, modulesStarted: 0, totalModules: MODULES.length, percent: 0 };
  if (!supabase) return empty;
  const [{ data: rows }, { data: pref }, boundaries] = await Promise.all([
    supabase.from("discovery_answers").select("question_key, answer, choices, updated_at").eq("user_id", userId),
    supabase.from("discovery_preference").select("choice").eq("user_id", userId).maybeSingle(),
    reflectionsWritten(userId),
  ]);
  const answers = Object.fromEntries(((rows ?? []) as Answer[]).map((r) => [r.question_key, r]));
  let modulesDone = 0, modulesStarted = 0;
  for (const m of MODULES) {
    const n = m.slug === "boundaries" ? boundaries : m.questions.filter((q) => filled(answers[q.key])).length;
    const total = m.slug === "boundaries" ? 4 : m.questions.length;
    if (n >= total) modulesDone++;
    else if (n > 0) modulesStarted++;
  }
  const answered = QUESTION_KEYS.filter((k) => filled(answers[k])).length + boundaries;
  const percent = Math.round((100 * answered) / (QUESTION_KEYS.length + 4));
  return { answers, choice: (pref?.choice as DiscoveryChoice) ?? null, boundaries, modulesDone, modulesStarted, totalModules: MODULES.length, percent };
}

export const moduleProgress = (slug: string, answers: Record<string, Answer>, boundaries: number) => {
  const m = MODULES.find((x) => x.slug === slug)!;
  if (slug === "boundaries") return { done: boundaries, total: 4 };
  return { done: m.questions.filter((q) => filled(answers[q.key])).length, total: m.questions.length };
};

/** Where "Begin/Continue My Journey of Self-Discovery" should go: straight into the first unfinished module. */
export function nextModuleHref(answers: Record<string, Answer>, boundaries: number) {
  const next = MODULES.find((m) => { const p = moduleProgress(m.slug, answers, boundaries); return p.done < p.total; }) ?? MODULES[0];
  return next.slug === "boundaries" ? "/app/know-yourself/boundaries" : `/app/know-yourself/who-am-i/${next.slug}`;
}
