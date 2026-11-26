"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type StripeJs = { collectFinancialConnectionsAccounts: (o: { clientSecret: string }) => Promise<{ financialConnectionsSession?: { id: string; accounts: unknown[] }; error?: { message?: string } }> };
declare global { interface Window { Stripe?: (pk: string) => StripeJs } }

function loadStripeJs(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Stripe couldn't load."));
    document.head.appendChild(s);
  });
}

/** Express consent, then Stripe's own secure bank connection window. */
export function EliteBankConnect({ consentText, version, enabled, note }: { consentText: string; version: string; enabled: boolean; note?: string }) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const start = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/elite/financial/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ consent: true, version }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Something went wrong.");
      await loadStripeJs();
      const result = await window.Stripe!(d.publishableKey).collectFinancialConnectionsAccounts({ clientSecret: d.clientSecret });
      if (result.error) throw new Error(result.error.message ?? "The connection didn't complete.");
      const id = result.financialConnectionsSession?.id;
      if (!id || !result.financialConnectionsSession?.accounts?.length) throw new Error("No account was connected. You can try again whenever you like.");
      const c = await fetch("/api/elite/financial/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: id }) });
      const cd = await c.json();
      if (!c.ok) throw new Error(cd.error ?? "Something went wrong.");
      setMsg({ ok: true, text: cd.message });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex gap-3 rounded-xl border border-line p-3 text-xs leading-relaxed text-muted">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" disabled={!enabled} />
        <span>{consentText}</span>
      </label>
      <button type="button" onClick={start} disabled={!enabled || !agree || busy} className="btn btn-gold btn-sm">{busy ? "Opening Stripe…" : "Connect a bank account securely"}</button>
      {note && <p className="text-xs text-faint">{note}</p>}
      {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`} role="alert">{msg.text}</p>}
    </div>
  );
}
