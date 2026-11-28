import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { setQaJourneyTesting } from "@/app/actions/admin";
import { departmentTitle, READINESS, readiness, type QaFeature, type Tracker } from "@/lib/qa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Launch readiness report" };

/** Every feature grouped by what it is waiting for, from the QA Center and the Development Tracker. */
export default async function ReadinessReport() {
  await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  const [{ data: features }, { data: trackers }, { data: corrections }, { data: launch }] = await Promise.all([
    supabase.from("qa_features").select("key, department, title, href, tracker_key, peace_status, owner_status, retest_required, owner_approved").order("sort"),
    supabase.from("dev_tracker").select("key, title, built, tests_passed, merged, deployed, operational, awaiting, next_step"),
    supabase.from("qa_corrections").select("feature_key, status"),
    supabase.from("platform_settings").select("key, value").in("key", ["registrations_open", "payments_live", "qa_journey_testing", "qa_journey_monthly_cents", "qa_journey_daily_cents"]),
  ]);
  const list = (features ?? []) as QaFeature[];
  const tracker = (k: string | null) => (trackers ?? []).find((t) => t.key === k) ?? null;
  const open = (k: string) => (corrections ?? []).filter((c) => c.feature_key === k && (c.status === "open" || c.status === "in_progress")).length;
  const groups = Object.fromEntries(READINESS.map((r) => [r.key, [] as QaFeature[]]));
  for (const f of list) for (const g of readiness(f, tracker(f.tracker_key) as Tracker, open(f.key))) groups[g].push(f);
  // Tracker items not yet covered by a QA test (usually not built yet).
  const covered = new Set(list.map((f) => f.tracker_key));
  const notInPlan = (trackers ?? []).filter((t) => !covered.has(t.key) && !t.built);
  const flag = (k: string) => (launch ?? []).find((x) => x.key === k)?.value === true;

  return (
    <>
      <Link href="/admin/qa" className="text-sm text-gold">← Quality Assurance Center</Link>
      <PageHeader eyebrow="Owner Portal" title="Launch readiness" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">
        Public registration is <strong>{flag("registrations_open") ? "open" : "closed"}</strong> and live payments are <strong>{flag("payments_live") ? "on" : "off"}</strong>.
        Each feature appears where it currently waits. Features needing legal or professional approval appear there as well.
      </p>
      <section className="glass mb-6 p-5">
        <h2 className="display text-2xl">Journey QA testing exception</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Lets only the fictional QA account use Journey before live payments: conversations, navigation, growth reflections, couples guidance,
          research planning, meeting minutes, Elite Concierge and voice. It always follows the membership the QA account has selected (Free has no
          personalized Journey), every allowance and company cap still applies, and its own budget is ${(Number((launch ?? []).find((x) => x.key === "qa_journey_monthly_cents")?.value ?? 0) / 100).toFixed(2)} a month
          and ${(Number((launch ?? []).find((x) => x.key === "qa_journey_daily_cents")?.value ?? 0) / 100).toFixed(2)} a day. Real members are not affected.
        </p>
        <p className="mt-2 text-sm">Status: <strong>{flag("qa_journey_testing") ? "On" : "Off"}</strong></p>
        <ActionForm action={setQaJourneyTesting} className="mt-3"><input type="hidden" name="enable" value={flag("qa_journey_testing") ? "false" : "true"} />
          <button className="btn btn-ghost btn-sm">{flag("qa_journey_testing") ? "Turn off" : "Turn on"}</button></ActionForm>
      </section>
      <div className="space-y-6">
        {READINESS.map((r) => (
          <section key={r.key} className="glass p-5">
            <h2 className="display text-2xl">{r.title} <span className="text-base text-muted">· {groups[r.key].length}</span></h2>
            {groups[r.key].length === 0 ? <p className="mt-2 text-sm text-muted">None.</p> : (
              <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                {groups[r.key].map((f) => (
                  <li key={f.key}><Link href={`/admin/qa/${f.key}`} className="hover:text-gold">{f.title}</Link> <span className="text-xs text-muted">· {departmentTitle(f.department)}</span>
                    {r.key === "development" && tracker(f.tracker_key)?.next_step && <span className="block text-xs text-faint">{tracker(f.tracker_key)!.next_step}</span>}</li>
                ))}
              </ul>
            )}
            {r.key === "development" && notInPlan.length > 0 && (
              <p className="mt-3 text-xs text-muted">Also designed and not yet built: {notInPlan.map((t) => t.title).join(" · ")}.</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
