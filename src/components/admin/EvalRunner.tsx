"use client";
import { useActionState, useState } from "react";
import { saveEvalRun } from "@/app/actions/journey-admin";

/** Runs one evaluation scenario through Journey (owner testing budget) and records the owner's rating. */
export function EvalRunner({ id, mode, prompt }: { id: string; mode: string; prompt: string }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, save, saving] = useActionState(saveEvalRun, null);
  async function run() {
    setBusy(true);
    const d = await fetch("/api/journey/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, message: prompt, ownerTest: true, requestKey: crypto.randomUUID().replace(/-/g, "") }) }).then((r) => r.json()).catch(() => null);
    setReply(d?.ok ? d.reply : `Not run: ${d?.message ?? "unknown error"}`);
    setBusy(false);
  }
  return (
    <div className="mt-3 space-y-2">
      <button type="button" onClick={run} disabled={busy} className="btn btn-ghost btn-sm">{busy ? "Running…" : "Run with Journey"}</button>
      {reply && (
        <form action={save} className="space-y-2">
          <input type="hidden" name="scenario" value={id} /><input type="hidden" name="reply" value={reply} />
          <p className="whitespace-pre-wrap rounded-xl border border-line bg-ink-2 p-3 text-sm">{reply}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select name="rating" className="field w-40" defaultValue=""><option value="" disabled>Rate 1–5</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} — {["", "Unacceptable", "Needs work", "Acceptable", "Good", "Exceptional"][n]}</option>)}</select>
            <input name="notes" className="field flex-1" placeholder="What should change?" />
            <button className="btn btn-gold btn-sm" disabled={saving}>Save rating</button>
          </div>
          {state && <p className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>}
        </form>
      )}
    </div>
  );
}
