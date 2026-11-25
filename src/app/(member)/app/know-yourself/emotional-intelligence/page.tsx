import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EI_AREAS, EI_KEYS, EI_PROFILE } from "@/lib/emotional-intelligence";
import { saveEIReflections } from "@/app/actions/emotional-intelligence";
import { ActionForm } from "@/components/admin/ActionForm";
import { EIIcon } from "@/components/EIIcon";
import { EIJourneyBand } from "@/components/EIJourneyBand";

export const metadata = { title: "My Emotional Intelligence Profile" };
export const dynamic = "force-dynamic";

export default async function EIProfile() {
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer);
  const supabase = (await createClient())!;
  const [{ data: rows }, { data: history }] = preview ? [{ data: [] }, { data: [] }] : await Promise.all([
    supabase.from("discovery_answers").select("question_key, answer, updated_at").eq("user_id", viewer.id).in("question_key", EI_KEYS),
    supabase.from("discovery_history").select("question_key, recorded_at").eq("user_id", viewer.id).in("question_key", EI_KEYS),
  ]);
  const saved = Object.fromEntries((rows ?? []).map((r) => [r.question_key, r.answer ?? ""]));
  const versions = (history ?? []).length;

  return (
    <div className="space-y-10">
      <header>
        <Link href="/app/know-yourself" className="text-sm text-burgundy">← The Art of Knowing Yourself</Link>
        <p className="display mt-6 text-3xl italic text-burgundy">The Art of</p>
        <h1 className="display text-5xl sm:text-6xl">Emotional Intelligence</h1>
        <p className="display mt-2 text-2xl italic text-text/80">My private profile</p>
        <div className="mt-5 h-px w-24 bg-gold" />
        <p className="mt-5 max-w-2xl text-muted">An optional, evolving reflection — never a label or a diagnosis. Update it whenever you notice something new; your earlier words are kept privately so you can see how you’ve grown.</p>
      </header>

      <section aria-label="Lessons" className="grid gap-3 sm:grid-cols-5">
        {EI_AREAS.map((a) => {
          const done = a.reflections.filter((r) => saved[r.key]).length;
          return (
            <Link key={a.slug} href={`/emotional-intelligence/${a.slug}`} className="flex flex-col items-center rounded-2xl border border-champagne/70 bg-ivory/70 p-4 text-center transition hover:border-gold">
              <span className="text-gold"><EIIcon name={a.icon} className="h-7 w-7" /></span>
              <span className="display mt-2 text-lg text-burgundy">{a.title}</span>
              <span className="text-xs text-muted">{done ? `${done} of ${a.reflections.length} reflections` : "Explore"}</span>
            </Link>
          );
        })}
      </section>

      <ActionForm action={saveEIReflections} className="rounded-[22px] border border-champagne/70 bg-ivory/70 p-6 sm:p-9">
        <div className="grid gap-5 md:grid-cols-2">
          {EI_PROFILE.map((p) => (
            <label key={p.key} className="block space-y-1.5">
              <span className="font-semibold">{p.label}</span>
              <textarea name={p.key} defaultValue={saved[p.key] ?? ""} maxLength={4000} rows={3} className="field" />
            </label>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="rounded-xl bg-burgundy px-6 py-3 font-medium text-ivory" disabled={preview}>Save privately</button>
          {versions > 0 && <Link href="/app/know-yourself/growth" className="text-sm text-burgundy underline-offset-4 hover:underline">See how I’ve grown →</Link>}
        </div>
        <p className="mt-4 text-xs text-muted">Visible only to you — never to matches, partners, business connections, providers or our team.</p>
      </ActionForm>

      <EIJourneyBand ask="I’d like to explore my emotional patterns and how I respond to conflict." title="Reflect with Journey" body="Talk through your patterns, triggers and growth privately — Journey helps you notice, never labels." />
    </div>
  );
}
