"use client";
import { useState } from "react";
import type { Scenario } from "@/lib/emotional-intelligence";

/** An interactive moment: choose a response and see a gentle reflection — no scores, no judgment. */
export function EIScenario({ scenario }: { scenario: Scenario }) {
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <div className="rounded-[22px] border border-champagne/60 bg-ivory/70 p-6 sm:p-8">
      <p className="text-xs tracking-[0.25em] uppercase text-gold-deep">Try it · {scenario.context}</p>
      <p className="display mt-3 text-2xl leading-snug sm:text-3xl">{scenario.situation}</p>
      <div className="mt-6 grid gap-3">
        {scenario.options.map((o, i) => (
          <button key={o.text} type="button" onClick={() => setChosen(i)} aria-pressed={chosen === i}
            className={`rounded-2xl border px-5 py-4 text-left transition ${chosen === i ? "border-burgundy bg-burgundy/5" : "border-line bg-white/60 hover:border-champagne"}`}>
            <span className="font-medium">{o.text}</span>
            {chosen === i && <span className="mt-2 block text-sm text-muted">{o.reflection}</span>}
          </button>
        ))}
      </div>
      {chosen !== null && <button type="button" onClick={() => setChosen(null)} className="mt-4 text-sm text-gold-deep underline">Try another response</button>}
    </div>
  );
}
