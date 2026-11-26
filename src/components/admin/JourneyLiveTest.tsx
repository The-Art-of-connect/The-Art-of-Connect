"use client";
import { useState } from "react";
import { OwnerTest } from "@/components/admin/OwnerTest";
import { VoiceStudio } from "@/components/JourneyPickers";
import { VOICE_MODELS, providerCostCents } from "@/lib/journey-voice-models";

/** Short spoken scenarios to say to each voice model, so the comparison is fair. */
const SPOKEN_SCENARIOS = [
  "My divorce was finalized last month and the evenings are the hardest part.",
  "I don't really know who I am anymore outside of being a mom.",
  "My husband buys me gifts, but what I really want is his time.",
  "My sister calls every day to vent and I'm exhausted.",
  "I'm launching a small bakery and I feel overwhelmed.",
];

type Result = { model: string; seconds: number; cents: number | null };

/** "Test Journey now": a real written conversation and a real live voice conversation, on the owner's private budget. */
export function JourneyLiveTest({ ready, voiceReady, voiceReason, productionModel }: { ready: boolean; voiceReady: boolean; voiceReason: string; productionModel: string | null }) {
  const [tab, setTab] = useState<"chat" | "voice">("chat");
  const [model, setModel] = useState(productionModel && VOICE_MODELS.some((m) => m.id === productionModel) ? productionModel : VOICE_MODELS[0].id);
  const [results, setResults] = useState<Result[]>([]);
  const chosen = VOICE_MODELS.find((m) => m.id === model)!;
  return (
    <div>
      <div className="flex gap-2 border-b border-line px-5 pt-4" role="tablist">
        {(["chat", "voice"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px rounded-t-xl border-b-2 px-4 py-2 text-sm ${tab === t ? "border-gold font-semibold text-gold" : "border-transparent text-muted"}`}>
            {t === "chat" ? "Write to Journey" : "Talk to Journey (live voice)"}
          </button>
        ))}
      </div>
      {!ready ? (
        <p className="p-5 text-sm text-muted">Activate Journey above, then talk with her right here.</p>
      ) : tab === "chat" ? (
        <OwnerTest note="This is the real Journey, answering through OpenAI on your private testing budget." />
      ) : (
        <div className="space-y-4 p-5">
          <label className="block text-sm">
            <span className="font-semibold">Voice model to test</span>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="field mt-1 w-full">
              {VOICE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}{m.id === productionModel ? " · current production" : ""}{m.deprecated ? " · deprecated" : ""}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted">{chosen.note}</span>
          </label>
          <details className="rounded-xl border border-line px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold">Say the same things to each model</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">{SPOKEN_SCENARIOS.map((x) => <li key={x}>&ldquo;{x}&rdquo;</li>)}</ol>
            <p className="mt-2 text-xs text-faint">Then answer naturally for two or three turns. Try interrupting her once.</p>
          </details>
          <VoiceStudio key={model} voiceModel={model} minutes={null} available={voiceReady} reason={voiceReason} ownerTest mode="life" initialTranscripts
            onUsage={(u) => setResults((r) => [{ model: u.model, seconds: u.seconds, cents: u.usage ? providerCostCents(u.model, u.usage) : null }, ...r])} />
          {results.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead><tr className="text-muted"><th className="py-1">Model</th><th>Length</th><th>Actual expense</th><th>Per minute</th></tr></thead>
              <tbody>{results.map((x, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1">{VOICE_MODELS.find((m) => m.id === x.model)?.label ?? x.model}</td>
                  <td>{Math.floor(x.seconds / 60)}:{String(x.seconds % 60).padStart(2, "0")}</td>
                  <td>{x.cents == null ? "not reported" : `$${(x.cents / 100).toFixed(4)}`}</td>
                  <td>{x.cents == null || !x.seconds ? "—" : `$${((x.cents / 100) / (x.seconds / 60)).toFixed(3)}`}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
