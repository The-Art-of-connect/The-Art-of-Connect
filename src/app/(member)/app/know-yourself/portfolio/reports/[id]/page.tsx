import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reportNarrative } from "@/lib/growth";
import { brandName } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "My reflection" };

/**
 * A growth reflection (directive 45): where the member began, what changed since the last reflection, milestones and
 * next steps. Every line is labeled by its source: platform activity, what the member recorded, or Journey's observation.
 */
export default async function Reflection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = (await createClient())!;
  const { data: r } = await db.from("growth_reports").select("id, kind, period_start, period_end, began_at, activity, member_reported, journey_reflection, created_at").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: earlier } = await db.from("growth_reports").select("id, created_at").lt("created_at", r.created_at).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const n = reportNarrative(r.activity ?? {}, r.member_reported ?? {}, r.began_at);
  const Section = ({ title, source, items }: { title: string; source: string; items: string[] }) => items.length ? (
    <section className="glass p-6"><h2 className="display text-2xl">{title}</h2><p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">{source}</p>
      <ul className="mt-3 space-y-2">{items.map((x) => <li key={x} className="flex gap-2"><span className="text-gold" aria-hidden="true">✓</span>{x}</li>)}</ul></section>
  ) : null;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/app/know-yourself/portfolio#growth" className="text-sm text-gold">← {brandName("portfolio")}</Link>
        <p className="eyebrow mt-4">Celebrate Your Becoming</p>
        <h1 className="display mt-2 text-4xl">Your reflection</h1>
        <p className="mt-2 text-muted">{new Date(r.period_start).toLocaleDateString("en-US", { dateStyle: "long" })} to {new Date(r.period_end).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
      </div>
      <section className="glass p-6">
        <p className="eyebrow">Where you began</p>
        <p className="mt-2">{n.began ?? "Your journey with us is just beginning."}</p>
        <p className="mt-3 text-muted">{n.summary}</p>
        {earlier && <p className="mt-2 text-sm"><Link href={`/app/know-yourself/portfolio/reports/${earlier.id}`} className="text-gold underline">Compare with your previous reflection</Link></p>}
      </section>
      <Section title="Since your last reflection" source="From your activity on The Art of Connect" items={n.activity} />
      <Section title="Milestones and life changes" source="As you recorded them" items={n.reported} />
      <section className="glass p-6">
        <h2 className="display text-2xl">A reflection from Journey</h2>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">Journey&rsquo;s observation, never a diagnosis</p>
        {r.journey_reflection ? <p className="mt-3 whitespace-pre-line">{r.journey_reflection}</p> : (
          <p className="mt-3 text-sm text-muted">Talk this reflection through with Journey: what stands out, what you&rsquo;re proud of, and what you&rsquo;d like next. Journey only uses what you&rsquo;ve allowed it to remember and follows your membership&rsquo;s Journey allowance.</p>
        )}
        <Link href="/app/journey?topic=growth-reflection" className="btn btn-gold btn-sm mt-4">Discuss my progress with Journey</Link>
      </section>
      {n.explore.length > 0 && <Section title="You may wish to explore" source="Gentle suggestions, never requirements" items={n.explore} />}
      <section className="glass p-6 text-sm">
        <h2 className="display text-2xl">Next steps</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[["/app/sanctuary", "My Daily Sanctuary"], ["/app/sanctuary/becoming", "Who Am I Becoming?"], ["/app/know-yourself", "The Art of Knowing Yourself"], ["/app/know-yourself/portfolio#milestones", "Add a milestone"]].map(([h, l]) => <li key={h}><Link href={h} className="flex justify-between rounded-xl border border-line px-4 py-3">{l}<span aria-hidden="true" className="text-gold">›</span></Link></li>)}
        </ul>
      </section>
    </div>
  );
}
