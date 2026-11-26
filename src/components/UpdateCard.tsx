"use client";
import { useState } from "react";

/** Opens Stripe's secure page to update the card on file. */
export function UpdateCard({ label = "Update my card" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    const res = await fetch("/api/membership/payment-method", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) return void (window.location.href = data.url);
    setBusy(false);
    setMsg(data.error ?? "Something went wrong.");
  };
  return (
    <span>
      <button type="button" onClick={go} disabled={busy} className="btn btn-gold btn-sm">{busy ? "Opening…" : label}</button>
      {msg && <span className="ml-3 text-sm text-muted" role="status">{msg}</span>}
    </span>
  );
}
