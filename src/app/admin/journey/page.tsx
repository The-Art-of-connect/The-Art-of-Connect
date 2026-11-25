import { requireStaff } from "@/lib/auth";
import { money, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { isOpenAIConfigured } from "@/lib/openai";
import { INITIAL_MONTHLY_MESSAGES } from "@/lib/journey-budget";
import { JOURNEY_PHILOSOPHY } from "@/lib/journey";
import { ActionForm } from "@/components/admin/ActionForm";
import { OwnerTest } from "@/components/admin/OwnerTest";
import { Empty, NotConnected, PageHeader, Panel, Stat } from "@/components/admin/ui";
import {
  publishInstructions, saveExample, saveInstructions, saveJourneyLimits, saveKnowledge, saveModel, savePackage, saveTierLimit, setJourneySwitch,
} from "@/app/actions/journey-admin";

export const metadata = { title: "Journey Intelligence Center" };
const dollars = (c: number | string | null) => (c === null || c === undefined ? "" : (Number(c) / 100).toFixed(2));
const usd = (c: number) => money(Math.round(c));

export default async function JourneyAdmin() {
  const viewer = await requireStaff(rolesFor("/admin/journey"));
  const owner = viewer.roles.includes("owner");
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Journey" title="Journey Intelligence Center" /><NotConnected /></>;
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const [{ data: s }, { data: models }, { data: tiers }, { data: packages }, { data: versions }, { data: knowledge }, { data: examples }, { data: usage }, { data: pkgs }] = await Promise.all([
    supabase.from("journey_settings").select("*").maybeSingle(),
    supabase.from("journey_models").select("*").order("id"),
    supabase.from("journey_tier_limits").select("*"),
    supabase.from("journey_message_packages").select("*").order("sort_order"),
    supabase.from("journey_instruction_versions").select("id, version, note, status, created_at, published_at").order("version", { ascending: false }).limit(20),
    supabase.from("journey_knowledge").select("id, mode, title, status, updated_at").order("updated_at", { ascending: false }).limit(50),
    supabase.from("journey_examples").select("id, mode, member_message, status").order("updated_at", { ascending: false }).limit(30),
    supabase.from("journey_usage").select("user_id, package_slug, mode, status, is_owner_test, reserved_cents, cost_cents, input_tokens, output_tokens").gte("created_at", monthStart).limit(50000),
    supabase.from("membership_packages").select("slug, name").order("sort_order"),
  ]);
  const rows = usage ?? [];
  const spent = rows.reduce((n, r) => n + Number(r.status === "completed" ? r.cost_cents ?? r.reserved_cents : r.status === "failed" ? r.cost_cents ?? 0 : r.reserved_cents), 0);
  const testSpent = rows.filter((r) => r.is_owner_test).reduce((n, r) => n + Number(r.cost_cents ?? 0), 0);
  const members = new Set(rows.filter((r) => !r.is_owner_test).map((r) => r.user_id)).size;
  const messages = rows.filter((r) => r.status === "completed" && !r.is_owner_test).length;
  const byTier = new Map<string, number>();
  for (const r of rows) if (!r.is_owner_test) byTier.set(r.package_slug ?? "—", (byTier.get(r.package_slug ?? "—") ?? 0) + Number(r.cost_cents ?? r.reserved_cents));
  const limit = s?.company_monthly_limit_cents ? Number(s.company_monthly_limit_cents) : null;
  const tierMap = new Map((tiers ?? []).map((t) => [t.package_slug, t]));

  const Switch = ({ k, label, on, confirm }: { k: string; label: string; on: boolean; confirm?: string }) => (
    <ActionForm action={setJourneySwitch} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span><span className="block font-semibold">{label}</span><span className={`text-xs ${on ? "text-success" : "text-faint"}`}>{on ? "On" : "Off"}</span></span>
      <span className="flex items-center gap-2">
        <input type="hidden" name="key" value={k} /><input type="hidden" name="on" value={String(!on)} />
        {!on && confirm && <input name="confirm" placeholder={`Type ${confirm}`} className="field w-36 text-sm" />}
        <button className={`btn btn-sm ${on ? "btn-ghost" : "btn-gold"}`} disabled={!owner}>{on ? "Turn off" : "Turn on"}</button>
      </span>
    </ActionForm>
  );

  return (
    <>
      <PageHeader eyebrow="Owner Portal · Journey" title="Journey Intelligence Center" />
      <p className="-mt-4 mb-8 max-w-3xl text-sm text-muted">AI management, financial controls and member assistance. Journey runs on OpenAI only. Member conversations, journals and assessments are never shown here — only totals.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="AI expense this month" value={usd(spent)} hint={limit ? `of ${usd(limit)} company budget` : "Company budget not set"} />
        <Stat label="Budget used" value={limit ? `${Math.min(100, Math.round((spent / limit) * 100))}%` : "—"} />
        <Stat label="Active Journey members" value={members} hint={`${messages} messages`} />
        <Stat label="Average cost per member" value={members ? usd(spent / members) : usd(0)} hint={`Owner testing: ${usd(testSpent)}`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Emergency controls and authorization">
          <div className="divide-y divide-line">
            <Switch k="enabled" label="Journey (emergency shutdown when off)" on={Boolean(s?.enabled)} />
            <Switch k="paid_usage_authorized" label="Billable OpenAI usage authorized" on={Boolean(s?.paid_usage_authorized)} confirm="AUTHORIZE" />
            <Switch k="owner_testing_enabled" label="Owner testing" on={Boolean(s?.owner_testing_enabled)} />
            <Switch k="message_packages_published" label="Message package prices visible to members" on={Boolean(s?.message_packages_published)} confirm="PUBLISH" />
            <Switch k="attachments_enabled" label="Attachment processing" on={Boolean(s?.attachments_enabled)} />
            <p className="px-5 py-4 text-xs text-faint">OpenAI key on the server: <strong className={isOpenAIConfigured() ? "text-success" : "text-gold"}>{isOpenAIConfigured() ? "added" : "not added yet (OPENAI_API_KEY in Netlify)"}</strong></p>
          </div>
        </Panel>

        <Panel title="Company budgets and processing limits">
          <ActionForm action={saveJourneyLimits} className="grid gap-3 p-5 sm:grid-cols-2">
            <label className="text-xs text-muted">Company monthly AI budget ($)<input name="company" defaultValue={dollars(s?.company_monthly_limit_cents ?? null)} className="field mt-1 w-full" placeholder="500.00" /></label>
            <label className="text-xs text-muted">Owner testing budget ($)<input name="testing" defaultValue={dollars(s?.owner_test_monthly_limit_cents ?? null)} className="field mt-1 w-full" placeholder="25.00" /></label>
            <label className="text-xs text-muted">Requests per member per minute<input name="perMinute" defaultValue={s?.per_minute_requests ?? 6} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Longest member message (characters)<input name="maxInput" defaultValue={s?.max_input_chars ?? 4000} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Conversation history sent (messages)<input name="historyMessages" defaultValue={s?.max_history_messages ?? 12} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Conversation history sent (characters)<input name="historyChars" defaultValue={s?.max_history_chars ?? 12000} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Purchased messages expire after (days)<input name="expiry" defaultValue={s?.purchased_message_expiry_days ?? ""} className="field mt-1 w-full" placeholder="365" /></label>
            <label className="text-xs text-muted">Owner alerts at (% of budget)<input name="alerts" defaultValue={(s?.alert_thresholds ?? [50, 80, 100]).join(", ")} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted sm:col-span-2">Default OpenAI model
              <select name="defaultModel" defaultValue={s?.default_model ?? ""} className="field mt-1 w-full">
                <option value="">Choose an approved model</option>
                {(models ?? []).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
              </select>
            </label>
            <button className="btn btn-gold btn-sm sm:col-span-2" disabled={!owner}>Save limits</button>
          </ActionForm>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Approved OpenAI models and rates">
          <div className="p-5 text-xs text-muted">Enter each model&rsquo;s current price from OpenAI&rsquo;s pricing page, in dollars per one million tokens. Journey won&rsquo;t use a model without a price.</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-faint"><th className="px-5 py-2">Model</th><th className="px-5 py-2">Input $/1M</th><th className="px-5 py-2">Output $/1M</th><th className="px-5 py-2">Approved</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {[...(models ?? []), { id: "", input_cents_per_million: null, output_cents_per_million: null, enabled: false }].map((m) => (
                <tr key={m.id || "new"}><td colSpan={5} className="p-0">
                  <ActionForm action={saveModel} className="grid grid-cols-2 items-center gap-2 px-5 py-3 sm:grid-cols-[2fr_1fr_1fr_auto_auto]">
                    <input name="id" defaultValue={m.id} placeholder="New model name" className="field" readOnly={Boolean(m.id)} />
                    <input name="input" defaultValue={dollars(m.input_cents_per_million)} placeholder="Input" className="field" />
                    <input name="output" defaultValue={dollars(m.output_cents_per_million)} placeholder="Output" className="field" />
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="enabled" defaultChecked={m.enabled} /> Approved</label>
                    <button className="btn btn-ghost btn-sm">{m.id ? "Save" : "Add"}</button>
                  </ActionForm>
                </td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Membership allowances and spending caps">
          <div className="p-5 text-xs text-muted">One combined allowance per membership. Couples share theirs. Included messages reset each billing period and don&rsquo;t roll over. Journey stays off for a membership until both caps are set. Free accounts: 0.</div>
          <div className="divide-y divide-line">
            {(pkgs ?? []).filter((p) => p.slug in INITIAL_MONTHLY_MESSAGES).map((p) => {
              const t = tierMap.get(p.slug);
              return (
                <ActionForm key={p.slug} action={saveTierLimit} className="grid grid-cols-2 items-end gap-2 px-5 py-4 sm:grid-cols-[1.6fr_repeat(5,1fr)_auto]">
                  <input type="hidden" name="slug" value={p.slug} />
                  <span className="col-span-2 font-semibold sm:col-span-1">{p.name}<span className="block text-xs font-normal text-faint">Spent this month: {usd(byTier.get(p.slug) ?? 0)}</span></span>
                  <label className="text-[0.65rem] text-faint">Monthly messages<input name="monthly" defaultValue={t?.monthly_messages ?? ""} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Daily messages<input name="daily" defaultValue={t?.daily_messages ?? ""} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Member cap ($/mo)<input name="memberCap" defaultValue={dollars(t?.member_monthly_limit_cents ?? null)} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Membership cap ($/mo)<input name="tierCap" defaultValue={dollars(t?.tier_monthly_limit_cents ?? null)} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Longest reply (tokens)<input name="maxOutput" defaultValue={t?.max_output_tokens ?? 700} className="field mt-1 w-full" /></label>
                  <button className="btn btn-ghost btn-sm">Save</button>
                </ActionForm>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Additional message packages">
          <div className="divide-y divide-line">
            {(packages ?? []).map((p) => (
              <ActionForm key={p.slug} action={savePackage} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2 px-5 py-3">
                <input type="hidden" name="slug" value={p.slug} />
                <label className="text-[0.65rem] text-faint">Messages<input name="messages" defaultValue={p.messages} className="field mt-1 w-full" /></label>
                <label className="text-[0.65rem] text-faint">Price ($)<input name="price" defaultValue={dollars(p.price_cents)} className="field mt-1 w-full" /></label>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={p.is_active} /> Offer</label>
                <button className="btn btn-ghost btn-sm">Save</button>
              </ActionForm>
            ))}
          </div>
          <p className="px-5 pb-4 text-xs text-faint">{s?.message_packages_published ? "Prices are visible to members." : "Prices are hidden from members until you publish them above."} Never purchased automatically.</p>
        </Panel>

        <Panel title="Test Journey privately">
          <OwnerTest />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Journey's personality and instructions">
          <details className="border-b border-line px-5 py-4 text-sm">
            <summary className="cursor-pointer font-semibold">The Journey Philosophy (permanent foundation — always first)</summary>
            <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted">{JOURNEY_PHILOSOPHY}</p>
          </details>
          <ActionForm action={saveInstructions} className="space-y-2 p-5">
            <textarea name="body" rows={8} maxLength={20000} className="field w-full" placeholder="Journey's voice, conversation style, manifestation philosophy, emotional-awareness responses, referral standards, session structure… These add to the philosophy; they can never override it." />
            <input name="note" maxLength={300} className="field w-full" placeholder="What changed in this version (optional)" />
            <button className="btn btn-gold btn-sm">Save as draft</button>
          </ActionForm>
          <ul className="divide-y divide-line">
            {(versions ?? []).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>Version {v.version} <span className={`chip ml-2 ${v.status === "published" ? "chip-live" : ""}`}>{v.status}</span><span className="block text-xs text-faint">{v.note}</span></span>
                {v.status !== "published" && owner && (
                  <ActionForm action={publishInstructions}><input type="hidden" name="id" value={v.id} /><button className="btn btn-ghost btn-sm">{v.status === "retired" ? "Roll back to this" : "Publish"}</button></ActionForm>
                )}
              </li>
            ))}
            {!versions?.length && <Empty>No instruction versions yet. Journey uses the philosophy and guardrails alone.</Empty>}
          </ul>
        </Panel>

        <Panel title="Approved knowledge and example conversations">
          <ActionForm action={saveKnowledge} className="space-y-2 border-b border-line p-5">
            <div className="grid grid-cols-2 gap-2">
              <select name="mode" className="field"><option value="all">All experiences</option><option value="life">In Life</option><option value="love">In Love</option><option value="business">In Business</option><option value="concierge">Private Concierge</option></select>
              <select name="status" className="field"><option value="draft">Draft</option><option value="approved">Approved</option></select>
            </div>
            <input name="title" maxLength={160} className="field w-full" placeholder="e.g. The Art of Boundaries — module 1" />
            <textarea name="body" rows={4} maxLength={20000} className="field w-full" placeholder="Educational content, reflection questions, affirmations, guided exercises or response standards" />
            <input name="review" maxLength={500} className="field w-full" placeholder="Professional review notes (who reviewed, when)" />
            <button className="btn btn-ghost btn-sm">Save knowledge</button>
          </ActionForm>
          <ul className="max-h-48 divide-y divide-line overflow-y-auto">
            {(knowledge ?? []).map((k) => <li key={k.id} className="px-5 py-2 text-sm">{k.title} <span className="chip ml-2">{k.status}</span> <span className="text-xs text-faint">{k.mode}</span></li>)}
          </ul>
          <ActionForm action={saveExample} className="space-y-2 border-t border-line p-5">
            <select name="mode" className="field w-full"><option value="life">In Life</option><option value="love">In Love</option><option value="business">In Business</option><option value="concierge">Private Concierge</option></select>
            <textarea name="member" rows={2} className="field w-full" placeholder="A member says…" />
            <textarea name="reply" rows={3} className="field w-full" placeholder="Journey's ideal reply…" />
            <button className="btn btn-ghost btn-sm">Save example conversation</button>
            <p className="text-xs text-faint">{examples?.length ?? 0} approved examples</p>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
