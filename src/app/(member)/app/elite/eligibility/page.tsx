import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { EliteBadge } from "@/components/EliteBadge";
import { eliteAppeal, eliteDataRequest, eliteDisconnectBank, eliteSubmitEvidence } from "@/app/actions/elite";
import { ELITE_QUALIFICATIONS, ELITE_STATUS_LABEL, ELITE_TAGLINE, EVIDENCE_KINDS, OWNERSHIP_LABEL, VERIFICATION_METHODS, depositWindow, usd, type Thresholds } from "@/lib/elite";
import { FC_CONSENT_TEXT, FC_CONSENT_VERSION, syncPendingFee, verificationGate } from "@/lib/elite-verification";
import { VerifyButton } from "@/components/VerifyButton";
import { EliteBankConnect } from "@/components/EliteBankConnect";
import { EliteCheckoutButton } from "@/components/EliteCheckoutButton";
import { EliteScreeningForm } from "@/components/EliteScreeningForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Elite application" };

type Eval = { candidate: boolean; pathway: string | null; status: string | null; age: boolean; standing: boolean; identity: boolean; qualification: boolean;
  months: number; min_months: number; answers: number; min_answers: number; progression: boolean; fee: boolean; expedited_available: boolean; invitation_expires_at: string | null };

/** Private: a member's own Elite eligibility. No ranking, no pressure, nothing charged here. */
export default async function EliteEligibility({ searchParams }: { searchParams: Promise<{ fee?: string }> }) {
  const { fee: feeReturn } = await searchParams;
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  if (feeReturn === "paid" && !isInsidePreview(viewer) && !viewer.viewAs) await syncPendingFee(viewer.id);
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const [{ data: ev }, { data: s }, { data: c }] = await Promise.all([
    preview ? Promise.resolve({ data: null }) : supabase.rpc("elite_evaluate"),
    supabase.from("elite_settings").select("thresholds, min_membership_months, min_discovery_answers, progression_approved, expedited_fee_cents, expedited_fee_active").maybeSingle(),
    preview ? Promise.resolve({ data: null }) : supabase.from("elite_candidates").select("id, status, pathway, qualification, invitation_expires_at, screening_result").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const e = ev as Eval | null;
  const [{ data: evidence }, { data: appeals }, { data: banks }] = c
    ? await Promise.all([
        supabase.from("elite_evidence").select("id, kind, status, reviewer_note, created_at").eq("candidate_id", c.id).order("created_at", { ascending: false }),
        supabase.from("elite_appeals").select("id, status, response, created_at").eq("candidate_id", c.id).order("created_at", { ascending: false }),
        supabase.from("elite_financial_accounts").select("id, institution_name, last4, livemode, ownership_result, data_status, disconnected_at").eq("candidate_id", c.id).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const [idGate, fcGate, feeGate] = preview || !c
    ? [null, null, null]
    : await Promise.all([verificationGate("identity", viewer.id), verificationGate("financial", viewer.id), verificationGate("fee", viewer.id)]);
  const sandbox = (g: typeof idGate) => Boolean(g?.stripe && !g.live);
  const method = c?.qualification ? VERIFICATION_METHODS[c.qualification] : null;
  type Mine = {
    candidacy: { review_reasons: string[] } | null;
    identity_verifications: { provider: string; status: string; meets_minimum_age: boolean | null; verified_at: string | null; started_at: string }[];
    bank_accounts: { id: string; institution: string | null; last4: string | null; sandbox: boolean; ownership_result: string; balance_cents: number | null; balance_as_of: string | null;
      deposits_cents: number | null; deposits_count: number | null; history_days: number | null; history_start: string | null; history_end: string | null; data_status: string; erase_after: string | null }[];
    data_requests: { kind: string; subject: string; status: string; response: string | null; created_at: string }[];
  };
  const mine = (c && !preview ? (await supabase.rpc("elite_my_verification")).data : null) as Mine | null;
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
  const cash = (cents: number | null) => (cents == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100));
  const t = (s?.thresholds ?? {}) as Thresholds;
  const status = c?.status ?? "not_started";
  const canSubmit = c && ["preliminary", "verification_pending", "info_required", "manual_review", "owner_verified", "automated_verified", "qualification_approved"].includes(status);
  // Progress markers fill in automatically. Unfinished steps link to where they're completed.
  const check = (done: boolean, label: string, hint?: string, href?: string, action?: string) => (
    <li className="flex gap-3"><span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${done ? "bg-[#e8701a] text-white" : "border border-dashed border-[#c9a96e]/60"}`}>{done ? "✓" : ""}</span>
      <span><span className={done ? "text-muted" : "font-semibold"}>{label}</span><span className="sr-only">{done ? " (complete)" : " (not yet complete)"}</span>{hint && <span className="block text-xs text-faint">{hint}</span>}
        {!done && href && action && <a href={href} className="mt-1 inline-block text-xs font-semibold text-[#c8701a] underline underline-offset-2">{action} →</a>}</span></li>
  );

  return (
    <>
      <section className="theme-dark relative overflow-hidden rounded-[28px] px-6 py-10 text-center sm:px-12" style={{ background: "#1b1310" }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgb(232_112_26/0.14),transparent_70%)]" aria-hidden="true" />
        <p className="relative flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-[#f0c98a]"><EliteBadge size={16} interactive={false} /><span>Apply for Elite Membership · Qualification and verification required</span></p>
        <h1 className="display relative mt-4 text-4xl text-[#f6e7c8] sm:text-5xl">My Elite application</h1>
        <p className="display relative mt-2 text-xl italic text-[#e8892b]">{ELITE_TAGLINE}</p>
        <p className="relative mx-auto mt-4 max-w-xl text-sm text-[#f5ecdf]/75">Private to you. Applying is free and standard verification is complimentary. Once you&rsquo;re approved, Elite Concierge membership unlocks for purchase.</p>
        <p className="relative mt-4 inline-block rounded-full border border-[#c9a96e]/50 px-4 py-1 text-xs text-[#f0c98a]">Status: {ELITE_STATUS_LABEL[status] ?? status}</p>
      </section>

      {preview && <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm text-gold">Preview: sign in as a member (or a test account in an owner testing session) to try eligibility.</p>}

      {status === "invitation_issued" && (
        <div className="mt-8 rounded-[24px] border-2 border-[#e8892b]/60 bg-[#e8892b]/5 p-6 text-center">
          <div className="flex justify-center"><EliteBadge size={40} interactive={false} /></div>
          <p className="display mt-3 text-3xl">You&rsquo;re approved. Elite Concierge is unlocked.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">Choose Elite Concierge in Membership &amp; billing whenever you&rsquo;re ready. Your gold Elite badge is issued when your membership activates. Nothing is charged until you confirm checkout.{e?.invitation_expires_at ? ` Your approval is held until ${new Date(e.invitation_expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` : ""}</p>
          <Link href="/app/membership" className="btn btn-gold mt-5">Choose Elite Concierge</Link>
        </div>
      )}
      {(status === "invitation_accepted") && (
        <div className="mt-8 rounded-[24px] border border-[#e8892b]/50 p-6 text-center">
          <p className="display text-2xl">Elite Concierge is unlocked.</p>
          <Link href="/app/membership" className="btn btn-gold mt-4">Choose Elite Concierge in Membership &amp; billing</Link>
        </div>
      )}
      {status === "membership_activated" && <p className="mt-8 text-center"><Link href="/app/elite" className="btn btn-gold">Enter the Elite Concierge Society</Link></p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="glass p-6">
          <h2 className="display text-2xl">1 · Private preliminary questions</h2>
          <p className="mt-1 text-sm text-muted">Choose the pathway that best describes you and answer a few private questions. Preliminary screening isn&rsquo;t admission: everything is verified afterwards.</p>
          <EliteScreeningForm
            qualifications={ELITE_QUALIFICATIONS.map((q) => {
              const th = q.threshold ? t[q.threshold] : null;
              return { id: q.id, label: q.label, detail: q.detail, thresholdNote: th ? (th.approved ? ` Threshold: ${usd(th.amount)}.` : " Threshold being finalized.") : "" };
            })}
            initial={c?.qualification ?? null}
            initialPathway={c?.pathway ?? null}
            disabled={preview || ["invitation_issued", "invitation_accepted", "membership_activated", "revoked"].includes(status)}
          />
          {c?.screening_result === "owner_review" && <p className="mt-3 rounded-xl border border-[#c9a96e]/50 p-3 text-xs text-muted">Your preliminary answers are with our founder for a personal review.</p>}
        </section>

        <section className="glass p-6">
          <h2 className="display text-2xl">2 · Your progress</h2>
          {e ? (
            <ul className="mt-4 space-y-3 text-sm">
              {check(e.identity, "Identity verified", "Government-issued identity, verified privately.", "#verify-identity", "Verify my identity")}
              {check(e.qualification, "Qualification verified", "Your chosen pathway, verified from your documents or an approved method.", "#private-verification", "Share verification")}
              {check(e.age && e.standing, "Membership in good standing", undefined, "/app/membership", "View my membership")}
              {e.pathway === "earned" && check(e.progression, "Membership milestones", `${e.months} of ${e.min_months} months of membership · ${e.answers} of ${e.min_answers} personal discoveries${s?.progression_approved ? "" : " (milestones being finalized)"}`)}
              {e.pathway === "expedited" && check(e.fee, "Priority verification (optional)", s?.expedited_fee_active ? `One-time ${usd((s.expedited_fee_cents ?? 0) / 100)}, offered only after preliminary screening. It purchases faster verification, never admission.` : sandbox(feeGate) ? `Sandbox test: ${usd((s?.expedited_fee_cents ?? 0) / 100)} with Stripe test cards only. The fee isn't active for members until our founder approves it.` : "Not yet available: the expedited verification service is awaiting final approval.")}
              {check(["invitation_issued", "invitation_accepted", "membership_activated"].includes(status), "Approved: Elite Concierge membership unlocked", "Automatic once every step above is verified.")}
            </ul>
          ) : <p className="mt-3 text-sm text-muted">Answer the preliminary questions to see your progress.</p>}
          {e && <p className="mt-3 text-xs text-faint">These markers check off automatically as each step is completed; they can&rsquo;t be selected by hand.</p>}
          {feeReturn === "paid" && (e?.fee
            ? <p className="mt-4 text-sm text-success">Thank you. Your expedited verification payment is confirmed; your review is now prioritized.</p>
            : <p className="mt-4 text-sm text-muted">Confirming your payment with Stripe… refresh in a moment.</p>)}
          {e?.pathway === "expedited" && e.expedited_available && !e.fee && feeGate?.stripe && (
            <div className="mt-4 rounded-xl border border-[#e8892b]/50 p-4 text-sm">
              <p>Expedited verification purchases a faster, private review. It never guarantees or purchases admission{sandbox(feeGate) ? ". Sandbox test: use card 4242 4242 4242 4242, any future date and any CVC; nothing real is charged" : ""}.</p>
              {e.identity ? <EliteCheckoutButton /> : <p className="mt-3 text-xs text-muted">Verify your identity first; checkout opens right after. <a href="#verify-identity" className="font-semibold text-[#c8701a] underline">Verify my identity →</a></p>}
            </div>
          )}
          {feeReturn === "canceled" && <p className="mt-4 text-sm text-muted">Checkout was canceled. Nothing was charged.</p>}
        </section>
      </div>

      {canSubmit && (
        <section id="private-verification" className="glass mt-6 scroll-mt-24 p-6">
          <h2 className="display text-2xl">3 · Private verification</h2>
          <p className="mt-1 text-sm text-muted">Share only what&rsquo;s needed. Verification runs through Stripe wherever possible; anything Stripe can&rsquo;t conclusively verify is reviewed personally by our founder from private documents. We keep verification results rather than complete financial records.</p>
          {(sandbox(idGate) || sandbox(fcGate)) && <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-gold">Stripe Sandbox: use fictional test information only. Nothing here is a real verification or a real charge.</p>}
          {method && (
            <div className="mt-4 grid gap-2 rounded-xl border border-line p-4 text-xs sm:grid-cols-3">
              <p><span className="block font-semibold text-sm">Through Stripe</span>{method.stripe}</p>
              <p><span className="block font-semibold text-sm">Your documents</span>{method.documents}</p>
              <p><span className="block font-semibold text-sm">Our standard</span>{method.never}</p>
            </div>
          )}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div id="verify-identity" className="scroll-mt-24 rounded-xl border border-line p-4">
              <p className="font-semibold">Identity · Stripe Identity</p>
              <p className="mt-1 text-xs text-muted">Photograph your government-issued ID and take a live selfie on Stripe&rsquo;s secure page. We receive only whether you&rsquo;re verified and meet the age requirement.</p>
              <div className="mt-3">{e?.identity ? <p className="text-sm text-success">✓ Identity verified</p> : <VerifyButton enabled={Boolean(idGate?.stripe)} label="Verify my identity with Stripe" />}</div>
              {!e?.identity && <p className="mt-2 text-xs text-faint">Prefer not to use a selfie? Choose &ldquo;Government-issued identity&rdquo; under Supporting documents for private review instead.</p>}
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="font-semibold">Bank verification · Stripe Financial Connections <span className="font-normal text-faint">(optional, supporting)</span></p>
              <p className="mt-1 mb-3 text-xs text-muted">Confirms you own the account and summarizes balances and deposits for a private review. It supports, but never by itself proves, income or net worth.</p>
              <EliteBankConnect consentText={FC_CONSENT_TEXT} version={FC_CONSENT_VERSION} enabled={Boolean(fcGate?.stripe)} note={fcGate?.stripe ? undefined : "Bank verification isn't available yet. You can submit documents below."} />
              {(banks ?? []).length > 0 && (
                <ul className="mt-4 divide-y divide-line text-xs">
                  {(banks ?? []).map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>{b.institution_name ?? "Bank"}{b.last4 ? ` ••${b.last4}` : ""}{b.livemode ? "" : " · Sandbox"}<span className="block text-faint">{OWNERSHIP_LABEL[b.ownership_result]} · {b.data_status === "purged" ? "summaries erased" : b.data_status === "pending" ? "collecting" : "received for review"}</span></span>
                      {b.data_status !== "purged" && (
                        <ActionForm action={eliteDisconnectBank}><input type="hidden" name="id" value={b.id} /><button className="btn btn-ghost btn-sm">Disconnect &amp; erase</button></ActionForm>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="mt-6 font-semibold">Supporting documents</p>
          <ActionForm action={eliteSubmitEvidence} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">What this verifies<select name="kind" className="field mt-1 w-full" required>{EVIDENCE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
            <label className="text-sm">Document (PDF or image, up to 10 MB)<input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" /></label>
            <label className="text-sm sm:col-span-2">Or describe what can be independently verified (for example, a public business registration or license number)<textarea name="description" rows={2} maxLength={1000} className="field mt-1 w-full" /></label>
            <button className="btn btn-gold btn-sm sm:col-span-2 sm:justify-self-start">Submit privately</button>
          </ActionForm>
          {(evidence ?? []).length > 0 && (
            <ul className="mt-5 divide-y divide-line text-sm">
              {(evidence ?? []).map((x) => (
                <li key={x.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{EVIDENCE_KINDS.find((k) => k.id === x.kind)?.label}</span>
                  <span className={x.status === "owner_verified" || x.status === "automated_verified" ? "text-success" : x.status === "rejected" ? "text-danger" : "text-muted"}>
                    {x.status === "submitted" ? "Under review" : x.status === "owner_verified" || x.status === "automated_verified" ? "Verified" : x.status === "needs_info" ? "More information requested" : "Not accepted"}{x.reviewer_note ? ` · ${x.reviewer_note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {mine && (
        <section className="glass mt-6 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="display text-2xl">My verification information</h2>
            <a href="/api/elite/my-data" className="btn btn-ghost btn-sm">Download a copy</a>
          </div>
          <p className="mt-1 text-sm text-muted">Everything we hold about your Elite verification. Only you and our founder can see it; it is never shown to other members.</p>
          {(mine.candidacy?.review_reasons ?? []).length > 0 && (
            <div className="mt-4 rounded-xl border border-line p-3 text-xs"><p className="font-semibold">Why this is with our founder</p><ul className="mt-1 list-disc pl-4 text-muted">{mine.candidacy!.review_reasons.map((x) => <li key={x}>{x}</li>)}</ul></div>
          )}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line p-4 text-sm">
              <p className="font-semibold">Identity</p>
              {mine.identity_verifications.length === 0 ? <p className="mt-1 text-xs text-muted">No identity verification yet.</p> : mine.identity_verifications.map((v, i) => (
                <p key={i} className="mt-1 text-xs text-muted">Stripe Identity · {v.status}{v.meets_minimum_age === false ? " · below minimum age" : v.meets_minimum_age ? " · meets age requirement" : ""} · started {fmtDate(v.started_at)}{v.verified_at ? ` · verified ${fmtDate(v.verified_at)}` : ""}</p>
              ))}
              <p className="mt-2 text-[0.7rem] text-faint">Your ID images and date of birth are held by Stripe, not by us.</p>
            </div>
            <div className="rounded-xl border border-line p-4 text-sm">
              <p className="font-semibold">Bank summaries</p>
              {mine.bank_accounts.length === 0 ? <p className="mt-1 text-xs text-muted">No bank accounts connected.</p> : mine.bank_accounts.map((b) => {
                const w = depositWindow(b);
                return (
                  <div key={b.id} className="mt-2 space-y-0.5 text-xs">
                    <p className="font-semibold">{b.institution ?? "Bank"}{b.last4 ? ` ••${b.last4}` : ""}{b.sandbox ? " · Sandbox" : ""}</p>
                    <p className="text-muted">{OWNERSHIP_LABEL[b.ownership_result]}</p>
                    {b.data_status === "purged" ? <p className="text-muted">Summaries erased.</p> : <>
                      <p className="text-muted">Balance: {cash(b.balance_cents)}{b.balance_as_of ? ` on ${fmtDate(b.balance_as_of)}` : ""} (not net worth)</p>
                      {w && <p className="text-muted">Deposits: {w.text}. {w.caveat}</p>}
                      {b.erase_after && <p className="text-faint">Erased automatically after {fmtDate(b.erase_after)}.</p>}
                    </>}
                  </div>
                );
              })}
            </div>
          </div>
          <ActionForm action={eliteDataRequest} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Request<select name="kind" className="field mt-1 w-full"><option value="correction">Correct something inaccurate</option><option value="access">Access something not shown here</option></select></label>
            <label className="text-sm">About<select name="subject" className="field mt-1 w-full"><option value="identity">Identity</option><option value="bank">Bank summaries</option><option value="evidence">Documents or reviews</option><option value="status">My status</option><option value="other">Other</option></select></label>
            <label className="text-sm sm:col-span-2">Details<textarea name="message" rows={2} maxLength={4000} className="field mt-1 w-full" placeholder="What's inaccurate and what it should say, or what you'd like to receive" /></label>
            <button className="btn btn-ghost btn-sm sm:justify-self-start">Send to our founder</button>
          </ActionForm>
          {mine.data_requests.map((r, i) => <p key={i} className="mt-2 text-xs text-muted">{fmtDate(r.created_at)} · {r.kind === "correction" ? "Correction" : "Access"} ({r.subject}) · {r.status === "open" ? "In progress" : r.status}{r.response ? `: ${r.response}` : ""}</p>)}
          <p className="mt-3 text-[0.7rem] text-faint">You can also replace a document by submitting a corrected one above, or disconnect a bank account to erase its summaries.</p>
        </section>
      )}

      {c && (
        <section className="glass mt-6 p-6">
          <h2 className="display text-2xl">Request a review</h2>
          <p className="mt-1 text-sm text-muted">If something isn&rsquo;t right, or you&rsquo;d like a decision reconsidered, our founder reviews every request personally.</p>
          <ActionForm action={eliteAppeal} className="mt-3 space-y-2">
            <textarea name="message" rows={3} maxLength={4000} className="field w-full" placeholder="What would you like reviewed?" />
            <button className="btn btn-ghost btn-sm">Send privately</button>
          </ActionForm>
          {(appeals ?? []).map((a) => <p key={a.id} className="mt-2 text-xs text-muted">{new Date(a.created_at).toLocaleDateString("en-US")} · {a.status === "open" ? "Under review" : a.status === "upheld" ? "Reconsidered" : "Reviewed"}{a.response ? `: ${a.response}` : ""}</p>)}
        </section>
      )}
      <p className="mt-8 text-center text-xs text-muted">Eligibility never considers race, gender, disability, medical history or counseling participation. Your answers and documents are never shared with Journey, matches, business connections or other members.</p>
    </>
  );
}
