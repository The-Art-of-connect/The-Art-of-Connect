import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, hasPaidAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeLetter, normalizeResume } from "@/lib/resume";
import { ResumeEditor } from "@/components/ResumeEditor";
import { MemberForm } from "@/components/MemberForm";
import { approveResume, deleteResume, duplicateResume, restoreVersion, saveVersion, setPortfolio, tailorResume } from "@/app/actions/resume";

export const metadata = { title: "Edit résumé" };
export const dynamic = "force-dynamic";

export default async function EditResume({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  const db = await createClient();
  const { data: r } = db ? await db.from("resumes").select("*").eq("id", id).maybeSingle() : { data: null };
  if (!r) notFound();
  const { data: versions } = await db!.from("resume_versions").select("id, version, label, created_at").eq("resume_id", id).order("version", { ascending: false });
  const kind = r.kind as "resume" | "letter";
  const data = kind === "letter" ? normalizeLetter(r.data) : normalizeResume(r.data);
  const paid = hasPaidAccess(viewer);
  const review = (r.review ?? {}) as { questions?: string[]; changes?: string[]; from?: string };

  return (
    <>
      <nav className="mb-4 text-sm"><Link href="/app/career" className="text-gold underline">My Professional Readiness</Link> <span className="text-faint">/</span> <Link href="/app/career/resume" className="text-gold underline">Résumé Builder</Link></nav>

      {r.status === "pending_approval" && (
        <section className="glass mb-6 border-[var(--champagne)] p-6">
          <p className="eyebrow">Journey&apos;s enhanced draft · awaiting your approval</p>
          <p className="mt-2 text-sm text-muted">Journey refined the wording and structure of {review.from ? <strong>{review.from}</strong> : "your résumé"} using only what you wrote. Your original file is kept unchanged. Please read every line, make any corrections, and approve it only if everything is accurate.</p>
          {review.questions?.length ? <div className="mt-4"><p className="font-semibold">Journey&apos;s questions for you</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{review.questions.map((q) => <li key={q}>{q}</li>)}</ul><p className="mt-2 text-xs text-faint">Add the answers yourself where they&apos;re true. If something doesn&apos;t apply, simply leave it out.</p></div> : null}
          {review.changes?.length ? <details className="mt-3 text-sm"><summary className="cursor-pointer text-gold">What Journey changed</summary><ul className="mt-2 list-disc pl-5 text-muted">{review.changes.map((c) => <li key={c}>{c}</li>)}</ul></details> : null}
        </section>
      )}

      <ResumeEditor id={r.id} kind={kind} title={r.title} template={r.template} data={data} />

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <section className="glass p-5">
          <p className="eyebrow">Download</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href={`/api/resume/${r.id}/pdf`} className="btn btn-gold btn-sm">PDF</a>
            <a href={`/api/resume/${r.id}/docx`} className="btn btn-ghost btn-sm">Word (.docx)</a>
          </div>
          <p className="mt-2 text-xs text-faint">Save your changes first; downloads use your saved version.</p>
        </section>

        {kind === "resume" && (
          <section className="glass p-5">
            <p className="eyebrow">Approve</p>
            {r.status === "approved"
              ? <p className="mt-2 text-sm">Approved {new Date(r.approved_at).toLocaleDateString()}.{r.is_master ? " This is your master professional history." : ""} Editing it returns it to draft until you approve again.</p>
              : (
                <MemberForm action={approveResume} className="mt-2 space-y-2 text-sm">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="flex gap-2"><input type="checkbox" name="accurate" />Everything in this résumé is accurate and my own.</label>
                  <label className="flex gap-2"><input type="checkbox" name="master" defaultChecked={!r.parent_id} />Make this my master professional history</label>
                  <button className="btn btn-gold btn-sm">Approve</button>
                </MemberForm>
              )}
            <MemberForm action={tailorResume} className="mt-4 flex flex-wrap gap-2 text-sm">
              <input type="hidden" name="id" value={r.id} />
              <input name="opportunity" className="field min-w-0 flex-1" placeholder="Tailor a copy for… (role or opportunity)" />
              <button className="btn btn-ghost btn-sm">Create</button>
            </MemberForm>
            {paid
              ? <MemberForm action={setPortfolio} className="mt-3 text-sm"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="on" value={r.portfolio_authorized ? "0" : "1"} /><button className="text-gold underline">{r.portfolio_authorized ? "Remove from my Opportunity Portfolio" : "Authorize for my Opportunity Portfolio"}</button></MemberForm>
              : <p className="mt-3 text-xs text-faint">Journey&apos;s personalized help and the Opportunity Portfolio are part of paid memberships.</p>}
          </section>
        )}

        <section className="glass p-5">
          <p className="eyebrow">Versions</p>
          <MemberForm action={saveVersion} className="mt-2 flex gap-2 text-sm">
            <input type="hidden" name="id" value={r.id} />
            <input name="label" className="field min-w-0 flex-1" placeholder="Label (optional)" />
            <button className="btn btn-ghost btn-sm">Save version</button>
          </MemberForm>
          <ul className="mt-3 space-y-2 text-sm">
            {(versions ?? []).slice(0, 8).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2">
                <span>v{v.version}{v.label ? ` · ${v.label}` : ""} <span className="text-xs text-faint">{new Date(v.created_at).toLocaleDateString()}</span></span>
                <MemberForm action={restoreVersion}><input type="hidden" name="version_id" value={v.id} /><button className="text-xs text-gold underline">Restore</button></MemberForm>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-3 text-xs">
            <MemberForm action={duplicateResume}><input type="hidden" name="id" value={r.id} /><button className="text-muted underline">Duplicate</button></MemberForm>
            <MemberForm action={deleteResume} className="flex items-center gap-2"><input type="hidden" name="id" value={r.id} /><label className="flex items-center gap-1"><input type="checkbox" name="confirm" />Confirm</label><button className="text-danger underline">Delete</button></MemberForm>
          </div>
        </section>
      </div>
    </>
  );
}
