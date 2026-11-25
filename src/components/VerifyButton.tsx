"use client";
import { useState } from "react";

export function VerifyButton({ enabled, label = "Verify my identity" }: { enabled: boolean; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const start = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/identity/start", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMsg(data.error ?? "Something went wrong.");
    } catch {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button type="button" onClick={start} disabled={!enabled || busy} className="btn btn-gold">{busy ? "Opening secure verification…" : label}</button>
      {!enabled && <p className="mt-3 text-sm text-muted">Identity verification opens at launch.</p>}
      {msg && <p className="mt-3 text-sm text-danger" role="alert">{msg}</p>}
    </div>
  );
}
