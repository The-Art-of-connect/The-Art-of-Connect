import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveReport } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export default async function ModerationPage() {
  await requireStaff(rolesFor("/admin/moderation"));
  const supabase = await createClient();
  const { data: reports } = supabase
    ? await supabase.from("moderation_reports").select("*").order("created_at", { ascending: false }).limit(100)
    : { data: [] as any[] };

  return (
    <>
      <PageHeader eyebrow="Care" title="Content moderation" />
      <p className="mb-6 max-w-2xl text-sm text-muted">Reports from In Love and In Business. In Life is outside moderation to protect confidentiality; concerns about a counselor go through counselor verification.</p>
      <Panel title="Reports">
        <table className="data-table">
          <thead><tr><th>Experience</th><th>Reason</th><th>Details</th><th>Status</th><th>Filed</th><th /></tr></thead>
          <tbody>
            {(reports ?? []).map((r: any) => (
              <tr key={r.id}>
                <td className="capitalize">{r.experience}</td><td className="text-text">{r.reason}</td>
                <td className="max-w-xs truncate">{r.details ?? "—"}</td><td><span className="chip">{r.status}</span></td><td>{date(r.created_at)}</td>
                <td>
                  <ActionForm action={resolveReport} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <button name="status" value="actioned" className="btn btn-gold btn-sm">Action</button>
                    <button name="status" value="dismissed" className="btn btn-ghost btn-sm">Dismiss</button>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!reports?.length && <Empty>No reports. All quiet.</Empty>}
      </Panel>
    </>
  );
}
