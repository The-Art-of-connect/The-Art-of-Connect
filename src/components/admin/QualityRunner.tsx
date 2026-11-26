"use client";
import { useState } from "react";
import { QUALITY_CRITERIA, QUALITY_SCENARIOS, type QualityScenario } from "@/lib/journey-quality";

type Turn = { who: "member" | "journey" | "note"; text: string };
type Run = { turns: Turn[]; status: "idle" | "running" | "done" | "failed"; cents: number; version: number | null };
const key = () => crypto.randomUUID().replace(/-/g, "");

/** Runs scripted multi-turn conversations through the real Journey, one message at a time, on the owner testing budget. */
export function QualityRunner({ ready, blueprint }: { ready: boolean; blueprint: string }) {
  const [runs, setRuns] = useState<Record<string, Run>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, f: (r: Run) => Run) => setRuns((x) => ({ ...x, [k]: f(x[k] ?? { turns: [], status: "idle", cents: 0, version: null }) }));

  async function runOne(sc: QualityScenario) {
    set(sc.key, () => ({ turns: [], status: "running", cents: 0, version: null }));
    let conversationId: string | null = null;
    for (const msg of sc.turns) {
      set(sc.key, (r) => ({ ...r, turns: [...r.turns, { who: "member", text: msg }] }));
      const d: { ok: boolean; reply?: string; message?: string; conversationId?: string | null; test?: { costCents?: number; instructionVersion?: number | null } } | null = await fetch("/api/journey/message", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: sc.mode, message: msg, ownerTest: true, conversationId, requestKey: key() }) }).then((x) => x.json()).catch(() => null);
      if (!d?.ok) { set(sc.key, (r) => ({ ...r, status: "failed", turns: [...r.turns, { who: "note", text: `Stopped: ${d?.message ?? "no response"}` }] })); return false; }
      conversationId = d.conversationId ?? conversationId;
      set(sc.key, (r) => ({ ...r, cents: r.cents + Number(d.test?.costCents ?? 0), version: d.test?.instructionVersion ?? r.version, turns: [...r.turns, { who: "journey", text: d.reply ?? "" }] }));
    }
    set(sc.key, (r) => ({ ...r, status: "done" }));
    return true;
  }
  async function runAll() {
    setBusy(true);
    for (const sc of QUALITY_SCENARIOS) if (!(await runOne(sc))) break;
    setBusy(false);
  }
  const total = Object.values(runs).reduce((n, r) => n + r.cents, 0);

  return (
    <div className="space-y-6">
      <div className="glass flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="text-sm">
          <p>Each conversation runs through the real Journey, written path, exactly as a member would experience it. Using: <strong>{blueprint}</strong>, plus training drafts awaiting your review.</p>
          <p className="mt-1 text-xs text-muted">About 27 messages for all nine, roughly $0.15 to $0.30 of your testing budget. {total > 0 && `This run so far: $${(total / 100).toFixed(3)}.`}</p>
        </div>
        <button type="button" onClick={runAll} disabled={!ready || busy} className="btn btn-gold btn-sm">{busy ? "Running…" : "Run all nine"}</button>
      </div>
      {!ready && <p className="text-sm text-danger">Activate Journey in the Journey Intelligence Center first.</p>}
      <div className="glass p-5 text-sm">
        <p className="font-semibold">What to look for</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">{QUALITY_CRITERIA.map((c) => <li key={c}>◇ {c}</li>)}</ul>
      </div>
      {QUALITY_SCENARIOS.map((sc) => {
        const r = runs[sc.key];
        return (
          <section key={sc.key} className="glass overflow-hidden !p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <p className="font-semibold">{sc.title} <span className="text-xs font-normal capitalize text-muted">· {sc.mode}</span></p>
              <span className="flex items-center gap-3 text-xs text-muted">
                {r?.status === "done" && `Done · $${(r.cents / 100).toFixed(3)}${r.version ? ` · Blueprint v${r.version}` : ""}`}
                {r?.status === "running" && "Journey is reflecting…"}
                <button type="button" onClick={() => runOne(sc)} disabled={!ready || busy || r?.status === "running"} className="btn btn-ghost btn-sm">Run</button>
              </span>
            </div>
            {r?.turns.length ? (
              <div className="space-y-3 p-5 text-sm">
                {r.turns.map((t, i) => (
                  <p key={i} className={`whitespace-pre-wrap ${t.who === "member" ? "ml-8 rounded-xl bg-champagne/15 p-3" : t.who === "journey" ? "mr-8" : "text-xs text-danger"}`}>
                    <span className="mb-1 block text-xs font-semibold text-gold">{t.who === "member" ? "Member (fictional)" : t.who === "journey" ? "Journey" : ""}</span>{t.text}
                  </p>
                ))}
              </div>
            ) : <p className="px-5 py-4 text-xs text-muted">{sc.turns.length} member messages, not run yet.</p>}
          </section>
        );
      })}
    </div>
  );
}
