"use client";
import { useState, useTransition } from "react";
import { continueVaultSelfTest, setVaultStorage, startVaultSelfTest, type RunView } from "@/app/actions/vault-admin";

const CHIP: Record<string, string> = { pass: "chip-live", fail: "chip-danger", inconclusive: "chip-locked", owner_action: "chip-locked" };
const LABEL: Record<string, string> = { pass: "Passed", fail: "Failed", inconclusive: "Inconclusive", owner_action: "Owner action" };

/** Runs the two-phase security self-test against the real AWS role and bucket, showing each result as it arrives. */
export function VaultSelfTest({ storage }: { storage: string }) {
  const [run, setRun] = useState<RunView | null>(null);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState(storage);
  const [pending, start] = useTransition();

  const poll = async (id: string) => {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 8000));
      const v = await continueVaultSelfTest(id);
      if ("error" in v) { setMsg(v.error); return; }
      setRun(v); setMsg(v.message ?? "");
      if (v.finished) return;
    }
  };
  const begin = () => start(async () => {
    setMsg("Running phase 1: credentials, uploads and pre-scan protections…");
    const v = await startVaultSelfTest();
    if ("error" in v) { setMsg(v.error); return; }
    setRun(v);
    if (!v.finished) { setMsg(v.message ?? "Waiting for GuardDuty to scan the fictional files (usually under two minutes)…"); await poll(v.id); }
  });
  const counts = run ? ["pass", "fail", "inconclusive", "owner_action"].map((k) => [k, run.results.filter((r) => r.outcome === k).length] as const) : [];

  return (
    <div className="space-y-6">
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="font-semibold">Testing storage</p>
          <p className="text-sm text-muted">When on, the owner, staff and test accounts can upload fictional documents. Members can&apos;t. There is no production setting.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`chip ${mode === "aws_testing" ? "chip-live" : "chip-locked"}`}>{mode === "aws_testing" ? "On (testing)" : "Off"}</span>
          <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const next = mode === "aws_testing" ? "off" : "aws_testing"; const r = await setVaultStorage(next); setMsg(r.message); if (r.ok) setMode(next); })}>{mode === "aws_testing" ? "Turn off" : "Turn on for testing"}</button>
        </div>
      </section>

      <section className="glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Security self-test</p>
            <p className="text-sm text-muted">Tests the real AWS role and bucket with fictional files: a plain text document and the standard EICAR antivirus test file. About 2–5 minutes. AWS cost is a fraction of a cent.</p>
          </div>
          <button className="btn btn-gold btn-sm" disabled={pending} onClick={begin}>{pending ? "Running…" : "Run or resume security self-test"}</button>
        </div>
        {msg && <p className="mt-3 text-sm text-muted" role="status">{msg}</p>}
        {run && (
          <>
            <p className="mt-4 flex flex-wrap gap-2 text-xs">{counts.map(([k, n]) => <span key={k} className={`chip ${CHIP[k]}`}>{LABEL[k]}: {n}</span>)}<span className="chip">{run.finished ? (run.status === "complete" ? "Complete" : "Finished with failures") : "In progress"}</span></p>
            <ul className="mt-4 divide-y divide-line text-sm">
              {run.results.map((r) => (
                <li key={r.id} className="grid gap-1 py-3 sm:grid-cols-[4rem_1fr_7rem]">
                  <span className="text-xs text-faint">{r.id}</span>
                  <span><span className="font-semibold">{r.name}</span><span className="block text-xs text-muted">Expected: {r.expected}. {r.detail}</span></span>
                  <span className={`chip ${CHIP[r.outcome]} h-fit justify-self-start sm:justify-self-end`}>{LABEL[r.outcome]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
