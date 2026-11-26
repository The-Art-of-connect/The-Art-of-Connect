import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EI_AREAS, eiArea } from "@/lib/emotional-intelligence";
import { saveEIReflections } from "@/app/actions/emotional-intelligence";
import { ActionForm } from "@/components/admin/ActionForm";
import { JourneyGuide } from "@/components/JourneyGuide";
import { guideFor } from "@/lib/journey-guide-access";
import { EIIcon } from "@/components/EIIcon";
import { EIJourneyBand } from "@/components/EIJourneyBand";
import { EIScenario } from "@/components/EIScenario";

export function generateStaticParams() {
  return EI_AREAS.map((a) => ({ area: a.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const a = eiArea((await params).area);
  return a ? { title: `${a.title} · The Art of Emotional Intelligence`, description: a.tagline } : {};
}

export default async function EIAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const a = eiArea((await params).area);
  if (!a) notFound();
  const viewer = await getViewer();
  const member = viewer && !isInsidePreview(viewer);
  let saved: Record<string, string> = {};
  if (member) {
    const supabase = (await createClient())!;
    const { data } = await supabase.from("discovery_answers").select("question_key, answer").eq("user_id", viewer.id).in("question_key", a.reflections.map((r) => r.key));
    saved = Object.fromEntries((data ?? []).map((r) => [r.question_key, r.answer ?? ""]));
  }
  const guide = member ? await guideFor(`ei/${a.slug}`) : null;
  const i = EI_AREAS.findIndex((x) => x.slug === a.slug);
  const next = EI_AREAS[(i + 1) % EI_AREAS.length];
  const card = "rounded-[22px] border border-champagne/70 bg-ivory/70 p-7 sm:p-9";

  return (
    <div className="band theme-cream">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-8 lg:py-16">
        <Link href="/emotional-intelligence" className="text-sm text-burgundy">← The Art of Emotional Intelligence</Link>
        <header className="text-center">
          <span className="inline-flex text-gold"><EIIcon name={a.icon} className="h-12 w-12" /></span>
          <p className="mt-3 text-xs tracking-[0.3em] uppercase text-gold-deep">Lesson {i + 1} of {EI_AREAS.length}</p>
          <h1 className="display mt-2 text-5xl text-burgundy sm:text-6xl">{a.title}</h1>
          <p className="display mx-auto mt-3 max-w-2xl text-2xl italic text-text/80">{a.tagline}</p>
          <div className="mx-auto mt-6 h-px w-24 bg-gold" />
        </header>

        <section className={card}>
          {a.intro.map((p, n) => <p key={n} className={n === 0 ? "text-lg leading-relaxed" : "display mt-4 text-2xl italic text-burgundy"}>{p}</p>)}
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {a.topics.map((t) => (
              <div key={t.title}>
                <p className="display text-xl">{t.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-text/75">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-center text-xs tracking-[0.28em] uppercase text-gold-deep">In real life</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {a.examples.map((e) => (
              <div key={e.text} className="rounded-2xl border border-champagne/60 bg-white/50 p-6">
                <p className="text-xs font-semibold tracking-wide text-burgundy">{e.context}</p>
                <p className="mt-2 text-text/85">{e.text}</p>
              </div>
            ))}
          </div>
        </section>

        <EIScenario scenario={a.scenario} />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <p className="text-xs tracking-[0.28em] uppercase text-gold-deep">Practice</p>
            <p className="display mt-2 text-3xl">{a.practice.title}</p>
            <ol className="mt-5 space-y-3">
              {a.practice.steps.map((s, n) => <li key={s} className="flex gap-3"><span className="display text-xl text-gold">{n + 1}</span><span className="text-text/85">{s}</span></li>)}
            </ol>
          </div>
          <div className={card}>
            <p className="text-xs tracking-[0.28em] uppercase text-gold-deep">Reflect · optional & private</p>
            {member ? (
              <div className="mt-4"><JourneyGuide mod={guide!.mod} access={guide!.access} hasAnswers={guide!.hasAnswers}>
              <ActionForm action={saveEIReflections} className="space-y-4">
                {a.reflections.map((r) => (
                  <label key={r.key} className="block space-y-1.5"><span className="text-sm font-semibold">{r.prompt}</span>
                    <textarea name={r.key} defaultValue={saved[r.key] ?? ""} maxLength={4000} rows={3} className="field" /></label>
                ))}
                <button className="rounded-xl bg-burgundy px-6 py-3 font-medium text-ivory">Save privately</button>
              </ActionForm>
              </JourneyGuide></div>
            ) : (
              <>
                <ul className="mt-4 space-y-3">{a.reflections.map((r) => <li key={r.key} className="flex gap-2 text-text/85"><span className="text-gold">◆</span>{r.prompt}</li>)}</ul>
                <p className="mt-5 text-sm text-muted">Members can save reflections privately and revisit them as they grow.</p>
                <Link href={`/sign-in?next=/emotional-intelligence/${a.slug}`} className="mt-3 inline-block font-medium text-burgundy underline-offset-4 hover:underline">Sign in to reflect →</Link>
              </>
            )}
          </div>
        </section>

        <EIJourneyBand ask={a.journeyPrompt} title={`Explore ${a.title} with Journey`} body="Discuss this lesson, your experiences and your patterns privately — in writing or by voice." />

        <section className="flex flex-col items-center justify-between gap-4 border-t border-champagne/60 pt-8 sm:flex-row">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {a.connections.map((c) => <Link key={c.href} href={c.href} className="text-burgundy underline-offset-4 hover:underline">{c.label}</Link>)}
          </div>
          <Link href={`/emotional-intelligence/${next.slug}`} className="display text-xl text-burgundy">Next: {next.title} →</Link>
        </section>
      </div>
    </div>
  );
}
