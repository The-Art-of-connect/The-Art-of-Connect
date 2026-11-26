import Link from "next/link";
import { requireStaff, getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { featureState, OWNER_STATUS_LABEL, QA_DEPARTMENTS, READINESS, readiness, type QaFeature, type Tracker } from "@/lib/qa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quality Assurance Center" };

const STATE_STYLE = { operational: "text-success", partial: "text-gold", unfinished: "text-faint" } as const;
const OWNER_STYLE: Record<string, string> = { passed: "text-success", failed: "text-danger", needs_changes: "text-danger", in_progress: "text-gold", not_started: "text-faint" };

export default async function QaCenter() {
  await requireStaff(["owner"]);
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const [{ data: features }, { data: trackers }, { data: corrections }, { data: place }] = await Promise.all([
    supabase.from("qa_features").select("key, department, title, href, tracker_key, peace_status, owner_status, retest_required, owner_approved").order("sort"),
    supabase.from("dev_tracker").select("key, built, tests_passed, merged, deployed, operational, awaiting"),
    supabase.from("qa_corrections").select("feature_key, status"),
    supabase.from("qa_owner_state").select("last_feature, last_department, updated_at").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const list = (features ?? []) as QaFeature[];
  const tracker = (k: string | null): Tracker => (trackers ?? []).find((t) => t.key === k) ?? null;
  const open = (k: string) => (corrections ?? []).filter((c) => c.feature_key === k && (c.status === "open" || c.status === "in_progress")).length;
  const groups = Object.fromEntries(READINESS.map((r) => [r.key, 0])) as Record<string, number>;
  for (const f of list) for (const g of readiness(f, tracker(f.tracker_key), open(f.key))) groups[g]++;
  const last = list.find((f) => f.key === place?.last_feature);
  const nextUp = list.find((f) => !f.owner_approved && f.peace_status === "passed" && (f.owner_status === "not_started" || f.retest_required));

  return (
    <>
      <PageHeader eyebrow="Owner Portal" title="Quality Assurance Center" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Every feature, organized by department, with what to test, step-by-step instructions and the expected result. Your results, screenshots and comments save as you go. Anything that fails becomes a correction task for Peace and returns to you for retesting. Nothing is approved without you. Public registration, payments and clinical services stay closed throughout.</p>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="glass p-5">
          <p className="eyebrow">Continue where you left off</p>
          {last ? <Link href={`/admin/qa/${last.key}`} className="display mt-2 block text-2xl text-gold">{last.title} →</Link> : <p className="mt-2 text-sm text-muted">You haven&rsquo;t started yet.</p>}
          {nextUp && nextUp.key !== last?.key && <p className="mt-2 text-sm">Next ready for you: <Link href={`/admin/qa/${nextUp.key}`} className="text-gold underline">{nextUp.title}</Link></p>}
        </div>
        <Link href="/admin/qa/readiness" className="glass block p-5 transition hover:border-gold/60">
          <p className="eyebrow">Launch readiness</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {READINESS.map((r) => <li key={r.key} className="flex justify-between gap-2"><span className="text-muted">{r.title}</span><span className="font-semibold">{groups[r.key]}</span></li>)}
          </ul>
          <p className="mt-3 text-xs text-gold">Open the full report →</p>
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 text-xs">
        {QA_DEPARTMENTS.map((d) => <a key={d.key} href={`#${d.key}`} className="rounded-full border border-line px-3 py-1 hover:border-gold">{d.title}</a>)}
      </nav>

      {QA_DEPARTMENTS.map((d) => {
        const items = list.filter((f) => f.department === d.key);
        const done = items.filter((f) => f.owner_approved).length;
        return (
          <section key={d.key} id={d.key} className="mb-8 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="display text-3xl">{d.title}</h2>
              <p className="text-xs text-muted">{done} of {items.length} approved</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-3"><div className="h-full bg-champagne" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} /></div>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {items.map((f) => {
                const st = featureState(tracker(f.tracker_key));
                const corr = open(f.key);
                return (
                  <li key={f.key}>
                    <Link href={`/admin/qa/${f.key}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition hover:bg-white/5">
                      <span className="font-semibold">{f.title}</span>
                      <span className="flex flex-wrap items-center gap-3 text-xs">
                        <span className={STATE_STYLE[st.key]}>{st.label}</span>
                        <span className={f.peace_status === "passed" ? "text-success" : "text-faint"}>{f.peace_status === "passed" ? "Peace ✓" : f.peace_status === "failed" ? "Peace ✕" : "Peace: not yet"}</span>
                        {corr > 0 && <span className="text-danger">{corr} correction{corr > 1 ? "s" : ""}</span>}
                        {f.retest_required && !corr && <span className="text-gold">Retest</span>}
                        <span className={OWNER_STYLE[f.owner_status]}>{f.owner_approved ? "Approved ✓" : OWNER_STATUS_LABEL[f.owner_status]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
