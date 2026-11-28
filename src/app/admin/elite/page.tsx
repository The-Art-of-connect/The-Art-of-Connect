import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Stat } from "@/components/admin/ui";
import { EliteBadge } from "@/components/EliteBadge";
import Link from "next/link";
import { eliteBadge, eliteDecide, eliteDecideAppeal, eliteFinancialAction, eliteFounderInvite, eliteResolveDataRequest, eliteReviewEvidence, eliteSaveSettings } from "@/app/actions/elite";
import { AMOUNT_BANDS, SCREENING } from "@/lib/elite-screening";
import { ELITE_QUALIFICATIONS, ELITE_STATUS_LABEL, EVIDENCE_KINDS, OWNERSHIP_LABEL, VERIFICATION_METHODS, depositWindow, usd, type Thresholds } from "@/lib/elite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Elite Management Center" };

const THRESHOLD_LABELS: Record<string, string> = {
  personal_income: "Annual personal income", business_revenue: "Annual business revenue (with profitability and verified ownership)",
  net_worth: "Net worth, excluding primary residence", investable_assets: "Investable assets",
};
const PATHWAY_LABEL: Record<string, string> = { direct: "Direct application", earned: "Earned", expedited: "Priority (expedited)", founder: "Founder" };

/** Owner only: qualification rules, verification review, founder invitations, badges and appeals. Confidential. */
export default async function EliteCenter({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff(["owner"]);
  const filter = (await searchParams).status ?? "";
  const supabase = (await createClient())!;
  const [{ data: s }, { data: candidates }, { data: badges }, { data: appeals }, { data: dataRequests }] = await Promise.all([
    supabase.from("elite_settings").select("*").maybeSingle(),
    supabase.from("elite_candidates").select("id, user_id, invitee_email, invitee_name, pathway, qualification, status, fee_waived, fee_paid_at, invitation_expires_at, decided_at, created_at, review_reasons, screening, screening_result, screening_meets, profiles:user_id (display_name, email, is_test)").order("updated_at", { ascending: false }).limit(200),
    supabase.from("elite_badges").select("user_id, status, issued_at"),
    supabase.from("elite_appeals").select("id, candidate_id, message, status, response, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("elite_data_requests").select("id, kind, subject, message, status, response, created_at, profiles:user_id (display_name, email)").order("created_at", { ascending: false }).limit(50),
  ]);
  const list = (candidates ?? []) as unknown as { id: string; user_id: string | null; invitee_email: string | null; invitee_name: string | null; pathway: string; qualification: string | null; status: string; fee_waived: boolean; fee_paid_at: string | null; invitation_expires_at: string | null; created_at: string; review_reasons: string[]; screening: Record<string, string | number>; screening_result: string | null; screening_meets: boolean | null; profiles: { display_name: string; email: string; is_test: boolean } | null }[];
  // Priority (paid expedited) applicants awaiting review come first.
  const waiting = (c: (typeof list)[number]) => Boolean(c.fee_paid_at) && !["invitation_issued", "invitation_accepted", "membership_activated", "revoked", "expired"].includes(c.status);
  const shown = (filter ? list.filter((c) => c.status === filter) : list).slice().sort((a, b) => Number(waiting(b)) - Number(waiting(a)));
  const ids = shown.map((c) => c.id);
  const userIds = shown.map((c) => c.user_id).filter(Boolean) as string[];
  const [{ data: evidence }, { data: notes }, { data: fin }, { data: idv }, { data: fees }] = ids.length
    ? await Promise.all([
        supabase.from("elite_evidence").select("id, candidate_id, kind, storage_path, description, status, reviewer_note, created_at").in("candidate_id", ids).order("created_at", { ascending: false }),
        supabase.from("elite_owner_notes").select("candidate_id, note, created_at").in("candidate_id", ids).order("created_at", { ascending: false }),
        supabase.rpc("elite_owner_financials", { p_candidates: ids }),
        userIds.length ? supabase.from("identity_verifications").select("user_id, status, age_meets_minimum, created_at").in("user_id", userIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from("elite_verification_payments").select("candidate_id, amount_cents, status, livemode, paid_at").in("candidate_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
  type Fin = { id: string; candidate_id: string; institution_name: string | null; last4: string | null; livemode: boolean; ownership_result: string; balance_cents: number | null; balance_currency: string | null; balance_as_of: string | null; deposits_cents: number | null; deposits_count: number | null; history_days: number | null; history_start: string | null; history_end: string | null; data_status: string; delete_after: string | null };
  const finRows = (fin ?? []) as Fin[];
  const money = (cents: number | null) => (cents == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100));
  const paths = (evidence ?? []).map((e) => e.storage_path).filter(Boolean) as string[];
  const urls = paths.length ? (await supabase.storage.from("elite-evidence").createSignedUrls(paths, 600)).data ?? [] : [];
  const t = (s?.thresholds ?? {}) as Thresholds;
  const count = (st: string[]) => list.filter((c) => st.includes(c.status)).length;
  const activeBadges = (badges ?? []).filter((b) => b.status === "active").length;

  return (
    <>
      <PageHeader eyebrow="Owner Portal" title="Elite Management Center" />
      <p className="-mt-6 mb-6 text-sm"><Link href="/admin/elite/verification" className="text-gold underline">Stripe verification: use-case review, activation steps, costs and controls →</Link></p>
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Elite Concierge is open to apply, with qualification and verification required. Everything here is confidential: financial details and verification documents are visible only to you. All decisions are recorded in the audit history. Founder discretion never overrides identity verification, age requirements or safety protections.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Candidates" value={list.length} />
        <Stat label="Awaiting your review" value={count(["preliminary", "verification_pending", "manual_review", "info_required"])} />
        <Stat label="Approved (Elite unlocked)" value={count(["invitation_issued"])} />
        <Stat label="Activated or accepted" value={count(["invitation_accepted", "membership_activated"])} />
        <Stat label="Active Elite members" value={activeBadges} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ActionForm action={eliteSaveSettings} className="glass space-y-4 p-6">
          <h2 className="display text-2xl">Qualification rules</h2>
          <label className="block text-xs text-muted">Tagline<input name="tagline" defaultValue={s?.tagline ?? ""} className="field mt-1 w-full" /></label>
          {Object.entries(THRESHOLD_LABELS).map(([k, label]) => (
            <div key={k} className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
              <label className="text-xs text-muted">{label} ($)<input name={`t_${k}`} defaultValue={t[k]?.amount ?? ""} className="field mt-1 w-full" /></label>
              <label className="flex items-center gap-2 pb-2 text-xs"><input type="checkbox" name={`a_${k}`} defaultChecked={t[k]?.approved} /> Approved</label>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted">Membership months (earned pathway)<input name="min_months" defaultValue={s?.min_membership_months ?? 6} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Personal discoveries completed<input name="min_answers" defaultValue={s?.min_discovery_answers ?? 20} className="field mt-1 w-full" /></label>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="progression_approved" defaultChecked={s?.progression_approved} /> Membership milestones approved</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted">Invitation valid for (days)<input name="invitation_days" defaultValue={s?.invitation_days ?? 30} className="field mt-1 w-full" /></label>
            <label className="text-xs text-muted">Delete documents after review (days)<input name="retention_days" defaultValue={s?.evidence_retention_days ?? 90} className="field mt-1 w-full" /></label>
          </div>
          <div className="rounded-xl border border-line p-3 text-xs">
            <p className="font-semibold">Automatic qualification</p>
            <p className="mt-1 text-faint">Candidates whose evidence conclusively meets an approved requirement are verified and invited automatically; everything else comes to you with reasons. Identity (Stripe Identity), founder invitations and owner-verified documents always proceed automatically.</p>
            <label className="mt-2 flex gap-2"><input type="checkbox" name="auto_investable" defaultChecked={Boolean((s?.auto_rules as { investable_assets_from_balances?: boolean } | null)?.investable_assets_from_balances)} /> Approve rule: investable assets are verified automatically when balances on cash and investment accounts owned by the verified member meet the approved threshold</label>
            <label className="mt-2 block text-muted">Bank data must be no older than (days)<input name="max_data_age" defaultValue={s?.max_data_age_days ?? 30} className="field mt-1 w-full" /></label>
            <p className="mt-1 text-faint">No automatic rule exists for income, business ownership, net worth or accomplishments: Stripe can&rsquo;t verify these conclusively, so they come to you.</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <label className="text-xs text-muted">Expedited verification fee ($, one-time)<input name="fee" defaultValue={((s?.expedited_fee_cents ?? 99500) / 100).toFixed(2)} className="field mt-1 w-full" /></label>
            <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" name="fee_active" defaultChecked={s?.expedited_fee_active} /> Fee approved and active</label>
            <input name="fee_confirm" placeholder="Type APPROVE to activate" className="field mt-2 w-full text-xs" autoComplete="off" />
            <p className="mt-1 text-[0.7rem] text-faint">{s?.expedited_fee_active ? "Active." : "Inactive (proposal). Expedited verification payment stays off until you approve it."} The fee purchases faster verification, never admission, and is separate from membership.</p>
          </div>
          <p className="text-[0.7rem] text-faint">Elite Concierge membership price is managed in Pricing &amp; packages (currently a draft until you publish pricing). Identity verification is always required.</p>
          <button className="btn btn-gold btn-sm">Save rules</button>
        </ActionForm>

        <ActionForm action={eliteFounderInvite} className="glass space-y-3 p-6">
          <h2 className="display text-2xl">Founder&rsquo;s invitation</h2>
          <p className="text-sm text-muted">Invite an existing member by their email, or someone who isn&rsquo;t a member yet (it attaches when they join with that email). Thresholds are waived; identity verification, age and safety still apply.</p>
          <label className="block text-xs text-muted">Email<input name="email" type="email" required className="field mt-1 w-full" /></label>
          <label className="block text-xs text-muted">Name (for someone not yet a member)<input name="name" className="field mt-1 w-full" /></label>
          <label className="block text-xs text-muted">Confidential reason (visible only to you)<textarea name="reason" rows={3} required className="field mt-1 w-full" placeholder="Leadership, impact, accomplishments…" /></label>
          <p className="text-xs text-faint">The expedited verification fee is waived for founder invitations.</p>
          <button className="btn btn-gold btn-sm">Approve and invite</button>
        </ActionForm>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-3xl">Candidates</h2>
          <nav className="flex flex-wrap gap-2 text-xs">
            <a href="/admin/elite" className={`rounded-full border px-3 py-1 ${!filter ? "border-gold text-gold" : "border-line"}`}>All</a>
            {Object.entries(ELITE_STATUS_LABEL).map(([k, v]) => list.some((c) => c.status === k) && <a key={k} href={`/admin/elite?status=${k}`} className={`rounded-full border px-3 py-1 ${filter === k ? "border-gold text-gold" : "border-line"}`}>{v}</a>)}
          </nav>
        </div>
        {shown.length === 0 ? <p className="mt-4 text-sm text-muted">No candidates yet.</p> : (
          <div className="mt-4 space-y-3">
            {shown.map((c) => {
              const ev = (evidence ?? []).filter((e) => e.candidate_id === c.id);
              const nt = (notes ?? []).filter((n) => n.candidate_id === c.id);
              const badge = (badges ?? []).find((b) => b.user_id === c.user_id);
              return (
                <details key={c.id} className="glass overflow-hidden !p-0">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold">{c.profiles?.display_name ?? c.invitee_name ?? c.invitee_email}{badge?.status === "active" && <EliteBadge size={16} interactive={false} />}{c.profiles?.is_test && <span className="rounded-full border border-gold/50 px-2 text-[0.6rem] text-gold">TEST</span>}</span>
                    <span className="flex flex-wrap gap-3 text-xs text-muted"><span>{PATHWAY_LABEL[c.pathway]}</span>{waiting(c) && <span className="rounded-full bg-[#e8892b]/20 px-2 text-[#f0a35a]">Priority</span>}<span>{ELITE_QUALIFICATIONS.find((q) => q.id === c.qualification)?.label ?? (c.qualification === "founder_selected" ? "Founder-selected" : "—")}</span><span className="text-gold">{ELITE_STATUS_LABEL[c.status]}</span></span>
                  </summary>
                  <div className="grid gap-5 border-t border-line p-5 lg:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <p className="text-xs text-muted">{c.profiles?.email ?? c.invitee_email} · since {new Date(c.created_at).toLocaleDateString("en-US")} · fee {c.fee_waived ? "waived" : c.fee_paid_at ? "paid" : "not paid"}{c.invitation_expires_at ? ` · invitation until ${new Date(c.invitation_expires_at).toLocaleDateString("en-US")}` : ""}</p>
                      {c.screening_result && (
                        <div className="rounded-xl border border-line p-3 text-xs">
                          <p className="font-semibold">Preliminary screening: <span className="text-gold">{c.screening_result === "pass" ? "Passed" : c.screening_result === "owner_review" ? "Needs your review" : "Not yet"}</span>{c.screening_meets ? " · expedited unlocked" : ""}</p>
                          <ul className="mt-1 space-y-0.5 text-muted">{Object.entries(c.screening ?? {}).map(([k, v]) => {
                            const q = (SCREENING[c.qualification ?? ""] ?? []).find((x) => x.id === k);
                            const shown = q?.kind === "band" ? AMOUNT_BANDS.find((b) => b.value === Number(v))?.label : q?.options?.find((o) => String(o.value) === String(v))?.label;
                            return <li key={k}>{q?.label ?? k}: <span className="text-text">{shown ?? String(v)}</span></li>;
                          })}</ul>
                        </div>
                      )}
                      {(c.review_reasons ?? []).length > 0 && (
                        <div className="rounded-xl border border-[#e8892b]/50 p-3 text-xs"><p className="font-semibold">Needs your review because</p><ul className="mt-1 list-disc pl-4">{c.review_reasons.map((x) => <li key={x}>{x}</li>)}</ul></div>
                      )}
                      {(() => {
                        const iv = (idv ?? []).find((v) => v.user_id === c.user_id);
                        const fp = (fees ?? []).filter((p) => p.candidate_id === c.id && p.paid_at);
                        const m = c.qualification ? VERIFICATION_METHODS[c.qualification] : null;
                        return (
                          <div className="space-y-1 rounded-xl border border-line p-3 text-xs">
                            <p><span className="font-semibold">Stripe Identity:</span> {iv ? `${iv.status}${iv.age_meets_minimum === false ? " · below minimum age" : ""}` : "not started"}</p>
                            {fp.map((p, i) => <p key={i}><span className="font-semibold">Expedited fee:</span> {money(p.amount_cents)} {p.status}{p.livemode ? "" : " (Sandbox)"}</p>)}
                            {m && <p className="text-faint">Required for this pathway: {m.documents} {m.never}</p>}
                          </div>
                        );
                      })()}
                      {finRows.filter((a) => a.candidate_id === c.id).map((a) => (
                        <div key={a.id} className="space-y-1 rounded-xl border border-gold/40 p-3 text-xs">
                          <p className="flex flex-wrap justify-between gap-2 font-semibold"><span>{a.institution_name ?? "Bank"}{a.last4 ? ` ••${a.last4}` : ""}</span><span className="text-gold">{a.livemode ? "Live" : "Sandbox"} · {a.data_status}</span></p>
                          <p>Ownership: {OWNERSHIP_LABEL[a.ownership_result]}</p>
                          <p>Current balance on this account: {money(a.balance_cents)}{a.balance_as_of ? ` (as of ${new Date(a.balance_as_of).toLocaleDateString("en-US")})` : ""} <span className="text-faint">· not net worth</span></p>
                          {(() => { const w = depositWindow(a); return <p>Deposits: {w ? w.text : "—"} <span className="text-faint">· {w?.caveat ?? "Not verified income."} Deposits may include transfers, reimbursements or business funds.</span></p>; })()}
                          {a.delete_after && <p className="text-faint">Summaries erased automatically after {new Date(a.delete_after).toLocaleDateString("en-US")}.</p>}
                          {a.data_status !== "purged" && (
                            <ActionForm action={eliteFinancialAction} className="flex gap-2 pt-1"><input type="hidden" name="id" value={a.id} />
                              <button name="op" value="refresh" className="btn btn-ghost btn-sm">Refresh from Stripe</button>
                              <button name="op" value="purge" className="btn btn-ghost btn-sm">Erase now</button>
                            </ActionForm>
                          )}
                        </div>
                      ))}
                      <p className="eyebrow">Verification evidence</p>
                      {ev.length === 0 ? <p className="text-xs text-muted">None submitted.</p> : ev.map((e) => {
                        const url = e.storage_path ? urls.find((u) => u.path === e.storage_path)?.signedUrl : null;
                        return (
                          <ActionForm key={e.id} action={eliteReviewEvidence} className="space-y-2 rounded-xl border border-line p-3">
                            <input type="hidden" name="id" value={e.id} />
                            <p className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-semibold">{EVIDENCE_KINDS.find((k) => k.id === e.kind)?.label}</span><span className="text-gold">{e.status}</span></p>
                            {e.description && <p className="text-xs">{e.description}</p>}
                            {url && <a href={url} target="_blank" rel="noreferrer" className="text-xs text-gold underline">Open document (link expires in 10 minutes)</a>}
                            <input name="note" placeholder="Note to the member (optional)" className="field w-full text-xs" defaultValue={e.reviewer_note ?? ""} />
                            <div className="flex flex-wrap gap-2 text-xs">
                              <button name="status" value="owner_verified" className="btn btn-gold btn-sm">Verified</button>
                              <button name="status" value="needs_info" className="btn btn-ghost btn-sm">Need more</button>
                              <button name="status" value="rejected" className="btn btn-ghost btn-sm">Reject</button>
                            </div>
                          </ActionForm>
                        );
                      })}
                    </div>
                    <div className="space-y-3 text-sm">
                      <ActionForm action={eliteDecide} className="space-y-2 rounded-xl border border-line p-3">
                        <input type="hidden" name="id" value={c.id} />
                        <p className="eyebrow">Decision</p>
                        <textarea name="note" rows={2} className="field w-full text-xs" placeholder="Confidential reason or note (required to approve or revoke)" />
                        <div className="flex flex-wrap gap-2">
                          {!c.screening_meets && c.pathway !== "founder" && c.screening_result && <button name="action" value="approve_screening" className="btn btn-ghost btn-sm">Approve preliminary screening</button>}
                          <button name="action" value="approve" className="btn btn-gold btn-sm">Approve qualification</button>
                          <button name="action" value="manual_review" className="btn btn-ghost btn-sm">Manual review</button>
                          <button name="action" value="info" className="btn btn-ghost btn-sm">Request information</button>
                          {!c.fee_waived && <button name="action" value="waive" className="btn btn-ghost btn-sm">Waive fee</button>}
                          {c.status !== "revoked" ? <button name="action" value="revoke" className="btn btn-ghost btn-sm text-danger">Revoke</button> : <button name="action" value="reinstate" className="btn btn-ghost btn-sm">Reinstate</button>}
                          <button name="action" value="" className="btn btn-ghost btn-sm">Add note only</button>
                        </div>
                      </ActionForm>
                      {c.user_id && (
                        <ActionForm action={eliteBadge} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 text-xs">
                          <input type="hidden" name="user_id" value={c.user_id} />
                          <span>Badge: <strong>{badge?.status ?? "none"}</strong></span>
                          <button name="status" value="active" className="btn btn-ghost btn-sm">Activate</button>
                          <button name="status" value="suspended" className="btn btn-ghost btn-sm">Suspend</button>
                          <button name="status" value="revoked" className="btn btn-ghost btn-sm text-danger">Revoke</button>
                        </ActionForm>
                      )}
                      {nt.length > 0 && <div className="rounded-xl border border-line p-3 text-xs"><p className="eyebrow">Confidential notes</p>{nt.map((n) => <p key={n.created_at} className="mt-1"><span className="text-faint">{new Date(n.created_at).toLocaleDateString("en-US")}:</span> {n.note}</p>)}</div>}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display text-3xl">Access and correction requests</h2>
        {(dataRequests ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">None.</p> : (
          <div className="mt-4 space-y-3">
            {((dataRequests ?? []) as unknown as { id: string; kind: string; subject: string; message: string; status: string; response: string | null; created_at: string; profiles: { display_name: string | null; email: string } | null }[]).map((d) => (
              <ActionForm key={d.id} action={eliteResolveDataRequest} className="glass space-y-2 p-4 text-sm">
                <input type="hidden" name="id" value={d.id} />
                <p className="text-xs text-muted">{new Date(d.created_at).toLocaleDateString("en-US")} · {d.profiles?.display_name ?? d.profiles?.email} · {d.kind} · {d.subject} · {d.status}</p>
                <p className="whitespace-pre-wrap">{d.message}</p>
                {d.status === "open" && <><textarea name="response" rows={2} className="field w-full text-xs" placeholder="Response to the member (what was corrected or provided)" />
                  <div className="flex gap-2"><button name="status" value="completed" className="btn btn-gold btn-sm">Complete</button><button name="status" value="declined" className="btn btn-ghost btn-sm">Decline</button></div></>}
                {d.response && <p className="text-xs text-muted">Response: {d.response}</p>}
              </ActionForm>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display text-3xl">Review requests</h2>
        {(appeals ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">None.</p> : (
          <div className="mt-4 space-y-3">
            {(appeals ?? []).map((a) => (
              <ActionForm key={a.id} action={eliteDecideAppeal} className="glass space-y-2 p-4 text-sm">
                <input type="hidden" name="id" value={a.id} />
                <p className="text-xs text-muted">{new Date(a.created_at).toLocaleDateString("en-US")} · {a.status}</p>
                <p className="whitespace-pre-wrap">{a.message}</p>
                {a.status === "open" && <><textarea name="response" rows={2} className="field w-full text-xs" placeholder="Response to the member" />
                  <div className="flex gap-2"><button name="status" value="upheld" className="btn btn-gold btn-sm">Reconsider</button><button name="status" value="denied" className="btn btn-ghost btn-sm">Decline</button></div></>}
                {a.response && <p className="text-xs text-muted">Response: {a.response}</p>}
              </ActionForm>
            ))}
          </div>
        )}
      </section>
      <p className="mt-10 text-xs text-faint">Proposed thresholds and the expedited fee stay inactive until you approve them. Stripe is the only verification provider: Stripe Identity and Financial Connections run in Sandbox for testing, and production use follows your switches on the Stripe verification page. Financial results are supporting evidence only; every qualification decision is yours. Revenue for Elite Concierge memberships and verification will be reported separately once payments are live.</p>
    </>
  );
}
