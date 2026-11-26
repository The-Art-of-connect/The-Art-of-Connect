import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveTrainingCategory } from "@/app/actions/journey-training";
import { ActionForm } from "@/components/admin/ActionForm";
import { NotConnected, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Journey consolidated review" };
export const dynamic = "force-dynamic";

/** Everything that shapes Journey, on one page: the Blueprint and every training entry by category. */
export default async function JourneyReview() {
  await requireStaff(["owner", "executive"]);
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Journey" title="Consolidated review" /><NotConnected /></>;
  const [{ data: versions }, { data: cats }, { data: entries }] = await Promise.all([
    supabase.from("journey_instruction_versions").select("version, status, body, note, created_at").order("version", { ascending: false }).limit(1),
    supabase.from("journey_training_categories").select("key, title, description, status, learning_objectives").order("sort"),
    supabase.from("journey_training_entries").select("id, category, topic, scenario, founder_principles, interpretation, approach, example_response, follow_ups, safety, status, founder_question, origin").order("created_at"),
  ]);
  const blueprint = versions?.[0];
  const list = entries ?? [];

  return (
    <>
      <Link href="/admin/journey" className="text-sm text-gold">← Journey Intelligence Center</Link>
      <PageHeader eyebrow="Journey" title="Consolidated review" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Journey&rsquo;s Blueprint and all {list.length} training entries in one place. Approve a whole category here, or open any entry to edit it in your own words. Nothing reaches members until you approve it, and Journey&rsquo;s personality stays unpublished until you publish it.</p>

      <nav className="mb-8 flex flex-wrap gap-2 text-sm">
        <a href="#blueprint" className="chip chip-locked">Blueprint</a>
        {(cats ?? []).map((c) => <a key={c.key} href={`#${c.key}`} className={`chip ${c.status === "approved" ? "chip-live" : "chip-locked"}`}>{c.title}</a>)}
      </nav>

      <section id="blueprint" className="glass scroll-mt-24 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-3xl">Journey Master Blueprint {blueprint ? `· version ${blueprint.version}` : ""}</h2>
          <span className={`chip ${blueprint?.status === "published" ? "chip-live" : "chip-locked"}`}>{blueprint?.status === "published" ? "Published" : "Draft (unpublished)"}</span>
        </div>
        {blueprint ? <div className="mt-4 max-h-[36rem] overflow-y-auto whitespace-pre-wrap rounded-xl bg-ivory/60 p-5 text-sm leading-relaxed">{blueprint.body}</div> : <p className="mt-3 text-sm text-muted">No Blueprint saved yet.</p>}
        <Link href="/admin/journey/personality" className="btn btn-ghost btn-sm mt-4">Edit or publish the Blueprint</Link>
      </section>

      {(cats ?? []).map((c) => {
        const mine = list.filter((e) => e.category === c.key);
        return (
          <section key={c.key} id={c.key} className="mt-10 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="display text-3xl">{c.title}</h2>
                <p className="text-sm text-muted">{c.description}</p>
                <p className="mt-1 text-xs text-faint">{mine.filter((e) => e.status === "approved").length} approved · {mine.filter((e) => e.status === "pending").length} awaiting review · {mine.filter((e) => e.status === "rejected").length} rejected</p>
              </div>
              <ActionForm action={approveTrainingCategory} className="flex items-center gap-2">
                <input type="hidden" name="category" value={c.key} />
                <button className="btn btn-gold btn-sm">{c.status === "approved" ? "Approve new entries" : "Approve this category"}</button>
              </ActionForm>
            </div>
            <div className="mt-4 space-y-3">
              {mine.map((e) => (
                <details key={e.id} className="glass overflow-hidden !p-0">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <span className="font-semibold">{e.topic}</span>
                    <span className={`chip ${e.status === "approved" ? "chip-live" : "chip-locked"}`}>{e.founder_question ? "Decision needed" : e.status === "approved" ? "Approved" : e.status === "rejected" ? "Rejected" : "Awaiting review"}</span>
                  </summary>
                  <div className="space-y-3 border-t border-line px-5 py-4 text-sm">
                    <p><span className="eyebrow block">Member scenario</span>{e.scenario}</p>
                    <div><span className="eyebrow block">Founder principles</span><ul className="mt-1 list-disc space-y-1 pl-5">{e.founder_principles.map((pr: string) => <li key={pr}>{pr}</li>)}</ul></div>
                    {e.interpretation && <p><span className="eyebrow block">AI interpretation</span>{e.interpretation}</p>}
                    <p><span className="eyebrow block">Approach</span>{e.approach}</p>
                    <p className="rounded-xl bg-champagne/15 p-3"><span className="eyebrow block">Example Journey response</span>{e.example_response}</p>
                    <p><span className="eyebrow block">Follow-up questions</span>{e.follow_ups.join(" · ")}</p>
                    <p><span className="eyebrow block">Safety</span>{e.safety}</p>
                    <Link href={`/admin/journey/training/${c.key}`} className="text-gold">Edit, approve or reject this entry →</Link>
                  </div>
                </details>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
