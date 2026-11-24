import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { updatePlan } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader } from "@/components/admin/ui";

export default async function PricingPage() {
  await requireStaff(rolesFor("/admin/pricing"));
  const supabase = await createClient();
  const { data: plans } = supabase ? await supabase.from("membership_plans").select("*").order("sort_order") : { data: [] };

  return (
    <>
      <PageHeader eyebrow="Revenue" title="Pricing & packages" />
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Set the price and Stripe price ID for each package. A package marked available is shown to members, but nobody can
        be charged real money until live payments are authorized in Launch controls.
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        {(plans ?? []).map((p) => (
          <ActionForm key={p.id} action={updatePlan} className="glass p-6">
            <input type="hidden" name="id" value={p.id} />
            <div className="mb-4 flex items-center justify-between">
              <span className="chip">{p.audience === "counselor" ? "Provider" : "Member"} · {(p.experiences as string[]).join(", ") || "choice of one"}</span>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="active" defaultChecked={p.is_active} className="accent-[var(--gold)]" /> Available
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-faint">Name<input name="name" defaultValue={p.name} className="field" /></label>
              <label className="space-y-1 text-xs text-faint">Price (USD)<input name="price" type="number" step="0.01" min="0" defaultValue={(p.price_cents / 100).toFixed(2)} className="field" /></label>
              <label className="space-y-1 text-xs text-faint">Billing
                <select name="interval" defaultValue={p.billing_interval} className="field">
                  <option value="month">Monthly</option><option value="year">Yearly</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-faint">Stripe price ID<input name="stripePriceId" defaultValue={p.stripe_price_id ?? ""} placeholder="price_…" className="field" /></label>
            </div>
            <p className="mt-3 text-xs text-faint">{p.description}</p>
            <button className="btn btn-gold btn-sm mt-4">Save package</button>
          </ActionForm>
        ))}
      </div>
      {!plans?.length && <Empty>No packages yet. Run the database migration to load the draft packages.</Empty>}
    </>
  );
}
