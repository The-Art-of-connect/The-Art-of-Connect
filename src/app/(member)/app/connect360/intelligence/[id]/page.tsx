import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { assignmentAction, beginResearch, refreshResearch, requestCorrection, saveFinding } from "@/app/actions/intelligence";
import { CATEGORY_LABEL } from "@/lib/connect360";

export const metadata = { title: "Research assignment · My Intelligence Office" };
export const dynamic = "force-dynamic";

const VERIFY: Record<string, { label: string; chip: string; note: string }> = {
  confirmed: { label: "Confirmed", chip: "chip-live", note: "Supported by an official source." },
  corroborated: { label: "Corroborated", chip: "chip-live", note: "Supported by more than one source or an official source." },
  unverified: { label: "Unverified", chip: "chip-locked", note: "Reported, but not independently confirmed." },
  suggestion: { label: "Lead to explore", chip: "chip-locked", note: "A discovery worth reviewing; not yet verified." },
  conflicting: { label: "Conflicting", chip: "chip-danger", note: "Sources disagree." },
  outdated: { label: "Possibly outdated", chip: "chip-danger", note: "The source may be old." },
  self_reported: { label: "Self-reported", chip: "chip-locked", note: "Stated by the organization itself." },
  unresolved_concern: { label: "Unresolved concern", chip: "chip-danger", note: "Something to look into further." },
  not_established: { label: "Not established", chip: "chip-locked", note: "Couldn't be determined from public sources." },
};
const ORDER = ["confirmed", "corroborated", "unverified", "unresolved_concern", "conflicting", "outdated", "self_reported", "not_established", "suggestion"];
type Finding = { id: string; kind: string; title: string; detail: string | null; verification: string; saved: boolean; intel_sources: { url: string; title: string | null; publisher: string | null; authoritative: boolean; provider: string | null }[] };

export default async function Assignment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  const db = (await createClient())!;
  const { data: a } = await db.from("intel_assignments").select("*").eq("id", id).maybeSingle();
  if (!a || a.user_id !== viewer.id) notFound();
  const [{ data: findings }, { data: events }, { data: reports }, { data: jobs }] = await Promise.all([
    db.from("intel_findings").select("id, kind, title, detail, verification, saved, intel_sources(url, title, publisher, authoritative, provider)").eq("assignment_id", id).order("created_at"),
    db.from("intel_events").select("id, actor, action, detail, created_at").eq("assignment_id", id).order("created_at", { ascending: false }).limit(30),
    db.from("intel_reports").select("version, summary, created_at").eq("assignment_id", id).order("version", { ascending: false }).limit(1),
    db.from("intel_jobs").select("status").eq("assignment_id", id),
  ]);
  const plan = (a.requirements?.plan ?? null) as { summary: string; clarifying: string[]; discovery: string[]; investigation: string } | null;
  const list = ((findings ?? []) as Finding[]).sort((x, y) => ORDER.indexOf(x.verification) - ORDER.indexOf(y.verification));
  const running = (jobs ?? []).some((j) => j.status === "running" || j.status === "queued");
  const report = reports?.[0];

  return (
    <>
      <Link href="/app/connect360/intelligence" className="text-sm text-gold">← My Intelligence Office</Link>
      <section className="theme-dark relative mt-4 overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10" style={{ background: "var(--ink)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--glow)" }} aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow">{CATEGORY_LABEL[a.category]} · {a.depth === "deep" ? "In-depth research" : "Standard research"}</p>
          <h1 className="display mt-3 text-4xl text-gold-bright sm:text-5xl">{a.title}</h1>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-muted">{a.objective}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {["draft", "complete", "paused", "needs_member", "queued"].includes(a.status) && !running && (
              <MemberForm action={beginResearch}><input type="hidden" name="id" value={id} /><button className="btn btn-gold">{a.status === "complete" ? "Research further" : "Begin research with Journey"}</button></MemberForm>
            )}
            {running && <MemberForm action={refreshResearch}><input type="hidden" name="id" value={id} /><button className="btn btn-ghost btn-sm">Check for new results</button></MemberForm>}
            {["queued", "researching", "verifying"].includes(a.status) && <MemberForm action={assignmentAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="paused" /><button className="btn btn-ghost btn-sm">Pause</button></MemberForm>}
            {!["complete", "cancelled"].includes(a.status) && <MemberForm action={assignmentAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="cancelled" /><button className="btn btn-ghost btn-sm">Cancel</button></MemberForm>}
          </div>
          <p className="mt-4 text-xs text-faint">Journey&apos;s planning uses one message from your Journey allowance. Research partners&apos; costs are covered within your membership&apos;s research allowance.</p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {report && <section className="glass border-[var(--champagne)] p-6"><p className="eyebrow">Report · version {report.version}</p><p className="display mt-2 text-2xl">Your research is ready</p><p className="mt-2 text-sm text-muted">{report.summary}</p></section>}
          {plan && (
            <section className="glass p-6 text-sm">
              <p className="eyebrow">Journey&apos;s research plan</p>
              <p className="mt-2">{plan.summary}</p>
              <p className="mt-3 text-xs text-muted"><span className="font-semibold text-text">Investigating: </span>{plan.investigation}</p>
              <p className="mt-1 text-xs text-muted"><span className="font-semibold text-text">Discovering: </span>{plan.discovery.join(" · ")}</p>
              {plan.clarifying.length > 0 && <div className="mt-3"><p className="font-semibold">Journey&apos;s questions for you</p><ul className="mt-1 list-disc pl-5 text-muted">{plan.clarifying.map((q) => <li key={q}>{q}</li>)}</ul><p className="mt-1 text-xs text-faint">Answer them as an instruction below, then research further.</p></div>}
            </section>
          )}
          <section className="space-y-4">
            {list.map((f) => {
              const v = VERIFY[f.verification] ?? VERIFY.unverified;
              return (
                <article key={f.id} className="glass p-6 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2"><p className="display text-xl">{f.title}</p><span className={`chip ${v.chip}`} title={v.note}>{v.label}</span></div>
                  {f.detail && <p className="mt-2 whitespace-pre-line text-muted">{f.detail}</p>}
                  {f.intel_sources.length > 0 && <ul className="mt-3 space-y-1 text-xs">{f.intel_sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer nofollow" className="text-gold underline">{s.title || s.publisher || s.url}</a>{s.authoritative && <span className="ml-2 text-success">official source</span>}</li>)}</ul>}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                    <MemberForm action={saveFinding}><input type="hidden" name="id" value={id} /><input type="hidden" name="finding" value={f.id} /><input type="hidden" name="saved" value={f.saved ? "0" : "1"} /><button className="text-gold underline">{f.saved ? "★ Saved" : "☆ Save"}</button></MemberForm>
                    <details><summary className="cursor-pointer text-muted underline">Report an inaccuracy</summary>
                      <MemberForm action={requestCorrection} className="mt-2 space-y-2"><input type="hidden" name="finding" value={f.id} /><input type="hidden" name="subject" value={f.title} />
                        <textarea name="explanation" rows={2} className="field w-full" placeholder="What's inaccurate?" /><input name="evidence" className="field w-full" placeholder="Supporting link (https://…, optional)" /><button className="btn btn-ghost btn-sm">Submit</button></MemberForm>
                    </details>
                  </div>
                </article>
              );
            })}
            {!list.length && <p className="glass p-6 text-sm text-muted">{running ? "Research is underway. Results appear here as they arrive." : "No findings yet. Begin research when you're ready."}</p>}
          </section>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <MemberForm action={assignmentAction} className="glass space-y-2 p-6 text-sm">
            <p className="eyebrow">Add an instruction</p>
            <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="instruct" />
            <textarea name="detail" rows={3} className="field w-full" placeholder="Answers to Journey's questions, or anything to focus on next." />
            <button className="btn btn-ghost btn-sm">Add</button>
          </MemberForm>
          <section className="glass p-6 text-sm">
            <p className="eyebrow">History</p>
            <ul className="mt-3 space-y-2 text-xs">{(events ?? []).map((e) => <li key={e.id}><span className="font-semibold capitalize">{e.actor}</span> · {new Date(e.created_at).toLocaleString()}<span className="block text-muted">{e.detail}</span></li>)}</ul>
          </section>
        </aside>
      </div>
    </>
  );
}
