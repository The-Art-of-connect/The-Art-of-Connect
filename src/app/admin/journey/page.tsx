import { generateVoicePreviews } from "@/app/actions/customize";
import { requireStaff } from "@/lib/auth";
import { money, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { isOpenAIConfigured } from "@/lib/openai";
import { INITIAL_MONTHLY_MESSAGES } from "@/lib/journey-budget";
import { JOURNEY_PHILOSOPHY } from "@/lib/journey";
import { ActionForm } from "@/components/admin/ActionForm";
import { getLaunchState } from "@/lib/launch";
import { env } from "@/lib/env";
import { verifyOpenAI } from "@/app/actions/journey-admin";
import { saveCheckinSettings } from "@/app/actions/checkins";
import { OwnerTest } from "@/components/admin/OwnerTest";
import { JourneyLiveTest } from "@/components/admin/JourneyLiveTest";
import { Empty, NotConnected, PageHeader, Panel, Stat } from "@/components/admin/ui";
import {
  publishInstructions, saveExample, saveInstructions, saveJourneyLimits, saveKnowledge, saveModel, savePackage, saveSessionProduct, saveTierLimit, saveVoiceSettings, setJourneySwitch, activateJourney, pauseJourney,
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
    supabase.from("journey_usage").select("user_id, package_slug, mode, status, is_owner_test, reserved_cents, cost_cents, input_tokens, output_tokens, created_at").gte("created_at", monthStart).limit(50000),
    supabase.from("membership_packages").select("slug, name").order("sort_order"),
  ]);
  const [{ data: sessions }, { data: voice }] = await Promise.all([
    supabase.from("journey_session_products").select("*").order("sort_order"),
    supabase.rpc("journey_voice_summary", { p_from: monthStart }),
  ]);
  const voiceRow = (voice as { sessions: number; seconds: number; cost_cents: number }[] | null)?.[0];
  const rows = usage ?? [];
  const spent = rows.reduce((n, r) => n + Number(r.status === "completed" ? r.cost_cents ?? r.reserved_cents : r.status === "failed" ? r.cost_cents ?? 0 : r.reserved_cents), 0);
  const testSpent = rows.filter((r) => r.is_owner_test).reduce((n, r) => n + Number(r.cost_cents ?? 0), 0);
  const members = new Set(rows.filter((r) => !r.is_owner_test).map((r) => r.user_id)).size;
  const messages = rows.filter((r) => r.status === "completed" && !r.is_owner_test).length;
  const byTier = new Map<string, number>();
  for (const r of rows) if (!r.is_owner_test) byTier.set(r.package_slug ?? "—", (byTier.get(r.package_slug ?? "—") ?? 0) + Number(r.cost_cents ?? r.reserved_cents));
  const limit = s?.company_monthly_limit_cents ? Number(s.company_monthly_limit_cents) : null;
  const tierMap = new Map((tiers ?? []).map((t) => [t.package_slug, t]));
  const launch = await getLaunchState();
  const [{ data: ck }, { data: ckTotals }] = await Promise.all([
    supabase.from("journey_checkin_settings").select("*").maybeSingle(),
    supabase.rpc("journey_checkin_totals"),
  ]);
  const ct = (ckTotals ?? {}) as Record<string, number>;
  const { data: lastCheck } = await supabase.from("audit_log").select("action, created_at, details").like("action", "journey.openai.%").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const testCap = s?.owner_test_monthly_limit_cents != null ? Number(s.owner_test_monthly_limit_cents) : null;
  const approvedModel = (models ?? []).find((m) => m.id === s?.default_model && m.enabled && m.input_cents_per_million != null);
  const readiness: [string, boolean, string][] = [
    ["OpenAI key visible to the website", isOpenAIConfigured(), "Set OPENAI_API_KEY in Netlify and redeploy."],
    ["Connection verified", lastCheck?.action === "journey.openai.connected", "Press “Verify connection”."],
    ["Approved model with rates", Boolean(approvedModel), "Add a model and its prices below, then choose it as the default."],
    ["Company monthly AI budget", s?.company_monthly_limit_cents != null, "Set it under Company budgets."],
    ["Owner testing budget", testCap != null, "Set it under Company budgets."],
    ["Owner testing switched on", Boolean(s?.owner_testing_enabled), "Turn on below."],
    ["Journey switched on and AI usage authorized", Boolean(s?.enabled && s?.paid_usage_authorized), "Turn on below (type AUTHORIZE)."],
  ];
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - (13 - i)); return d.toISOString().slice(0, 10); });
  const daily = days.map((day) => {
    const r = rows.filter((x) => String(x.created_at).slice(0, 10) === day && x.status === "completed");
    return { day, messages: r.length, cents: r.reduce((n, x) => n + Number(x.cost_cents ?? 0), 0) };
  });
  const peak = Math.max(1, ...daily.map((d) => d.cents));

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

      <section aria-labelledby="activate" className="mb-10 overflow-hidden rounded-[24px] border border-gold/40 bg-ink-2">
        <div className="border-b border-line px-6 py-5">
          <h2 id="activate" className="display text-3xl text-gold-bright">Activate &amp; test Journey</h2>
          <p className="mt-1 text-sm text-muted">Everything you need for private testing, in one place. Members stay blocked: registration, live payments and public launch are separate switches that remain off.</p>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-5 border-b border-line p-6 lg:border-b-0 lg:border-r">
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {([
                ["OpenAI key", isOpenAIConfigured()],
                ["OpenAI connection", lastCheck?.action === "journey.openai.connected"],
                ["Journey", Boolean(s?.enabled)],
                ["Billable usage", Boolean(s?.paid_usage_authorized)],
                ["Owner testing", Boolean(s?.owner_testing_enabled)],
                ["Live voice", Boolean(s?.voice_enabled && s?.voice_model && s?.voice_cents_per_minute != null)],
                ["Members (public)", false],
                ["Live payments", launch.payments_live],
              ] as [string, boolean][]).map(([label, on]) => (
                <li key={label} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${on ? "border-success/40" : "border-line"}`}>
                  <span>{label}</span><span className={on ? "font-semibold text-success" : "text-faint"}>{on ? "On" : "Off"}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm">Testing budget: <strong>{testCap != null ? usd(testCap) : "not set"}</strong> per month · spent <strong>{usd(testSpent)}</strong>. Testing stops automatically at the limit.</p>

            <ActionForm action={activateJourney} className="space-y-4 rounded-2xl border border-line p-4">
              <p className="text-sm font-semibold">1 · Activate for private testing</p>
              <p className="text-xs text-muted">One press: verifies your OpenAI connection first (nothing changes if it fails), then turns on Journey, billable usage within your budgets, and owner testing.</p>
              {!s?.paid_usage_authorized && (
                <label className="block text-xs text-muted">Type AUTHORIZE to allow billable OpenAI usage within your budgets
                  <input name="confirm" autoComplete="off" className="field mt-1 w-full" placeholder="AUTHORIZE" /></label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted">Voice model<input name="voiceModel" defaultValue={s?.voice_model ?? "gpt-realtime-mini"} className="field mt-1 w-full" /></label>
                <label className="text-xs text-muted">Voice cost per minute ($, for budgeting)<input name="voiceRate" defaultValue={s?.voice_cents_per_minute != null ? dollars(s.voice_cents_per_minute) : "0.10"} className="field mt-1 w-full" /></label>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="voice" defaultChecked={Boolean(s?.voice_enabled) || !s?.voice_model} /> Enable live voice</label>
              <button className="btn btn-gold w-full" disabled={!owner}>{s?.enabled && s?.paid_usage_authorized ? "Save settings" : "Activate Journey for private testing"}</button>
            </ActionForm>
            <div className="flex flex-wrap items-center gap-3">
              <ActionForm action={verifyOpenAI}><button className="btn btn-ghost btn-sm">Verify OpenAI connection</button></ActionForm>
              {s?.enabled && <ActionForm action={pauseJourney}><button className="btn btn-ghost btn-sm" disabled={!owner}>Turn Journey off</button></ActionForm>}
            </div>
            <p className="text-xs text-faint">{lastCheck ? `Last connection check ${new Date(lastCheck.created_at).toLocaleString("en-US")}: ${lastCheck.action === "journey.openai.connected" ? "connected" : "failed"}.` : "Connection not checked yet."} Checking uses no tokens.</p>
          </div>
          <div>
            <p className="px-6 pt-5 text-sm font-semibold">2 · Test Journey now</p>
            <JourneyLiveTest ready={Boolean(s?.enabled && s?.paid_usage_authorized && s?.owner_testing_enabled)}
              voiceReady={Boolean(s?.enabled && s?.paid_usage_authorized && s?.voice_enabled && s?.voice_model && s?.voice_cents_per_minute != null)}
              voiceReason="Turn on “Enable live voice” in step 1 and press Save settings." />
            <p className="border-t border-line px-6 pt-4 text-sm"><a href="/admin/journey/quality" className="btn btn-gold btn-sm">Run quality tests: nine real conversations →</a></p>
            <p className="px-6 py-4 text-xs text-muted">Also try Journey across the website: <a href="/app/know-yourself/who-am-i/beyond-my-titles" className="text-gold underline">a lesson</a>, <a href="/app/journey/discover" className="text-gold underline">Discovery Sessions</a>, <a href="/app/journey/customize" className="text-gold underline">avatar &amp; voice</a>, or any paid membership through <strong>View as</strong>. All use this same private budget.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="AI expense this month" value={usd(spent)} hint={limit ? `of ${usd(limit)} company budget` : "Company budget not set"} />
        <Stat label="Budget used" value={limit ? `${Math.min(100, Math.round((spent / limit) * 100))}%` : "—"} />
        <Stat label="Active Journey members" value={members} hint={`${messages} messages`} />
        <Stat label="Average cost per member" value={members ? usd(spent / members) : usd(0)} hint={`Owner testing: ${usd(testSpent)}`} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Written conversation expense" value={usd(spent)} />
        <Stat label="Voice expense" value={usd(Number(voiceRow?.cost_cents ?? 0))} hint={`${Math.round(Number(voiceRow?.seconds ?? 0) / 60)} minutes · ${voiceRow?.sessions ?? 0} conversations`} />
        <div className="glass flex flex-col justify-center gap-2 p-5"><a href="/admin/journey/review" className="btn btn-gold btn-sm">Consolidated review</a><a href="/admin/journey/training" className="btn btn-ghost btn-sm">Knowledge &amp; Training Library</a><ActionForm action={generateVoicePreviews}><button className="btn btn-ghost btn-sm w-full">Create voice previews (one time, a few cents)</button></ActionForm><a href="/admin/journey/evaluations" className="btn btn-ghost btn-sm">Evaluation scenarios</a><a href="/admin/development" className="btn btn-ghost btn-sm">Development tracker</a></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Connection & readiness">
          <div className="space-y-4 p-5">
            <ActionForm action={verifyOpenAI} className="flex flex-wrap items-center gap-3">
              <button className="btn btn-gold btn-sm">Verify OpenAI connection</button>
              <span className="text-xs text-muted">{lastCheck ? `Last check ${new Date(lastCheck.created_at).toLocaleString("en-US")}: ${lastCheck.action === "journey.openai.connected" ? "connected" : "failed"}` : "Not checked yet"} · uses no tokens</span>
            </ActionForm>
            <ul className="space-y-2 text-sm">
              {readiness.map(([label, done, next]) => (
                <li key={label} className="flex items-start gap-2"><span className={done ? "text-success" : "text-gold"}>{done ? "✓" : "○"}</span><span>{label}{!done && <span className="block text-xs text-muted">{next}</span>}</span></li>
              ))}
            </ul>
            <p className={`rounded-xl border px-4 py-3 text-xs ${launch.payments_live ? "border-success/40 text-success" : "border-gold/40 text-gold"}`}>
              {launch.payments_live ? "Members with paid memberships can use Journey within their allowances." : "Public access is closed: members cannot use Journey until you open enrollment and live payments. Only your private owner tests run."}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/journey/models" className="btn btn-gold btn-sm">Model Lab — choose & compare models →</a>
              <a href="/admin/journey/personality" className="btn btn-ghost btn-sm">Edit Journey’s master personality →</a>
            </div>
          </div>
        </Panel>
        <Panel title="Owner testing budget & last 14 days">
          <div className="space-y-4 p-5">
            <div>
              <p className="flex justify-between text-sm"><span>Owner testing this month</span><span className="font-semibold">{usd(testSpent)}{testCap != null ? ` of ${usd(testCap)}` : ""}</span></p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-3"><div className="h-full rounded-full bg-champagne" style={{ width: `${testCap ? Math.min(100, (testSpent / testCap) * 100) : 0}%` }} /></div>
            </div>
            <div className="flex h-28 items-end gap-1" aria-label="Daily AI cost, last 14 days">
              {daily.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.messages} messages · ${usd(d.cents)}`}>
                  <div className="w-full rounded-t bg-champagne/70" style={{ height: `${Math.max(2, (d.cents / peak) * 96)}px` }} />
                  <span className="text-[0.55rem] text-faint">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">{rows.filter((r) => r.status === "completed").length} replies this month · {rows.reduce((n, r) => n + Number(r.input_tokens ?? 0) + Number(r.output_tokens ?? 0), 0).toLocaleString("en-US")} tokens · costs are recorded per reply from your approved model rates.</p>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Proactive care — check-ins & notifications">
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr]">
            <ActionForm action={saveCheckinSettings} className="space-y-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={ck?.enabled ?? true} className="accent-[var(--champagne)]" /> Check-ins on (morning manifestations, evening reflections, wellness and personal check-ins in the member dashboard)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="email_enabled" defaultChecked={ck?.email_enabled ?? false} className="accent-[var(--champagne)]" /> Email reminders for members who opt in {env.launchLocked && <span className="text-xs text-muted">(before launch, only @theartofconnect.com test addresses receive email)</span>}</label>
              <p className="text-xs text-muted">Phone notifications and text messages: not yet available — they need a provider you authorize.</p>
              <label className="block space-y-1"><span className="text-xs text-muted">Most emails per member per week</span><input name="max_emails_per_week" type="number" min={0} max={21} defaultValue={ck?.max_emails_per_week ?? 3} className="field !w-28" /></label>
              <label className="block space-y-1"><span className="text-xs text-muted">Email subject (never includes personal details)</span><input name="email_subject" maxLength={80} defaultValue={ck?.email_subject ?? "Journey is thinking of you"} className="field" /></label>
              {owner && <button className="btn btn-gold btn-sm">Save check-in settings</button>}
            </ActionForm>
            <div>
              <p className="text-xs text-muted">Totals only — members’ check-ins, replies and preferences are private to them.</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {[["Members using check-ins", ct.members_with_prefs], ["Morning manifestations", ct.morning], ["Evening reflections", ct.evening], ["Wellness check-ins", ct.wellness], ["Email opt-ins", ct.email_opt_in], ["Scheduled check-ins", ct.scheduled], ["Replies (30 days)", ct.responded_30d], ["Emails sent (30 days)", ct.emailed_30d]].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl border border-line p-3"><dt className="text-xs text-muted">{String(l)}</dt><dd className="display text-2xl">{Number(v ?? 0)}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Emergency controls and authorization">
          <div className="divide-y divide-line">
            <Switch k="enabled" label="Journey (emergency shutdown when off)" on={Boolean(s?.enabled)} />
            <Switch k="paid_usage_authorized" label="Billable OpenAI usage authorized" on={Boolean(s?.paid_usage_authorized)} confirm="AUTHORIZE" />
            <Switch k="owner_testing_enabled" label="Owner testing" on={Boolean(s?.owner_testing_enabled)} />
            <Switch k="message_packages_published" label="Message package prices visible to members" on={Boolean(s?.message_packages_published)} confirm="PUBLISH" />
            <Switch k="attachments_enabled" label="Attachment processing" on={Boolean(s?.attachments_enabled)} />
            <Switch k="voice_enabled" label="Talk to Journey (voice)" on={Boolean(s?.voice_enabled)} />
            <Switch k="memory_enabled" label="Personal memory (members still choose for themselves)" on={s?.memory_enabled !== false} />
            <Switch k="sessions_published" label="Private Session prices visible to members" on={Boolean(s?.sessions_published)} confirm="PUBLISH" />
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
                <ActionForm key={p.slug} action={saveTierLimit} className="grid grid-cols-2 items-end gap-2 px-5 py-4 sm:grid-cols-[1.6fr_repeat(6,1fr)_auto]">
                  <input type="hidden" name="slug" value={p.slug} />
                  <span className="col-span-2 font-semibold sm:col-span-1">{p.name}<span className="block text-xs font-normal text-faint">Spent this month: {usd(byTier.get(p.slug) ?? 0)}</span></span>
                  <label className="text-[0.65rem] text-faint">Monthly messages<input name="monthly" defaultValue={t?.monthly_messages ?? ""} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Daily messages<input name="daily" defaultValue={t?.daily_messages ?? ""} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Member cap ($/mo)<input name="memberCap" defaultValue={dollars(t?.member_monthly_limit_cents ?? null)} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Membership cap ($/mo)<input name="tierCap" defaultValue={dollars(t?.tier_monthly_limit_cents ?? null)} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Longest reply (tokens)<input name="maxOutput" defaultValue={t?.max_output_tokens ?? 700} className="field mt-1 w-full" /></label>
                  <label className="text-[0.65rem] text-faint">Voice minutes / mo<input name="voiceMinutes" defaultValue={t?.monthly_voice_minutes ?? ""} className="field mt-1 w-full" /></label>
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
        <Panel title="Voice and Auto-Reload safeguards">
          <ActionForm action={saveVoiceSettings} className="grid gap-3 p-5 sm:grid-cols-2">
            <label className="text-xs text-muted sm:col-span-2">OpenAI realtime voice model<input name="voiceModel" defaultValue={s?.voice_model ?? "gpt-realtime-mini"} className="field mt-1 w-full" placeholder="e.g. gpt-realtime" /></label>
            <label className="text-xs text-muted">Voice cost ($ per minute, for budgeting)<input name="voiceRate" defaultValue={s?.voice_cents_per_minute != null ? dollars(s.voice_cents_per_minute) : "0.10"} className="field mt-1 w-full" placeholder="0.10" /></label>
            <label className="text-xs text-muted">End after silence (seconds)<input name="inactivity" defaultValue={s?.voice_inactivity_seconds ?? 120} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Longest voice conversation (minutes)<input name="maxMinutes" defaultValue={s?.voice_max_session_minutes ?? 30} className="field mt-1 w-full" /></label>
            <span />
            <label className="text-xs text-muted">Auto-Reloads per member per day (max)<input name="reloadDay" defaultValue={s?.auto_reload_max_per_day ?? 3} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Auto-Reloads per member per month (max)<input name="reloadMonth" defaultValue={s?.auto_reload_max_per_month ?? 10} className="field mt-1 w-full" /></label>
            <p className="text-xs text-faint sm:col-span-2">These company safeguards apply even when a member chooses no personal Auto-Reload limit. Members under safety review can&rsquo;t be reloaded.</p>
            <button className="btn btn-gold btn-sm sm:col-span-2" disabled={!owner}>Save</button>
          </ActionForm>
        </Panel>
        <Panel title="Private Sessions">
          <div className="divide-y divide-line">
            {(sessions ?? []).map((p) => (
              <ActionForm key={p.slug} action={saveSessionProduct} className="grid grid-cols-[1.4fr_1fr_1fr_auto_auto] items-end gap-2 px-5 py-3">
                <input type="hidden" name="slug" value={p.slug} />
                <span className="text-sm font-semibold">{p.name}<span className="block text-xs font-normal text-faint">{p.minutes} minutes</span></span>
                <label className="text-[0.65rem] text-faint">Price ($)<input name="price" defaultValue={dollars(p.price_cents)} className="field mt-1 w-full" /></label>
                <label className="text-[0.65rem] text-faint">Message limit<input name="maxMessages" defaultValue={p.max_messages} className="field mt-1 w-full" /></label>
                <label className="flex items-center gap-1 pb-2 text-xs"><input type="checkbox" name="active" defaultChecked={p.is_active} /> Offer</label>
                <button className="btn btn-ghost btn-sm">Save</button>
              </ActionForm>
            ))}
          </div>
          <p className="px-5 pb-4 text-xs text-faint">{s?.sessions_published ? "Session prices are visible to members." : "Hidden from members until you publish above."} Sessions are AI-guided personal development, never therapy.</p>
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
                  <ActionForm action={publishInstructions} className="flex items-center gap-1"><input type="hidden" name="id" value={v.id} /><input name="confirm" placeholder="Type PUBLISH" aria-label="Type PUBLISH to confirm" className="field !min-h-0 !w-28 !py-1 text-xs" /><button className="btn btn-ghost btn-sm">{v.status === "retired" ? "Roll back to this" : "Publish"}</button></ActionForm>
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
