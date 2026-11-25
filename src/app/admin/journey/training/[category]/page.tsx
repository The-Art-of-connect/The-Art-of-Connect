import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FOUNDER_PRINCIPLES } from "@/lib/journey-training-seed";
import { TRAINING_CATEGORY_KEYS } from "@/lib/journey-training";
import { approveTrainingCategory, draftTrainingEntries, reviewTrainingEntry, saveTrainingEntry } from "@/app/actions/journey-training";
import { ActionForm } from "@/components/admin/ActionForm";
import { NotConnected, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Training category" };
export const dynamic = "force-dynamic";

const Founder = () => <span className="chip chip-live mr-2 shrink-0">Founder</span>;
const AI = () => <span className="chip chip-locked mr-2 shrink-0">AI interpretation</span>;

export default async function TrainingCategory({ params }: { params: Promise<{ category: string }> }) {
  const viewer = await requireStaff(["owner", "executive"]);
  const key = (await params).category;
  if (!(TRAINING_CATEGORY_KEYS as readonly string[]).includes(key)) notFound();
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Training Library" title={key} /><NotConnected /></>;
  const [{ data: cat }, { data: entries }] = await Promise.all([
    supabase.from("journey_training_categories").select("*").eq("key", key).single(),
    supabase.from("journey_training_entries").select("*").eq("category", key).order("created_at"),
  ]);
  if (!cat) notFound();
  const order = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  const list = (entries ?? []).sort((a, b) => order[a.status] - order[b.status]);

  return (
    <>
      <Link href="/admin/journey/training" className="text-sm text-gold">← Knowledge &amp; Training Library</Link>
      <PageHeader eyebrow="Training Library" title={cat.title} />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">{cat.description}</p>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {list.length === 0 && <p className="text-sm text-muted">No entries yet. Load the starter library or draft new entries with Journey.</p>}
          {list.map((e) => (
            <details key={e.id} className={`glass overflow-hidden !p-0 ${e.status === "rejected" ? "opacity-60" : ""}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4">
                <span className="font-semibold">{e.topic}</span>
                <span className="flex gap-2 text-xs">
                  {e.founder_question && <span className="chip chip-locked">Decision needed</span>}
                  <span className={`chip ${e.status === "approved" ? "chip-live" : "chip-locked"}`}>{e.status === "approved" ? "Approved" : e.status === "rejected" ? "Rejected" : "Awaiting review"}</span>
                  <span className="chip chip-locked">{e.origin === "edited" ? "Edited by founder" : e.source === "generator" ? "Drafted by Journey" : "Starter draft"}</span>
                </span>
              </summary>
              <div className="space-y-4 border-t border-line px-5 py-5 text-sm">
                <p><span className="eyebrow block">Member scenario</span>{e.scenario}</p>
                <div><span className="eyebrow block">Relevant founding principles</span>
                  <ul className="mt-1 space-y-1">{e.founder_principles.map((p: string) => <li key={p} className="flex items-start"><Founder />{p}</li>)}</ul>
                </div>
                {e.interpretation && <p className="flex items-start"><AI />{e.interpretation}</p>}
                {e.founder_question && <p className="rounded-xl bg-champagne/20 p-3"><strong>Decision needed:</strong> {e.founder_question} <Link href="/admin/journey/training" className="text-gold">Answer it →</Link></p>}
                {e.reviewer_note && <p className="text-xs text-muted">Your note: {e.reviewer_note}</p>}

                <ActionForm action={saveTrainingEntry} className="space-y-3 rounded-xl border border-line p-4">
                  <input type="hidden" name="id" value={e.id} />
                  <label className="block space-y-1"><span className="font-semibold">Educational topic</span><input name="topic" defaultValue={e.topic} className="field" /></label>
                  <label className="block space-y-1"><span className="font-semibold">Example member scenario</span><textarea name="scenario" defaultValue={e.scenario} rows={2} className="field" /></label>
                  <label className="block space-y-1"><span className="font-semibold">Interpretation (AI-generated unless you edit it)</span><textarea name="interpretation" defaultValue={e.interpretation} rows={2} className="field" /></label>
                  <label className="block space-y-1"><span className="font-semibold">Recommended conversational approach</span><textarea name="approach" defaultValue={e.approach} rows={3} className="field" /></label>
                  <label className="block space-y-1"><span className="font-semibold">Example Journey response</span><textarea name="example_response" defaultValue={e.example_response} rows={5} className="field" /></label>
                  <label className="block space-y-1"><span className="font-semibold">Follow-up questions (one per line)</span><textarea name="follow_ups" defaultValue={e.follow_ups.join("\n")} rows={3} className="field" /></label>
                  <label className="block space-y-1"><span className="font-semibold">Safety &amp; professional referral considerations</span><textarea name="safety" defaultValue={e.safety} rows={2} className="field" /></label>
                  <button className="btn btn-gold btn-sm">Save in my words{e.founder_question ? "" : " & approve"}</button>
                </ActionForm>

                <div className="flex flex-wrap gap-2">
                  {e.status !== "approved" && !e.founder_question && (
                    <ActionForm action={reviewTrainingEntry}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="decision" value="approve" /><button className="btn btn-ghost btn-sm">Approve as written</button></ActionForm>
                  )}
                  {e.status !== "rejected" ? (
                    <ActionForm action={reviewTrainingEntry} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={e.id} /><input type="hidden" name="decision" value="reject" /><input name="note" placeholder="Why it doesn't fit (optional)" className="field !py-1.5 text-sm" /><button className="btn btn-ghost btn-sm">Reject</button></ActionForm>
                  ) : (
                    <ActionForm action={reviewTrainingEntry}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="decision" value="restore" /><button className="btn btn-ghost btn-sm">Return to review</button></ActionForm>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>

        <aside className="space-y-6">
          <Panel title="Approve this category">
            <ActionForm action={approveTrainingCategory} className="space-y-3 p-5">
              <input type="hidden" name="category" value={key} />
              <p className="text-sm text-muted">Approves every entry awaiting review in one step. Rejected entries and entries waiting on your decision are left alone.</p>
              <button className="btn btn-gold btn-sm">Approve {cat.title}</button>
            </ActionForm>
          </Panel>

          {viewer.roles.includes("owner") && (
            <Panel title="Draft more with Journey">
              <ActionForm action={draftTrainingEntries} className="space-y-3 p-5">
                <input type="hidden" name="category" value={key} />
                <p className="text-sm text-muted">Journey drafts two new scenarios grounded only in your principles below. This uses OpenAI and your private owner test budget (a few cents), never members&rsquo; allowances. Drafts wait for your review.</p>
                <input name="hint" placeholder="Optional focus, e.g. blended families" className="field" />
                <button className="btn btn-ghost btn-sm">Draft 2 new entries</button>
              </ActionForm>
            </Panel>
          )}

          <Panel title="Learning objectives">
            <ul className="space-y-2 p-5 text-sm">{(cat.learning_objectives ?? []).map((x: string) => <li key={x}>✦ {x}</li>)}</ul>
          </Panel>
          <Panel title="Founder principles for this category">
            <ul className="space-y-2 p-5 text-sm">{(FOUNDER_PRINCIPLES[key] ?? []).map((p) => <li key={p} className="flex items-start"><Founder />{p}</li>)}</ul>
          </Panel>
          {cat.founder_decisions?.length ? (
            <Panel title="Your decisions">
              <ul className="space-y-2 p-5 text-sm">{cat.founder_decisions.map((p: string) => <li key={p} className="flex items-start"><Founder />{p}</li>)}</ul>
            </Panel>
          ) : null}
        </aside>
      </div>
    </>
  );
}
