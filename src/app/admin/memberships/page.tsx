import { requireStaff } from "@/lib/auth";
import { countRows, date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

export default async function MembershipsPage() {
  await requireStaff(rolesFor("/admin/memberships"));
  const supabase = await createClient();
  const [{ data: subs }, active, trialing, pastDue, canceled] = await Promise.all([
    supabase
      ? supabase.from("subscriptions").select("id, status, current_period_end, cancel_at_period_end, created_at, profiles(email), membership_plans(name)").order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] as any[] }),
    countRows("subscriptions", (q) => q.eq("status", "active")),
    countRows("subscriptions", (q) => q.eq("status", "trialing")),
    countRows("subscriptions", (q) => q.eq("status", "past_due")),
    countRows("subscriptions", (q) => q.eq("status", "canceled")),
  ]);

  return (
    <>
      <PageHeader eyebrow="Revenue" title="Memberships" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active" value={active} accent="var(--success)" />
        <Stat label="Trialing" value={trialing} />
        <Stat label="Past due" value={pastDue} accent="var(--danger)" />
        <Stat label="Canceled" value={canceled} />
      </div>
      <Panel title="Subscriptions">
        <table className="data-table">
          <thead><tr><th>Member</th><th>Package</th><th>Status</th><th>Renews</th><th>Started</th></tr></thead>
          <tbody>
            {(subs ?? []).map((s: any) => (
              <tr key={s.id}>
                <td className="text-text">{s.profiles?.email ?? "—"}</td>
                <td>{s.membership_plans?.name ?? "—"}</td>
                <td><span className="chip">{s.status}{s.cancel_at_period_end ? " · ending" : ""}</span></td>
                <td>{date(s.current_period_end)}</td>
                <td>{date(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!subs?.length && <Empty>No subscriptions yet. They appear here automatically from Stripe once payments launch.</Empty>}
      </Panel>
    </>
  );
}
