"use client";
import { useState } from "react";

export function CancelMembership({ cancelling }: { cancelling: boolean }) {
  const [state, setState] = useState(cancelling);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const go = async (resume: boolean) => {
    if (!resume && !window.confirm("Cancel your membership at the end of this billing period? You keep access until then.")) return;
    setBusy(true);
    const res = await fetch("/api/membership/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resume }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error ?? "Something went wrong.");
    setState(Boolean(data.cancelAtPeriodEnd));
    setMsg(data.cancelAtPeriodEnd ? "Your membership will end at the close of this billing period." : "Your membership will continue.");
  };
  return (
    <div className="mt-6">
      {state ? (
        <button type="button" onClick={() => go(true)} disabled={busy} className="btn btn-gold btn-sm">Keep my membership</button>
      ) : (
        <button type="button" onClick={() => go(false)} disabled={busy} className="btn btn-ghost btn-sm">Cancel membership</button>
      )}
      {msg && <p className="mt-2 text-sm text-muted" role="status">{msg}</p>}
    </div>
  );
}
