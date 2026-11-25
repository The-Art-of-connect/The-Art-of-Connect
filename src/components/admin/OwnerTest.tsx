"use client";
import { useState } from "react";

/** Owner's private Journey test. Uses the separate owner testing budget, never a member allowance. */
export function OwnerTest() {
  const [mode, setMode] = useState("life");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!msg.trim()) return;
    setBusy(true);
    setOut(null);
    const res = await fetch("/api/journey/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, message: msg, ownerTest: true, requestKey: crypto.randomUUID().replace(/-/g, "") }) });
    const d = await res.json().catch(() => null);
    setOut(d?.ok ? d.reply : `Not sent: ${d?.message ?? "unknown error"}`);
    setBusy(false);
  }
  return (
    <div className="space-y-3 p-5">
      <div className="flex flex-wrap gap-2">
        {["life", "love", "business", "concierge"].map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-3 py-1 text-xs capitalize ${mode === m ? "bg-gold text-espresso" : "border border-line-strong text-muted"}`}>{m}</button>
        ))}
      </div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="field w-full" placeholder="Try a fictional scenario, e.g. 'My partner wants a night alone and I feel rejected.'" />
      <button type="button" onClick={run} disabled={busy} className="btn btn-gold btn-sm">{busy ? "Journey is reflecting…" : "Test privately"}</button>
      {out && <p className="whitespace-pre-wrap rounded-xl border border-line bg-ink-2 p-4 text-sm">{out}</p>}
      <p className="text-xs text-faint">Use fictional scenarios only — never real member information. Test replies are saved to your test history.</p>
    </div>
  );
}
