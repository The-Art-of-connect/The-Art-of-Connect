import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const TABLES: Record<string, string> = {
  pricing_config: "Pricing settings",
  membership_packages: "Membership package",
  professional_packages: "Professional membership",
  membership_addons: "Add-on",
  promotions: "Promotion",
  payments: "Payment",
  subscriptions: "Subscription",
  platform_settings: "Launch & platform setting",
  staff_roles: "Team permission",
};
// Identifiers that add noise without meaning to a reader.
const HIDE = new Set(["id", "user_id", "stripe_customer_id", "stripe_subscription_id", "stripe_payment_intent_id", "stripe_payment_ref", "stripe_invoice_id", "stripe_product_id", "stripe_membership_item_id", "granted_by", "updated_by", "resolved_by"]);

const when = (iso: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));
const show = (field: string, v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" && /cents$/.test(field)) return `$${(v / 100).toFixed(2)}`;
  if (Array.isArray(v)) return v.length ? v.join(", ") : "none";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/**
 * Financial audit trail, recorded by the database itself on every change to
 * pricing, promotions, payments, subscriptions, launch switches and team
 * permissions. Entries cannot be edited or deleted by anyone.
 */
export default async function FinancialAuditPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  await requireStaff(rolesFor("/admin/audit"));
  const area = (await searchParams).area ?? "";
  const supabase = (await createClient())!;
  let q = supabase.from("financial_audit_log").select("*").order("occurred_at", { ascending: false }).limit(300);
  if (area && TABLES[area]) q = q.eq("table_name", area);
  const { data: rows, error } = await q;

  return (
    <>
      <PageHeader eyebrow="Revenue" title="Financial audit trail" />
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Every change to prices, packages, promotions, payments and refunds, subscriptions, launch switches and team permissions is
        recorded automatically by the database: who made it, the previous value, the new value, and the date and time. Entries
        cannot be edited or deleted. Changes made by Stripe or the server are marked “System”.
      </p>
      <form method="get" className="mb-6 flex flex-wrap gap-2">
        <a href="/admin/audit" className={`nav-pill text-sm ${!area ? "!border-champagne !bg-champagne/15" : ""}`}>All</a>
        {Object.entries(TABLES).map(([k, label]) => (
          <a key={k} href={`/admin/audit?area=${k}`} className={`nav-pill text-sm ${area === k ? "!border-champagne !bg-champagne/15" : ""}`}>{label}</a>
        ))}
      </form>
      <Panel title={`Changes${area ? ` — ${TABLES[area]}` : ""}`}>
        {error ? (
          <Empty>The audit trail is not available yet (database update pending).</Empty>
        ) : rows?.length ? (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const fields = (r.changed_fields as string[]).filter((f) => !HIDE.has(f));
              return (
                <li key={r.id} className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      {TABLES[r.table_name] ?? r.table_name} <span className="font-normal text-muted">· {r.record_key}</span>
                      <span className="ml-2 text-xs text-gold">{r.operation === "INSERT" ? "Created" : r.operation === "DELETE" ? "Removed" : "Changed"}</span>
                    </p>
                    <p className="text-xs text-muted">{when(r.occurred_at)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    By {r.source === "system" ? "System (Stripe webhook / server)" : `${r.actor_email ?? "unknown"}${r.actor_roles ? ` (${r.actor_roles})` : ""}`}
                  </p>
                  {fields.length > 0 && (
                    <table className="mt-3 w-full text-xs">
                      <thead className="text-left text-faint"><tr><th className="py-1 pr-3 font-normal">Field</th><th className="py-1 pr-3 font-normal">Previous</th><th className="py-1 font-normal">New</th></tr></thead>
                      <tbody>
                        {fields.map((f) => (
                          <tr key={f} className="align-top">
                            <td className="py-1 pr-3 text-muted">{f.replaceAll("_", " ")}</td>
                            <td className="max-w-[18rem] break-words py-1 pr-3">{r.operation === "INSERT" ? "—" : show(f, (r.previous_values as Record<string, unknown>)?.[f])}</td>
                            <td className="max-w-[18rem] break-words py-1">{r.operation === "DELETE" ? "—" : show(f, (r.new_values as Record<string, unknown>)?.[f])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>No financial changes recorded yet.</Empty>
        )}
      </Panel>
    </>
  );
}
