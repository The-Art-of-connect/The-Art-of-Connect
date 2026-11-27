import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat } from "@/components/admin/ui";
import { IntelConnections } from "@/components/admin/IntelConnections";

export const metadata = { title: "Intelligence Division · Owner Portal" };
export const dynamic = "force-dynamic";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

/** CONNECT 360 Intelligence Division controls (founder directive 26): provider connections, budget and safeguards. */
export default async function Intelligence() {
  await requireStaff(["owner"]);
  const db = (await createClient())!;
  const [{ data: s }, { data: spend }, { count: deliveries }] = await Promise.all([
    db.from("intel_settings").select("*").maybeSingle(),
    db.rpc("intel_spend_summary"),
    db.from("intel_webhook_deliveries").select("id", { count: "exact", head: true }),
  ]);
  const rows = (spend ?? []) as { provider: string; month_cents: number; today_cents: number }[];
  const month = rows.reduce((n, r) => n + Number(r.month_cents), 0);
  const today = rows.reduce((n, r) => n + Number(r.today_cents), 0);
  return (
    <>
      <PageHeader eyebrow="CONNECT 360" title="Intelligence Division" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Parallel and Exa work behind Journey. Every request passes the spending check first. While testing is on, research runs only for test and staff accounts with fictional scenarios; real member access stays off.</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Division" value={s?.enabled ? "On" : "Off"} hint={s?.emergency_stop ? "Emergency stop on" : undefined} />
        <Stat label="Mode" value={s?.testing_only ? "Testing only" : "Members"} />
        <Stat label="This month" value={`${usd(month)} of ${usd(s?.company_monthly_limit_cents ?? 0)}`} />
        <Stat label="Today" value={`${usd(today)} of ${usd(s?.company_daily_limit_cents ?? 0)}`} hint={`${deliveries ?? 0} webhook deliveries`} />
      </div>
      <div className="mt-6"><IntelConnections /></div>
    </>
  );
}
