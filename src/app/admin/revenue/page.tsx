import { requireStaff, hasRole } from "@/lib/auth";
import { date, money, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { refundPayment } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

export default async function RevenuePage() {
  const viewer = await requireStaff(rolesFor("/admin/revenue"));
  const canRefund = hasRole(viewer, ["owner", "finance"]);
  const supabase = await createClient();
  const { data: payments } = supabase
    ? await supabase
        .from("payments")
        .select("id, amount_cents, refunded_amount_cents, currency, status, livemode, stripe_payment_ref, created_at, profiles(email)")
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] as any[] };
  const rows = payments ?? [];
  const live = rows.filter((p: any) => p.livemode);
  const succeeded = live.filter((p: any) => ["succeeded", "partially_refunded", "refunded"].includes(p.status));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const net = (p: any) => p.amount_cents - (p.refunded_amount_cents ?? 0);
  const thisMonth = succeeded.filter((p: any) => new Date(p.created_at).getTime() >= monthStart).reduce((s: number, p: any) => s + net(p), 0);
  const refunds = live.reduce((s: number, p: any) => s + (p.refunded_amount_cents ?? 0), 0);
  const failed = live.filter((p: any) => p.status === "failed").length;

  return (
    <>
      <PageHeader eyebrow="Revenue" title="Payments" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="This month, net (live)" value={money(thisMonth)} accent="var(--gold-bright)" />
        <Stat label="Refunded (live)" value={money(refunds)} />
        <Stat label="Failed payments (live)" value={failed} accent="var(--danger)" />
        <Stat label="Sandbox payments" value={rows.filter((p: any) => !p.livemode).length} hint="Test mode — not counted as revenue" />
      </div>
      <Panel title="Recent payments">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Member</th><th>Amount</th><th>Status</th><th>Mode</th>{canRefund && <th>Refund</th>}</tr></thead>
          <tbody>
            {rows.map((p: any) => {
              const remaining = p.amount_cents - (p.refunded_amount_cents ?? 0);
              return (
                <tr key={p.id}>
                  <td>{date(p.created_at)}</td>
                  <td className="text-text">{p.profiles?.email ?? "—"}</td>
                  <td className="text-text">
                    {money(p.amount_cents, p.currency)}
                    {p.refunded_amount_cents ? <span className="block text-xs text-faint">−{money(p.refunded_amount_cents, p.currency)} refunded</span> : null}
                  </td>
                  <td>{p.status.replace("_", " ")}</td>
                  <td><span className={`chip ${p.livemode ? "chip-live" : ""}`}>{p.livemode ? "Live" : "Sandbox"}</span></td>
                  {canRefund && (
                    <td>
                      {remaining > 0 && p.stripe_payment_ref && ["succeeded", "partially_refunded"].includes(p.status) ? (
                        <ActionForm action={refundPayment} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <input name="amount" inputMode="decimal" placeholder={(remaining / 100).toFixed(2)} aria-label="Refund amount" className="field !min-h-[36px] !w-24 !text-sm" />
                          <button className="btn btn-ghost btn-sm">Refund</button>
                        </ActionForm>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <Empty>No payments yet.</Empty>}
      </Panel>
      <p className="mt-4 text-xs text-muted">Leave the amount blank for a full refund. Refunds are processed by Stripe; the payment updates here when Stripe confirms.</p>
    </>
  );
}
