import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { updateTicket } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export default async function SupportPage() {
  await requireStaff(rolesFor("/admin/support"));
  const supabase = await createClient();
  const { data: tickets } = supabase
    ? await supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(100)
    : { data: [] as any[] };

  return (
    <>
      <PageHeader eyebrow="Care" title="Customer support" />
      <Panel title="Tickets">
        <div className="divide-y divide-line">
          {(tickets ?? []).map((t: any) => (
            <div key={t.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text">{t.subject}</p>
                  <span className="chip">{t.category}</span><span className="chip">{t.status}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-muted">{t.body}</p>
                <p className="mt-2 text-xs text-faint">{t.email} · {date(t.created_at)}</p>
              </div>
              <ActionForm action={updateTicket} className="flex flex-wrap items-start gap-2">
                <input type="hidden" name="id" value={t.id} />
                <button name="status" value="pending" className="btn btn-ghost btn-sm">Pending</button>
                <button name="status" value="resolved" className="btn btn-gold btn-sm">Resolve</button>
              </ActionForm>
            </div>
          ))}
        </div>
        {!tickets?.length && <Empty>No support tickets. Members can also reach you at info@theartofconnect.com.</Empty>}
      </Panel>
    </>
  );
}
