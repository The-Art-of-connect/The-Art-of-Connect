import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDiscovery, moduleHref } from "@/lib/know-yourself-server";
import { LESSONS, MODULES, PILLARS, moduleBySlug } from "@/lib/who-am-i";
import { saveDiscoveryModule } from "@/app/actions/who-am-i";
import { ActionForm } from "@/components/admin/ActionForm";
import { PillarIcon } from "@/components/PillarIcon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const m = moduleBySlug((await params).module);
  return { title: m ? `${m.title} · Who Am I?` : "Who Am I?" };
}

export default async function DiscoveryModulePage({ params }: { params: Promise<{ module: string }> }) {
  const slug = (await params).module;
  if (slug === "boundaries" || slug === "love-languages") redirect(moduleHref(slug));
  const mod = moduleBySlug(slug);
  if (!mod) notFound();
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const [d, { data: history }] = await Promise.all([
    getDiscovery(viewer.id),
    supabase.from("discovery_history").select("question_key, answer, choices, recorded_at").eq("user_id", viewer.id)
      .in("question_key", mod.questions.map((q) => q.key)).order("recorded_at", { ascending: true }),
  ]);
  const firstVersion = (key: string) => (history ?? []).find((h) => h.question_key === key);
  const versions = (key: string) => (history ?? []).filter((h) => h.question_key === key).length;
  const pillar = PILLARS.find((p) => p.key === mod.pillar)!;
  const lesson = LESSONS.find((l) => l.pillar === mod.pillar);
  const idx = MODULES.findIndex((m) => m.slug === mod.slug);
  const next = MODULES[(idx + 1) % MODULES.length];
  const nextHref = moduleHref(next.slug);

  return (
    <>
      <Link href="/app/know-yourself#who-am-i" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold"><span aria-hidden="true">←</span> Who Am I?</Link>
      <section className="theme-dark relative mt-4 overflow-hidden rounded-[28px] bg-ink">
        <div className="relative aspect-[16/9] sm:aspect-[21/8]">
          <Image src={mod.image} alt="" fill priority sizes="100vw" className="kenburns object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/5" />
        </div>
        <div className="relative -mt-24 px-6 pb-8 sm:-mt-28 sm:px-10">
          <p className="flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-gold"><PillarIcon pillar={mod.pillar} className="h-4 w-4" /> {pillar.title} · Module {idx + 1} of {MODULES.length}</p>
          <h1 className="display rise mt-3 text-4xl sm:text-6xl">{mod.title}</h1>
          <p className="rise rise-2 mt-3 max-w-2xl text-muted">{mod.intro}</p>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ActionForm action={saveDiscoveryModule} className="glass space-y-7 p-6 sm:p-8">
          <input type="hidden" name="module" value={mod.slug} />
          {mod.questions.map((q, i) => {
            const a = d.answers[q.key];
            const first = firstVersion(q.key);
            const grew = versions(q.key) > 1 && first;
            return (
              <fieldset key={q.key} className="tile-in" style={{ animationDelay: `${i * 80}ms` }}>
                <legend className="display text-2xl leading-snug">{q.prompt}</legend>
                {q.hint && <p className="mt-1 text-sm text-muted">{q.hint}</p>}
                {q.type === "values" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {q.options!.map((v) => (
                      <label key={v} className="cursor-pointer">
                        <input type="checkbox" name={q.key} value={v} defaultChecked={a?.choices?.includes(v)} className="peer sr-only" />
                        <span className="inline-flex rounded-full border border-champagne/50 px-3.5 py-2 text-sm transition-colors peer-checked:border-gold-deep peer-checked:bg-champagne/40 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{v}</span>
                      </label>
                    ))}
                    <p className="w-full text-xs text-muted">Choose up to {q.max ?? 5}.</p>
                  </div>
                ) : (
                  <textarea name={q.key} defaultValue={a?.answer ?? ""} maxLength={4000} className="field mt-3 !min-h-[110px]" placeholder="Write freely — only you will see this." />
                )}
                {grew && (
                  <p className="mt-2 rounded-xl border border-champagne/40 bg-champagne/10 px-3 py-2 text-xs text-muted">
                    <span className="font-semibold text-gold-deep">How you’ve grown:</span> on {new Date(first!.recorded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} you first wrote “{(first!.answer ?? first!.choices?.join(", ") ?? "").slice(0, 160)}”.
                  </p>
                )}
              </fieldset>
            );
          })}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <button className="btn btn-gold">Save privately</button>
            <Link href={nextHref} className="btn btn-ghost">Next: {next.title}</Link>
          </div>
          <p className="text-xs text-muted">Leave anything blank and come back anytime. Your answers are private and never shared with connections, matches, partners, providers or our team.</p>
        </ActionForm>

        <aside className="space-y-5">
          {lesson && (
            <div className="glass p-6">
              <p className="eyebrow">Learn · {pillar.title}</p>
              <p className="display mt-2 text-2xl">{lesson.title}</p>
              {lesson.body.map((p) => <p key={p.slice(0, 20)} className="mt-3 text-sm text-muted">{p}</p>)}
              <p className="mt-4 rounded-xl bg-champagne/15 p-3 text-sm"><span className="font-semibold">Practice: </span>{lesson.practice}</p>
            </div>
          )}
          <Link href="/app/journey" className="theme-dark lift relative block overflow-hidden rounded-[24px] bg-ink p-6">
            <div className="orb-halo pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.4),transparent_70%)]" aria-hidden="true" />
            <p className="display relative text-2xl text-gold-bright">Reflect further with Journey</p>
            <p className="relative mt-2 text-sm text-muted">Paid members can explore this module with Journey, within their allowance. Journey asks questions — you find your own answers.</p>
          </Link>
        </aside>
      </div>
    </>
  );
}
