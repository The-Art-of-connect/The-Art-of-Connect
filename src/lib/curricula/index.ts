import { IDENTITY_SELF_LOVE, type Curriculum } from "@/lib/curricula/identity-self-love";

/** Founding (code) versions of each founder-editable curriculum. */
export const CURRICULA: Record<string, Curriculum> = { [IDENTITY_SELF_LOVE.section]: IDENTITY_SELF_LOVE };

type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Merges an edited copy onto the founding structure. Keys (lessons, questions,
 * choices, strength/develop) always come from the founding version so saved
 * member answers stay valid; only the words can change.
 */
export function mergeCurriculum(base: Curriculum, edited: unknown): Curriculum {
  const e = (edited ?? {}) as Partial<Curriculum>;
  const str = (v: unknown, fallback: string, max = 4000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback);
  const list = (v: unknown, fallback: string[]) => (Array.isArray(v) && v.every((x) => typeof x === "string") && v.length ? (v as string[]).map((x) => x.slice(0, 2000)).slice(0, 20) : fallback);
  return {
    ...base,
    title: str(e.title, base.title, 120), tagline: str(e.tagline, base.tagline, 300),
    purpose: list(e.purpose, base.purpose), philosophy: str(e.philosophy, base.philosophy), closing: str(e.closing, base.closing),
    journeyInstructions: str(e.journeyInstructions, base.journeyInstructions, 6000),
    lessons: base.lessons.map((l) => {
      const el = (e.lessons ?? []).find((x) => x?.slug === l.slug);
      if (!el) return l;
      return {
        ...l,
        title: str(el.title, l.title, 160), focus: list(el.focus, l.focus), understanding: list(el.understanding, l.understanding),
        principles: l.principles ? list(el.principles, l.principles) : undefined,
        reflection: str(el.reflection, l.reflection), forward: str(el.forward, l.forward), journeyPrompt: str(el.journeyPrompt, l.journeyPrompt, 600),
        examples: Array.isArray(el.examples) && el.examples.length
          ? el.examples.filter((x) => x && typeof x.who === "string" && typeof x.text === "string" && x.text.trim()).slice(0, 10).map((x) => ({ who: x.who.slice(0, 120), text: x.text.slice(0, 2000) }))
          : l.examples,
        questions: l.questions.map((q) => {
          const eq = (el.questions ?? []).find((x) => x?.key === q.key);
          if (!eq) return q;
          return {
            ...q, prompt: str(eq.prompt, q.prompt, 400),
            choices: q.choices.map((c) => {
              const ec = (eq.choices ?? []).find((x) => x?.key === c.key);
              return ec ? { ...c, label: str(ec.label, c.label, 200), guidance: str(ec.guidance, c.guidance, 1500), reading: { kind: c.reading.kind, text: str(ec.reading?.text, c.reading.text, 600) } } : c;
            }),
          };
        }),
      };
    }),
  };
}

/** The version members see: the owner's published version, or the founding version. */
export async function getCurriculum(db: Db | null, section: string): Promise<Curriculum | null> {
  const base = CURRICULA[section];
  if (!base) return null;
  if (!db) return base;
  const { data } = await db.from("curriculum_versions").select("content").eq("section", section).eq("status", "published").maybeSingle();
  return data?.content ? mergeCurriculum(base, data.content) : base;
}

/** Journey's specialized teaching instructions for a section or one lesson ("section" or "section/lesson"). */
export async function teachingGuidance(db: Db | null, ref: string): Promise<string> {
  const [section, lessonSlug] = ref.split("/");
  const c = await getCurriculum(db, section);
  if (!c) return "";
  const l = lessonSlug ? c.lessons.find((x) => x.slug === lessonSlug) : null;
  const lessonText = l
    ? `\n\n## Current lesson: ${l.title}\nEducational focus: ${l.focus.join(" ")}\n${l.principles ? `Founding principles: ${l.principles.join(" ")}\n` : ""}Discovery questions you may explore conversationally (one at a time, never as a quiz): ${l.questions.map((q) => q.prompt).join(" | ")}\nGuided understanding: ${l.understanding.join(" ")}`
    : `\n\nLessons in this section: ${c.lessons.map((x) => x.title).join("; ")}.`;
  return `# Teaching guidance: ${c.title} (The Art of Self)\n${c.philosophy}\n${c.journeyInstructions}${lessonText}`.slice(0, 7000);
}
