"use client";
import { useState } from "react";
import { MembershipBuilder } from "@/components/MembershipBuilder";
import type { PricingCatalogue, Selection } from "@/lib/pricing";

/** Builder wired to checkout (new members) or to subscription changes (existing members). */
export function MemberBilling({ catalogue, initial, paymentsOpen, kind, eliteInvited = false, trialAvailable = false }: { catalogue: PricingCatalogue; initial: Selection; paymentsOpen: boolean; kind: "checkout" | "change"; eliteInvited?: boolean; trialAvailable?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmLoss, setConfirmLoss] = useState<{ sel: Selection; losses: string[] } | null>(null);

  const submit = async (sel: Selection, promo: string | null, accepted?: boolean, acknowledgeLoss = false) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(kind === "checkout" ? "/api/checkout" : "/api/membership/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "checkout" ? { kind: "member", selection: sel, promo: promo ?? undefined, accept: accepted === true } : { ...sel, acknowledgeLoss }),
      });
      const data = await res.json();
      if (res.status === 409 && Array.isArray(data.losses)) return setConfirmLoss({ sel, losses: data.losses });
      if (!res.ok) return setMsg(data.error ?? "Something went wrong.");
      if (data.url) window.location.href = data.url;
      else setMsg(`Your membership is now ${data.tier}. Changes appear in a moment.`);
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div aria-busy={busy}>
      {!paymentsOpen && (
        <p className="mb-8 rounded-2xl border border-champagne/50 bg-champagne/10 px-5 py-4 text-sm text-gold">
          Membership payments open soon. You can review your selection now; you’ll be able to complete it at launch.
        </p>
      )}
      <MembershipBuilder catalogue={catalogue} initial={initial} enrollmentOpen={paymentsOpen} mode={kind} onChangeSubmit={submit} eliteInvited={eliteInvited} trialAvailable={kind === "checkout" && trialAvailable} />
      {confirmLoss && (
        <div role="alertdialog" aria-labelledby="loss-title" className="mt-6 rounded-2xl border border-gold/40 bg-gold/5 p-5 text-sm">
          <p id="loss-title" className="font-semibold">This isn&rsquo;t a level up.</p>
          <p className="mt-1">It would remove {confirmLoss.losses.join(", ")}. Your history, progress and records always stay with you.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-gold btn-sm" onClick={() => setConfirmLoss(null)}>Keep my current membership</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const s = confirmLoss.sel; setConfirmLoss(null); void submit(s, null, undefined, true); }}>I understand, make this change</button>
          </div>
        </div>
      )}
      {msg && <p className="mt-6 text-center text-sm" role="status">{msg}</p>}
    </div>
  );
}
