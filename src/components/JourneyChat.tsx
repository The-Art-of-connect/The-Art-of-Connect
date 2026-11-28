"use client";
import { useRef, useState } from "react";
import type { AllowanceView } from "@/lib/journey-budget";

type Mode = "business" | "life" | "love" | "concierge";
type Turn = { role: "member" | "journey"; text: string };
type SavedConversation = { id: string; mode: Mode; title: string | null };

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
  // Pay-as-you-go: purchased Journey credits only, one per reply.
  if (a.creditsOnly) return (
    <div className="theme-dark rounded-2xl border border-gold/30 p-5" style={{ background: "var(--ink-2)" }}>
      <p className="text-xs tracking-[0.25em] text-gold uppercase">Your Journey credits</p>
      <p className="mt-2"><span className="display text-5xl text-gold-bright">{a.purchasedRemaining}</span> <span className="text-muted">credit{a.purchasedRemaining === 1 ? "" : "s"} remaining</span></p>
      <p className="mt-2 text-xs text-faint">One credit is one reply from Journey in The Art of Becoming. Nothing is ever charged automatically. <a href="/app/journey/plus#credits" className="underline">More credits</a></p>
    </div>
  );
  // Directive 51: one dollar allowance at actual AI cost for writing and voice.
  if (a.cents) {
    const usd = (c: number) => `$${(Math.floor(c) / 100).toFixed(2)}`;
    return (
      <div className="theme-dark rounded-2xl border border-gold/30 p-5" style={{ background: "var(--ink-2)" }}>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Your monthly Journey allowance</p>
        <p className="mt-2"><span className="display text-5xl text-gold-bright">{usd(a.remaining)}</span> <span className="text-muted">of {usd(a.allowance)} remaining</span></p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={a.percentUsed} aria-valuemin={0} aria-valuemax={100} aria-label="Allowance used">
          <div className="h-full rounded-full" style={{ width: `${a.percentUsed}%`, background: "linear-gradient(90deg, var(--champagne-deep), var(--champagne))" }} />
        </div>
        <p className="mt-2 flex justify-between text-xs text-faint"><span>Writing and voice, at actual AI cost · renews {new Date(a.resetsOn + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span><span>{a.percentUsed}% used</span></p>
        {a.notice && <p className="mt-3 rounded-xl border border-gold/30 px-3 py-2 text-xs text-gold-bright">{a.notice === 100 ? "You've used this month's included allowance. Your conversations are saved, and nothing is ever charged automatically." : `You've used ${a.notice}% of this month's allowance.`}</p>}
      </div>
    );
  }
  if (a.unlimited) return (
    <div className="theme-dark rounded-2xl border border-gold/40 p-5" style={{ background: "#1b1310" }}>
      <p className="text-xs tracking-[0.25em] text-gold uppercase">Elite Concierge · Journey</p>
      <p className="mt-2"><span className="display text-4xl text-gold-bright">Unlimited</span> <span className="text-muted">text conversations</span></p>
      <p className="mt-2 text-xs text-faint">{a.used} this month · included in your membership. Fair use applies to keep Journey attentive for everyone; nothing is ever charged for text.</p>
    </div>
  );
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

export function JourneyChat({ initialMode = "life", allowance, available, reason, ownerTest = false, initialText = "", lesson = null, homeChat = false }: { initialMode?: Mode; allowance: AllowanceView | null; available: boolean; reason: string; ownerTest?: boolean; initialText?: string; lesson?: string | null; homeChat?: boolean }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [meter, setMeter] = useState(allowance);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[] | null>(null);
  const [readingHistory, setReadingHistory] = useState(false);
  const conversation = useRef<string | null>(null);
  const working = useRef(false);

  function startNew(nextMode = mode) {
    if (working.current) return;
    conversation.current = null;
    setMode(nextMode);
    setTurns([]);
    setNotice(null);
  }

  async function openHistory(id?: string) {
    if (working.current) return;
    working.current = true;
    setReadingHistory(true);
    setNotice(null);
    try {
      const r = await fetch(id ? `/api/journey/conversations?id=${encodeURIComponent(id)}` : "/api/journey/conversations");
      const data = await r.json();
      if (!r.ok) {
        setNotice(data.message ?? "Saved conversations couldn't load. Please try again.");
        return;
      }
      if (!id) {
        setSavedConversations(data.conversations);
        return;
      }
      conversation.current = data.conversation.id;
      setMode(data.conversation.mode);
      setTurns(data.turns);
      if (data.truncated) setNotice("Showing the latest 100 messages from this conversation.");
    } catch {
      setNotice("Saved conversations couldn't load. Please try again.");
    } finally {
      working.current = false;
      setReadingHistory(false);
    }
  }

  async function send(message: string) {
    const m = message.trim();
    if (!available || !m || working.current) return;
    working.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/journey/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: m, requestKey: crypto.randomUUID().replace(/-/g, ""), conversationId: conversation.current, ownerTest, lesson, homeChat }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        conversation.current = data.conversationId;
        setTurns((t) => [...t, { role: "member", text: m }, { role: "journey", text: data.reply }]);
        setText("");
        if (homeChat) {
          setSavedConversations(null);
          if (!data.saved) setNotice("Journey replied, but this exchange couldn't be saved. Copy anything you'd like to keep before leaving.");
        }
        if (data.allowance) setMeter(data.allowance);
      } else {
        setText(m);
        setNotice(data?.message ?? "Journey couldn't reply just now. Your draft is still here.");
        if (data?.allowance) setMeter(data.allowance);
      }
    } catch {
      setText(m);
      setNotice(homeChat ? "The connection was interrupted. Your draft is still here. Check Saved conversations before retrying." : "The connection was interrupted. Your draft is still here.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="theme-dark overflow-hidden rounded-[1.75rem] border border-gold/25" style={{ background: "var(--ink)" }}>
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-4" role="tablist" aria-label="Journey experience">
          {MODES.map((x) => (
            <button key={x.id} role="tab" aria-selected={mode === x.id} disabled={busy || readingHistory} onClick={() => { if (x.id !== mode) homeChat ? startNew(x.id) : setMode(x.id); }}
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
                  <button key={s} onClick={() => send(s)} disabled={!available || busy || readingHistory} className="rounded-full border border-gold/40 px-4 py-2 text-sm text-ivory/90 transition hover:bg-gold/10 disabled:opacity-50">{s}</button>
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
            placeholder={available ? "Share what's on your mind…" : "Journey opens soon"} disabled={!available || busy || readingHistory}
            className="field min-h-12 flex-1 resize-none" />
          <button className="btn btn-gold btn-sm self-end" disabled={!available || busy || readingHistory || !text.trim()}>Send</button>
        </form>
      </div>
      <div className="space-y-4">
        {homeChat && (
          <section className="glass space-y-3 p-5">
            <h2 className="display text-xl">Saved conversations</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openHistory()} disabled={busy || readingHistory}>
                {readingHistory ? "Loading…" : "Show recent"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => startNew()} disabled={busy || readingHistory || !turns.length}>New conversation</button>
            </div>
            {savedConversations?.length === 0 && <p className="text-sm text-muted">Conversations saved here will appear after Journey replies.</p>}
            {Boolean(savedConversations?.length) && (
              <ul className="space-y-2">
                {savedConversations!.map((chat) => (
                  <li key={chat.id}>
                    <button type="button" className="block w-full break-words text-left text-sm hover:underline disabled:opacity-60" onClick={() => openHistory(chat.id)} disabled={busy || readingHistory}>
                      {chat.title || "Journey conversation"}
                      <span className="block text-xs text-muted">{MODES.find((item) => item.id === chat.mode)?.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {meter ? <AllowanceMeter a={meter} /> : (
          <div className="glass p-5 text-sm text-muted">Your monthly message allowance appears here once your membership includes Journey.</div>
        )}
        <p className="px-1 text-xs text-faint">Journey is an AI assistant. Your conversations are private to you — not visible to partners, matches or The Art of Connect team.</p>
      </div>
    </div>
  );
}
