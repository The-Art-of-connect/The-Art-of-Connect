"use client";
import { useState, useTransition } from "react";
import { runIntelSelfTest, setIntelTesting, type IntelRun } from "@/app/actions/intel-admin";

const CHIP: Record<string, string> = { pass: "chip-live", fail: "chip-danger", inconclusive: "chip-locked", owner_action: "chip-locked" };
const LABEL: Record<string, string> = { pass: "Passed", fail: "Failed", inconclusive: "Inconclusive", owner_action: "Owner action" };

/** Testing-mode switch and the two-phase integration self-test (free checks, then one fictional search per provider). */
export function IntelSelfTest({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [run, setRun] = useState<IntelRun | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const go = () => start(async () => {
    setMsg("Phase 1: keys, webhook receivers, spending guard (free)…");
    const a = await runIntelSelfTest("A");
    if ("error" in a) { setMsg(a.error); return; }
    setRun(a);
    setMsg("Phase 2: one fictional search with each provider (about one cent in total)…");
    const b = await runIntelSelfTest("B", a.id);
    if ("error" in b) { setMsg(b.error); return; }
    setRun(b); setMsg(b.status === "complete" ? "Self-test complete." : "Self-test finished with failures.");
  });
  return (
    <div className="space-y-6">
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div><p className="font-semibold">Testing mode</p><p className="text-sm text-muted">Turns on the division and both providers for the owner, staff and test accounts only, within $25 a month and $5 a day. Members can&apos;t use research yet.</p></div>
        <div className="flex items-center gap-3">
          <span className={`chip ${on ? "chip-live" : "chip-locked"}`}>{on ? "On (testing)" : "Off"}</span>
          <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await setIntelTesting(!on); setMsg(r.message); if (r.ok) setOn(!on); })}>{on ? "Turn off" : "Turn on for testing"}</button>
        </div>
      </section>
      <section className="glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-semibold">Integration self-test</p><p className="text-sm text-muted">Verifies keys, webhook signatures, duplicate protection and the spending guard, then runs one fictional public-information search with each provider (about one cent in total).</p></div>
          <button className="btn btn-gold btn-sm" disabled={pending} onClick={go}>{pending ? "Running…" : "Run integration self-test"}</button>
        </div>
        {msg && <p className="mt-3 text-sm text-muted" role="status">{msg}</p>}
        {run && (
          <ul className="mt-4 divide-y divide-line text-sm">
            {run.results.map((x) => (
              <li key={x.id} className="grid gap-1 py-3 sm:grid-cols-[3.5rem_1fr_7rem]">
                <span className="text-xs text-faint">{x.id}</span>
                <span><span className="font-semibold">{x.name}</span><span className="block text-xs text-muted">Expected: {x.expected}. {x.detail}</span></span>
                <span className={`chip ${CHIP[x.outcome]} h-fit justify-self-start sm:justify-self-end`}>{LABEL[x.outcome]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
