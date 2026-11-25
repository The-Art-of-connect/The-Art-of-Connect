import { requireStaff, hasRole } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { getCatalogue } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";
import { deleteAddon, saveAddon, saveExperienceOffering, saveGeneralPricing, savePackage, saveTier, setPricingPublished } from "@/app/actions/pricing";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";
import { MembershipBuilder } from "@/components/MembershipBuilder";

export const dynamic = "force-dynamic";

const dollars = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));
const TYPES = [["licensed_clinical", "Licensed clinical"], ["coach", "Coach"], ["mentor", "Mentor"], ["other_nonclinical", "Other"]] as const;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export default async function PricingPage() {
  const viewer = await requireStaff(rolesFor("/admin/pricing"));
  const isOwner = hasRole(viewer, ["owner"]);
  const supabase = (await createClient())!;
  const [{ data: cfg }, { data: offerings }, { data: tiers }, { data: addons }, { data: packages }, preview] = await Promise.all([
    supabase.from("pricing_config").select("*").maybeSingle(),
    supabase.from("experience_offerings").select("*").order("sort_order"),
    supabase.from("membership_tiers").select("*").order("sort_order"),
    supabase.from("membership_addons").select("*").order("sort_order"),
    supabase.from("professional_packages").select("*").order("sort_order"),
    getCatalogue(true),
  ]);
  const unpriced = (offerings ?? []).filter((o) => o.is_active && o.monthly_price_cents == null).length;

  return (
    <>
      <PageHeader eyebrow="Revenue" title="Pricing & packages" />
      <p className="mb-8 max-w-3xl text-sm text-muted">
        Every name, description, price, discount, fee and benefit customers see is set here — nothing is hard-coded.
        Prices stay hidden from the public until the owner publishes them. Publishing pricing does not open registration or
        payments; those remain under Launch controls.
      </p>

      {/* Publish status */}
      <div className={`mb-8 rounded-2xl border p-6 ${cfg?.is_published ? "border-success/40 bg-success/5" : "border-champagne/50 bg-champagne/10"}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">{cfg?.is_published ? "Pricing is public" : "Pricing is in draft — hidden from the public"}</p>
            <p className="mt-1 text-sm text-muted">
              {cfg?.is_published ? `Published ${date(cfg.published_at)}.` : unpriced ? `${unpriced} active experience(s) still need a price before publishing.` : "Ready to publish when you approve."}
            </p>
          </div>
          {isOwner ? (
            <ActionForm action={setPricingPublished} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="publish" value={String(!cfg?.is_published)} />
              {!cfg?.is_published && <input name="confirm" placeholder="Type PUBLISH" autoComplete="off" className="field !min-h-[38px] !w-40 !text-sm" />}
              <button className={`btn btn-sm ${cfg?.is_published ? "btn-ghost" : "btn-gold"}`}>{cfg?.is_published ? "Unpublish" : "Publish pricing"}</button>
            </ActionForm>
          ) : (
            <p className="text-xs text-muted">Only the owner can publish.</p>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <Panel title="General">
          <ActionForm action={saveGeneralPricing} className="grid gap-4 p-5 md:grid-cols-3">
            <Field label="Currency"><input name="currency" defaultValue={cfg?.currency ?? "usd"} className="field" /></Field>
            <Field label="Annual billing discount (%)" hint="Applies to every tier unless a tier sets its own."><input name="annual" inputMode="decimal" defaultValue={cfg?.annual_discount_percent ?? ""} className="field" /></Field>
            <Field label="Couples upgrade price (per month)"><input name="couplesPrice" inputMode="decimal" placeholder="Not set" defaultValue={dollars(cfg?.couples_upgrade_monthly_cents)} className="field" /></Field>
            <Field label="Couples upgrade name"><input name="couplesName" defaultValue={cfg?.couples_upgrade_name ?? ""} className="field" /></Field>
            <div className="md:col-span-2"><Field label="Couples upgrade description"><input name="couplesDescription" defaultValue={cfg?.couples_upgrade_description ?? ""} className="field" /></Field></div>
            <div className="md:col-span-3"><Field label="Referral reward (shown to members)" hint="e.g. One month free for you and a friend."><input name="referral" defaultValue={cfg?.referral_reward_description ?? ""} className="field" /></Field></div>
            <div><button className="btn btn-gold btn-sm">Save general settings</button></div>
          </ActionForm>
        </Panel>

        <Panel title="Experiences — individual monthly prices">
          <div className="grid gap-px bg-line lg:grid-cols-3">
            {(offerings ?? []).map((o) => (
              <ActionForm key={o.experience} action={saveExperienceOffering} className="space-y-3 bg-ink-2 p-5">
                <input type="hidden" name="experience" value={o.experience} />
                <Field label="Name"><input name="name" defaultValue={o.name} className="field" /></Field>
                <Field label="Subtitle"><input name="subtitle" defaultValue={o.subtitle} className="field" /></Field>
                <Field label="Monthly price"><input name="price" inputMode="decimal" placeholder="Not set" defaultValue={dollars(o.monthly_price_cents)} className="field" /></Field>
                <Field label="Description"><textarea name="description" defaultValue={o.description} className="field !min-h-[80px]" /></Field>
                <Field label="Benefits (one per line)"><textarea name="benefits" defaultValue={(o.benefits ?? []).join("\n")} className="field !min-h-[100px]" /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={o.is_active} className="accent-[var(--champagne)]" /> Offered</label>
                <button className="btn btn-gold btn-sm">Save</button>
              </ActionForm>
            ))}
          </div>
        </Panel>

        <Panel title="Membership tiers — bundles">
          <div className="grid gap-px bg-line lg:grid-cols-3">
            {(tiers ?? []).map((t) => (
              <ActionForm key={t.slug} action={saveTier} className="space-y-3 bg-ink-2 p-5">
                <input type="hidden" name="slug" value={t.slug} />
                <p className="text-xs tracking-[0.2em] uppercase text-faint">{t.experience_count} experience{t.experience_count > 1 ? "s" : ""}</p>
                <Field label="Name"><input name="name" defaultValue={t.name} className="field" /></Field>
                <Field label="Description"><input name="description" defaultValue={t.description} className="field" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bundle discount %"><input name="bundle" inputMode="decimal" defaultValue={t.bundle_discount_percent ?? ""} className="field" /></Field>
                  <Field label="Annual discount %" hint="Blank = general"><input name="annual" inputMode="decimal" defaultValue={t.annual_discount_percent ?? ""} className="field" /></Field>
                </div>
                <Field label="One-time setup fee"><input name="setup" inputMode="decimal" placeholder="None" defaultValue={dollars(t.setup_fee_cents)} className="field" /></Field>
                <Field label="Benefits (one per line)"><textarea name="benefits" defaultValue={(t.benefits ?? []).join("\n")} className="field !min-h-[100px]" /></Field>
                <Field label="Eligibility note"><input name="eligibility" defaultValue={t.eligibility ?? ""} className="field" /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={t.is_active} className="accent-[var(--champagne)]" /> Offered</label>
                <button className="btn btn-gold btn-sm">Save</button>
              </ActionForm>
            ))}
          </div>
        </Panel>

        <Panel title="Premium add-ons">
          <div className="divide-y divide-line">
            {[...(addons ?? []), null].map((a, i) => (
              <div key={a?.slug ?? `new-${i}`} className="p-5">
                {!a && <p className="mb-3 text-sm font-semibold">Add a new add-on</p>}
                <ActionForm action={saveAddon} className="grid gap-3 md:grid-cols-4">
                  <Field label="Code (slug)"><input name="slug" defaultValue={a?.slug ?? ""} readOnly={Boolean(a)} placeholder="e.g. concierge" className="field" /></Field>
                  <Field label="Name"><input name="name" defaultValue={a?.name ?? ""} className="field" /></Field>
                  <Field label="Price"><input name="price" inputMode="decimal" placeholder="Not set" defaultValue={dollars(a?.price_cents)} className="field" /></Field>
                  <Field label="Billing">
                    <select name="billing" defaultValue={a?.billing ?? "monthly"} className="field"><option value="monthly">Monthly</option><option value="one_time">One-time</option></select>
                  </Field>
                  <div className="md:col-span-2"><Field label="Description"><input name="description" defaultValue={a?.description ?? ""} className="field" /></Field></div>
                  <Field label="For">
                    <select name="audience" defaultValue={a?.audience ?? "member"} className="field"><option value="member">Members</option><option value="professional">Professionals</option></select>
                  </Field>
                  <Field label="Requires experience">
                    <select name="requires" defaultValue={a?.requires_experience ?? ""} className="field">
                      <option value="">Any</option><option value="business">In Business</option><option value="counseling">In Life</option><option value="relationships">In Love</option>
                    </select>
                  </Field>
                  <div className="md:col-span-3"><Field label="Eligibility note"><input name="eligibility" defaultValue={a?.eligibility ?? ""} className="field" /></Field></div>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={a?.is_active ?? false} className="accent-[var(--champagne)]" /> Offered</label>
                    <button className="btn btn-gold btn-sm">{a ? "Save" : "Add"}</button>
                  </div>
                </ActionForm>
                {a && (
                  <ActionForm action={deleteAddon} className="mt-2">
                    <input type="hidden" name="slug" value={a.slug} />
                    <button className="text-xs text-danger underline">Remove {a.name}</button>
                  </ActionForm>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Professional packages — counselors, coaches & mentors">
          <div className="divide-y divide-line">
            {[...(packages ?? []), null].map((p, i) => (
              <ActionForm key={p?.slug ?? `new-${i}`} action={savePackage} className="grid gap-3 p-5 md:grid-cols-4">
                {!p && <p className="text-sm font-semibold md:col-span-4">Add a new package</p>}
                <Field label="Code (slug)"><input name="slug" defaultValue={p?.slug ?? ""} readOnly={Boolean(p)} className="field" /></Field>
                <Field label="Name"><input name="name" defaultValue={p?.name ?? ""} className="field" /></Field>
                <Field label="Monthly price"><input name="price" inputMode="decimal" placeholder="Not set" defaultValue={dollars(p?.monthly_price_cents)} className="field" /></Field>
                <Field label="Onboarding fee (one-time)"><input name="onboarding" inputMode="decimal" placeholder="None" defaultValue={dollars(p?.onboarding_fee_cents)} className="field" /></Field>
                <div className="md:col-span-2"><Field label="Description"><input name="description" defaultValue={p?.description ?? ""} className="field" /></Field></div>
                <div className="md:col-span-2"><Field label="Eligibility note"><input name="eligibility" defaultValue={p?.eligibility ?? ""} className="field" /></Field></div>
                <div className="md:col-span-2"><Field label="Benefits (one per line)"><textarea name="benefits" defaultValue={(p?.benefits ?? []).join("\n")} className="field !min-h-[90px]" /></Field></div>
                <fieldset className="md:col-span-2">
                  <legend className="text-xs font-semibold tracking-wide text-muted">Eligible professional types</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {TYPES.map(([v, l]) => (
                      <label key={v} className="flex items-center gap-2 text-sm"><input type="checkbox" name="types" value={v} defaultChecked={p ? p.eligible_types?.includes(v) : true} className="accent-[var(--champagne)]" /> {l}</label>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.is_active ?? true} className="accent-[var(--champagne)]" /> Offered</label>
                    <button className="btn btn-gold btn-sm">{p ? "Save" : "Add package"}</button>
                  </div>
                </fieldset>
              </ActionForm>
            ))}
          </div>
          {!packages?.length && <Empty>No professional packages yet.</Empty>}
        </Panel>

        <Panel title="Live preview — exactly what customers will see (with your draft prices)">
          <div className="theme-ivory p-5 sm:p-8">
            <MembershipBuilder catalogue={preview} initial={{ experiences: ["business", "relationships"], interval: "month", couples: false, addons: [] }} enrollmentOpen={false} mode="preview" />
          </div>
        </Panel>
      </div>
    </>
  );
}
