import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurriculum } from "@/lib/curricula";
import { assembleAnalysis, choiceKey, ISL_ANALYSIS_KEY, lessonReflectionKey, type ISLAnswers } from "@/lib/curricula/identity-self-love";
import { parseJourneyDiscovery } from "@/lib/personal-discovery";
import { getJourneyStatus } from "@/lib/journey-server";
import { saveLessonAnswers, createJourneyCurriculumAnalysis } from "@/app/actions/curriculum";
import { ActionForm } from "@/components/admin/ActionForm";
import { SelfBanner } from "@/components/SelfBanner";
import { PersonalDiscoveryCard } from "@/components/PersonalDiscoveryCard";
import { OpenOnHash } from "@/components/OpenOnHash";

export const dynamic = "force-dynamic";
export const metadata = { title: "Identity & Self-Love · The Art of Self" };

const SECTION = "identity-self-love";

export default async function IdentitySelfLovePage() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const c = (await getCurriculum(supabase, SECTION))!;
  const keys = [...c.lessons.flatMap((l) => [...l.questions.map((q) => choiceKey(q.key)), lessonReflectionKey(l.slug)]), ISL_ANALYSIS_KEY];
  const [{ data }, js] = await Promise.all([
    supabase ? supabase.from("discovery_answers").select("question_key, answer, choices, updated_at").eq("user_id", viewer.id).in("question_key", keys) : Promise.resolve({ data: [] as never[] }),
    getJourneyStatus().catch(() => null),
  ]);
  const rows = (data ?? []) as { question_key: string; answer: string | null; choices: string[] | null; updated_at: string }[];
  const answers: ISLAnswers = Object.fromEntries(rows.map((r) => [r.question_key, r]));
  const analysis = assembleAnalysis(c, answers);
  const savedJourney = rows.find((r) => r.question_key === ISL_ANALYSIS_KEY);
  const journeyAnalysis = savedJourney?.answer ? parseJourneyDiscovery(savedJourney.answer) : null;

  const paid = js?.access === "standard" || js?.access === "enhanced";
  const staff = js?.access === "staff";
  const credits = js?.allowance ? js.allowance.remaining + js.allowance.purchasedRemaining : 0;
  const option = paid ? { kind: "member" as const, enabled: Boolean(js?.enabled), credits } : staff ? { kind: "staff" as const, enabled: Boolean(js?.enabled) } : { kind: "none" as const };
  const lessonDone = (slug: string) => c.lessons.find((l) => l.slug === slug)!.questions.every((q) => answers[choiceKey(q.key)]?.choices?.length);
  const firstOpen = c.lessons.find((l) => !lessonDone(l.slug))?.slug ?? null;

  return (
    <>
      <SelfBanner section="identity" actions={[{ href: "#lessons", label: firstOpen && firstOpen !== c.lessons[0].slug ? "Continue my lessons" : "Begin the lessons", primary: true }, { href: "/app/know-yourself#art-of-self", label: "The Art of Self" }]} />

      <section className="mx-auto mt-12 max-w-3xl text-center">
        <p className="eyebrow">The Art of Self · Founding Curriculum</p>
        {c.purpose.map((p, i) => <p key={i} className={i === 0 ? "display mt-4 text-2xl leading-snug sm:text-3xl" : "mt-4 text-muted"}>{p}</p>)}
        <div className="mx-auto mt-8 h-px w-24 bg-gold" />
        <p className="display mt-6 text-2xl italic text-burgundy">{c.philosophy}</p>
      </section>

      <section aria-labelledby="choose" className="mt-14">
        <p className="eyebrow text-center">Choose your experience</p>
        <h2 id="choose" className="display mt-2 text-center text-4xl">Learn in the way that suits you</h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="glass p-7">
            <p className="eyebrow">Self-Guided Learning</p>
            <p className="display mt-2 text-2xl">Included for every member</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>✦ Educational lessons and real-life examples</li>
              <li>✦ Interactive questions with thoughtful explanations</li>
              <li>✦ Optional private reflections</li>
              <li>✦ A written personal analysis at the end</li>
            </ul>
            <p className="mt-4 text-sm font-semibold text-burgundy">No credits are ever used.</p>
            <a href="#lessons" className="btn btn-ghost btn-sm mt-5">Begin self-guided</a>
          </div>
          <div className="theme-dark relative overflow-hidden rounded-[24px] bg-ink p-7 text-ivory">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.35),transparent_70%)]" aria-hidden="true" />
            <p className="eyebrow relative">Interactive Learning with Journey</p>
            <p className="display relative mt-2 text-2xl text-gold-bright">Personal, by text or voice</p>
            <p className="relative mt-3 text-sm text-muted">Journey listens, asks about your circumstances and adapts each lesson to you, then writes an individualized analysis grounded in your conversations.</p>
            {paid ? (
              <p className="relative mt-4 rounded-xl border border-champagne/30 bg-white/5 p-3 text-sm">You have <span className="font-semibold text-gold-bright">{credits}</span> credits available. Each message to Journey uses 1 credit; opening lessons and learning self-guided never do.</p>
            ) : staff ? (
              <p className="relative mt-4 text-sm text-muted">Owner testing uses your private test budget.</p>
            ) : (
              <>
                <p className="relative mt-4 text-sm text-muted">Interactive learning with Journey is included with paid memberships.</p>
                <Link href="/membership" className="btn btn-gold btn-sm relative mt-5">Explore memberships</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <OpenOnHash />
      <section id="lessons" aria-label="Lessons" className="mx-auto mt-16 max-w-4xl scroll-mt-24 space-y-4">
        {c.lessons.map((l, n) => {
          const done = lessonDone(l.slug);
          return (
            <details key={l.slug} id={l.slug} open={l.slug === firstOpen} className="glass group scroll-mt-24 overflow-hidden !p-0">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${done ? "border-burgundy bg-burgundy text-ivory" : "border-champagne text-gold-deep"}`}>{done ? "✓" : n + 1}</span>
                <span className="flex-1">
                  <span className="block text-xs tracking-[0.2em] uppercase text-gold-deep">Lesson {n + 1} of {c.lessons.length}</span>
                  <span className="display block text-2xl text-burgundy sm:text-3xl">{l.title}</span>
                </span>
                <span className="text-gold-deep transition group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>

              <div className="border-t border-champagne/50 px-6 pb-8 pt-6">
                <h3 className="eyebrow">Educational focus</h3>
                {l.focus.map((p, i) => <p key={i} className="mt-2 leading-relaxed">{p}</p>)}
                {l.principles && (
                  <div className="mt-6 rounded-2xl border border-champagne/60 bg-champagne/10 p-5">
                    <p className="eyebrow">Founding principles</p>
                    <ul className="mt-3 space-y-2">{l.principles.map((p) => <li key={p} className="display text-xl italic text-burgundy">{p}</li>)}</ul>
                  </div>
                )}

                <ActionForm action={saveLessonAnswers} className="mt-8 space-y-7">
                  <input type="hidden" name="section" value={SECTION} />
                  <input type="hidden" name="lesson" value={l.slug} />
                  <h3 className="eyebrow">Discovery questions</h3>
                  {l.questions.map((q) => {
                    const picked = answers[choiceKey(q.key)]?.choices?.[0];
                    return (
                      <fieldset key={q.key}>
                        <legend className="display text-2xl leading-snug">{q.prompt}</legend>
                        <div className="mt-3 grid gap-2">
                          {q.choices.map((ch) => (
                            <label key={ch.key} className="cursor-pointer">
                              <input type="radio" name={q.key} value={ch.key} defaultChecked={picked === ch.key} className="peer sr-only" />
                              <span className="block rounded-2xl border border-champagne/60 px-4 py-3 text-sm transition peer-checked:border-burgundy peer-checked:bg-champagne/25 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{ch.label}</span>
                              <span className="mt-2 hidden rounded-2xl bg-ivory px-4 py-3 text-sm leading-relaxed text-muted peer-checked:block">{ch.guidance}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  })}

                  <div className="rounded-2xl border border-line bg-ivory/60 p-5">
                    <h3 className="eyebrow">Guided understanding</h3>
                    {l.understanding.map((p, i) => <p key={i} className="mt-3 text-sm leading-relaxed">{p}</p>)}
                  </div>

                  <div>
                    <h3 className="eyebrow">Real-life examples</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {l.examples.map((e) => (
                        <div key={e.who} className="rounded-2xl border border-champagne/50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">{e.who}</p>
                          <p className="mt-2 text-sm leading-relaxed">{e.text}</p>
                        </div>
                      ))}
                    </div>
                    {l.slug === "protecting-the-essence-of-you" && <Link href="/app/know-yourself/boundaries" className="mt-4 inline-block text-sm font-semibold text-burgundy">Go deeper in Boundaries &amp; Self-Worth →</Link>}
                  </div>

                  <div>
                    <label htmlFor={`${l.slug}-reflection`} className="eyebrow">Optional reflection</label>
                    <p className="display mt-2 text-xl">{l.reflection}</p>
                    <textarea id={`${l.slug}-reflection`} name="reflection" defaultValue={answers[lessonReflectionKey(l.slug)]?.answer ?? ""} maxLength={4000} className="field mt-3 !min-h-[100px]" placeholder="Write freely. Only you will see this." />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
                    <button className="btn btn-gold">Save privately</button>
                    {(paid || staff) && (
                      <Link href={`/app/journey?lesson=${SECTION}/${l.slug}&ask=${encodeURIComponent(l.journeyPrompt)}#chat`} className="btn btn-ghost">
                        Explore with Journey{paid ? ` · ${credits} credits` : ""}
                      </Link>
                    )}
                    {n < c.lessons.length - 1 && <a href={`#${c.lessons[n + 1].slug}`} className="text-sm text-burgundy">Next lesson →</a>}
                  </div>
                </ActionForm>
              </div>
            </details>
          );
        })}
      </section>

      {analysis ? (
        <PersonalDiscoveryCard slug={SECTION} reflection={analysis} journey={journeyAnalysis}
          journeyWritten={journeyAnalysis && savedJourney ? new Date(savedJourney.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null}
          option={option} action={createJourneyCurriculumAnalysis} field="section" consent="my answers to Identity & Self-Love" title="Your Personal Analysis"
          selfLine="Assembled from thoughtful interpretations of the answers you chose. No credits, no scores. Update any lesson and your analysis grows with you." />
      ) : (
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted">Your personal analysis appears here once you&rsquo;ve answered a lesson. There are no scores or grades, only understanding.</p>
      )}

      <section className="mx-auto mt-14 max-w-3xl text-center">
        <div className="mx-auto h-px w-24 bg-gold" />
        <p className="display mt-6 text-2xl italic text-burgundy">{c.closing}</p>
        <p className="mt-3 text-xs tracking-[0.25em] uppercase text-gold-deep">The Art of Connect · Every connection begins with yourself.</p>
        <p className="mx-auto mt-6 max-w-xl text-xs text-muted">Participation is optional and self-paced. Your answers are private and never shared with connections, matches, partners, providers or our team. This is education and reflection, not a clinical assessment.</p>
      </section>
    </>
  );
}
