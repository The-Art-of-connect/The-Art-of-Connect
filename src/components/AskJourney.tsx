"use client";
import Link from "next/link";
import { useState } from "react";
import { route } from "@/lib/concierge";

type Level = "free" | "one" | "complete" | "executive" | "elite";

/** "Ask Journey anything": everyday language in, the right place out. Paid members can continue with Journey by text or voice. */
export function AskJourney({ level, journey }: { level: Level; journey: boolean }) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const results = asked ? route(asked, level) : [];
  return (
    <div className="w-full">
      <form onSubmit={(e) => { e.preventDefault(); setAsked(q); }} className="flex items-center gap-2 rounded-full border border-[var(--champagne)]/60 bg-[var(--surface,#fffdf8)] px-4 py-2 shadow-sm" role="search">
        <span aria-hidden="true" className="text-xl text-gold">✦</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask Journey anything…" aria-label="Ask Journey anything" enterKeyHint="go"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-text placeholder:text-faint focus:outline-none" />
        {journey && <Link href="/app/journey/voice" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gold-deep hover:bg-champagne/15" aria-label="Talk with Journey by voice">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
        </Link>}
        <button className="btn btn-gold btn-sm shrink-0">Go</button>
      </form>
      {asked && (
        <div className="mt-3 space-y-2" aria-live="polite">
          {results.map((r) => (
            <Link key={r.id} href={r.included ? r.href : "/membership#build"} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-[var(--surface,#fffdf8)] px-4 py-3 text-sm transition hover:border-[var(--champagne)]">
              <span><span className="block font-semibold text-text">{r.label}</span><span className="block text-xs text-muted">{r.included ? r.line : "Available with an upgraded membership"}</span></span>
              <span className="text-gold" aria-hidden="true">→</span>
            </Link>
          ))}
          {journey ? (
            <Link href="/app/journey" className="block rounded-2xl px-4 py-2 text-sm text-gold underline">{results.length ? "Or talk it through with Journey" : "Talk it through with Journey"}</Link>
          ) : !results.length && <p className="px-2 text-sm text-muted">Try a few words like &ldquo;start a business&rdquo;, &ldquo;help me grow&rdquo; or &ldquo;my résumé&rdquo;.</p>}
        </div>
      )}
    </div>
  );
}
