import { requireStaff } from "@/lib/auth";
import { money, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

/** Monthly revenue summary built from recorded live payments. */
export default async function ReportsPage() {
  await requireStaff(rolesFor("/admin/reports"));
  const supabase = await createClient();
  const since = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString();
  const { data } = supabase
    ? await supabase.from("payments").select("amount_cents, status, created_at").eq("livemode", true).gte("created_at", since)
    : { data: [] as any[] };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }), gross: 0, refunds: 0, count: 0 };
  });
  for (const p of data ?? []) {
    const d = new Date(p.created_at);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (!m) continue;
    if (p.status === "succeeded") { m.gross += p.amount_cents; m.count++; }
    if (p.status === "refunded") m.refunds += p.amount_cents;
  }
  const max = Math.max(1, ...months.map((m) => m.gross));

  return (
    <>
      <PageHeader eyebrow="Revenue" title="Financial reports" />
      <Panel title="Revenue — last 12 months (live payments)">
        {data?.length ? null : <Empty>Reports fill in automatically once live payments begin.</Empty>}
        <table className="data-table">
          <thead><tr><th>Month</th><th>Gross</th><th>Refunds</th><th>Net</th><th>Payments</th><th className="w-1/3">Trend</th></tr></thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <td className="text-text">{m.label}</td><td>{money(m.gross)}</td><td>{money(m.refunds)}</td>
                <td className="text-text">{money(m.gross - m.refunds)}</td><td>{m.count}</td>
                <td><div className="h-2 rounded-full bg-gold/70" style={{ width: `${(m.gross / max) * 100}%`, minWidth: m.gross ? 4 : 0 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="mt-4 text-xs text-faint">Stripe remains the system of record for payouts, fees and tax. Export detailed statements from the Stripe dashboard for bookkeeping.</p>
    </>
  );
}
