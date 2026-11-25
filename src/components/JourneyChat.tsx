"use client";
import { useRef, useState } from "react";
import type { AllowanceView } from "@/lib/journey-budget";

type Mode = "business" | "life" | "love" | "concierge";
type Turn = { role: "member" | "journey"; text: string };

const MODES: { id: Mode; label: string }[] = [
  { id: "life", label: "In Life" },
  { id: "love", label: "In Love" },
  { id: "business", label: "In Business" },
  { id: "concierge", label: "Private Concierge" },
];

const STARTERS = [
  "Help me understand myself",
  "Help me communicate my feelings",
  "Help us plan a memorable date",
  "Help me surprise my partner",
  "Help me explore professional guidance",
];

export function AllowanceMeter({ a }: { a: AllowanceView }) {
  const pct = a.allowance > 0 ? Math.min(100, Math.round((a.used / a.allowance) * 100)) : 100;
  return (
    <div className="theme-dark rounded-2xl border border-gold/30 p-5" style={{ background: "var(--ink-2)" }}>
      <p className="text-xs tracking-[0.25em] text-gold uppercase">Your monthly Journey allowance</p>
      <p className="mt-2"><span className="display text-5xl text-gold-bright">{a.remaining}</span> <span className="text-muted">of {a.allowance} messages remaining</span></p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Allowance used">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--champagne-deep), var(--champagne))" }} />
      </div>
      <p className="mt-2 flex justify-between text-xs text-faint"><span>{a.used} used · resets {new Date(a.resetsOn + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span><span>{pct}% used</span></p>
      {a.purchasedRemaining > 0 && <p className="mt-2 text-xs text-gold">{a.purchasedRemaining} additional purchased messages available</p>}
      {a.notice && (
        <p className="mt-3 rounded-xl border border-gold/30 px-3 py-2 text-xs text-gold-bright">
          {a.notice === 100
            ? "You've used this month's messages. Your conversations are still here, and nothing is ever charged automatically."
            : `You've used ${a.notice}% of this month's messages.`}
        </p>
      )}
    </div>
  );
}

export function JourneyChat({ initialMode = "life", allowance, available, reason, ownerTest = false, initialText = "", lesson = null }: { initialMode?: Mode; allowance: AllowanceView | null; available: boolean; reason: string; ownerTest?: boolean; initialText?: string; lesson?: string | null }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [meter, setMeter] = useState(allowance);
  const conversation = useRef<string | null>(null);

  async function send(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setBusy(true);
    setNotice(null);
    setTurns((t) => [...t, { role: "member", text: m }]);
    setText("");
    try {
      const res = await fetch("/api/journey/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: m, requestKey: crypto.randomUUID().replace(/-/g, ""), conversationId: conversation.current, ownerTest, lesson }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        conversation.current = data.conversationId;
        setTurns((t) => [...t, { role: "journey", text: data.reply }]);
        if (data.allowance) setMeter(data.allowance);
      } else {
        setNotice(data?.message ?? "Journey couldn't reply just now. This message didn't count toward your allowance.");
        if (data?.allowance) setMeter(data.allowance);
      }
    } catch {
      setNotice("You appear to be offline. Nothing was counted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="theme-dark overflow-hidden rounded-[1.75rem] border border-gold/25" style={{ background: "var(--ink)" }}>
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-4" role="tablist" aria-label="Journey experience">
          {MODES.map((x) => (
            <button key={x.id} role="tab" aria-selected={mode === x.id} onClick={() => setMode(x.id)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${mode === x.id ? "bg-gold text-espresso font-semibold" : "border border-line-strong text-muted hover:text-text"}`}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="min-h-[18rem] space-y-4 px-5 py-6 sm:px-7" aria-live="polite">
          {turns.length === 0 ? (
            <div className="text-center">
              <p className="display text-3xl text-gold-bright">What&rsquo;s on your mind today?</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} disabled={!available || busy} className="rounded-full border border-gold/40 px-4 py-2 text-sm text-ivory/90 transition hover:bg-gold/10 disabled:opacity-50">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) => (
              <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${t.role === "member" ? "ml-auto bg-gold/15 text-ivory" : "border border-line bg-white/5 text-ivory/95"}`}>
                {t.role === "journey" && <span className="mb-1 block text-[0.65rem] tracking-[0.25em] text-gold uppercase">Journey · AI</span>}
                {t.text}
              </div>
            ))
          )}
          {busy && <p className="text-xs text-gold">Journey is reflecting…</p>}
        </div>
        {(notice || !available) && <p className="mx-5 mb-3 rounded-xl border border-gold/30 px-4 py-2.5 text-sm text-gold-bright">{notice ?? reason}</p>}
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-line p-4">
          <label className="sr-only" htmlFor="journey-message">Message Journey</label>
          <textarea id="journey-message" rows={2} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
            placeholder={available ? "Share what's on your mind…" : "Journey opens soon"} disabled={!available || busy}
            className="field min-h-12 flex-1 resize-none" />
          <button className="btn btn-gold btn-sm self-end" disabled={!available || busy || !text.trim()}>Send</button>
        </form>
      </div>
      <div className="space-y-4">
        {meter ? <AllowanceMeter a={meter} /> : (
          <div className="glass p-5 text-sm text-muted">Your monthly message allowance appears here once your membership includes Journey.</div>
        )}
        <p className="px-1 text-xs text-faint">Journey is an AI assistant. Your conversations are private to you — not visible to partners, matches or The Art of Connect team.</p>
      </div>
    </div>
  );
}
