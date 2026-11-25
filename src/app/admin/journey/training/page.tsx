import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RESPONSE_STANDARDS } from "@/lib/journey-training-seed";
import { answerFounderQuestion, loadStarterLibrary } from "@/app/actions/journey-training";
import { ActionForm } from "@/components/admin/ActionForm";
import { NotConnected, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Journey Knowledge & Training Library" };
export const dynamic = "force-dynamic";

export default async function TrainingLibrary() {
  await requireStaff(["owner", "executive"]);
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Journey" title="Knowledge & Training Library" /><NotConnected /></>;
  const [{ data: cats }, { data: entries }] = await Promise.all([
    supabase.from("journey_training_categories").select("key, title, description, status, founder_decisions").order("sort"),
    supabase.from("journey_training_entries").select("id, category, topic, scenario, status, founder_question"),
  ]);
  const all = entries ?? [];
  const decisions = all.filter((e) => e.founder_question && e.status !== "rejected");
  const count = (k: string, s: string) => all.filter((e) => e.category === k && e.status === s).length;

  return (
    <>
      <Link href="/admin/journey" className="text-sm text-gold">← Journey Intelligence Center</Link>
      <PageHeader eyebrow="Journey" title="Knowledge & Training Library" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">
        Journey learns from your principles, not from hundreds of answers you write by hand. Each entry shows your <strong>founder-approved principles</strong> (quoted word for word) separately from the <strong>AI-generated interpretation</strong>.
        Approve whole categories, edit any response or reject what doesn&rsquo;t fit your vision. Only approved entries ever reach members.
      </p>

      {all.length === 0 && (
        <Panel title="Get started">
          <ActionForm action={loadStarterLibrary} className="space-y-3 p-5">
            <p className="text-sm text-muted">Load your founding principles, learning objectives, response standards and 28 starter entries across all 14 categories. They arrive as drafts for your review; nothing reaches members yet.</p>
            <button className="btn btn-gold btn-sm">Load the starter library</button>
          </ActionForm>
        </Panel>
      )}

      {decisions.length > 0 && (
        <Panel title={`Decisions for you (${decisions.length})`}>
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted">These need a genuinely new philosophical decision. Your answer becomes a founder decision Journey follows across the whole category.</p>
            {decisions.map((e) => (
              <ActionForm key={e.id} action={answerFounderQuestion} className="space-y-2 rounded-xl border border-champagne/60 p-4">
                <input type="hidden" name="id" value={e.id} />
                <p className="text-xs uppercase tracking-wide text-gold-deep">{cats?.find((c) => c.key === e.category)?.title} · {e.topic}</p>
                <p className="font-semibold">{e.founder_question}</p>
                <textarea name="answer" rows={2} className="field" placeholder="Your decision, in your words" />
                <button className="btn btn-gold btn-sm">Record my decision</button>
              </ActionForm>
            ))}
          </div>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Categories">
          <ul className="divide-y divide-line">
            {(cats ?? []).map((c) => (
              <li key={c.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold">{c.title} <span className={`chip ml-2 ${c.status === "approved" ? "chip-live" : "chip-locked"}`}>{c.status === "approved" ? "Approved" : "In review"}</span></p>
                  <p className="text-xs text-muted">{count(c.key, "approved")} approved · {count(c.key, "pending")} awaiting review · {count(c.key, "rejected")} rejected{c.founder_decisions?.length ? ` · ${c.founder_decisions.length} founder decision${c.founder_decisions.length === 1 ? "" : "s"}` : ""}</p>
                </div>
                <Link href={`/admin/journey/training/${c.key}`} className="btn btn-ghost btn-sm">Review</Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Response standards (every category)">
          <ul className="space-y-3 p-5 text-sm">
            {RESPONSE_STANDARDS.map((s) => <li key={s} className="rounded-xl bg-champagne/15 p-3"><span className="chip chip-live mr-2">Founder</span>{s}</li>)}
          </ul>
        </Panel>
      </div>
    </>
  );
}
