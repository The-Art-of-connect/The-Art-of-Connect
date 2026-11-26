import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader } from "@/components/admin/ui";
import { QaScreenshotUpload } from "@/components/admin/QaScreenshotUpload";
import { approveQaFeature, deleteQaScreenshot, rememberQaPlace, saveQaResult } from "@/app/actions/qa";
import { departmentTitle, featureState, OWNER_STATUS_LABEL, PEACE_STATUS_LABEL, QA_DEPARTMENTS } from "@/lib/qa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Test a feature" };

const STATE_STYLE = { operational: "border-success/50 text-success", partial: "border-gold/50 text-gold", unfinished: "border-line text-faint" } as const;

export default async function QaFeaturePage({ params }: { params: Promise<{ key: string }> }) {
  await requireStaff(["owner"]);
  const key = (await params).key;
  const supabase = (await createClient())!;
  const { data: f } = await supabase.from("qa_features").select("*").eq("key", key).maybeSingle();
  if (!f) notFound();
  const [{ data: tracker }, { data: corrections }, { data: shots }, { data: siblings }] = await Promise.all([
    f.tracker_key ? supabase.from("dev_tracker").select("title, built, tests_passed, merged, deployed, operational, awaiting, next_step").eq("key", f.tracker_key).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("qa_corrections").select("id, reported, status, resolution, created_at, fixed_at").eq("feature_key", key).order("created_at", { ascending: false }),
    supabase.from("qa_screenshots").select("id, path, note, created_at").eq("feature_key", key).order("created_at", { ascending: false }),
    supabase.from("qa_features").select("key, title").eq("department", f.department).order("sort"),
  ]);
  await rememberQaPlace(key, f.department);
  const urls = shots?.length ? (await supabase.storage.from("qa-evidence").createSignedUrls(shots.map((s) => s.path), 3600)).data ?? [] : [];
  const state = featureState(tracker);
  const list = siblings ?? [];
  const i = list.findIndex((s) => s.key === key);
  const next = list[i + 1] ?? null;
  const prev = i > 0 ? list[i - 1] : null;
  const openCorrections = (corrections ?? []).filter((c) => c.status === "open" || c.status === "in_progress").length;

  return (
    <>
      <Link href={`/admin/qa#${f.department}`} className="text-sm text-gold">← {departmentTitle(f.department)}</Link>
      <PageHeader eyebrow={`Quality Assurance · ${departmentTitle(f.department)}`} title={f.title} />
      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-3 py-1 ${STATE_STYLE[state.key]}`}>{state.label}</span>
        <span className="rounded-full border border-line px-3 py-1">{PEACE_STATUS_LABEL[f.peace_status as keyof typeof PEACE_STATUS_LABEL]}</span>
        <span className="rounded-full border border-line px-3 py-1">Your result: {OWNER_STATUS_LABEL[f.owner_status as keyof typeof OWNER_STATUS_LABEL]}</span>
        {f.retest_required && <span className="rounded-full border border-gold/60 px-3 py-1 text-gold">Retest needed</span>}
        {f.owner_approved && <span className="rounded-full border border-success/60 px-3 py-1 text-success">Approved by you</span>}
        {tracker?.awaiting === "legal" && <span className="rounded-full border border-danger/40 px-3 py-1 text-danger">Awaiting legal review</span>}
        {tracker?.awaiting === "professional" && <span className="rounded-full border border-danger/40 px-3 py-1 text-danger">Awaiting professional review</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="glass space-y-4 p-6">
          {f.href && <a href={f.href} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">Open this feature ↗</a>}
          <div><p className="eyebrow">What you&rsquo;re testing</p><p className="mt-1 text-sm">{f.purpose}</p></div>
          <div>
            <p className="eyebrow">Steps</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">{(f.steps as string[]).map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
          <div><p className="eyebrow">Expected result</p><p className="mt-1 text-sm">{f.expected}</p></div>
          <div className="rounded-xl border border-line p-4 text-sm">
            <p className="eyebrow">Peace&rsquo;s technical testing</p>
            <p className="mt-1">{PEACE_STATUS_LABEL[f.peace_status as keyof typeof PEACE_STATUS_LABEL]}{f.peace_tested_at ? ` · ${new Date(f.peace_tested_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}</p>
            {f.peace_evidence && <p className="mt-2 whitespace-pre-wrap text-xs text-muted">{f.peace_evidence}</p>}
            {tracker?.next_step && <p className="mt-2 text-xs text-muted">Tracker next step: {tracker.next_step}</p>}
          </div>
          <p className="text-xs text-muted">Use the gold <strong>View as</strong> bar to test as different memberships. Coming Soon pages open for you with a note; members still see Coming Soon.</p>
        </section>

        <section className="space-y-6">
          <ActionForm action={saveQaResult} className="glass space-y-4 p-6">
            <input type="hidden" name="key" value={f.key} />
            <p className="eyebrow">Your result</p>
            <label className="block text-sm"><span className="font-semibold">What actually happened</span>
              <textarea name="actual" defaultValue={f.actual_result ?? ""} maxLength={4000} rows={4} className="field mt-1 w-full" placeholder="Describe what you saw." /></label>
            <fieldset>
              <legend className="text-sm font-semibold">Result</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["in_progress", "passed", "failed", "needs_changes"] as const).map((s) => (
                  <label key={s} className="cursor-pointer"><input type="radio" name="status" value={s} defaultChecked={f.owner_status === s} className="peer sr-only" required />
                    <span className="inline-flex rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{OWNER_STATUS_LABEL[s]}</span></label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm"><span className="font-semibold">Comments</span>
              <textarea name="comments" defaultValue={f.owner_comments ?? ""} maxLength={4000} rows={3} className="field mt-1 w-full" placeholder="Anything you'd like changed, in your own words." /></label>
            <button className="btn btn-gold btn-sm">Save result</button>
            <p className="text-xs text-muted">Choosing Failed or Needs changes creates a correction task for Peace automatically.</p>
          </ActionForm>

          <div className="glass space-y-3 p-6">
            <p className="eyebrow">Screenshots</p>
            <QaScreenshotUpload featureKey={f.key} />
            {(shots ?? []).length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {(shots ?? []).map((s) => {
                  const url = urls.find((u) => u.path === s.path)?.signedUrl;
                  return (
                    <figure key={s.id} className="space-y-1">
                      {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={s.note ?? "Test screenshot"} className="aspect-[3/4] w-full rounded-xl object-cover" /></a> : <div className="aspect-[3/4] rounded-xl bg-ink-3" />}
                      <figcaption className="flex items-center justify-between gap-2 text-[0.7rem] text-muted">
                        <span>{s.note ?? new Date(s.created_at).toLocaleDateString("en-US")}</span>
                        <ActionForm action={deleteQaScreenshot}><input type="hidden" name="id" value={s.id} /><button className="text-danger">Remove</button></ActionForm>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass space-y-3 p-6">
            <p className="eyebrow">Corrections</p>
            {(corrections ?? []).length === 0 ? <p className="text-sm text-muted">None. If something isn&rsquo;t right, choose Failed or Needs changes above.</p> : (
              <ul className="space-y-2 text-sm">
                {(corrections ?? []).map((c) => (
                  <li key={c.id} className="rounded-xl border border-line p-3">
                    <p className="flex items-center justify-between gap-2 text-xs"><span>{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span className={c.status === "fixed" || c.status === "closed" ? "text-success" : "text-gold"}>{c.status === "open" ? "Open" : c.status === "in_progress" ? "Peace is correcting" : c.status === "fixed" ? "Fixed · please retest" : "Closed"}</span></p>
                    <p className="mt-1 whitespace-pre-wrap">{c.reported}</p>
                    {c.resolution && <p className="mt-1 text-xs text-muted">Peace: {c.resolution}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ActionForm action={approveQaFeature} className="glass space-y-3 p-6">
            <input type="hidden" name="key" value={f.key} />
            <p className="eyebrow">Final owner approval</p>
            {f.owner_approved
              ? <><p className="text-sm text-success">Approved by you{f.approved_at ? ` on ${new Date(f.approved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}.</p><input type="hidden" name="approve" value="no" /><button className="btn btn-ghost btn-sm">Withdraw approval</button></>
              : <><p className="text-sm text-muted">{f.owner_status === "passed" && !openCorrections ? "You can approve this feature." : "Available after you record a Passed result and any corrections are resolved."}</p><input type="hidden" name="approve" value="yes" /><button className="btn btn-gold btn-sm" disabled={f.owner_status !== "passed" || openCorrections > 0}>I approve this feature</button></>}
          </ActionForm>
        </section>
      </div>

      <nav className="mt-8 flex flex-wrap justify-between gap-3 text-sm">
        {prev ? <Link href={`/admin/qa/${prev.key}`} className="text-gold">← {prev.title}</Link> : <span />}
        {next ? <Link href={`/admin/qa/${next.key}`} className="btn btn-gold btn-sm">Next: {next.title} →</Link>
          : <Link href={`/admin/qa#${QA_DEPARTMENTS[QA_DEPARTMENTS.findIndex((d) => d.key === f.department) + 1]?.key ?? ""}`} className="btn btn-gold btn-sm">Next department →</Link>}
      </nav>
    </>
  );
}
