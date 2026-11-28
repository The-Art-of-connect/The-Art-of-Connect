import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { reviewFormationOrder } from "@/app/actions/formation";
import { FORMABLE, PROVIDER_LABEL, REVIEW_STATUSES, orderStatus } from "@/lib/formation";

export const metadata = { title: "Formation requests · Owner Portal" };
export const dynamic = "force-dynamic";

type O = { id: string; user_id: string; status: string; provider: string; requested_at: string | null; status_note: string | null; updated_at: string;
  member_businesses: { name: string; entity_type: string; state: string | null } | null };
const STATUS_OPTION: Record<string, string> = { processing: "Processing (being prepared)", filed: "Filed with the state", completed: "Completed", cancelled: "Cancelled (closed)", failed: "Unable to proceed" };

/** Formation requests members have sent from the Business Launch Center. Status updates only: no fees, payments or filing happen here. */
export default async function FormationOrdersAdmin({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireStaff(rolesFor("/admin/formation-orders"));
  const show = (await searchParams).show === "all" ? "all" : "open";
  const db = (await createClient())!;
  const { data } = await db.from("formation_orders")
    .select("id, user_id, status, provider, requested_at, status_note, updated_at, member_businesses(name, entity_type, state)")
    .not("requested_at", "is", null).order("requested_at", { ascending: false }).limit(500);
  const all = (data ?? []) as unknown as O[];
  const orders = show === "open" ? all.filter((o) => !["completed", "cancelled", "refunded", "failed"].includes(o.status)) : all;
  const { data: people } = orders.length ? await db.from("profiles").select("id, display_name").in("id", [...new Set(orders.map((o) => o.user_id))]) : { data: [] };
  const nameOf = (id: string) => people?.find((p) => p.id === id)?.display_name ?? "Member";

  return (
    <>
      <PageHeader eyebrow="Business Launch Center" title="Formation requests">
        <div className="flex gap-2 text-sm">
          <a href="/admin/formation-orders" className={`btn btn-sm ${show === "open" ? "btn-gold" : "btn-ghost"}`}>Open</a>
          <a href="/admin/formation-orders?show=all" className={`btn btn-sm ${show === "all" ? "btn-gold" : "btn-ghost"}`}>All</a>
        </div>
      </PageHeader>
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Requests members have sent for review. Nothing here takes a payment or files anything: update the status as the request moves forward, and the member is notified. Fees can only come from an approved provider; drafts members haven&apos;t sent stay private.</p>
      <Panel title={`${show === "open" ? "Open requests" : "All requests"} (${orders.length})`}>
        <div className="divide-y divide-line">
          {orders.map((o) => {
            const st = orderStatus(o);
            const closed = ["completed", "cancelled", "refunded", "failed"].includes(o.status);
            return (
              <div key={o.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr]">
                <div className="text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-base font-semibold text-text">{o.member_businesses?.name ?? "Business"}</p>
                    <span className="chip">{st.label}</span>
                  </div>
                  <p className="mt-1 text-muted">{FORMABLE[o.member_businesses?.entity_type ?? ""] ?? o.member_businesses?.entity_type} · {o.member_businesses?.state ?? "—"} · {nameOf(o.user_id)}</p>
                  <p className="mt-1 text-faint">{PROVIDER_LABEL[o.provider] ?? o.provider}</p>
                  <p className="mt-1 text-faint">Sent {o.requested_at ? new Date(o.requested_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"} · updated {new Date(o.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
                  {o.status_note && <p className="mt-2 text-muted">Note to member: {o.status_note}</p>}
                </div>
                {closed ? <p className="text-sm text-faint">Closed.</p> : (
                  <ActionForm action={reviewFormationOrder} className="space-y-2">
                    <input type="hidden" name="id" value={o.id} />
                    <label className="block text-xs font-semibold text-muted">Status
                      <select name="status" defaultValue={REVIEW_STATUSES.includes(o.status as never) ? o.status : "processing"} className="field mt-1 !min-h-[40px] text-sm">
                        {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{STATUS_OPTION[s]}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-muted">Note the member will see (optional, no fees or prices)
                      <textarea name="note" defaultValue={o.status_note ?? ""} maxLength={1000} className="field mt-1 !min-h-[60px] text-sm" />
                    </label>
                    <button className="btn btn-gold btn-sm">Update and notify member</button>
                  </ActionForm>
                )}
              </div>
            );
          })}
        </div>
        {!orders.length && <Empty>No formation requests {show === "open" ? "waiting" : "yet"}.</Empty>}
      </Panel>
    </>
  );
}
