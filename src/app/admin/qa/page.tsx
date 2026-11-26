import Link from "next/link";
import { requireStaff, getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { getOwnerTestSession } from "@/lib/owner-test-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { endOwnerTestSession, removeTestAccounts, startOwnerTestSession } from "@/app/actions/owner-test";
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
  const session = await getOwnerTestSession();
  const admin = createAdminClient();
  const { data: testAccounts } = admin ? await admin.from("profiles").select("id, email, display_name, account_type, created_at").eq("is_test", true).order("created_at", { ascending: false }).limit(100) : { data: null };
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

      <section className="mb-8 overflow-hidden rounded-[24px] border border-gold/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <h2 className="display text-2xl text-gold-bright">Owner testing session</h2>
            <p className="text-xs text-muted">{session ? `Active in this browser until ${session.expires.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}.` : "Not active."}</p>
          </div>
          {session
            ? <form action={endOwnerTestSession}><button className="btn btn-ghost btn-sm">End testing session</button></form>
            : <ActionForm action={startOwnerTestSession}><button className="btn btn-gold btn-sm">Start testing session</button></ActionForm>}
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>While a session is active in <strong>this browser only</strong>, the whole developed platform works as if it were launched, so you can test it exactly as a customer would. Everyone else still sees The Art of Connect closed.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Start the session, then open the <a href="/" className="text-gold underline">homepage</a>.</li>
              <li>Sign out, then register as a new member with an email you can receive, for example your own address with a tag: <em>yourname+singles@gmail.com</em> (Gmail delivers these to you). Each becomes a fictional test account.</li>
              <li>Choose any membership, monthly or annual, and check out with Stripe&rsquo;s test card <strong>4242 4242 4242 4242</strong>, any future date, any CVC and any ZIP. No real money moves.</li>
              <li>Use the membership, then upgrade, downgrade or cancel from Membership &amp; billing.</li>
              <li>Record what works and what doesn&rsquo;t in the departments below.</li>
            </ol>
            <p className="text-xs text-muted">Payments use Stripe test mode only (live keys are refused). Draft prices are shown. Test accounts keep every age rule, are permanently flagged, and receive emails even before launch. Journey usage by test accounts counts against the company AI budget.</p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-semibold">Test accounts ({(testAccounts ?? []).length})</p>
            {(testAccounts ?? []).length === 0 ? <p className="text-xs text-muted">None yet. Accounts you register during a testing session appear here.</p> : (
              <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                {(testAccounts ?? []).map((a) => <li key={a.id} className="flex justify-between gap-2 border-b border-line py-1"><span>{a.display_name} · {a.email}</span><span className="text-muted">{a.account_type} · {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></li>)}
              </ul>
            )}
            {(testAccounts ?? []).length > 0 && (
              <ActionForm action={removeTestAccounts} className="flex flex-wrap items-center gap-2">
                <input name="confirm" placeholder="Type REMOVE" className="field w-32 text-xs" autoComplete="off" />
                <button className="btn btn-ghost btn-sm">Remove all test accounts</button>
              </ActionForm>
            )}
            <p className="text-xs text-faint">Remove all test accounts before launch so they never mix with real members.</p>
          </div>
        </div>
      </section>

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
