import { requireStaff, hasRole } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { setAccountStatus } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireStaff(rolesFor("/admin/members"));
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase?.from("profiles").select("id, email, display_name, status, created_at, experience_access(experience, status)").order("created_at", { ascending: false }).limit(100);
  if (q && query) query = query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,display_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data: members } = query ? await query : { data: [] };
  const canChange = hasRole(viewer, ["owner", "admin"]);

  return (
    <>
      <PageHeader eyebrow="People" title="Members">
        <form className="w-full sm:w-72"><input name="q" defaultValue={q} placeholder="Search name or email" className="field" /></form>
      </PageHeader>
      <Panel title="Accounts">
        <table className="data-table">
          <thead><tr><th>Member</th><th>Experiences</th><th>Status</th><th>Joined</th>{canChange && <th>Action</th>}</tr></thead>
          <tbody>
            {(members ?? []).map((m: any) => (
              <tr key={m.id}>
                <td><p className="text-text">{m.display_name ?? "—"}</p><p className="text-xs text-faint">{m.email}</p></td>
                <td className="capitalize">{m.experience_access?.filter((a: any) => a.status === "active").map((a: any) => a.experience).join(", ") || "—"}</td>
                <td><span className={`chip ${m.status === "active" ? "chip-live" : "chip-danger"}`}>{m.status}</span></td>
                <td>{date(m.created_at)}</td>
                {canChange && (
                  <td>
                    {m.id !== viewer.id && (
                      <ActionForm action={setAccountStatus}>
                        <input type="hidden" name="id" value={m.id} />
                        <button name="status" value={m.status === "active" ? "suspended" : "active"} className="btn btn-ghost btn-sm">
                          {m.status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                      </ActionForm>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!members?.length && <Empty>No members yet.</Empty>}
      </Panel>
    </>
  );
}
