import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOC_CATEGORIES } from "@/lib/connect360";
import { APP_STATUS, ASSESSMENT, COMM_KINDS, EVIDENCE_REQUIRED, FUNDING_NOTICE, POSITION_LABEL, POSITION_STATUS, PROJECT_KINDS, STAGES, summarize, usd, type Line } from "@/lib/funding";
import { MemberForm } from "@/components/MemberForm";
import { addPosition, addScenario, saveApplication, saveAssessment, saveCommunication, setCommunicationStatus, withdrawPosition } from "@/app/actions/funding";

export const metadata = { title: "Funding project · CONNECT 360" };
export const dynamic = "force-dynamic";

const dollars = (c: number | null) => (c === null ? "—" : usd(c / 100));

/** One private funding project: assessment, capital strategy, funding positions, readiness, applications and lender messages. */
export default async function FundingProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  const b = (await createClient())!.schema("business");
  const { data: p } = await b.from("funding_projects").select("*").eq("id", id).maybeSingle();
  if (!p || p.user_id !== viewer.id) notFound();
  const [{ data: scenarios }, { data: positions }, { data: apps }, { data: comms }, { data: rooms }, { data: docs }] = await Promise.all([
    b.from("funding_scenarios").select("*").eq("project_id", id).order("created_at"),
    b.from("funding_positions").select("*").eq("project_id", id).order("created_at"),
    b.from("funding_applications").select("*").eq("project_id", id).order("created_at"),
    b.from("funding_communications").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    b.from("room_participants").select("room_id, deal_rooms(title)").eq("user_id", viewer.id).eq("status", "active"),
    b.from("room_documents").select("id, title, category").eq("uploaded_by", viewer.id).in("category", ["proof_of_funds", "lender_correspondence", "conditional_approval", "commitment_letter", "disbursement_confirmation", "financing_document"]),
  ]);
  const a = (p.assessment ?? {}) as Record<string, { value: string }>;
  const activePos = (positions ?? []).filter((x) => x.status !== "withdrawn");
  const byCat = (cat: string) => activePos.filter((x) => x.category === cat && (cat === "declared" || cat === "committed" || x.status === "verified")).reduce((n, x) => n + Number(x.amount_cents), 0);
  const roomList = ((rooms ?? []) as unknown as { room_id: string; deal_rooms: { title: string } | null }[]).filter((r) => r.deal_rooms);
  const docOptions = (docs ?? []) as { id: string; title: string; category: string }[];
  const readiness = [
    { label: "Funding assessment complete", done: (p.missing ?? []).length === 0 && Object.keys(a).length > 0 },
    { label: "At least one capital scenario", done: (scenarios ?? []).length > 0 },
    { label: "Owner contribution recorded", done: byCat("declared") + byCat("committed") > 0 },
    { label: "Verified balance or approved financing on file", done: byCat("verified_balance") + byCat("approved_financing") > 0 },
    { label: "Supporting documents in a Deal Room vault", done: docOptions.length > 0 },
    { label: "A financing option being tracked", done: (apps ?? []).length > 0 },
  ];

  return (
    <>
      <Link href="/app/connect360/funding" className="text-sm text-gold">← Capital & Funding Intelligence Center</Link>
      <section className="theme-dark relative mt-4 overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10" style={{ background: "var(--ink)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--glow)" }} aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow">{PROJECT_KINDS[p.kind]} · {STAGES[p.stage]}</p>
          <h1 className="display mt-3 text-4xl text-gold-bright sm:text-5xl">{p.title}</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {(["declared", "committed", "verified_balance", "approved_financing"] as const).map((k) => (
              <div key={k} className="rounded-2xl border border-[var(--champagne)]/30 bg-white/[0.04] p-4"><p className="text-xs text-muted">{POSITION_LABEL[k]}</p><p className="display mt-1 text-2xl text-gold">{dollars(byCat(k))}</p></div>
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">These four are always kept separate. Income or net worth never counts as proof that you can afford an opportunity.</p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <details className="glass p-6" open={Object.keys(a).length === 0}>
            <summary className="cursor-pointer display text-2xl">Funding assessment</summary>
            <p className="mt-1 text-xs text-muted">Confidential and self-reported. Approximate answers are fine. Never enter account numbers or Social Security numbers.</p>
            <MemberForm action={saveAssessment} className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              {ASSESSMENT.map((q) => <label key={q.key} className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">{q.label}</span><textarea name={q.key} rows={2} className="field w-full" defaultValue={a[q.key]?.value ?? ""} placeholder={q.hint} /></label>)}
              <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">Link a Deal Room (optional)</span>
                <select name="room" className="field w-full" defaultValue={p.room_id ?? ""}><option value="">None</option>{roomList.map((r) => <option key={r.room_id} value={r.room_id}>{r.deal_rooms!.title}</option>)}</select></label>
              <button className="btn btn-gold btn-sm sm:col-span-2 sm:w-fit">Save assessment</button>
            </MemberForm>
            {(p.missing ?? []).length > 0 && Object.keys(a).length > 0 && <p className="mt-3 text-xs text-gold">Still open: {(p.missing as string[]).join(", ")}.</p>}
          </details>

          <section className="glass p-6">
            <h2 className="display text-2xl">Capital strategy scenarios</h2>
            <div className="mt-4 space-y-4">
              {(scenarios ?? []).map((s) => {
                const sum = summarize(s.uses as Line[], s.sources as Line[]);
                return (
                  <div key={s.id} className="rounded-2xl border border-line p-4 text-sm">
                    <p className="font-semibold">{s.name}</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div><p className="text-xs uppercase tracking-[0.12em] text-muted">Uses of funds</p>{(s.uses as Line[]).map((l, i) => <p key={i} className="flex justify-between"><span>{l.label}</span><span>{usd(l.amount)}</span></p>)}</div>
                      <div><p className="text-xs uppercase tracking-[0.12em] text-muted">Sources</p>{(s.sources as Line[]).map((l, i) => <p key={i} className="flex justify-between gap-2"><span>{l.label}{l.rate !== undefined ? ` (${l.rate}% · ${l.months} mo, estimate)` : ""}</span><span>{usd(l.amount)}</span></p>)}</div>
                    </div>
                    <p className="mt-3 text-xs text-muted">Total cost {usd(sum.totalUses)} · sources {usd(sum.totalSources)} · <span className={sum.gap > 0 ? "text-gold" : ""}>{sum.gap > 0 ? `remaining need ${usd(sum.gap)}` : "fully covered"}</span>{sum.monthly > 0 ? ` · est. monthly payments ${usd(sum.monthly)} · est. interest ${usd(sum.interest)}` : ""}</p>
                  </div>
                );
              })}
            </div>
            <MemberForm action={addScenario} className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
              <input type="hidden" name="id" value={id} />
              <input name="name" className="field" placeholder="Scenario name, e.g. Owner capital plus a term loan" required />
              <div className="grid gap-2 sm:grid-cols-2">
                <textarea name="uses" rows={4} className="field" placeholder={"Uses of funds, one per line:\nEquipment | 80000\nWorking capital | 20000"} required />
                <textarea name="sources" rows={4} className="field" placeholder={"Sources, one per line (rate % and months for financing):\nOwner capital | 30000\nTerm loan | 60000 | 9 | 84"} />
              </div>
              <button className="btn btn-gold btn-sm w-fit">Add scenario</button>
            </MemberForm>
          </section>

          <section className="glass p-6">
            <h2 className="display text-2xl">Financing applications</h2>
            <ul className="mt-4 space-y-3">
              {(apps ?? []).map((x) => (
                <li key={x.id} className="rounded-2xl border border-line p-4 text-sm">
                  <p className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{x.provider_name}{x.product ? ` · ${x.product}` : ""}</span><span className="chip normal-case tracking-normal">{APP_STATUS[x.status]}</span></p>
                  {x.amount_requested_cents && <p className="text-xs text-muted">Requested {dollars(Number(x.amount_requested_cents))}</p>}
                  <MemberForm action={saveApplication} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="id" value={id} /><input type="hidden" name="application" value={x.id} />
                    <select name="status" className="field !py-1 text-xs" defaultValue={x.status}>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <select name="evidence" className="field !py-1 text-xs" defaultValue={x.evidence_document_id ?? ""}><option value="">Evidence (needed for approved or funded)</option>{docOptions.map((d) => <option key={d.id} value={d.id}>{DOC_CATEGORIES[d.category]}: {d.title}</option>)}</select>
                    <button className="btn btn-ghost btn-sm">Update</button>
                  </MemberForm>
                </li>
              ))}
            </ul>
            <MemberForm action={saveApplication} className="mt-4 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
              <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="researching" />
              <input name="provider" className="field" placeholder="Lender or program" required />
              <input name="product" className="field" placeholder="Product, e.g. SBA 7(a) loan" />
              <input name="amount" className="field" placeholder="Amount you may request" inputMode="decimal" />
              <input name="url" className="field" placeholder="Official website (https://…)" />
              <button className="btn btn-gold btn-sm w-fit">Track this option</button>
            </MemberForm>
            <p className="mt-2 text-xs text-faint">Nothing is submitted for you. {Object.entries(EVIDENCE_REQUIRED).map(([k, v]) => `${APP_STATUS[k]} requires ${v}.`).join(" ")}</p>
          </section>

          <section className="glass p-6">
            <h2 className="display text-2xl">Lender messages</h2>
            <p className="mt-1 text-xs text-muted">Prepare messages here, then send them yourself from your own email. Nothing is sent automatically, and no credit application or financial information is ever submitted for you.</p>
            <ul className="mt-4 space-y-3">
              {(comms ?? []).map((m) => (
                <li key={m.id} className="rounded-2xl border border-line p-4 text-sm">
                  <p className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{m.subject}</span><span className="text-xs text-muted">{COMM_KINDS[m.kind]} · to {m.recipient} · {m.status === "draft" ? "Draft" : m.status === "authorized" ? "Approved by you" : m.status === "sent_by_member" ? "Sent by you" : "Archived"}</span></p>
                  <p className="mt-2 whitespace-pre-line text-muted">{m.body}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    {m.status === "draft" && <MemberForm action={setCommunicationStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="comm" value={m.id} /><input type="hidden" name="status" value="authorized" /><button className="text-gold underline">Approve</button></MemberForm>}
                    {m.status === "authorized" && <MemberForm action={setCommunicationStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="comm" value={m.id} /><input type="hidden" name="status" value="sent_by_member" /><button className="text-gold underline">I sent this</button></MemberForm>}
                  </div>
                </li>
              ))}
            </ul>
            <MemberForm action={saveCommunication} className="mt-4 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              <select name="kind" className="field" defaultValue="inquiry">{Object.entries(COMM_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input name="recipient" className="field" placeholder="Lender or program" required />
              <input name="subject" className="field sm:col-span-2" placeholder="Subject" required />
              <textarea name="body" rows={5} className="field sm:col-span-2" placeholder="Your message" required />
              <button className="btn btn-gold btn-sm w-fit">Save draft</button>
            </MemberForm>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <section className="glass p-6 text-sm">
            <p className="eyebrow">Funding readiness</p>
            <ul className="mt-3 space-y-2">{readiness.map((r) => <li key={r.label} className="flex gap-2"><span className={r.done ? "text-success" : "text-faint"}>{r.done ? "✓" : "○"}</span>{r.label}</li>)}</ul>
            <p className="mt-3 text-xs text-faint">Document readiness only. It isn&apos;t a prediction of eligibility or approval.</p>
          </section>
          <section className="glass p-6 text-sm">
            <p className="eyebrow">Funds</p>
            <ul className="mt-3 space-y-2">
              {activePos.map((x) => <li key={x.id} className="flex items-start justify-between gap-2"><span>{POSITION_LABEL[x.category]}<span className="block text-xs text-muted">{dollars(Number(x.amount_cents))} · {POSITION_STATUS[x.status]}</span></span>
                <MemberForm action={withdrawPosition}><input type="hidden" name="id" value={id} /><input type="hidden" name="position" value={x.id} /><button className="text-xs text-muted underline">Withdraw</button></MemberForm></li>)}
              {!activePos.length && <li className="text-muted">Nothing recorded yet.</li>}
            </ul>
            <MemberForm action={addPosition} className="mt-4 space-y-2 border-t border-line pt-4">
              <input type="hidden" name="id" value={id} />
              <select name="category" className="field w-full" defaultValue="declared">{Object.entries(POSITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input name="amount" className="field w-full" placeholder="Amount" inputMode="decimal" required />
              <select name="method" className="field w-full" defaultValue="lender_letter"><option value="lender_letter">Evidence: lender letter</option><option value="professional_letter">Evidence: professional (CPA or attorney) letter</option></select>
              <select name="document" className="field w-full" defaultValue=""><option value="">Evidence document (for verified or approved)</option>{docOptions.map((d) => <option key={d.id} value={d.id}>{DOC_CATEGORIES[d.category]}: {d.title}</option>)}</select>
              <label className="flex gap-2 text-xs"><input type="checkbox" name="attest" />For committed funds: these funds are set aside for this project.</label>
              <button className="btn btn-gold btn-sm">Record</button>
            </MemberForm>
            <p className="mt-2 text-xs text-faint">Verified balances and approved financing are reviewed before they show as verified. Bank verification is coming once Stripe approves it.</p>
          </section>
          <p className="text-xs text-faint">{FUNDING_NOTICE}</p>
        </aside>
      </div>
    </>
  );
}
