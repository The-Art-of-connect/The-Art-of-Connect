"use client";
import { useActionState, useState } from "react";
import { summarizeSession } from "@/app/actions/journey-member";

/** A focused, time-limited Private Session conversation, with an optional private summary at the end. */
export function SessionRoom({ sessionId, endsAt }: { sessionId: string; endsAt: string | null }) {
  const [turns, setTurns] = useState<{ role: "member" | "journey"; text: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [needsMore, setNeedsMore] = useState(false);
  const [balance, setBalance] = useState<{ left: number; notice: number | null } | null>(null);
  const [sumState, summarize, summarizing] = useActionState(summarizeSession, null);
  async function send() {
    const m = text.trim();
    if (!m || busy) return;
    setBusy(true); setNote(null); setText("");
    setTurns((t) => [...t, { role: "member", text: m }]);
    const r = await fetch("/api/journey/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "life", message: m, sessionId, requestKey: crypto.randomUUID().replace(/-/g, "") }) }).then((x) => x.json()).catch(() => null);
    if (r?.allowance) setBalance({ left: r.allowance.remaining + r.allowance.purchasedRemaining, notice: r.allowance.notice });
    if (r?.ok) { setTurns((t) => [...t, { role: "journey", text: r.reply }]); setNeedsMore(false); }
    else { setTurns((t) => t.slice(0, -1)); setText(m); setNote(r?.message ?? "Journey couldn't reply just now."); setNeedsMore(r?.status === 402 || /add messages/i.test(r?.message ?? "")); }
    setBusy(false);
  }
  const notes = turns.map((t) => `${t.role === "member" ? "Member" : "Journey"}: ${t.text}`).join("\n").slice(-12000);
  return (
    <div className="theme-dark overflow-hidden rounded-[1.75rem] border border-gold/25" style={{ background: "var(--ink)" }}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs text-gold">
        <span>Private Session · Journey · AI</span>
        <span>{endsAt ? `Ends ${new Date(endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Your time begins with your first message"}{balance ? ` · ${balance.left} messages available` : ""}</span>
      </div>
      <div className="min-h-48 space-y-3 px-5 py-5" aria-live="polite">
        {turns.map((t, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${t.role === "member" ? "ml-auto bg-gold/15 text-ivory" : "border border-line bg-white/5 text-ivory/95"}`}>{t.text}</p>
        ))}
        {busy && <p className="text-xs text-gold">Journey is reflecting…</p>}
        {balance?.notice && balance.notice < 100 && !note && (
          <p className="rounded-xl border border-gold/30 px-3 py-2 text-xs text-gold-bright">You&rsquo;ve used {balance.notice}% of this month&rsquo;s included messages. {balance.left} left. One is always kept for your closing summary.</p>
        )}
        {note && (
          <div className="rounded-xl border border-gold/30 px-3 py-2 text-sm text-gold-bright">
            <p>{note}</p>
            {needsMore && <a href="/app/journey/plus" className="mt-2 inline-block text-xs underline">Add messages (optional, only with your approval)</a>}
          </div>
        )}
        <p className="text-[0.7rem] text-ivory/50">If you need help right now: call 911 or call or text 988. Always free, no messages used.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-line p-4">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000} className="field flex-1" placeholder="Begin when you're ready…" aria-label="Message" />
        <button className="btn btn-gold btn-sm self-end" disabled={busy || !text.trim()}>Send</button>
      </form>
      <form action={summarize} className="border-t border-line px-4 py-3">
        <input type="hidden" name="id" value={sessionId} /><input type="hidden" name="notes" value={notes} />
        <button className="text-sm text-gold underline" disabled={summarizing || !turns.length}>End session and create my private summary</button>
        {sumState && <p className={`mt-1 text-xs ${sumState.ok ? "text-success" : "text-danger"}`}>{sumState.message}</p>}
      </form>
    </div>
  );
}
