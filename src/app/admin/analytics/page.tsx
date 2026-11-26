import { requireStaff } from "@/lib/auth";
import { countRows, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

/** Aggregate counts only — no individual is identified on this page. */
function tally(rows: Record<string, any>[], pick: (r: Record<string, any>) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r) || "Direct / unknown";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
}
import { PageHeader, Panel, Stat } from "@/components/admin/ui";

export default async function AnalyticsPage() {
  await requireStaff(rolesFor("/admin/analytics"));
  // Membership conversions (founder directive 18): counts only; the database returns rows to owner, executive and finance.
  const convDb = await createClient();
  const { data: conv } = convDb ? await convDb.rpc("membership_conversions", { p_months: 6 }) : { data: [] };
  const conversions = (conv ?? []) as { month: string; new_free_accounts: number; trials_started: number; trials_converted: number; trials_cancelled: number; direct_purchases: number }[];
  const sum = (k: keyof (typeof conversions)[number]) => conversions.reduce((a, r) => a + Number(r[k] ?? 0), 0);
  const rate = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const [members, new30, rel, biz, couns, waitlist, wlRel, wlBiz, wlCouns, wlProviders, wlSingles, wlCouples, relProfiles, bizProfiles, relConn, bizConn] = await Promise.all([
    countRows("profiles"),
    countRows("profiles", (q) => q.gte("created_at", since30)),
    countRows("experience_access", (q) => q.eq("experience", "relationships").eq("status", "active")),
    countRows("experience_access", (q) => q.eq("experience", "business").eq("status", "active")),
    countRows("experience_access", (q) => q.eq("experience", "counseling").eq("status", "active")),
    countRows("waitlist"),
    countRows("waitlist", (q) => q.contains("interests", ["relationships"])),
    countRows("waitlist", (q) => q.contains("interests", ["business"])),
    countRows("waitlist", (q) => q.contains("interests", ["counseling"])),
    countRows("professional_interest"),
    countRows("waitlist", (q) => q.eq("love_track", "single")),
    countRows("waitlist", (q) => q.eq("love_track", "couple")),
    countRows("profiles", undefined, "relationships"),
    countRows("profiles", undefined, "business"),
    countRows("connections", (q) => q.eq("status", "accepted"), "relationships"),
    countRows("connections", (q) => q.eq("status", "accepted"), "business"),
  ]);
  const supabase = await createClient();
  const [{ data: wl }, { data: profs }, { data: refs }] = supabase
    ? await Promise.all([
        supabase.from("waitlist").select("attribution, desired_tier, desired_interval").limit(5000),
        supabase.from("profiles").select("attribution").limit(5000),
        supabase.from("referrals").select("status").limit(5000),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];
  const all = [...(wl ?? []), ...(profs ?? [])];
  const reports: [string, [string, number][]][] = [
    ["Where people come from (utm_source)", tally(all, (r) => r.attribution?.utm_source)],
    ["Campaigns", tally(all.filter((r) => r.attribution?.utm_campaign), (r) => r.attribution?.utm_campaign)],
    ["Memberships built before launch", tally((wl ?? []).filter((r) => r.desired_tier), (r) => `${r.desired_tier} · ${r.desired_interval === "year" ? "annual" : "monthly"}`)],
    ["Referrals by status", tally(refs ?? [], (r) => r.status)],
  ];

  return (
    <>
      <PageHeader eyebrow="Command" title="Platform analytics" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Members" value={members} hint={`${new30} new in 30 days`} />
        <Stat label="In Business members" value={biz} accent="var(--business)" />
        <Stat label="In Life members" value={couns} accent="var(--counseling)" hint="Count only — no private details" />
        <Stat label="In Love members" value={rel} accent="var(--relationships)" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Notify-me demand">
          <ul className="divide-y divide-line text-sm">
            {[["Total", waitlist], ["In Business", wlBiz], ["In Life", wlCouns], ["In Love", wlRel], ["  · Singles", wlSingles], ["  · Couples", wlCouples], ["Professionals interested", wlProviders]].map(([l, n]) => (
              <li key={String(l)} className="flex justify-between px-5 py-3"><span className="text-muted">{l}</span><span className="text-text">{n}</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Engagement">
          <ul className="divide-y divide-line text-sm">
            {[["In Love profiles", relProfiles], ["In Business profiles", bizProfiles], ["Accepted In Love connections", relConn], ["Accepted In Business connections", bizConn]].map(([l, n]) => (
              <li key={String(l)} className="flex justify-between px-5 py-3"><span className="text-muted">{l}</span><span className="text-text">{n}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {reports.map(([title, rows]) => (
          <Panel key={title} title={title}>
            <ul className="divide-y divide-line text-sm">
              {rows.map(([k, n]) => (
                <li key={k} className="flex justify-between px-5 py-3"><span className="text-muted">{k}</span><span className="text-text">{n}</span></li>
              ))}
              {!rows.length && <li className="px-5 py-6 text-center text-faint">No data yet.</li>}
            </ul>
          </Panel>
        ))}
      </div>
      <Panel title="Membership conversions (last 6 months)">
        <div className="grid gap-4 p-5 sm:grid-cols-4">
          <Stat label="New free accounts" value={sum("new_free_accounts")} />
          <Stat label="Free → trial" value={rate(sum("trials_started"), sum("new_free_accounts"))} hint={`${sum("trials_started")} trials started`} />
          <Stat label="Trial → paid" value={rate(sum("trials_converted"), sum("trials_converted") + sum("trials_cancelled"))} hint={`${sum("trials_converted")} converted · ${sum("trials_cancelled")} ended`} />
          <Stat label="Direct purchases" value={sum("direct_purchases")} hint="Joined without a trial" />
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <table className="data-table min-w-[560px]">
            <thead><tr><th>Month</th><th>New free accounts</th><th>Trials started</th><th>Converted</th><th>Cancelled or ended</th><th>Direct purchases</th></tr></thead>
            <tbody>{conversions.map((r) => (
              <tr key={r.month}><td>{new Date(r.month).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</td><td>{r.new_free_accounts}</td><td>{r.trials_started}</td><td>{r.trials_converted}</td><td>{r.trials_cancelled}</td><td>{r.direct_purchases}</td></tr>
            ))}</tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Real counts only. Before the commercial launch these reflect test accounts and Stripe Sandbox activity.</p>
        </div>
      </Panel>
      <p className="mt-4 text-xs text-muted">Privacy-conscious analytics: first-party campaign tags and aggregate counts only. No third-party tracking pixels are installed.</p>
    </>
  );
}
