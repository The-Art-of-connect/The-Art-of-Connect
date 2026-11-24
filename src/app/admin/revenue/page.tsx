import { requireStaff } from "@/lib/auth";
import { date, money, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

export default async function RevenuePage() {
  await requireStaff(rolesFor("/admin/revenue"));
  const supabase = await createClient();
  const { data: payments } = supabase
    ? await supabase.from("payments").select("id, amount_cents, currency, status, livemode, created_at, profiles(email)").order("created_at", { ascending: false }).limit(200)
    : { data: [] as any[] };
  const rows = payments ?? [];
  const succeeded = rows.filter((p: any) => p.status === "succeeded" && p.livemode);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisMonth = succeeded.filter((p: any) => new Date(p.created_at).getTime() >= monthStart).reduce((s: number, p: any) => s + p.amount_cents, 0);
  const total = succeeded.reduce((s: number, p: any) => s + p.amount_cents, 0);

  return (
    <>
      <PageHeader eyebrow="Revenue" title="Payments" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="This month (live)" value={money(thisMonth)} accent="var(--gold-bright)" />
        <Stat label="Last 200 payments (live)" value={money(total)} />
        <Stat label="Test-mode payments" value={rows.filter((p: any) => !p.livemode).length} hint="Not counted as revenue" />
      </div>
      <Panel title="Recent payments">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Member</th><th>Amount</th><th>Status</th><th>Mode</th></tr></thead>
          <tbody>
            {rows.map((p: any) => (
              <tr key={p.id}>
                <td>{date(p.created_at)}</td><td className="text-text">{p.profiles?.email ?? "—"}</td>
                <td className="text-text">{money(p.amount_cents, p.currency)}</td><td>{p.status}</td>
                <td><span className={`chip ${p.livemode ? "chip-live" : ""}`}>{p.livemode ? "Live" : "Test"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No payments yet.</Empty>}
      </Panel>
    </>
  );
}
