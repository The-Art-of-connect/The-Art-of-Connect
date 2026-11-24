import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { reviewApplication } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export default async function CounselorsPage() {
  await requireStaff(rolesFor("/admin/counselors"));
  const supabase = await createClient();
  const c = supabase?.schema("counseling");
  const [{ data: apps }, { data: counselors }] = c
    ? await Promise.all([
        c.from("applications").select("*").order("created_at", { ascending: false }).limit(100),
        c.from("counselors").select("user_id, professional_name, credentials, is_verified, is_listed, rate_cents").order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <>
      <PageHeader eyebrow="People" title="Counselor verification" />
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Review provider licenses and credentials. You can see applications and listings here; client records and session
        notes are confidential and are never shown in the Owner Portal.
      </p>
      <Panel title="Applications">
        <div className="divide-y divide-line">
          {(apps ?? []).map((a) => (
            <div key={a.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr]">
              <div className="text-sm">
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold text-text">{a.legal_name}</p>
                  <span className="chip">{a.status.replace("_", " ")}</span>
                </div>
                <p className="mt-2 text-muted">{a.license_type} · #{a.license_number} · {a.license_state} · expires {date(a.license_expires_on)}</p>
                <p className="mt-1 text-faint">{(a.specialties ?? []).join(", ") || "No specialties listed"} · {a.document_paths?.length ?? 0} document(s) · applied {date(a.created_at)}</p>
              </div>
              <ActionForm action={reviewApplication} className="space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <textarea name="notes" defaultValue={a.reviewer_notes ?? ""} placeholder="Verification notes (license lookup, references…)" className="field !min-h-[70px] text-sm" />
                <div className="flex flex-wrap gap-2">
                  <button name="decision" value="approved" className="btn btn-gold btn-sm">Approve</button>
                  <button name="decision" value="in_review" className="btn btn-ghost btn-sm">In review</button>
                  <button name="decision" value="more_info" className="btn btn-ghost btn-sm">Request info</button>
                  <button name="decision" value="rejected" className="btn btn-ghost btn-sm text-danger">Reject</button>
                </div>
              </ActionForm>
            </div>
          ))}
        </div>
        {!apps?.length && <Empty>No applications yet. Applications open when you enable them in Launch controls.</Empty>}
      </Panel>
      <div className="mt-6">
        <Panel title="Verified counselors">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Credentials</th><th>Verified</th><th>Listed</th></tr></thead>
            <tbody>
              {(counselors ?? []).map((x) => (
                <tr key={x.user_id}>
                  <td className="text-text">{x.professional_name}</td><td>{x.credentials ?? "—"}</td>
                  <td>{x.is_verified ? "Yes" : "No"}</td><td>{x.is_listed ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!counselors?.length && <Empty>No verified counselors yet.</Empty>}
        </Panel>
      </div>
    </>
  );
}
