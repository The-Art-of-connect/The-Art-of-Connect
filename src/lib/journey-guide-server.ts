import "server-only";
import { MODULES, PILLARS, LESSONS, VALUES, moduleBySlug } from "@/lib/who-am-i";
import { AREAS, type Area } from "@/lib/know-yourself";
import { LANGUAGE_KEYS, LOVE_LANGUAGES, completeRank } from "@/lib/love-languages";
import { EI_AREAS, EI_PROFILE } from "@/lib/emotional-intelligence";
import { CURRICULA, getCurriculum } from "@/lib/curricula";
import { guideFromLesson, GUIDE_REF, type GuideAnswers, type GuideModule } from "@/lib/journey-guide";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const LOVE_OPTIONS = LANGUAGE_KEYS.map((k) => ({ id: k, label: LOVE_LANGUAGES[k].name }));
const boundaryKey = (area: string, field: string) => `${area}.${field}`;
const BOUNDARY_FIELDS = ["core_values", "will_do", "wont_do", "say_it"] as const;

/**
 * Every module on the platform that Journey can guide, addressed by a short reference:
 *   who-am-i/<module> · boundaries/<area> · love-languages · ei/<area> · ei/profile · <curriculum>/<lesson>
 */
export async function resolveGuide(db: Db | null, ref: string): Promise<GuideModule | null> {
  if (!GUIDE_REF.test(ref)) return null;
  const [a, b] = ref.split("/");
  if (a === "who-am-i" && b) {
    const m = moduleBySlug(b);
    if (!m || !MODULES.includes(m)) return null;
    const pillar = PILLARS.find((p) => p.key === m.pillar);
    const lesson = LESSONS.find((l) => l.pillar === m.pillar);
    return {
      ref, title: m.title, place: `The Art of Knowing Yourself · Who Am I? · ${pillar?.title ?? ""}`, href: `/app/know-yourself/who-am-i/${m.slug}`,
      objectives: [m.intro, pillar?.line ?? "", ...(lesson ? [lesson.title, lesson.practice] : [])].filter(Boolean),
      questions: m.questions.map((q) => q.type === "values"
        ? { key: q.key, prompt: q.prompt, kind: "multi" as const, max: q.max ?? 5, options: (q.options ?? VALUES).map((v) => ({ id: v, label: v })) }
        : { key: q.key, prompt: q.prompt, hint: q.hint, kind: "text" as const }),
    };
  }
  if (a === "boundaries" && b) {
    const area = AREAS.find((x) => x.key === b);
    if (!area) return null;
    return {
      ref, title: `Boundaries · ${area.title}`, place: "The Art of Knowing Yourself · Boundaries & non-negotiables", href: `/app/know-yourself/boundaries#${area.key}`,
      objectives: [area.intro, "Boundaries are a kindness to yourself and to others; they describe what the member will do, not what others must do."],
      questions: [
        { key: boundaryKey(area.key, "core_values"), prompt: area.values, kind: "text" },
        { key: boundaryKey(area.key, "will_do"), prompt: area.will, kind: "text" },
        { key: boundaryKey(area.key, "wont_do"), prompt: area.wont, kind: "text" },
        { key: boundaryKey(area.key, "say_it"), prompt: area.say, kind: "text" },
      ],
    };
  }
  if (a === "love-languages" && !b) {
    return {
      ref, title: "How I give and receive love", place: "The Art of Knowing Yourself · Love languages", href: "/app/know-yourself/love-languages#profile",
      objectives: ["Discover how the member most naturally feels loved and expresses love.", "Love languages are preferences that can change with life's seasons: never a fixed type, a label, or the deciding factor in compatibility."],
      questions: [
        { key: "receive", prompt: "Which expressions of love help you feel most loved, from most to least meaningful?", kind: "rank", options: LOVE_OPTIONS },
        { key: "express", prompt: "How do you most naturally show love, from most to least natural for you?", kind: "rank", options: LOVE_OPTIONS },
        { key: "connected", prompt: "When do you feel most connected to someone you care about?", kind: "text" },
        { key: "unappreciated", prompt: "What tends to leave you feeling unappreciated?", kind: "text" },
        { key: "notes", prompt: "Anything else you'd like to remember about how you give and receive love?", kind: "text" },
      ],
    };
  }
  if (a === "ei" && b === "profile") {
    return {
      ref, title: "My Emotional Intelligence Profile", place: "The Art of Knowing Yourself · Emotional Intelligence", href: "/app/know-yourself/emotional-intelligence",
      objectives: ["Build a private picture of the member's emotional strengths, growth areas, triggers and communication preferences, in their own words."],
      questions: EI_PROFILE.map((p) => ({ key: p.key, prompt: p.label, kind: "text" as const })),
    };
  }
  if (a === "ei" && b) {
    const area = EI_AREAS.find((x) => x.slug === b);
    if (!area) return null;
    return {
      ref, title: area.title, place: "The Art of Knowing Yourself · Emotional Intelligence", href: `/emotional-intelligence/${area.slug}`,
      objectives: [area.tagline, ...area.topics.map((t) => t.title)].slice(0, 10),
      questions: area.reflections.map((r) => ({ key: r.key, prompt: r.prompt, kind: "text" as const })),
    };
  }
  if (CURRICULA[a] && b) {
    const c = await getCurriculum(db, a);
    const l = c?.lessons.find((x) => x.slug === b);
    if (!c || !l) return null;
    const href = a === "emotional-intelligence" ? `/app/know-yourself/emotional-intelligence/lessons#${l.slug}` : `/app/know-yourself/${a}#${l.slug}`;
    return guideFromLesson(c, l, href);
  }
  return null;
}

/** The member's own saved answers for a module (read with their own permissions or as themselves on the server). */
export async function loadGuideAnswers(db: Db, userId: string, m: GuideModule): Promise<GuideAnswers> {
  const out: GuideAnswers = {};
  const [a, b] = m.ref.split("/");
  if (a === "boundaries") {
    const { data } = await db.from("self_discovery").select("core_values, will_do, wont_do, say_it").eq("user_id", userId).eq("area", b).maybeSingle();
    for (const f of BOUNDARY_FIELDS) if (data?.[f]) out[boundaryKey(b, f)] = data[f];
    return out;
  }
  if (a === "love-languages") {
    const { data } = await db.from("love_language_profiles").select("receive_rank, express_rank, feel_connected, feel_unappreciated, notes").eq("user_id", userId).maybeSingle();
    if (!data) return out;
    if (data.receive_rank?.length) out.receive = data.receive_rank;
    if (data.express_rank?.length) out.express = data.express_rank;
    if (data.feel_connected) out.connected = data.feel_connected;
    if (data.feel_unappreciated) out.unappreciated = data.feel_unappreciated;
    if (data.notes) out.notes = data.notes;
    return out;
  }
  const { data } = await db.from("discovery_answers").select("question_key, answer, choices").eq("user_id", userId).in("question_key", m.questions.map((q) => q.key));
  for (const r of data ?? []) {
    const q = m.questions.find((x) => x.key === r.question_key);
    if (!q) continue;
    if (q.kind === "text" && r.answer) out[q.key] = r.answer;
    else if (q.kind === "choice" && r.choices?.[0]) out[q.key] = r.choices[0];
    else if (r.choices?.length) out[q.key] = r.choices;
  }
  return out;
}

/**
 * Saves answers the member reviewed, exactly where the written form would have saved them.
 * Only questions present in `answers` are written, so nothing the member left out is erased.
 * `db` must be the member's own (row-secured) client.
 */
export async function saveGuideAnswers(db: Db, userId: string, m: GuideModule, answers: GuideAnswers): Promise<string | null> {
  const [a, b] = m.ref.split("/");
  if (a === "boundaries") {
    const row: Record<string, unknown> = { user_id: userId, area: b as Area };
    const { data: cur } = await db.from("self_discovery").select("core_values, will_do, wont_do, say_it").eq("user_id", userId).eq("area", b).maybeSingle();
    for (const f of BOUNDARY_FIELDS) row[f] = answers[boundaryKey(b, f)] !== undefined ? String(answers[boundaryKey(b, f)]).slice(0, f === "core_values" ? 2000 : 4000) : (cur?.[f] ?? null);
    const { error } = await db.from("self_discovery").upsert(row, { onConflict: "user_id,area" });
    return error ? "Not saved. Please try again." : null;
  }
  if (a === "love-languages") {
    const { data: cur } = await db.from("love_language_profiles").select("*").eq("user_id", userId).maybeSingle();
    const text = (k: string, f: string) => (answers[k] !== undefined ? String(answers[k]).slice(0, 2000) : (cur?.[f] ?? null));
    const { error } = await db.from("love_language_profiles").upsert({
      user_id: userId,
      receive_rank: answers.receive ? completeRank(answers.receive as string[]) : (cur?.receive_rank ?? completeRank([])),
      express_rank: answers.express ? completeRank(answers.express as string[]) : (cur?.express_rank ?? completeRank([])),
      feel_connected: text("connected", "feel_connected"), feel_unappreciated: text("unappreciated", "feel_unappreciated"), notes: text("notes", "notes"),
      // Sharing choices are never changed by Journey: new profiles start private.
      share_with_partner: cur?.share_with_partner ?? false, share_with_matches: cur?.share_with_matches ?? false, use_in_journey: cur?.use_in_journey ?? true,
    }, { onConflict: "user_id" });
    return error ? "Not saved. Please try again." : null;
  }
  const rows = m.questions.filter((q) => answers[q.key] !== undefined).map((q) => {
    const v = answers[q.key];
    return q.kind === "text"
      ? { user_id: userId, question_key: q.key, answer: String(v).slice(0, 4000), choices: null }
      : { user_id: userId, question_key: q.key, answer: null, choices: Array.isArray(v) ? v : [v] };
  });
  if (!rows.length) return "There was nothing to save yet.";
  const { error } = await db.from("discovery_answers").upsert(rows, { onConflict: "user_id,question_key" });
  return error ? "Not saved. Please try again." : null;
}
