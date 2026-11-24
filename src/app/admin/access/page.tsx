import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { reviewReferral, setExperienceAccess } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export default async function AccessPage() {
  await requireStaff(rolesFor("/admin/access"));
  const supabase = await createClient();
  const { data: referrals } = supabase
    ? await supabase.from("referrals").select("id, code, from_experience, to_experience, status, created_at").order("created_at", { ascending: false }).limit(100)
    : { data: [] };

  return (
    <>
      <PageHeader eyebrow="People" title="Access & referrals" />
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Each experience has separate permissions. Grant or revoke a member’s access to one experience without affecting the
        others, and approve referrals that move members between experiences.
      </p>
      <Panel title="Grant or revoke experience access">
        <ActionForm action={setExperienceAccess} className="grid gap-3 p-5 md:grid-cols-[1.4fr_1fr_auto_auto]">
          <input name="email" type="email" required placeholder="Member email" className="field" />
          <select name="experience" className="field" defaultValue="relationships">
            <option value="relationships">Relationships</option>
            <option value="business">Business</option>
            <option value="counseling">Counseling</option>
          </select>
          <button name="grant" value="true" className="btn btn-gold">Grant</button>
          <button name="grant" value="false" className="btn btn-ghost">Revoke</button>
        </ActionForm>
      </Panel>
      <div className="mt-6">
        <Panel title="Cross-experience referrals">
          <table className="data-table">
            <thead><tr><th>Code</th><th>From → To</th><th>Status</th><th>Created</th><th /></tr></thead>
            <tbody>
              {(referrals ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-text">{r.code}</td>
                  <td className="capitalize">{r.from_experience ?? "—"} → {r.to_experience ?? "—"}</td>
                  <td><span className="chip">{r.status}</span></td>
                  <td>{date(r.created_at)}</td>
                  <td>
                    {r.status === "pending" && (
                      <ActionForm action={reviewReferral} className="flex gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <button name="status" value="approved" className="btn btn-gold btn-sm">Approve</button>
                        <button name="status" value="rejected" className="btn btn-ghost btn-sm">Reject</button>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!referrals?.length && <Empty>No referrals yet.</Empty>}
        </Panel>
      </div>
    </>
  );
}
