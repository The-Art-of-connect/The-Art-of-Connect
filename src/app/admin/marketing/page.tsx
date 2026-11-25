import { hasRole, requireStaff } from "@/lib/auth";
import { FINANCE_VIEWERS, date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createPromotion, togglePromotion } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

const EXP: Record<string, string> = { business: "In Business", counseling: "In Life", relationships: "In Love" };

export default async function MarketingPage() {
  const viewer = await requireStaff(rolesFor("/admin/marketing"));
  // Promotions are discounts (financial): owner & finance manage them, executives view, general staff never see them.
  const seePromos = hasRole(viewer, FINANCE_VIEWERS);
  const managePromos = hasRole(viewer, ["owner", "finance"]);
  const supabase = await createClient();
  const [{ data: promos }, { data: waitlist }, { data: tiers }] = supabase
    ? await Promise.all([
        supabase.from("promotions").select("*").order("created_at", { ascending: false }),
        supabase.from("waitlist").select("email, full_name, interests, love_track, desired_tier, desired_interval, couples_upgrade, referral_code, attribution, created_at").order("created_at", { ascending: false }).limit(300),
        supabase.from("membership_packages").select("slug, name").order("sort_order"),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];

  return (
    <>
      <PageHeader eyebrow="Growth" title="Marketing & promotions" />
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Create promotional codes and launch offers. Codes start inactive; switch them on when ready. A “public offer” is
        announced on the Memberships page. Codes apply only once payments launch.
      </p>

      {seePromos && (
      <Panel title={managePromos ? "Create a promotion" : "Promotions (view only)"}>
        {managePromos && (
        <ActionForm action={createPromotion} className="grid gap-3 p-5 md:grid-cols-4">
          <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Code</span><input name="code" required placeholder="FOUNDING40" className="field uppercase" /></label>
          <label className="space-y-1.5 md:col-span-3"><span className="text-xs font-semibold text-muted">Description (shown to customers)</span><input name="description" placeholder="Founding member offer — 20% off your first period" className="field" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Discount type</span>
            <select name="kind" className="field" defaultValue="percent"><option value="percent">Percent off</option><option value="amount">Amount off ($)</option></select>
          </label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Value</span><input name="value" required inputMode="decimal" placeholder="20" className="field" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Starts</span><input name="startsAt" type="date" className="field" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Ends</span><input name="endsAt" type="date" className="field" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Max redemptions</span><input name="maxRedemptions" inputMode="numeric" placeholder="Unlimited" className="field" /></label>
          <fieldset className="md:col-span-2">
            <legend className="text-xs font-semibold text-muted">Applies to (none = all memberships)</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {(tiers ?? []).map((t: any) => (
                <label key={t.slug} className="flex items-center gap-2 text-sm"><input type="checkbox" name="tiers" value={t.slug} className="accent-[var(--champagne)]" /> {t.name}</label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publicOffer" className="accent-[var(--champagne)]" /> Public launch offer</label>
            <button className="btn btn-gold">Create</button>
          </div>
        </ActionForm>
        )}
        <table className="data-table">
          <thead><tr><th>Code</th><th>Offer</th><th>Window</th><th>Used</th><th>Status</th><th /></tr></thead>
          <tbody>
            {(promos ?? []).map((p: any) => (
              <tr key={p.id}>
                <td className="font-mono text-text">{p.code}</td>
                <td>{p.percent_off ? `${p.percent_off}% off` : `$${(p.amount_off_cents / 100).toFixed(2)} off`}{p.description ? ` · ${p.description}` : ""}{p.applies_to_tiers?.length ? ` · ${p.applies_to_tiers.join(", ")}` : ""}</td>
                <td>{p.starts_at || p.ends_at ? `${date(p.starts_at)} – ${date(p.ends_at)}` : "Always"}</td>
                <td>{p.redemption_count}{p.max_redemptions ? ` / ${p.max_redemptions}` : ""}</td>
                <td>
                  <span className={`chip ${p.is_active ? "chip-live" : ""}`}>{p.is_active ? "Active" : "Inactive"}</span>
                  {p.is_public_offer && <span className="chip chip-locked ml-1">Public</span>}
                </td>
                <td>
                  {managePromos && <div className="flex gap-2">
                    <ActionForm action={togglePromotion}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="field" value="is_active" /><input type="hidden" name="on" value={String(!p.is_active)} />
                      <button className="btn btn-ghost btn-sm">{p.is_active ? "Deactivate" : "Activate"}</button>
                    </ActionForm>
                    <ActionForm action={togglePromotion}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="field" value="is_public_offer" /><input type="hidden" name="on" value={String(!p.is_public_offer)} />
                      <button className="btn btn-ghost btn-sm">{p.is_public_offer ? "Hide offer" : "Announce"}</button>
                    </ActionForm>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!promos?.length && <Empty>No promotions yet.</Empty>}
      </Panel>
      )}

      <div className="mt-6">
        <Panel title={`Notify-me list — enrollment opens soon (${waitlist?.length ?? 0})`}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Membership built</th><th>Source</th><th>Joined</th></tr></thead>
            <tbody>
              {(waitlist ?? []).map((w: any) => (
                <tr key={w.email}>
                  <td><p className="text-text">{w.full_name ?? "—"}</p><p className="text-xs text-faint">{w.email}</p></td>
                  <td>
                    {(w.interests ?? []).map((e: string) => EXP[e]).join(" · ") || "—"}
                    {w.desired_tier ? <span className="block text-xs text-faint">{w.desired_tier} · {w.desired_interval === "year" ? "annual" : "monthly"}{w.couples_upgrade ? " · couples" : ""}{w.love_track ? ` · ${w.love_track}` : ""}</span> : null}
                  </td>
                  <td>{w.attribution?.utm_source ?? (w.referral_code ? `Referral ${w.referral_code}` : "Direct")}{w.attribution?.utm_campaign ? <span className="block text-xs text-faint">{w.attribution.utm_campaign}</span> : null}</td>
                  <td>{date(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!waitlist?.length && <Empty>No one has signed up to be notified yet.</Empty>}
        </Panel>
      </div>

      <div className="mt-6 rounded-2xl border border-line p-5 text-sm text-muted">
        <p className="font-semibold text-text">Campaign links</p>
        <p className="mt-2">
          Add tags to any link you share so you can see which posts bring members, e.g.
          <span className="mt-2 block break-all font-mono text-xs text-text">https://theartofconnect.com/membership?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=launch</span>
        </p>
        <p className="mt-2">Pre-select a membership with <span className="font-mono text-xs text-text">?experiences=business,life,love&amp;billing=annual</span>. Sources are recorded with first-party cookies only — no third-party trackers.</p>
      </div>
    </>
  );
}
