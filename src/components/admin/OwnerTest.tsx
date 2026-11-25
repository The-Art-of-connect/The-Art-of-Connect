"use client";
import { useRef, useState } from "react";

type Turn = { who: "you" | "journey" | "note"; text: string };

/** Owner's private Journey conversation. Uses the separate owner testing budget, never a member allowance. */
export function OwnerTest() {
  const [mode, setMode] = useState("life");
  const [msg, setMsg] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const conversation = useRef<string | null>(null);

  async function run() {
    const text = msg.trim();
    if (!text || busy) return;
    setBusy(true);
    setMsg("");
    setTurns((t) => [...t, { who: "you", text }]);
    const res = await fetch("/api/journey/message", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, message: text, ownerTest: true, conversationId: conversation.current, requestKey: crypto.randomUUID().replace(/-/g, "") }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) {
      conversation.current = d.conversationId ?? conversation.current;
      setTurns((t) => [...t, { who: "journey", text: d.reply }]);
    } else setTurns((t) => [...t, { who: "note", text: `Not sent: ${d?.message ?? "unknown error"}` }]);
    setBusy(false);
  }
  const reset = () => { conversation.current = null; setTurns([]); };

  return (
    <div className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {["life", "love", "business", "concierge"].map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); reset(); }} className={`rounded-full px-3 py-1 text-xs capitalize ${mode === m ? "bg-gold text-espresso" : "border border-line-strong text-muted"}`}>{m}</button>
        ))}
        {turns.length > 0 && <button type="button" onClick={reset} className="ml-auto text-xs text-gold underline">New conversation</button>}
      </div>
      {turns.length > 0 && (
        <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-xl border border-line bg-ink-2 p-4 text-sm">
          {turns.map((t, i) => (
            <p key={i} className={`whitespace-pre-wrap ${t.who === "you" ? "ml-8 rounded-xl bg-champagne/15 p-3" : t.who === "journey" ? "mr-8" : "text-xs text-danger"}`}>
              {t.who === "journey" && <span className="mb-1 block text-xs font-semibold text-gold">Journey</span>}{t.text}
            </p>
          ))}
          {busy && <p className="text-xs text-muted">Journey is reflecting…</p>}
        </div>
      )}
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }} rows={3} className="field w-full" placeholder="Try a fictional scenario, e.g. ‘My partner wants a night alone and I feel rejected.’" />
      <button type="button" onClick={run} disabled={busy || !msg.trim()} className="btn btn-gold btn-sm">{busy ? "Journey is reflecting…" : turns.length ? "Reply" : "Test privately"}</button>
      <p className="text-xs text-faint">Private to you and drawn from your owner testing budget. Use fictional scenarios — never real member information.</p>
    </div>
  );
}
