import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Stat } from "@/components/admin/ui";
import { decideIssue, runIssueNow, saveAssistSettings } from "@/app/actions/assist";
import { dispatchConfigured } from "@/lib/assist";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistance Center" };

const STATUS: Record<string, string> = {
  new: "New", investigating: "Peace is investigating", fixed: "Fixed by Peace", needs_owner: "Needs your decision", cannot_reproduce: "Couldn't reproduce",
  proposed: "Proposal ready: your approval needed", approved: "Approved: Peace will build", declined: "Declined", built: "Built by Peace", closed: "Closed",
};
const TABS = [["action", "Needs you"], ["open", "Open"], ["done", "Done"], ["all", "All"]] as const;

/** Every problem and suggestion members send. Peace fixes problems and proposes suggestions; you decide what gets built. */
export default async function AssistanceCenter({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff(["owner", "admin"]);
  const tab = (await searchParams).tab ?? "action";
  const db = (await createClient())!;
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const [{ data }, { data: settings }, { data: events }] = await Promise.all([
    db.from("site_issues").select("*, profiles:reporter_id (display_name, email)").order("created_at", { ascending: false }).limit(300),
    db.from("assist_settings").select("*").maybeSingle(),
    db.from("site_issue_events").select("issue_id, actor, action, detail, run_url, ai_cost_cents, input_tokens, output_tokens, duration_seconds, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  const ev = events ?? [];
  const monthEvents = ev.filter((e) => e.created_at >= monthStart);
  const monthCost = monthEvents.reduce((a, e) => a + Number(e.ai_cost_cents ?? 0), 0);
  const runs = monthEvents.filter((e) => e.action === "run_finished").length;
  const configured = dispatchConfigured();
  const all = (data ?? []) as unknown as { id: string; kind: string; priority: string; attempts: number; acknowledged_at: string | null; member_notified_at: string | null; page_path: string | null; description: string; expected: string | null; screenshot_path: string | null; device: string | null; status: string; peace_notes: string | null; pr_url: string | null; owner_note: string | null; member_reply: string | null; created_at: string; profiles: { display_name: string | null; email: string } | null }[];
  const needsYou = (i: (typeof all)[number]) => ["proposed", "needs_owner"].includes(i.status);
  const done = (i: (typeof all)[number]) => ["fixed", "built", "declined", "closed", "cannot_reproduce"].includes(i.status);
  const shown = all.filter((i) => tab === "all" || (tab === "action" ? needsYou(i) : tab === "done" ? done(i) : !done(i)));
  const shots = shown.map((i) => i.screenshot_path).filter(Boolean) as string[];
  const urls = shots.length ? (await db.storage.from("site-issues").createSignedUrls(shots, 1800)).data ?? [] : [];

  return (
    <>
      <PageHeader eyebrow="Owner Portal" title="Assistance Center" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Members (and you) send problems and suggestions from any page through <Link href="/app/assist" className="text-gold underline">Help &amp; suggestions</Link>. Peace checks this queue on a schedule: <strong>problems</strong> are investigated, fixed, tested and deployed, and the fix is recorded here; <strong>suggestions</strong> get a written proposal and are built only after you approve. Anything touching payments, pricing, privacy or legal terms always comes to you first.</p>
      <section className={`mb-6 rounded-2xl border p-5 ${settings?.repairs_paused ? "border-danger/50 bg-danger/5" : "border-gold/40 bg-gold/5"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-semibold">{settings?.repairs_paused ? "Automated repairs are PAUSED" : configured ? "Peace is on call: reports are processed the moment they arrive" : "Immediate processing is not connected yet"}</p>
            <p className="mt-1 text-xs text-muted">{configured ? "Website → GitHub dispatch is configured. A 15-minute backup sweep restarts anything not yet picked up." : "Until the setup below is complete, reports are acknowledged and processed by the backup checks only."}</p>
            <p className="mt-1 text-xs text-muted">This month: {runs} repair runs · AI cost {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(monthCost / 100)} of {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((settings?.monthly_budget_cents ?? 0) / 100)} budget</p>
          </div>
          <ActionForm action={saveAssistSettings} className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="repairs_paused" defaultChecked={settings?.repairs_paused} /> Pause all repairs</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="immediate_enabled" defaultChecked={settings?.immediate_enabled ?? true} /> Immediate processing</label>
            <label>Attempts per report<input name="max_attempts" defaultValue={settings?.max_attempts ?? 2} className="field mt-1 w-full" /></label>
            <label>Repairs per day<input name="daily_run_limit" defaultValue={settings?.daily_run_limit ?? 40} className="field mt-1 w-full" /></label>
            <label>Monthly AI budget ($)<input name="monthly_budget" defaultValue={((settings?.monthly_budget_cents ?? 5000) / 100).toFixed(0)} className="field mt-1 w-full" /></label>
            <button className="btn btn-gold btn-sm self-end">Save</button>
          </ActionForm>
        </div>
        {!configured && (
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer font-semibold">Setup for immediate processing (one time)</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
              <li>GitHub → your repository → Settings → Secrets and variables → Actions: add <code>ANTHROPIC_API_KEY</code> (a Claude API key; usage is billed per repair) and confirm <code>SUPABASE_DB_URL</code> exists.</li>
              <li>GitHub → Settings → Actions → General → Workflow permissions: choose &ldquo;Read and write&rdquo; and allow GitHub Actions to create and approve pull requests.</li>
              <li>Create a fine-grained GitHub token limited to this repository with &ldquo;Contents: Read and write&rdquo; and save it in Netlify as <code>GITHUB_DISPATCH_TOKEN</code>, then redeploy.</li>
            </ol>
          </details>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Needs your decision" value={all.filter(needsYou).length} />
        <Stat label="New" value={all.filter((i) => i.status === "new").length} />
        <Stat label="Fixed or built" value={all.filter((i) => ["fixed", "built"].includes(i.status)).length} />
        <Stat label="All reports" value={all.length} />
      </div>
      <nav className="mt-8 flex flex-wrap gap-2 text-sm">{TABS.map(([k, v]) => <Link key={k} href={`/admin/assist?tab=${k}`} className={`rounded-full border px-3 py-1 ${tab === k ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{v}</Link>)}</nav>
      {shown.length === 0 ? <p className="mt-6 text-sm text-muted">Nothing here.</p> : (
        <div className="mt-6 space-y-4">{shown.map((i) => {
          const shot = i.screenshot_path ? urls.find((u) => u.path === i.screenshot_path)?.signedUrl : null;
          return (
            <article key={i.id} className="glass space-y-3 p-5 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{i.kind === "problem" ? "Problem" : "Suggestion"}{i.page_path ? <> · <code className="text-xs">{i.page_path}</code></> : ""}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${needsYou(i) ? "bg-[#e8701a]/15 text-[#c8701a]" : "bg-gold/10 text-gold-deep"}`}>{STATUS[i.status] ?? i.status}</span>
              </div>
              <p className="text-xs text-faint">{new Date(i.created_at).toLocaleString("en-US")} · {i.profiles?.display_name ?? i.profiles?.email ?? "Member"}{i.device ? ` · ${i.device}` : ""}</p>
              <p className="whitespace-pre-wrap">{i.description}</p>
              {i.expected && <p className="text-xs text-muted">Expected: {i.expected}</p>}
              {shot && <a href={shot} target="_blank" rel="noreferrer" className="text-xs text-gold underline">Open screenshot</a>}
              <p className="text-xs"><span className={`rounded-full px-2 py-0.5 ${i.priority === "critical" ? "bg-danger/15 text-danger" : i.priority === "elite" ? "bg-[#e8701a]/15 text-[#c8701a]" : "bg-line/50"}`}>{i.priority === "critical" ? "Critical" : i.priority === "elite" ? "Elite priority" : "Standard"}</span> <span className="text-faint">· attempts {i.attempts ?? 0}{i.acknowledged_at ? " · acknowledged" : ""}{i.member_notified_at ? " · member notified" : ""}</span></p>
              {i.peace_notes && <div className="rounded-xl border border-gold/40 bg-gold/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-gold-deep">{i.kind === "problem" ? "Peace: cause and fix" : "Peace: proposal"}</p><p className="mt-1 whitespace-pre-wrap">{i.peace_notes}</p>{i.pr_url && <a href={i.pr_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">View the change</a>}</div>}
              {ev.some((e) => e.issue_id === i.id) && (
                <details className="text-xs"><summary className="cursor-pointer text-faint">Activity log</summary>
                  <ul className="mt-2 space-y-1">{ev.filter((e) => e.issue_id === i.id).slice().reverse().map((e, k) => (
                    <li key={k}>{new Date(e.created_at).toLocaleString("en-US")} · {e.actor} · {e.action}{e.detail ? ` · ${e.detail}` : ""}{e.ai_cost_cents != null ? ` · AI ${Number(e.ai_cost_cents).toFixed(2)}¢` : ""}{e.run_url && <> · <a href={e.run_url} target="_blank" rel="noreferrer" className="underline">run</a></>}</li>
                  ))}</ul>
                </details>
              )}
              {["new", "approved", "failed"].includes(i.status) && <ActionForm action={runIssueNow}><input type="hidden" name="id" value={i.id} /><button className="btn btn-ghost btn-sm">Run Peace now</button></ActionForm>}
              <ActionForm action={decideIssue} className="space-y-2 border-t border-line pt-3">
                <input type="hidden" name="id" value={i.id} />
                <textarea name="owner_note" rows={2} defaultValue={i.owner_note ?? ""} className="field w-full text-xs" placeholder="Your note to Peace (changes you'd like, or why)" />
                <input name="member_reply" defaultValue={i.member_reply ?? ""} className="field w-full text-xs" placeholder="Optional reply the member will see" />
                <div className="flex flex-wrap gap-2">
                  {(i.status === "proposed" || i.status === "needs_owner") && <><button name="op" value="approve" className="btn btn-gold btn-sm">Approve</button><button name="op" value="decline" className="btn btn-ghost btn-sm">Decline</button></>}
                  {i.kind === "suggestion" && i.status === "new" && <button name="op" value="approve" className="btn btn-ghost btn-sm">Approve now (skip proposal)</button>}
                  <button name="op" value="note" className="btn btn-ghost btn-sm">Save note</button>
                  {done(i) ? <button name="op" value="reopen" className="btn btn-ghost btn-sm">Reopen</button> : <button name="op" value="close" className="btn btn-ghost btn-sm">Close</button>}
                </div>
              </ActionForm>
            </article>
          );
        })}</div>
      )}
    </>
  );
}
