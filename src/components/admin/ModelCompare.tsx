"use client";
import { useState } from "react";
import { rateTestRun } from "@/app/actions/journey-admin";

type Version = { version: number; status: string; note: string | null };
type Result = { model: string; ok: boolean; reply?: string; error?: string; id?: string | null; latencyMs?: number; inputTokens?: number; outputTokens?: number; costCents?: number };
const CRITERIA = [["quality", "Conversational quality"], ["comprehension", "Comprehension"], ["emotion", "Emotional awareness"]] as const;

/** Sends the same message, with the same personality version, to several approved models — one after another. */
export function ModelCompare({ models, versions, current }: { models: string[]; versions: Version[]; current: string | null }) {
  const [picked, setPicked] = useState<string[]>(models.slice(0, 3));
  const [version, setVersion] = useState<number | "">(versions[0]?.version ?? "");
  const [mode, setMode] = useState("life");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});

  const toggle = (m: string) => setPicked((p) => (p.includes(m) ? p.filter((x) => x !== m) : p.length >= 4 ? p : [...p, m]));
  async function run() {
    const text = msg.trim();
    if (!text || !picked.length || running) return;
    const comparisonId = crypto.randomUUID();
    setResults([]); setRatings({}); setSaved({});
    for (const model of picked) {
      setRunning(model);
      const res = await fetch("/api/journey/message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: text, ownerTest: true, model, instructionVersion: version || null, comparisonId, requestKey: crypto.randomUUID().replace(/-/g, "") }),
      });
      const d = await res.json().catch(() => null);
      setResults((r) => [...r, d?.ok ? { model, ok: true, reply: d.reply, ...d.test } : { model, ok: false, error: d?.message ?? "No reply" }]);
    }
    setRunning(null);
  }
  async function save(r: Result) {
    if (!r.id) return;
    const out = await rateTestRun({ id: r.id, ratings: ratings[r.model] ?? {} });
    setSaved((s) => ({ ...s, [r.model]: out?.message ?? "" }));
  }
  const fastest = Math.min(...results.filter((r) => r.ok).map((r) => r.latencyMs ?? Infinity));
  const cheapest = Math.min(...results.filter((r) => r.ok).map((r) => r.costCents ?? Infinity));

  return (
    <div className="space-y-5 p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
        <fieldset>
          <legend className="text-xs font-semibold text-muted">Models to compare (up to 4)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {models.map((m) => (
              <button key={m} type="button" onClick={() => toggle(m)} aria-pressed={picked.includes(m)}
                className={`rounded-full px-3 py-1.5 text-xs ${picked.includes(m) ? "bg-gold text-espresso" : "border border-line-strong text-muted"}`}>
                {m}{m === current ? " · current" : ""}
              </button>
            ))}
            {!models.length && <span className="text-sm text-muted">Approve at least one model with its rates below.</span>}
          </div>
        </fieldset>
        <label className="text-xs font-semibold text-muted">Personality version
          <select value={version} onChange={(e) => setVersion(e.target.value ? Number(e.target.value) : "")} className="field mt-2 !min-h-0 !py-2 text-sm">
            <option value="">Published version (none yet = founding philosophy only)</option>
            {versions.map((v) => <option key={v.version} value={v.version}>Version {v.version} · {v.status}{v.note ? ` — ${v.note.slice(0, 40)}` : ""}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Experience
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="field mt-2 !min-h-0 !py-2 text-sm capitalize">
            {["life", "love", "business", "concierge"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} maxLength={4000} className="field w-full"
        placeholder="One fictional message for every model, e.g. ‘I just found out my business partner has been hiding losses from me. I’m furious and I don’t know what to do.’" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={!!running || !msg.trim() || !picked.length} className="btn btn-gold btn-sm">
          {running ? `Asking ${running}…` : `Compare ${picked.length} model${picked.length === 1 ? "" : "s"}`}
        </button>
        <span className="text-xs text-faint">Models answer one at a time. Every reply uses your owner testing budget and the same personality version.</span>
      </div>

      {results.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {results.map((r) => (
            <article key={r.model} className="rounded-2xl border border-line bg-ink-2 p-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{r.model}</h3>
                {r.ok && (
                  <span className="text-xs text-muted">
                    <span className={r.latencyMs === fastest ? "text-success" : ""}>{((r.latencyMs ?? 0) / 1000).toFixed(1)}s</span> ·{" "}
                    {(r.inputTokens ?? 0) + (r.outputTokens ?? 0)} tokens ·{" "}
                    <span className={r.costCents === cheapest ? "text-success" : ""}>${((r.costCents ?? 0) / 100).toFixed(4)}</span>
                  </span>
                )}
              </header>
              {r.ok ? <p className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm">{r.reply}</p> : <p className="mt-3 text-sm text-danger">{r.error}</p>}
              {r.ok && r.id && (
                <div className="mt-4 space-y-2 border-t border-line pt-3">
                  {CRITERIA.map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted">{label}</span>
                      <span className="flex gap-1" role="radiogroup" aria-label={`${label} for ${r.model}`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" role="radio" aria-checked={ratings[r.model]?.[k] === n}
                            onClick={() => setRatings((x) => ({ ...x, [r.model]: { ...x[r.model], [k]: n } }))}
                            className={`text-lg leading-none ${n <= (ratings[r.model]?.[k] ?? 0) ? "text-gold" : "text-faint"}`}>★</button>
                        ))}
                      </span>
                    </div>
                  ))}
                  <button type="button" onClick={() => save(r)} className="text-xs text-gold underline">Save my rating</button>
                  {saved[r.model] && <span className="ml-2 text-xs text-success">{saved[r.model]}</span>}
                </div>
              )}
            </article>
          ))}
          {running && <p className="text-sm text-muted">Waiting for {running}…</p>}
        </div>
      )}
    </div>
  );
}
