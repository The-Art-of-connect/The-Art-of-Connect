import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMABLE, PROVIDER_LABEL, canCancel, orderStatus } from "@/lib/formation";
import { MemberForm } from "@/components/MemberForm";
import { cancelFormationOrder, sendFormationRequest, updateFormationDraft } from "@/app/actions/formation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Formation request · Business Launch Center" };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : null);

/** Review a formation order, send it as a request, follow its status, or cancel it before processing begins. */
export default async function FormationOrder({ params }: { params: Promise<{ id: string }> }) {
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = (await createClient())!;
  const { data: o } = await db.from("formation_orders")
    .select("id, status, provider, requested_at, status_note, created_at, updated_at, member_businesses(name, entity_type, state)")
    .eq("id", id).eq("user_id", viewer.id).maybeSingle();
  if (!o) notFound();
  const b = o.member_businesses as unknown as { name: string; entity_type: string; state: string | null } | null;
  const { data: j } = b?.state ? await db.from("formation_jurisdictions").select("name, filing_office, filing_office_url").eq("code", b.state).maybeSingle() : { data: null };
  const st = orderStatus(o);
  const draft = o.status === "draft" && !o.requested_at;

  return (
    <>
      <Link href="/app/launch/orders" className="text-sm font-semibold text-gold">← My formation requests</Link>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Business Launch Center · formation request</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{b?.name ?? "My business"}</h1>
        </div>
        <span className={`chip ${st.tone === "done" ? "chip-live" : st.tone === "closed" ? "chip-locked" : ""}`} role="status">{st.label}</span>
      </header>
      <p className="mt-5 max-w-3xl rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm" role="note">
        <span className="font-semibold">This is a request, reviewed by our team before anything is filed or charged.</span> No payment is taken here and nothing is filed automatically.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="details" className="glass p-6">
          <h2 id="details" className="display text-2xl">{draft ? "Review your details" : "What you sent"}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Business name</dt><dd className="font-semibold">{b?.name}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Type</dt><dd className="font-semibold">{FORMABLE[b?.entity_type ?? ""] ?? b?.entity_type}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">State</dt><dd className="font-semibold">{j?.name ?? b?.state}</dd></div>
            {j?.filing_office && <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Filing office</dt><dd className="text-right">{j.filing_office_url ? <a href={j.filing_office_url} target="_blank" rel="noreferrer" className="text-gold underline">{j.filing_office} ↗</a> : j.filing_office}</dd></div>}
            <div><dt className="text-muted">How you&apos;d like it filed</dt><dd className="mt-1 font-semibold">{PROVIDER_LABEL[o.provider] ?? o.provider}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Started</dt><dd>{fmt(o.created_at)}</dd></div>
            {o.requested_at && <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Sent for review</dt><dd>{fmt(o.requested_at)}</dd></div>}
          </dl>
          {draft && (
            <MemberForm action={updateFormationDraft} className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <input type="hidden" name="id" value={o.id} />
              <fieldset><legend className="font-semibold">Change how you&apos;d like it filed</legend>
                <div className="mt-2 space-y-2">{Object.entries(PROVIDER_LABEL).map(([k, v]) => <label key={k} className="flex items-start gap-2"><input type="radio" name="provider" value={k} defaultChecked={o.provider === k} className="mt-1" /> {v}</label>)}</div>
              </fieldset>
              <button className="btn btn-ghost btn-sm">Save</button>
            </MemberForm>
          )}
          {draft && <p className="mt-3 text-xs text-muted">To change the name, type or state, cancel this draft and start a new one.</p>}
        </section>

        <section aria-labelledby="next" className="glass p-6">
          <h2 id="next" className="display text-2xl">Next step</h2>
          {draft ? (
            <MemberForm action={sendFormationRequest} className="mt-3 space-y-3 text-sm">
              <input type="hidden" name="id" value={o.id} />
              <p className="text-muted">When your details look right, send them to our team. We review every request before anything is filed or charged, and we&apos;ll notify you as its status changes.</p>
              <label className="flex items-start gap-2"><input type="checkbox" name="understand" required className="mt-1" /> I understand this is a request: nothing is filed or charged until it has been reviewed and I agree.</label>
              <button className="btn btn-gold">Send my request</button>
            </MemberForm>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-muted">{o.status === "draft" ? "Our team is reviewing your request. You'll be notified when its status changes." : st.tone === "closed" ? "This request is closed." : st.tone === "done" ? "This request is complete." : "Our team is working on your request. You'll be notified as its status changes."}</p>
              {o.status_note && <div className="rounded-xl border border-line p-4"><p className="font-semibold">Note from our team</p><p className="mt-1 whitespace-pre-line text-muted">{o.status_note}</p></div>}
            </div>
          )}
          {canCancel(o) && (
            <MemberForm action={cancelFormationOrder} className="mt-5 border-t border-line pt-4">
              <input type="hidden" name="id" value={o.id} />
              <button className="btn btn-ghost btn-sm">{draft ? "Discard this draft" : "Cancel this request"}</button>
              <p className="mt-1 text-xs text-muted">You can cancel until our team begins processing it.</p>
            </MemberForm>
          )}
          <p className="mt-5 text-xs text-muted">Prefer to file yourself? Your state&apos;s official links are in the <Link href={`/app/launch${b?.state ? `?state=${b.state}` : ""}`} className="text-gold underline">Business Launch Center</Link>.</p>
        </section>
      </div>
    </>
  );
}
