"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { AllowanceView } from "@/lib/journey-budget";
import { AllowanceMeter } from "@/components/JourneyChat";
import { SKIP_MESSAGE, SUMMARY_MESSAGE } from "@/lib/journey-discovery";

type Turn = { role: "member" | "journey"; text: string };

/** A private, adaptive discovery conversation. Every Journey reply uses one message from the member's allowance. */
export function DiscoveryChat({ sessionId, mode, opening, history, allowance, available, reason, ownerTest, endForm }: {
  sessionId: string; mode: string; opening: string; history: Turn[]; allowance: AllowanceView | null;
  available: boolean; reason: string; ownerTest: boolean; endForm: React.ReactNode;
}) {
  const [turns, setTurns] = useState<Turn[]>(history);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [meter, setMeter] = useState(allowance);
  const exchanges = useRef(history.filter((t) => t.role === "journey").length);

  async function send(message: string, flags: { skip?: boolean; summarize?: boolean } = {}) {
    const m = message.trim();
    if (!m || busy || done) return;
    setBusy(true); setNotice(null);
    setTurns((t) => [...t, { role: "member", text: m }]);
    setText("");
    try {
      const res = await fetch("/api/journey/message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: m, requestKey: crypto.randomUUID().replace(/-/g, ""), ownerTest, discovery: { sessionId, ...flags } }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setTurns((t) => [...t, { role: "journey", text: data.reply }]);
        exchanges.current += 1;
        if (data.allowance) setMeter(data.allowance);
        if (flags.summarize) setDone(true);
      } else {
        setTurns((t) => t.slice(0, -1));
        setText(m);
        setNotice(data?.message ?? "Journey couldn't reply just now. Nothing was counted.");
        if (data?.allowance) setMeter(data.allowance);
      }
    } catch {
      setTurns((t) => t.slice(0, -1)); setText(m);
      setNotice("You appear to be offline. Nothing was counted.");
    } finally { setBusy(false); }
  }

  const remaining = meter ? meter.remaining + meter.purchasedRemaining : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="theme-dark overflow-hidden rounded-[1.75rem] border border-gold/25" style={{ background: "var(--ink)" }}>
        <div className="min-h-[20rem] space-y-4 px-5 py-6 sm:px-7" aria-live="polite">
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-line bg-white/5 px-4 py-3 text-sm leading-relaxed text-ivory/95">
            <span className="mb-1 block text-[0.65rem] tracking-[0.25em] text-gold uppercase">Journey · AI</span>{opening}
          </div>
          {turns.map((t, i) => (
            <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${t.role === "member" ? "ml-auto bg-gold/15 text-ivory" : "border border-line bg-white/5 text-ivory/95"}`}>
              {t.role === "journey" && <span className="mb-1 block text-[0.65rem] tracking-[0.25em] text-gold uppercase">Journey · AI</span>}
              {t.text}
            </div>
          ))}
          {busy && <p className="text-xs text-gold">Journey is reflecting…</p>}
          {done && <p className="rounded-xl border border-gold/30 px-4 py-3 text-sm text-gold-bright">Your summary is saved privately in your Personal Discovery Portfolio. <Link href="/app/know-yourself/portfolio" className="underline">Open my portfolio</Link></p>}
        </div>
        {(notice || !available) && <p className="mx-5 mb-3 rounded-xl border border-gold/30 px-4 py-2.5 text-sm text-gold-bright">{notice ?? reason}</p>}
        {!done && (
          <>
            <div className="flex flex-wrap gap-2 border-t border-line px-4 pt-3">
              <button type="button" onClick={() => send(SKIP_MESSAGE, { skip: true })} disabled={!available || busy || turns.length === 0} className="rounded-full border border-gold/40 px-3 py-1.5 text-xs text-ivory/90 hover:bg-gold/10 disabled:opacity-40">Skip this question</button>
              <button type="button" onClick={() => send(SUMMARY_MESSAGE, { summarize: true })} disabled={!available || busy || exchanges.current < 2} title={exchanges.current < 2 ? "Share a little more first" : undefined} className="rounded-full border border-gold/40 px-3 py-1.5 text-xs text-ivory/90 hover:bg-gold/10 disabled:opacity-40">Get my summary &amp; finish</button>
              <Link href="/app/journey/discover" className="rounded-full border border-line-strong px-3 py-1.5 text-xs text-muted hover:text-text">Pause or change topic</Link>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 p-4">
              <label className="sr-only" htmlFor="discovery-message">Your answer</label>
              <textarea id="discovery-message" rows={2} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                placeholder={available ? "Answer in your own words…" : "Journey opens soon"} disabled={!available || busy}
                className="field min-h-12 flex-1 resize-none" />
              <button className="btn btn-gold btn-sm self-end" disabled={!available || busy || !text.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
      <div className="space-y-4">
        {meter ? <AllowanceMeter a={meter} /> : <div className="glass p-5 text-sm text-muted">{ownerTest ? "Owner testing uses your private test budget." : "Your allowance appears here once your membership includes Journey."}</div>}
        <div className="glass space-y-2 p-5 text-xs text-muted">
          <p className="font-semibold text-text">Included in your membership</p>
          <p>Each reply from Journey, including a skipped question or your final summary, uses 1 message{meter?.unlimited ? " (unlimited with your Elite Concierge membership)" : remaining != null ? ` (you have ${remaining})` : ""}. Opening, pausing, changing topics and ending never do.</p>
          <p>Journey only asks what helps you, and will offer your summary once it understands enough.</p>
        </div>
        {!done && <div className="px-1">{endForm}</div>}
        <p className="px-1 text-xs text-faint">Private to you. Never shown on your profile, to matches, partners, connections or providers, and never used for matchmaking.</p>
      </div>
    </div>
  );
}
