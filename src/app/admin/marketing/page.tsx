import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createPromotion } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export default async function MarketingPage() {
  await requireStaff(rolesFor("/admin/marketing"));
  const supabase = await createClient();
  const [{ data: promos }, { data: waitlist }] = supabase
    ? await Promise.all([
        supabase.from("promotions").select("*").order("created_at", { ascending: false }),
        supabase.from("waitlist").select("email, full_name, interests, is_counselor, created_at").order("created_at", { ascending: false }).limit(200),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }];

  return (
    <>
      <PageHeader eyebrow="Growth" title="Marketing & promotions" />
      <Panel title="Promotions">
        <ActionForm action={createPromotion} className="grid gap-3 border-b border-line p-5 md:grid-cols-[1fr_2fr_140px_auto]">
          <input name="code" required placeholder="FOUNDING" className="field uppercase" />
          <input name="description" placeholder="Founding member offer" className="field" />
          <input name="percentOff" type="number" min={1} max={100} required placeholder="% off" className="field" />
          <button className="btn btn-gold">Create</button>
        </ActionForm>
        <table className="data-table">
          <thead><tr><th>Code</th><th>Offer</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {(promos ?? []).map((p: any) => (
              <tr key={p.id}>
                <td className="font-mono text-text">{p.code}</td>
                <td>{p.percent_off ? `${p.percent_off}% off` : `$${(p.amount_off_cents / 100).toFixed(2)} off`} {p.description ? `· ${p.description}` : ""}</td>
                <td><span className={`chip ${p.is_active ? "chip-live" : ""}`}>{p.is_active ? "Active" : "Inactive"}</span></td>
                <td>{date(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!promos?.length && <Empty>No promotions yet.</Empty>}
      </Panel>
      <div className="mt-6">
        <Panel title={`Invitation requests (${waitlist?.length ?? 0})`}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Interests</th><th>Counselor</th><th>Requested</th></tr></thead>
            <tbody>
              {(waitlist ?? []).map((w: any) => (
                <tr key={w.email}>
                  <td className="text-text">{w.full_name ?? "—"}</td><td>{w.email}</td>
                  <td className="capitalize">{(w.interests ?? []).join(", ") || "—"}</td>
                  <td>{w.is_counselor ? "Yes" : "—"}</td><td>{date(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!waitlist?.length && <Empty>No invitation requests yet.</Empty>}
        </Panel>
      </div>
    </>
  );
}
