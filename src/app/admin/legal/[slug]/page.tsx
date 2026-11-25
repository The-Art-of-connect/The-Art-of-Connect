import Link from "next/link";
import { notFound } from "next/navigation";
import { hasRole, requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { diffLines, diffStats } from "@/lib/diff";
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, type LegalStatus } from "@/lib/legal";
import { legalWorkflow, newLegalDraft, saveLegalDraft } from "@/app/actions/legal";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";
import { Markdown } from "@/components/Markdown";

export const dynamic = "force-dynamic";

const when = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—");
const EDITABLE: LegalStatus[] = ["draft", "pending_owner_review", "pending_legal_review"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint">{hint}</span>}
    </label>
  );
}

function Step({ id, slug, action, label, tone = "btn-ghost", children }: { id: string; slug: string; action: string; label: string; tone?: string; children?: React.ReactNode }) {
  return (
    <ActionForm action={legalWorkflow} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="action" value={action} />
      {children}
      <button className={`btn btn-sm ${tone}`}>{label}</button>
    </ActionForm>
  );
}

export default async function LegalDocumentPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string; compare?: string; with?: string; preview?: string }> }) {
  const viewer = await requireStaff(rolesFor("/admin/legal"));
  const isOwner = hasRole(viewer, ["owner"]);
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = (await createClient())!;
  const [{ data: doc }, { data: versions }, { data: acceptances, count: acceptCount }] = await Promise.all([
    supabase.from("legal_documents").select("*").eq("slug", slug).maybeSingle(),
    supabase.from("legal_document_versions").select("*").eq("document_slug", slug).order("created_at", { ascending: false }),
    supabase.from("legal_acceptances").select("accepted_email, version_label, context, accepted_at", { count: "exact" }).eq("document_slug", slug).order("accepted_at", { ascending: false }).limit(25),
  ]);
  if (!doc) notFound();
  const all = versions ?? [];
  const working = all.find((v) => EDITABLE.includes(v.status as LegalStatus));
  const selected = all.find((v) => v.id === sp.v) ?? working ?? all[0];
  const inEffect = all.find((v) => v.status === "published" || (v.status === "scheduled" && v.scheduled_for && new Date(v.scheduled_for) <= new Date()));
  const compareA = all.find((v) => v.id === sp.compare);
  const compareB = all.find((v) => v.id === sp.with);
  const diff = compareA && compareB ? diffLines(compareA.body, compareB.body) : null;
  const status = selected?.status as LegalStatus | undefined;
  const editable = selected && EDITABLE.includes(status!);

  return (
    <>
      <Link href="/admin/legal" className="text-sm text-gold hover:text-gold-bright">← Legal & Policy Center</Link>
      <PageHeader eyebrow={CATEGORY_LABEL[doc.category] ?? doc.category} title={doc.title}>
        {selected && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/legal/${slug}/print?v=${selected.id}`} className="nav-pill text-sm" target="_blank">Print</Link>
            <a href={`/admin/legal/${slug}/download?v=${selected.id}`} className="nav-pill text-sm">Download</a>
          </div>
        )}
      </PageHeader>
      <p className="-mt-4 mb-6 text-sm text-muted">
        {inEffect ? `In effect: version ${inEffect.version_label} since ${inEffect.effective_date ?? when(inEffect.published_at)}.` : "Not yet in effect — the public sees only the title and a notice that the policy is being finalized."}
        {" "}{acceptCount ?? 0} acceptance{acceptCount === 1 ? "" : "s"} recorded.
      </p>

      {!selected ? (
        <Empty>No versions yet.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            <Panel title={`Version ${selected.version_label}`} action={<span className={`chip normal-case tracking-normal ${STATUS_TONE[status!]}`}>{STATUS_LABEL[status!]}</span>}>
              {editable && !sp.preview ? (
                <ActionForm action={saveLegalDraft} className="grid gap-4 p-5 md:grid-cols-2">
                  <input type="hidden" name="id" value={selected.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <Field label="Title"><input name="title" defaultValue={selected.title} className="field" /></Field>
                  <Field label="Version label" hint="e.g. 2026-12-draft-2 or v1.0"><input name="versionLabel" defaultValue={selected.version_label} className="field" /></Field>
                  <div className="md:col-span-2"><Field label="Summary"><input name="summary" defaultValue={selected.summary} className="field" /></Field></div>
                  <div className="md:col-span-2">
                    <Field label="Document text (Markdown)" hint="## for headings, - for bullet points, **bold**. Bracketed OWNER DECISION and ATTORNEY REVIEW markers must be resolved before approval.">
                      <textarea name="body" defaultValue={selected.body} className="field !min-h-[32rem] font-mono !text-sm !leading-relaxed" />
                    </Field>
                  </div>
                  <Field label="What changed in this version"><input name="changeSummary" defaultValue={selected.change_summary ?? ""} className="field" /></Field>
                  <Field label="Intended effective date"><input name="effectiveDate" type="date" defaultValue={selected.effective_date ?? ""} className="field" /></Field>
                  <label className="flex items-center gap-2 text-sm md:col-span-2">
                    <input type="checkbox" name="reaccept" defaultChecked={selected.requires_reacceptance} className="accent-[var(--champagne)]" />
                    Members must accept this version again when it takes effect
                  </label>
                  <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                    <button className="btn btn-gold btn-sm">Save draft</button>
                    <Link href={`/admin/legal/${slug}?v=${selected.id}&preview=1`} className="text-sm text-gold underline">Preview as members will see it</Link>
                  </div>
                </ActionForm>
              ) : (
                <div className="p-5">
                  {sp.preview && editable && <Link href={`/admin/legal/${slug}?v=${selected.id}`} className="mb-4 inline-block text-sm text-gold underline">← Back to editing</Link>}
                  {selected.change_summary && <p className="mb-4 text-sm text-muted">Changes: {selected.change_summary}</p>}
                  <div className="legal-prose max-w-3xl"><Markdown source={selected.body} /></div>
                </div>
              )}
            </Panel>

            {diff && compareA && compareB && (
              <Panel title={`Comparing ${compareA.version_label} → ${compareB.version_label}`} action={<span className="text-xs text-muted">+{diffStats(diff).added} · −{diffStats(diff).removed} lines</span>}>
                <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed">
                  {diff.map((l, i) => (
                    <span key={i} className={`block ${l.kind === "added" ? "bg-success/15 text-success" : l.kind === "removed" ? "bg-danger/10 text-danger line-through" : "text-muted"}`}>
                      {l.kind === "added" ? "+ " : l.kind === "removed" ? "− " : "  "}{l.text || " "}
                    </span>
                  ))}
                </pre>
              </Panel>
            )}

            <Panel title="Acceptance records">
              {acceptances?.length ? (
                <table className="data-table">
                  <thead><tr><th>Member</th><th>Version</th><th>Where</th><th>Accepted</th></tr></thead>
                  <tbody>
                    {acceptances.map((a, i) => (
                      <tr key={i}><td>{a.accepted_email ?? "Deleted account"}</td><td>{a.version_label}</td><td className="capitalize">{a.context.replaceAll("_", " ")}</td><td>{when(a.accepted_at)}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty>No acceptances yet. Members can accept only a published version.</Empty>
              )}
            </Panel>
          </div>

          <aside className="space-y-6">
            <Panel title="Workflow">
              <div className="space-y-5 p-5 text-sm">
                {selected.legal_reviewer && <p className="text-muted">Legal reviewer: <span className="text-text">{selected.legal_reviewer}</span>{selected.legal_review_requested_at ? ` · requested ${when(selected.legal_review_requested_at)}` : ""}</p>}
                {selected.legal_approved_at ? (
                  <p className="rounded-xl border border-success/40 bg-success/10 p-3 text-success">Attorney approval recorded: {selected.legal_approved_by_name}, {when(selected.legal_approved_at)}{selected.legal_approval_note ? ` — ${selected.legal_approval_note}` : ""}</p>
                ) : (
                  <p className="rounded-xl border border-champagne/50 bg-champagne/10 p-3 text-gold">No attorney approval recorded. Publication is blocked until it is.</p>
                )}
                {selected.owner_approved_at && <p className="text-muted">Owner approved {when(selected.owner_approved_at)}.</p>}
                {selected.scheduled_for && status === "scheduled" && <p className="text-muted">Scheduled to take effect {when(selected.scheduled_for)}.</p>}

                {status === "draft" && <Step id={selected.id} slug={slug} action="submit_owner_review" label="Send for owner review" tone="btn-gold" />}
                {(status === "draft" || status === "pending_owner_review") && (
                  <Step id={selected.id} slug={slug} action="send_legal_review" label="Assign for attorney review">
                    <input name="reviewer" placeholder="Attorney or law firm" defaultValue={selected.legal_reviewer ?? ""} className="field" />
                  </Step>
                )}
                {(status === "pending_owner_review" || status === "pending_legal_review") && <Step id={selected.id} slug={slug} action="return_to_draft" label="Return to draft" />}

                {isOwner && editable && (
                  <Step id={selected.id} slug={slug} action="record_legal_approval" label="Record attorney approval">
                    <input name="approvedBy" placeholder="Approving attorney (name, firm)" className="field" />
                    <input name="note" placeholder="Note (optional)" className="field" />
                    <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="attest" className="mt-0.5 accent-[var(--champagne)]" /> I confirm a qualified attorney approved this exact version.</label>
                  </Step>
                )}
                {isOwner && editable && <Step id={selected.id} slug={slug} action="approve" label="Approve (owner)" tone="btn-gold" />}
                {isOwner && status === "approved" && (
                  <>
                    <Step id={selected.id} slug={slug} action="publish" label="Publish now" tone="btn-gold">
                      <input name="effectiveDate" type="date" className="field" aria-label="Effective date" />
                      <input name="confirm" placeholder="Type PUBLISH" autoComplete="off" className="field" />
                    </Step>
                    <Step id={selected.id} slug={slug} action="schedule" label="Schedule publication">
                      <input name="scheduledFor" type="datetime-local" className="field" aria-label="Takes effect at" />
                      <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="confirm" className="mt-0.5 accent-[var(--champagne)]" /> Publish automatically at this time.</label>
                    </Step>
                  </>
                )}
                {isOwner && (status === "published" || status === "approved" || status === "scheduled") && <Step id={selected.id} slug={slug} action="archive" label="Archive this version" />}
                {isOwner && status === "draft" && <Step id={selected.id} slug={slug} action="delete_draft" label="Delete this draft" />}
                {!isOwner && <p className="text-xs text-faint">Only the owner can record attorney approval, approve, schedule or publish.</p>}
                {!working && (
                  <ActionForm action={newLegalDraft}>
                    <input type="hidden" name="slug" value={slug} />
                    <button className="btn btn-ghost btn-sm">Start a new draft from the latest version</button>
                  </ActionForm>
                )}
              </div>
            </Panel>

            <Panel title="Versions">
              <ul className="divide-y divide-line text-sm">
                {all.map((v) => (
                  <li key={v.id} className={`px-5 py-3 ${v.id === selected.id ? "bg-champagne/10" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/admin/legal/${slug}?v=${v.id}`} className="font-semibold hover:text-gold">{v.version_label}</Link>
                      <span className={`chip normal-case tracking-normal ${STATUS_TONE[v.status as LegalStatus]}`}>{STATUS_LABEL[v.status as LegalStatus]}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">Updated {when(v.updated_at)}{v.effective_date ? ` · effective ${v.effective_date}` : ""}</p>
                    {v.id !== selected.id && (
                      <Link href={`/admin/legal/${slug}?v=${selected.id}&compare=${v.id}&with=${selected.id}`} className="mt-1 inline-block text-xs text-gold underline">Compare with {selected.version_label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          </aside>
        </div>
      )}
    </>
  );
}
