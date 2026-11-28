import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CONTACT, FUTURE, HELP_NEEDED, HELP_OFFERED, MENTORSHIP, RELATIONSHIPS, SCOPES, STAGES, STRUCTURES, US_STATES, YEARS } from "@/lib/business-options";
import { saveBusinessProfile } from "@/app/actions/business";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Let’s Talk About Your Business" };
export const dynamic = "force-dynamic";

function Section({ n, title, sub, children }: { n: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <fieldset className="glass space-y-5 p-6 sm:p-8">
      <legend className="sr-only">{title}</legend>
      <div>
        <p className="flex items-baseline gap-3"><span className="display text-3xl text-gold">{n}</span><span className="text-xl font-semibold">{title}</span></p>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </fieldset>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}
function Checks({ name, options, selected }: { name: string; options: Record<string, string>; selected: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Object.entries(options).map(([k, l]) => (
        <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-2.5 text-sm transition-colors has-[:checked]:border-champagne has-[:checked]:bg-champagne/10">
          <input type="checkbox" name={name} value={k} defaultChecked={selected.includes(k)} className="h-4 w-4 accent-[var(--champagne)]" />
          {l}
        </label>
      ))}
    </div>
  );
}
function Select({ name, options, value, placeholder }: { name: string; options: Record<string, string>; value?: string | null; placeholder: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="field">
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}

export default async function BusinessOnboarding() {
  const { viewer, preview } = await requireExperience("business");
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [{ data: p }, { data: industries }, { data: priv }] = await Promise.all([
    biz.from("profiles").select("*").eq("user_id", viewer.id).maybeSingle(),
    biz.from("industries").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("private_details").select("annual_revenue_range, employee_range").eq("user_id", viewer.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Preview — The Professional Society is not open to members yet.</p>}
      <div className="theme-dark band rounded-[28px] p-8 text-center sm:p-10">
        <p className="eyebrow">The Professional Society · In Business</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Let’s talk about your business.</h1>
        <p className="mt-3 text-muted">Every business has a story. We want to understand yours — and what you can share with others.</p>
      </div>

      <ActionForm action={saveBusinessProfile} className="mt-8 space-y-6">
        <input type="hidden" name="from" value="onboarding" />
        <Section n="01" title="Your business">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name *"><input name="company" required defaultValue={p?.company ?? ""} className="field" /></Field>
            <Field label="Name shown to other members" hint="Leave blank to use your business name."><input name="displayName" defaultValue={p?.display_name ?? ""} className="field" /></Field>
            <Field label="Industry">
              <select name="industry" defaultValue={p?.industry ?? ""} className="field">
                <option value="">Choose your industry</option>
                {(industries ?? []).map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
              </select>
            </Field>
            <Field label="Business structure"><Select name="structure" options={STRUCTURES} value={p?.business_structure} placeholder="Choose" /></Field>
            <Field label="Years in business"><Select name="years" options={YEARS} value={p?.years_in_business} placeholder="Choose" /></Field>
            <Field label="Development stage"><Select name="stage" options={STAGES} value={p?.stage} placeholder="Choose" /></Field>
            <Field label="Your role" hint="e.g. Founder & CEO, Managing Partner"><input name="role" defaultValue={p?.leadership_role ?? ""} className="field" /></Field>
            <Field label="One-line headline" hint="e.g. Helping professional firms scale across states"><input name="headline" defaultValue={p?.headline ?? ""} className="field" /></Field>
            <Field label="City"><input name="city" defaultValue={p?.city ?? ""} className="field" /></Field>
            <Field label="State"><Select name="state" options={US_STATES} value={p?.state} placeholder="Choose your state" /></Field>
          </div>
          <Field label="Products or services you offer"><textarea name="offerings" defaultValue={p?.offerings ?? ""} className="field !min-h-[90px]" /></Field>
        </Section>

        <Section n="02" title="How can we help your business?" sub="Select everything that applies.">
          <Checks name="helpNeeded" options={HELP_NEEDED} selected={p?.help_needed ?? []} />
          <Field label="Current business challenges"><textarea name="challenges" defaultValue={p?.challenges ?? ""} className="field !min-h-[90px]" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Short-term goals (next 12 months)"><textarea name="goalsShort" defaultValue={p?.goals_short ?? ""} className="field !min-h-[90px]" /></Field>
            <Field label="Long-term goals"><textarea name="goalsLong" defaultValue={p?.goals_long ?? ""} className="field !min-h-[90px]" /></Field>
          </div>
          <p className="text-sm font-semibold">Strategic relationships you’re looking for</p>
          <Checks name="relationships" options={RELATIONSHIPS} selected={p?.relationships_desired ?? []} />
          <p className="text-sm font-semibold">Future plans you’re exploring</p>
          <Checks name="future" options={FUTURE} selected={p?.future_interests ?? []} />
        </Section>

        <Section n="03" title="How can your business help others?" sub="Tell us what you bring to the community. Every business owner has something to teach.">
          <Checks name="helpOffered" options={HELP_OFFERED} selected={p?.help_offered ?? []} />
          <Field label="Areas of expertise" hint="Separate with commas, e.g. multi-state expansion, payroll, franchising"><input name="expertise" defaultValue={(p?.expertise ?? []).join(", ")} className="field" /></Field>
          <Field label="Mentorship"><Select name="mentorship" options={MENTORSHIP} value={p?.mentorship ?? "none"} placeholder="Choose" /></Field>
          <Field label="About you and your business (shown to members you connect with)"><textarea name="about" defaultValue={p?.about ?? ""} className="field !min-h-[90px]" /></Field>
        </Section>

        <Section n="04" title="Privacy and connections" sub="You decide who sees your profile and who can contact you. Your email and phone are never shown.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Connect with owners in"><Select name="scope" options={SCOPES} value={p?.connection_scope ?? "national"} placeholder="Choose" /></Field>
            <Field label="Who may send you connection requests"><Select name="contact" options={CONTACT} value={p?.accept_requests_from ?? "members"} placeholder="Choose" /></Field>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="visibleToMembers" defaultChecked={p?.is_visible ?? true} className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
            <span>Show my business profile to other Professional Society members.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="publicConsent" defaultChecked={p?.public_profile_consent ?? false} className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
            <span>
              <strong>Optional:</strong> I consent to showing my business name, industry, city and state, headline and how I can help on the public
              Explore The Professional Society page. I can withdraw this at any time.
            </span>
          </label>
          <details className="rounded-xl border border-line p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Optional private financial details</summary>
            <p className="mt-2 text-muted">Used only to tailor your pathway. Visible to you alone — not to other members, our staff or the owner.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select name="revenue" defaultValue={priv?.annual_revenue_range ?? ""} className="field" aria-label="Annual revenue">
                <option value="">Annual revenue (optional)</option>
                {[["pre_revenue", "Pre-revenue"], ["under_250k", "Under $250K"], ["250k_1m", "$250K–$1M"], ["1m_5m", "$1M–$5M"], ["5m_25m", "$5M–$25M"], ["over_25m", "Over $25M"], ["prefer_not", "Prefer not to say"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select name="employees" defaultValue={priv?.employee_range ?? ""} className="field" aria-label="Team size">
                <option value="">Team size (optional)</option>
                {[["solo", "Just me"], ["2_10", "2–10"], ["11_50", "11–50"], ["51_200", "51–200"], ["over_200", "Over 200"], ["prefer_not", "Prefer not to say"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </details>
        </Section>

        <div className="flex flex-col items-center gap-3 pb-6 sm:flex-row sm:justify-between">
          <Link href="/app/business" className="text-sm text-muted underline">Cancel</Link>
          <button className="btn btn-gold w-full sm:w-auto">Save and continue</button>
        </div>
        <p className="text-center text-xs text-faint">We don’t guarantee funding, partnerships or business outcomes. Introductions happen only when both owners accept.</p>
      </ActionForm>
    </div>
  );
}
