import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LuxHero, LuxSection, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "The Journey Library" };

const ARTS: [string, string, string][] = [
  ["self", "The Art of Self", "Knowing who you are beyond your roles, responsibilities and relationships."],
  ["consciousness", "The Art of Consciousness", "Noticing your thoughts, beliefs and patterns with curiosity instead of judgment."],
  ["healing", "The Art of Healing", "Making peace with your past at your own pace, with compassion and support."],
  ["boundaries", "The Art of Boundaries", "Protecting your energy, honoring others and communicating limits with grace."],
  ["manifestation", "The Art of Manifestation", "Turning intention into aligned, realistic action — without promises of guaranteed outcomes."],
  ["emotional-awareness", "The Art of Emotional Awareness", "Naming what you feel, understanding why, and choosing how to respond."],
  ["abundance", "The Art of Abundance", "Gratitude, generosity and a healthy relationship with growth and prosperity."],
  ["love", "The Art of Love", "Giving and receiving love intentionally — with yourself, partners, family and friends."],
  ["letting-go", "The Art of Letting Go", "Releasing what no longer serves you so there is room for what will."],
  ["becoming", "The Art of Becoming", "Stepping into your next chapter with courage, clarity and purpose."],
];
const NUM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export default async function Library() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const { data } = supabase && !isInsidePreview(viewer)
    ? await supabase.from("journey_library").select("id, art, kind, title, body").not("art", "is", null).order("title")
    : { data: [] };
  return (
    <>
      <LuxHero eyebrow="Journey" title="The Journey Library" tagline="The ten Arts of a connected life.">
        <p className="max-w-2xl text-muted">Educational modules, guided exercises, reflection questions and affirmations — created and approved by The Art of Connect, reviewed with qualified professionals, and woven into every Journey conversation.</p>
      </LuxHero>
      <LuxSection title="Choose an Art to explore">
        <div className="space-y-4">
          {ARTS.map(([slug, title, body], i) => {
            const items = (data ?? []).filter((d) => d.art === slug);
            return (
              <details key={slug} className="glass group p-6 sm:p-7">
                <summary className="flex cursor-pointer list-none items-start gap-5">
                  <span className="display text-4xl text-gold">{NUM[i]}</span>
                  <span className="flex-1"><span className="block text-xl font-semibold">{title}</span><span className="mt-1 block text-sm text-muted">{body}</span></span>
                  <span className="chip shrink-0">{items.length ? `${items.length} module${items.length === 1 ? "" : "s"}` : "Coming soon"}</span>
                </summary>
                {items.length > 0 && (
                  <div className="mt-6 space-y-5 border-t border-line pt-6">
                    {items.map((it) => (
                      <article key={it.id}>
                        <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{it.kind}</p>
                        <h3 className="display mt-1 text-2xl">{it.title}</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{it.body}</p>
                      </article>
                    ))}
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </LuxSection>
      <SafetyFooter />
    </>
  );
}
