"use client";
import { useActionState, useState } from "react";
import { eliteScreen } from "@/app/actions/elite";
import { AMOUNT_BANDS, ATTESTATIONS, SCREENING } from "@/lib/elite-screening";

type Q = { id: string; label: string; detail: string; thresholdNote: string };

/** Preliminary screening: choose a pathway, then answer that pathway's questions (ranges only). */
export function EliteScreeningForm({ qualifications, initial, initialPathway, disabled }: { qualifications: Q[]; initial: string | null; initialPathway: string | null; disabled: boolean }) {
  const [qual, setQual] = useState<string>(initial ?? "");
  const [state, action, pending] = useActionState(eliteScreen, null);
  const questions = qual ? SCREENING[qual] ?? [] : [];

  return (
    <form action={action} className="mt-4 space-y-5" aria-busy={pending}>
      <fieldset className="space-y-2" disabled={disabled || pending}>
        <legend className="text-sm font-semibold">Which pathway best describes you?</legend>
        {qualifications.map((q) => (
          <label key={q.id} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-[#e8892b] has-[:checked]:bg-[#e8892b]/5">
            <input type="radio" name="qualification" value={q.id} checked={qual === q.id} onChange={() => setQual(q.id)} required />
            <span><span className="font-semibold">{q.label}</span><span className="block text-xs text-muted">{q.detail}{q.thresholdNote}</span></span>
          </label>
        ))}
      </fieldset>

      {questions.length > 0 && (
        <fieldset className="space-y-4 rounded-2xl border border-[#c9a96e]/50 p-4" disabled={disabled || pending}>
          <legend className="px-1 text-sm font-semibold">A few private questions</legend>
          <p className="text-xs text-muted">Ranges only. We never ask for, or keep, exact amounts here.</p>
          {questions.map((q) => (
            <div key={`${qual}-${q.id}`}>
              <p className="text-sm font-medium">{q.label}</p>
              {q.kind === "band" ? (
                <select name={`${qual}__${q.id}`} required defaultValue="" className="field mt-1.5 w-full">
                  <option value="" disabled>Choose a range</option>
                  {AMOUNT_BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              ) : (
                <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
                  {q.options!.map((o) => (
                    <label key={String(o.value)} className="flex items-center gap-2 text-sm"><input type="radio" name={`${qual}__${q.id}`} value={o.value} required /> {o.label}</label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </fieldset>
      )}

      <fieldset disabled={disabled || pending}>
        <legend className="text-sm font-semibold">How would you like to proceed?</legend>
        <label className="mt-2 flex items-start gap-2 text-sm"><input type="radio" name="pathway" value="direct" defaultChecked={initialPathway !== "expedited"} /> <span>Standard verification <span className="block text-xs text-muted">Complimentary. Reviewed in the order received.</span></span></label>
        <label className="mt-2 flex items-start gap-2 text-sm"><input type="radio" name="pathway" value="expedited" defaultChecked={initialPathway === "expedited"} /> <span>Priority verification <span className="block text-xs text-muted">Optional, for applicants who pass preliminary screening. Faster processing only: never required and never a guarantee of admission.</span></span></label>
      </fieldset>

      <fieldset className="space-y-2" disabled={disabled || pending}>
        {ATTESTATIONS.map((a) => (
          <label key={a.id} className="flex gap-2 text-xs text-muted"><input type="checkbox" name={a.id} required className="mt-0.5" /> {a.label}</label>
        ))}
      </fieldset>

      <button className="btn btn-gold btn-sm" disabled={disabled || pending || !qual}>{pending ? "Saving…" : "Submit privately"}</button>
      {state && <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>}
    </form>
  );
}
