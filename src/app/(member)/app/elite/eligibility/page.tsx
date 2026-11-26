import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { EliteBadge } from "@/components/EliteBadge";
import { eliteAcceptInvitation, eliteAppeal, eliteScreen, eliteSubmitEvidence } from "@/app/actions/elite";
import { ELITE_QUALIFICATIONS, ELITE_STATUS_LABEL, ELITE_TAGLINE, EVIDENCE_KINDS, usd, type Thresholds } from "@/lib/elite";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Elite eligibility" };

type Eval = { candidate: boolean; pathway: string | null; status: string | null; age: boolean; standing: boolean; identity: boolean; qualification: boolean;
  months: number; min_months: number; answers: number; min_answers: number; progression: boolean; fee: boolean; expedited_available: boolean; invitation_expires_at: string | null };

/** Private: a member's own Elite eligibility. No ranking, no pressure, nothing charged here. */
export default async function EliteEligibility() {
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const [{ data: ev }, { data: s }, { data: c }] = await Promise.all([
    preview ? Promise.resolve({ data: null }) : supabase.rpc("elite_evaluate"),
    supabase.from("elite_settings").select("thresholds, min_membership_months, min_discovery_answers, progression_approved, expedited_fee_cents, expedited_fee_active").maybeSingle(),
    preview ? Promise.resolve({ data: null }) : supabase.from("elite_candidates").select("id, status, pathway, qualification, invitation_expires_at").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const e = ev as Eval | null;
  const [{ data: evidence }, { data: appeals }] = c
    ? await Promise.all([
        supabase.from("elite_evidence").select("id, kind, status, reviewer_note, created_at").eq("candidate_id", c.id).order("created_at", { ascending: false }),
        supabase.from("elite_appeals").select("id, status, response, created_at").eq("candidate_id", c.id).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const t = (s?.thresholds ?? {}) as Thresholds;
  const status = c?.status ?? "not_started";
  const canSubmit = c && ["preliminary", "verification_pending", "info_required", "manual_review", "owner_verified", "automated_verified", "qualification_approved"].includes(status);
  const check = (done: boolean, label: string, hint?: string) => (
    <li className="flex gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${done ? "bg-[#e8701a] text-white" : "border border-[#c9a96e]/60"}`}>{done ? "✓" : ""}</span>
      <span><span className={done ? "text-muted" : "font-semibold"}>{label}</span>{hint && <span className="block text-xs text-faint">{hint}</span>}</span></li>
  );

  return (
    <>
      <section className="theme-dark relative overflow-hidden rounded-[28px] px-6 py-10 text-center sm:px-12" style={{ background: "#1b1310" }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgb(232_112_26/0.14),transparent_70%)]" aria-hidden="true" />
        <p className="relative flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-[#f0c98a]"><EliteBadge size={16} interactive={false} /><span>Elite Concierge · By Invitation Only</span></p>
        <h1 className="display relative mt-4 text-4xl text-[#f6e7c8] sm:text-5xl">My Elite eligibility</h1>
        <p className="display relative mt-2 text-xl italic text-[#e8892b]">{ELITE_TAGLINE}</p>
        <p className="relative mx-auto mt-4 max-w-xl text-sm text-[#f5ecdf]/75">Private to you. Explore at your own pace: there&rsquo;s no obligation, nothing is charged here, and members are never ranked.</p>
        <p className="relative mt-4 inline-block rounded-full border border-[#c9a96e]/50 px-4 py-1 text-xs text-[#f0c98a]">Status: {ELITE_STATUS_LABEL[status] ?? status}</p>
      </section>

      {preview && <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm text-gold">Preview: sign in as a member (or a test account in an owner testing session) to try eligibility.</p>}

      {status === "invitation_issued" && (
        <ActionForm action={eliteAcceptInvitation} className="mt-8 rounded-[24px] border-2 border-[#e8892b]/60 bg-[#e8892b]/5 p-6 text-center">
          <p className="display text-3xl">You&rsquo;re invited to the Elite Concierge Society.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">Accepting doesn&rsquo;t charge anything. Afterwards, you may choose Elite Concierge in Membership &amp; billing whenever you&rsquo;re ready.{e?.invitation_expires_at ? ` This invitation is open until ${new Date(e.invitation_expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` : ""}</p>
          <button className="btn btn-gold mt-5">Accept my invitation</button>
        </ActionForm>
      )}
      {(status === "invitation_accepted") && (
        <div className="mt-8 rounded-[24px] border border-[#e8892b]/50 p-6 text-center">
          <p className="display text-2xl">Invitation accepted.</p>
          <Link href="/app/membership" className="btn btn-gold mt-4">Choose Elite Concierge in Membership &amp; billing</Link>
        </div>
      )}
      {status === "membership_activated" && <p className="mt-8 text-center"><Link href="/app/elite" className="btn btn-gold">Enter the Elite Concierge Society</Link></p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="glass p-6">
          <h2 className="display text-2xl">1 · Private preliminary questions</h2>
          <p className="mt-1 text-sm text-muted">Choose the one pathway that best describes you. We don&rsquo;t ask for, or keep, amounts here.</p>
          <ActionForm action={eliteScreen} className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              {ELITE_QUALIFICATIONS.map((q) => {
                const th = q.threshold ? t[q.threshold] : null;
                return (
                  <label key={q.id} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-[#e8892b]">
                    <input type="radio" name="qualification" value={q.id} defaultChecked={c?.qualification === q.id} required className="mt-1" />
                    <span><span className="font-semibold">{q.label}</span><span className="block text-xs text-muted">{q.detail}{th ? (th.approved ? ` Threshold: ${usd(th.amount)}.` : " Threshold being finalized.") : ""}</span></span>
                  </label>
                );
              })}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold">Do you believe you meet this pathway today?</legend>
              <div className="mt-2 flex gap-4 text-sm"><label><input type="radio" name="meets" value="yes" required /> Yes</label><label><input type="radio" name="meets" value="no" /> Not yet</label></div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold">How would you like to proceed?</legend>
              <label className="mt-2 flex gap-2 text-sm"><input type="radio" name="pathway" value="earned" defaultChecked={c?.pathway !== "expedited"} /> Through my membership journey (complimentary)</label>
              <label className="mt-1 flex gap-2 text-sm"><input type="radio" name="pathway" value="expedited" defaultChecked={c?.pathway === "expedited"} /> Expedited verification, if I qualify</label>
            </fieldset>
            <button className="btn btn-gold btn-sm" disabled={preview || ["invitation_issued", "invitation_accepted", "membership_activated", "revoked"].includes(status)}>Save privately</button>
          </ActionForm>
        </section>

        <section className="glass p-6">
          <h2 className="display text-2xl">2 · Your progress</h2>
          {e ? (
            <ul className="mt-4 space-y-3 text-sm">
              {check(e.identity, "Identity verified", "Government-issued identity, verified privately.")}
              {check(e.qualification, "Qualification verified", "Your chosen pathway, verified from your documents or an approved method.")}
              {check(e.age && e.standing, "Membership in good standing")}
              {e.pathway === "earned" && check(e.progression, "Membership milestones", `${e.months} of ${e.min_months} months of membership · ${e.answers} of ${e.min_answers} personal discoveries${s?.progression_approved ? "" : " (milestones being finalized)"}`)}
              {e.pathway === "expedited" && check(e.fee, "Expedited verification", s?.expedited_fee_active ? `One-time ${usd((s.expedited_fee_cents ?? 0) / 100)}, offered only after preliminary screening. It purchases faster verification, never admission.` : "Not yet available: the expedited verification service is awaiting final approval.")}
              {check(["invitation_issued", "invitation_accepted", "membership_activated"].includes(status), "Invitation issued")}
            </ul>
          ) : <p className="mt-3 text-sm text-muted">Answer the preliminary questions to see your progress.</p>}
          {e && !e.identity && <p className="mt-4 text-xs text-muted">Identity verification can be completed in <Link href="/app/verify" className="text-gold underline">Identity verification</Link> when available, or by submitting your identity below for private review.</p>}
        </section>
      </div>

      {canSubmit && (
        <section className="glass mt-6 p-6">
          <h2 className="display text-2xl">3 · Private verification</h2>
          <p className="mt-1 text-sm text-muted">Share only what&rsquo;s needed. Documents are stored privately, visible only to our founder, and deleted after review where possible. We keep verification results rather than complete financial records.</p>
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
