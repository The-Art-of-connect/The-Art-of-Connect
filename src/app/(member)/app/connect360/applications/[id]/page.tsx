import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { saveChecklist, updateApplication } from "@/app/actions/radar";
import { APPLICATION_STATUS, OPPORTUNITY_KINDS, PIPELINE, deadlineLabel, normalizeChecklist } from "@/lib/radar";

export const metadata = { title: "Application · Application Center" };
export const dynamic = "force-dynamic";

const label = "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";
const OPEN = ["preparing", "submitted", "in_review"];

/** One application in the Application Center: status, deadline, documents checklist, notes, approved résumé and history. */
export default async function Application({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) notFound();
  const db = await createClient();
  if (!db) notFound();
  const { data: a } = await db.from("member_applications").select("*").eq("id", id).eq("user_id", viewer.id).maybeSingle();
  if (!a) notFound();
  const [{ data: history }, { data: resumes }, { data: opp }, { data: finding }] = await Promise.all([
    db.from("member_application_history").select("id, status, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    db.from("resumes").select("id, title, opportunity, approved_at").eq("user_id", viewer.id).eq("kind", "resume").eq("status", "approved").order("approved_at", { ascending: false }),
    a.opportunity_id ? db.from("radar_opportunities").select("title, organization, official_url, verified_on, status").eq("id", a.opportunity_id).maybeSingle() : Promise.resolve({ data: null }),
    a.finding_id ? db.from("intel_findings").select("assignment_id, title").eq("id", a.finding_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const items = normalizeChecklist(a.checklist);
  const done = items.filter((i) => i.done).length;
  const stage = PIPELINE.findIndex((p) => p.statuses.includes(a.status));
  const due = OPEN.includes(a.status) ? deadlineLabel(a.deadline) : null;
  const resume = (resumes ?? []).find((r) => r.id === a.resume_id);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow"><Link href="/app/connect360/applications" className="hover:underline">Application Center</Link> · {OPPORTUNITY_KINDS[a.kind] ?? "Other"}</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">{a.title}</h1>
      {a.organization && <p className="mt-1 text-muted">{a.organization}</p>}
      <p className="mt-3 text-sm text-gold">{[APPLICATION_STATUS[a.status], due, items.length ? `${done} of ${items.length} documents ready` : null].filter(Boolean).join(" · ")}</p>

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Pipeline">
        {PIPELINE.map((p, i) => (
          <li key={p.key} className={`rounded-xl border px-3 py-2 text-center text-xs ${i === stage ? "border-gold bg-gold/10 font-semibold" : i < stage ? "border-line text-muted" : "border-line text-faint"}`} aria-current={i === stage ? "step" : undefined}>{p.label}</li>
        ))}
      </ol>

      {(opp || finding || a.official_url) && (
        <section className="glass mt-6 p-5 text-sm">
          {opp && <p>From your Opportunity Radar: <span className="font-semibold">{opp.title}</span>, {opp.organization}{opp.status !== "published" ? " (no longer listed)" : ""}. <span className="text-xs text-faint">Confirmed at the official source on {opp.verified_on}.</span></p>}
          {finding && <p className={opp ? "mt-2" : ""}>From your research: <Link href={`/app/connect360/intelligence/${finding.assignment_id}`} className="text-gold underline">{finding.title}</Link></p>}
          {a.official_url && <p className={opp || finding ? "mt-2" : ""}><a href={a.official_url} target="_blank" rel="noreferrer" className="text-gold underline">Official application page ↗</a> <span className="text-xs text-faint">· submit there yourself</span></p>}
        </section>
      )}

      <section className="glass mt-8 p-6">
        <h2 className="display text-2xl">Documents and steps</h2>
        <p className="mt-1 text-sm text-muted">A checklist only: keep the documents themselves wherever you normally do. Tick what&apos;s ready, or edit the list.</p>
        <MemberForm action={saveChecklist} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={a.id} />
          {items.length > 0 ? (
            <ul className="space-y-2">{items.map((i, n) => (
              <li key={`${n}-${i.label}`}><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="done" value={String(n)} defaultChecked={i.done} className="h-4 w-4" /><span className={i.done ? "text-muted line-through" : ""}>{i.label}</span></label></li>
            ))}</ul>
          ) : <p className="text-sm text-muted">No items yet. Add the documents and steps this application asks for, one per line.</p>}
          <details open={items.length === 0}>
            <summary className="cursor-pointer text-sm text-gold">Edit the list</summary>
            <textarea name="items" rows={5} maxLength={12000} defaultValue={items.map((i) => i.label).join("\n")} className="field mt-2 w-full" aria-label="Documents and steps, one per line" placeholder={"Résumé\nCover letter\nTwo references"} />
          </details>
          <button className="btn btn-gold btn-sm">Save checklist</button>
        </MemberForm>
      </section>

      <section className="glass mt-8 p-6">
        <h2 className="display text-2xl">Status and details</h2>
        <MemberForm action={updateApplication} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={a.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm"><span className={label}>Opportunity</span><input name="title" required minLength={3} maxLength={200} defaultValue={a.title} className="field w-full" /></label>
            <label className="block text-sm"><span className={label}>Organization</span><input name="organization" maxLength={200} defaultValue={a.organization ?? ""} className="field w-full" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm"><span className={label}>Status</span><select name="status" defaultValue={a.status} className="field w-full">{Object.entries(APPLICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="block text-sm"><span className={label}>Deadline</span><input type="date" name="deadline" defaultValue={a.deadline ?? ""} className="field w-full" /></label>
            <label className="block text-sm"><span className={label}>Submitted on</span><input type="date" name="submitted_on" defaultValue={a.submitted_on ?? ""} className="field w-full" /></label>
          </div>
          <label className="block text-sm"><span className={label}>Official link</span><input type="url" name="official_url" maxLength={1000} pattern="https://.*" defaultValue={a.official_url ?? ""} className="field w-full" placeholder="https://" /></label>
          <label className="block text-sm"><span className={label}>Résumé for this application</span>
            <select name="resume_id" defaultValue={a.resume_id ?? ""} className="field w-full">
              <option value="">None selected</option>
              {(resumes ?? []).map((r) => <option key={r.id} value={r.id}>{r.title}{r.opportunity ? ` · ${r.opportunity}` : ""}</option>)}
            </select>
            <span className="mt-1 block text-xs text-faint">{(resumes ?? []).length ? "Only résumés you have approved are listed." : <>You haven&apos;t approved a résumé yet. <Link href="/app/career" className="text-gold underline">Prepare one in My Professional Readiness</Link>.</>}</span>
          </label>
          <label className="block text-sm"><span className={label}>Notes (private)</span><textarea name="note" rows={4} maxLength={4000} defaultValue={a.note ?? ""} className="field w-full" placeholder="Contacts you've spoken with publicly, interview dates, what to prepare next…" /></label>
          <button className="btn btn-gold btn-sm">Save changes</button>
        </MemberForm>
        {resume && <p className="mt-3 text-xs text-muted">Linked résumé: <Link href={`/app/career/resume/${resume.id}`} className="text-gold underline">{resume.title}</Link></p>}
      </section>

      <section className="mt-8">
        <h2 className="display text-2xl">History</h2>
        <ul className="glass mt-3 divide-y divide-line text-sm">{(history ?? []).map((h) => (
          <li key={h.id} className="flex justify-between gap-3 px-5 py-3"><span>{APPLICATION_STATUS[h.status] ?? h.status}</span><span className="text-xs text-faint">{new Date(h.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></li>
        ))}</ul>
        <p className="mt-2 text-xs text-faint">Every status change is kept, so you can always see how an application progressed.</p>
      </section>
      <p className="mt-10 text-center text-sm"><Link href="/app/connect360/applications" className="text-gold underline">Back to the Application Center</Link></p>
    </div>
  );
}
