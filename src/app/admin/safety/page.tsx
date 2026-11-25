import Link from "next/link";
import { requireStaff, hasRole } from "@/lib/auth";
import { countRows, date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { flagAccount, saveSafetySettings, updateSafetyFlag } from "@/app/actions/admin";
import { decideAppeal } from "@/app/actions/journey-admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

const REASON: Record<string, string> = { multiple_reports: "Repeated reports", payment_fraud: "Payment fraud", identity_mismatch: "Identity / age mismatch", spam: "Spam", manual: "Staff review" };

export default async function SafetyAdminPage() {
  const viewer = await requireStaff(rolesFor("/admin/safety"));
  const isOwner = hasRole(viewer, ["owner"]);
  const supabase = (await createClient())!;
  const [{ data: settings }, { data: flags }, openReports, verified, blocks, pendingIds] = await Promise.all([
    supabase.from("platform_settings").select("key, value").in("key", ["require_identity_for_matchmaking", "hide_flagged_from_matchmaking", "report_flag_threshold", "max_daily_connection_requests", "identity_verification_live"]),
    supabase.from("safety_flags").select("id, reason, details, status, created_at, profiles!safety_flags_user_id_fkey(email, display_name)").in("status", ["open", "reviewing"]).order("created_at", { ascending: false }).limit(100),
    countRows("moderation_reports", (q) => q.in("status", ["open", "reviewing"])),
    countRows("profiles", (q) => q.not("identity_verified_at", "is", null)),
    countRows("blocks"),
    countRows("identity_verifications", (q) => q.in("status", ["pending", "processing", "requires_input"])),
  ]);
  const v = (k: string) => (settings ?? []).find((s) => s.key === k)?.value;
  const { data: appeals } = await supabase.from("account_appeals").select("id, regarding, explanation, status, created_at").in("status", ["open", "reviewing"]).order("created_at").limit(50);

  return (
    <>
      <PageHeader eyebrow="Care" title="Trust & safety" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open safety flags" value={flags?.length ?? 0} accent="var(--danger)" />
        <Stat label="Open reports" value={openReports} hint="Review in Content moderation" />
        <Stat label="Identity-verified members" value={verified} accent="var(--success)" />
        <Stat label="Verifications in progress" value={pendingIds} hint={`${blocks} member blocks in place`} />
      </div>

      <div className="mt-6">
        <Panel title="Safety settings">
          {isOwner ? (
            <ActionForm action={saveSafetySettings} className="grid gap-5 p-5 md:grid-cols-2">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="require_identity_for_matchmaking" defaultChecked={v("require_identity_for_matchmaking") === true} className="mt-1 accent-[var(--champagne)]" />
                <span><span className="font-semibold">Require verified identity & age for In Love matchmaking</span><span className="block text-muted">Unverified members can’t see or be seen by singles. {v("identity_verification_live") === true ? "" : "Identity verification is not yet live (Launch controls)."}</span></span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="hide_flagged_from_matchmaking" defaultChecked={v("hide_flagged_from_matchmaking") !== false} className="mt-1 accent-[var(--champagne)]" />
                <span><span className="font-semibold">Hide flagged members from matchmaking</span><span className="block text-muted">Until a moderator resolves the flag.</span></span>
              </label>
              <label className="space-y-1.5 text-sm"><span className="font-semibold">Reports that automatically flag an account (30 days)</span>
                <input name="report_flag_threshold" type="number" min={1} max={50} defaultValue={Number(v("report_flag_threshold") ?? 3)} className="field" />
              </label>
              <label className="space-y-1.5 text-sm"><span className="font-semibold">Daily connection requests per member</span>
                <input name="max_daily_connection_requests" type="number" min={1} max={500} defaultValue={Number(v("max_daily_connection_requests") ?? 20)} className="field" />
              </label>
              <div><button className="btn btn-gold btn-sm">Save safety settings</button></div>
            </ActionForm>
          ) : (
            <p className="p-5 text-sm text-muted">Only the owner can change safety settings.</p>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Accounts flagged for review">
          <div className="divide-y divide-line">
            {(flags ?? []).map((f: any) => (
              <div key={f.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="text-sm">
                  <p className="font-semibold text-text">{f.profiles?.display_name ?? "Member"} <span className="font-normal text-faint">· {f.profiles?.email}</span></p>
                  <p className="mt-1 text-muted">{REASON[f.reason] ?? f.reason}{f.details ? ` — ${f.details}` : ""} · {date(f.created_at)} · <span className="chip">{f.status}</span></p>
                </div>
                <ActionForm action={updateSafetyFlag} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <button name="status" value="reviewing" className="btn btn-ghost btn-sm">Reviewing</button>
                  <button name="status" value="resolved" className="btn btn-gold btn-sm">Resolved</button>
                  <button name="status" value="dismissed" className="btn btn-ghost btn-sm">Dismiss</button>
                </ActionForm>
              </div>
            ))}
          </div>
          {!flags?.length && <Empty>No accounts are flagged.</Empty>}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Flag an account manually (e.g. suspected payment fraud)">
          <ActionForm action={flagAccount} className="grid gap-3 p-5 md:grid-cols-[1.2fr_1fr_1.6fr_auto]">
            <input name="email" type="email" required placeholder="Member email" className="field" />
            <select name="reason" className="field" defaultValue="manual"><option value="manual">Staff review</option><option value="payment_fraud">Payment fraud</option><option value="spam">Spam</option></select>
            <input name="details" placeholder="Details for the review team" className="field" />
            <button className="btn btn-gold">Flag</button>
          </ActionForm>
        </Panel>
      </div>
      <div className="mt-6">
        <Panel title={`Member appeals (${appeals?.length ?? 0} open)`}>
          {appeals?.length ? (
            <ul className="divide-y divide-line">
              {appeals.map((a) => (
                <li key={a.id} className="px-5 py-4 text-sm">
                  <p className="font-semibold">{a.regarding} <span className="chip ml-2">{a.status}</span></p>
                  <p className="mt-1 whitespace-pre-wrap text-muted">{a.explanation}</p>
                  <p className="mt-1 text-xs text-faint">{date(a.created_at)} · Reviewed by someone not involved in the original decision.</p>
                  <ActionForm action={decideAppeal} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <select name="status" className="field w-44" defaultValue="reviewing"><option value="reviewing">Reviewing</option><option value="reversed">Reverse decision</option><option value="upheld">Uphold decision</option></select>
                    <input name="note" className="field flex-1" placeholder="Note to file (not sent to the member)" />
                    <button className="btn btn-ghost btn-sm">Save</button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : <Empty>No open appeals.</Empty>}
        </Panel>
      </div>
      <p className="mt-4 text-xs text-muted">
        Built-in protections: identity documents are never stored; repeated reports open a flag automatically; members can block each other;
        connection requests are capped daily; sign-up, sign-in, forms and promo codes are rate-limited. Suspend accounts from <Link href="/admin/members" className="underline">Members</Link>.
      </p>
    </>
  );
}
