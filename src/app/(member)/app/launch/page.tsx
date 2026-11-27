import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { IRS_EIN_URL, IRS_ENTITY_URL, IRS_S_CORP_URL, MONTHS, SBA_LICENSES_URL, SBA_STRUCTURE_URL, STEPS, STRUCTURES, TAX_ELECTIONS, money, type EntityFacts } from "@/lib/business-launch";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { addBusiness, updateBusiness } from "@/app/actions/business-launch";

export const metadata = { title: "Business Launch Center" };
export const dynamic = "force-dynamic";

type J = { code: string; name: string; filing_office: string | null; filing_office_url: string | null; business_name_search_url: string | null; online_filing_url: string | null;
  business_license_url: string | null; revenue_department_url: string | null; llc: EntityFacts; corporation: EntityFacts; nonprofit: EntityFacts; registered_agent: string | null;
  verified_on: string | null; status: string };
type B = { id: string; name: string; entity_type: string; state: string | null; stage: string; ein_status: string; tax_election: string | null; annual_report_month: number | null; reminders: boolean };

const ENTITY_LABEL: Record<string, string> = { llc: "LLC", corporation: "Corporation", nonprofit: "Nonprofit", sole_proprietorship: "Sole proprietorship", partnership: "Partnership", undecided: "Undecided" };
const STAGE_LABEL: Record<string, string> = { planning: "Planning", name_check: "Checking the name", preparing: "Preparing to file", filed: "Filed", formed: "Formed", dissolved: "Dissolved" };

function Facts({ label, f, approved, url }: { label: string; f: EntityFacts; approved: boolean; url: string | null }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-gold-deep">{label}</p>
      <p className="display mt-1 text-lg">{f.document ?? "Formation document"}</p>
      {approved ? (
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted">State filing fee</dt><dd className="font-semibold">{money(f.filing_fee_usd) ?? "See official schedule"}</dd></div>
          {f.annual_report?.name && <div className="flex justify-between gap-3"><dt className="text-muted">{f.annual_report.name}</dt><dd>{[money(f.annual_report.fee_usd), f.annual_report.frequency].filter(Boolean).join(" · ") || "See official page"}</dd></div>}
          {f.annual_report?.due && <p className="text-xs text-faint">Due: {f.annual_report.due}</p>}
          {f.fee_notes && <p className="text-xs text-faint">{f.fee_notes}</p>}
          {f.tax_notes && <p className="text-xs text-muted">{f.tax_notes}</p>}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted">See the official fee schedule{url ? <> on the <a href={url} target="_blank" rel="noreferrer" className="text-gold underline">state&apos;s website ↗</a></> : ""}. Our verified summary for this state is being reviewed.</p>
      )}
    </div>
  );
}

/** Business Launch Center (founder directive 31): complimentary formation guidance for every state and D.C. */
export default async function LaunchCenter({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const { data: js } = db ? await db.from("formation_jurisdictions").select("*").order("name") : { data: [] };
  const states = (js ?? []) as J[];
  const pick = ((await searchParams).state ?? "").toUpperCase();
  const s = states.find((x) => x.code === pick) ?? null;
  const approved = s?.status === "approved";
  const { data: bs } = live && db ? await db.from("member_businesses").select("*").eq("user_id", viewer.id).order("created_at") : { data: [] };
  const businesses = (bs ?? []) as B[];
  const month = new Date().getMonth() + 1;

  return (
    <>
      <LuxHero eyebrow="Complimentary with every account" title="Business Launch Center" tagline="From idea to established business, one clear step at a time.">
        <form className="flex max-w-xl flex-wrap gap-3" action="/app/launch">
          <select name="state" defaultValue={s?.code ?? ""} className="field min-w-0 flex-1" aria-label="Choose your state">
            <option value="">Choose your state or D.C.</option>
            {states.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
          <button className="btn btn-gold">Show my state</button>
        </form>
      </LuxHero>

      {s && (
        <LuxSection eyebrow={s.filing_office ?? "Official filing office"} title={`Starting a business in ${s.name}`} intro={approved ? `Summary verified from official ${s.name} sources on ${s.verified_on}. Fees change; the official page is always the final word.` : "Official links for your state. Our verified fee summary for this state is still being reviewed, so fees link to the official schedule."}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Check name availability", s.business_name_search_url], ["File online", s.online_filing_url], ["Filing office", s.filing_office_url], ["Licenses and permits", s.business_license_url], ["State tax registration", s.revenue_department_url], ["Free federal EIN (IRS)", IRS_EIN_URL]]
              .filter(([, u]) => u).map(([t, u]) => <a key={t} href={u!} target="_blank" rel="noreferrer" className="glass flex items-center justify-between gap-3 p-4 text-sm transition hover:border-[var(--champagne)]"><span className="font-semibold">{t}</span><span className="text-gold">↗</span></a>)}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Facts label="LLC" f={s.llc} approved={approved} url={s.filing_office_url} />
            <Facts label="Corporation" f={s.corporation} approved={approved} url={s.filing_office_url} />
            <Facts label="Nonprofit" f={s.nonprofit} approved={approved} url={s.filing_office_url} />
          </div>
          {approved && s.registered_agent && <p className="mt-4 text-sm text-muted"><span className="font-semibold text-text">Registered agent: </span>{s.registered_agent}</p>}
          <p className="mt-4 text-xs text-faint">Government filing fees are paid directly to the state. Any optional third-party service (such as a registered agent or a filing service) is a separate charge, always shown to you in full before you agree to anything.</p>
        </LuxSection>
      )}

      <LuxSection eyebrow="The path" title="Eight steps to a business in good standing">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((st, i) => (
            <li key={st.key} className="glass p-5">
              <p className="display text-3xl text-gold">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-2 font-semibold">{st.title}</p>
              <p className="mt-1 text-sm text-muted">{st.body}</p>
              {st.key === "ein" && <a href={IRS_EIN_URL} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-gold underline">Apply free at IRS.gov ↗</a>}
              {st.key === "licenses" && <a href={SBA_LICENSES_URL} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-gold underline">SBA licensing guide ↗</a>}
            </li>
          ))}
        </ol>
      </LuxSection>

      <LuxSection eyebrow="Structures" title="Choose the right structure" intro="An overview to help you prepare your questions. It isn't legal or tax advice.">
        <div className="grid gap-4 md:grid-cols-2">
          {STRUCTURES.map((x) => (
            <div key={x.key} className="glass p-6"><p className="display text-2xl">{x.name}</p><p className="mt-1 text-sm text-muted">{x.line}</p>
              <ul className="mt-3 space-y-1.5 text-sm">{x.points.map((p) => <li key={p} className="flex gap-2"><span className="text-gold">✦</span>{p}</li>)}</ul></div>
          ))}
        </div>
        <p className="mt-3 text-sm"><a href={SBA_STRUCTURE_URL} target="_blank" rel="noreferrer" className="text-gold underline">SBA: Choose a business structure ↗</a> · <a href={IRS_ENTITY_URL} target="_blank" rel="noreferrer" className="text-gold underline">IRS: Business structures ↗</a></p>
      </LuxSection>

      <LuxSection eyebrow="Taxes" title="Legal structure and tax elections are different">
        <div className="grid gap-4 md:grid-cols-2">{TAX_ELECTIONS.map((t) => <div key={t.name} className="glass p-6"><p className="font-semibold">{t.name}</p><p className="mt-2 text-sm text-muted">{t.body}</p></div>)}</div>
        <p className="mt-3 text-sm"><a href={IRS_S_CORP_URL} target="_blank" rel="noreferrer" className="text-gold underline">IRS: S corporations ↗</a></p>
      </LuxSection>

      <LuxSection eyebrow="Private to you" title="My businesses" intro="Track each business you're planning or have formed, and we'll remind you when its annual report month arrives.">
        <div className="space-y-4">
          {businesses.map((b) => (
            <div key={b.id} className="glass p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="display text-xl">{b.name}</p>
                <span className="text-xs text-muted">{ENTITY_LABEL[b.entity_type]}{b.state ? ` · ${b.state}` : ""} · {STAGE_LABEL[b.stage]}</span>
              </div>
              {b.reminders && b.annual_report_month === month && <p className="mt-2 rounded-xl bg-[var(--hover-bg)] px-3 py-2 text-sm text-gold">Reminder: {b.name}&apos;s annual report is due this month. Check the official page for the exact date.</p>}
              <MemberForm action={updateBusiness} className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <input type="hidden" name="id" value={b.id} />
                <select name="stage" defaultValue={b.stage} className="field">{Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select name="ein_status" defaultValue={b.ein_status} className="field"><option value="not_started">EIN: not started</option><option value="applied">EIN: applied</option><option value="received">EIN: received</option></select>
                <select name="tax_election" defaultValue={b.tax_election ?? ""} className="field"><option value="">Tax election: undecided</option><option value="default">Default taxation</option><option value="s_corporation">S corporation</option><option value="c_corporation">C corporation</option><option value="tax_exempt">Tax-exempt</option></select>
                <select name="annual_report_month" defaultValue={b.annual_report_month ?? ""} className="field"><option value="">Annual report month</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2"><input type="checkbox" name="reminders" defaultChecked={b.reminders} />Remind me</label><button className="btn btn-gold btn-sm">Save</button></div>
              </MemberForm>
              <MemberForm action={updateBusiness} className="mt-2"><input type="hidden" name="id" value={b.id} /><input type="hidden" name="remove" value="1" /><button className="text-xs text-muted underline">Remove</button></MemberForm>
            </div>
          ))}
          <MemberForm action={addBusiness} className="glass grid gap-3 p-5 text-sm sm:grid-cols-[1fr_12rem_12rem_auto]">
            <input name="name" className="field" placeholder="Business name" required />
            <select name="entity_type" className="field" defaultValue="llc">{Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select name="state" className="field" defaultValue={s?.code ?? ""}><option value="">State</option>{states.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select>
            <button className="btn btn-gold btn-sm">Add business</button>
          </MemberForm>
        </div>
      </LuxSection>

      <LuxSection eyebrow="Coming next" title="Have a professional filing service form it for you">
        <p className="max-w-2xl text-sm text-muted">We&apos;re preparing an optional partnership so you can complete your formation right here, with every government fee, service charge and renewal shown in full before you authorize anything. It isn&apos;t available yet. Until then, you can file directly with your state using the official links above.</p>
        <p className="mt-3 text-sm"><Link href="/app/career" className="text-gold underline">Preparing for opportunities? Visit My Professional Readiness</Link></p>
      </LuxSection>
    </>
  );
}
