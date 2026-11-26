"use client";
import { useState } from "react";

/** Opens Stripe Checkout for expedited verification and shows the exact reason if it can't. */
export function EliteCheckoutButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/elite/expedited", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (d.url) { window.location.href = d.url; return; }
      setMsg(d.error ?? "Checkout couldn't start. Nothing was charged.");
    } catch {
      setMsg("Checkout couldn't start. Please check your connection. Nothing was charged.");
    }
    setBusy(false);
  };
  return (
    <div>
      <button type="button" onClick={go} disabled={busy} className="btn btn-gold btn-sm mt-3">{busy ? "Opening secure checkout…" : "Continue to secure checkout"}</button>
      {msg && <p className="mt-2 text-xs text-danger" role="alert">{msg}</p>}
    </div>
  );
}
