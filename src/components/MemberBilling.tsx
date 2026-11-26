"use client";
import { useState } from "react";
import { MembershipBuilder } from "@/components/MembershipBuilder";
import type { PricingCatalogue, Selection } from "@/lib/pricing";

/** Builder wired to checkout (new members) or to subscription changes (existing members). */
export function MemberBilling({ catalogue, initial, paymentsOpen, kind, eliteInvited = false }: { catalogue: PricingCatalogue; initial: Selection; paymentsOpen: boolean; kind: "checkout" | "change"; eliteInvited?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (sel: Selection, promo: string | null, accepted?: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(kind === "checkout" ? "/api/checkout" : "/api/membership/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "checkout" ? { kind: "member", selection: sel, promo: promo ?? undefined, accept: accepted === true } : sel),
      });
      const data = await res.json();
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
      <MembershipBuilder catalogue={catalogue} initial={initial} enrollmentOpen={paymentsOpen} mode={kind} onChangeSubmit={submit} eliteInvited={eliteInvited} />
      {msg && <p className="mt-6 text-center text-sm" role="status">{msg}</p>}
    </div>
  );
}
