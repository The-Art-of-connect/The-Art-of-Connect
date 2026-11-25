"use client";
import Link from "next/link";
import { useActionState } from "react";
import { saveOnboardingStage } from "@/app/actions/onboarding";
import type { Answers, Question } from "@/lib/onboarding";

export function StageForm({ stage, questions, answers, nextHref, nextLabel }: { stage: string; questions: Question[]; answers: Answers; nextHref: string; nextLabel: string }) {
  const [state, action, pending] = useActionState(saveOnboardingStage, null);
  return (
    <form action={action} className="mt-10 space-y-6">
      <input type="hidden" name="stage" value={stage} />
      {questions.map((q, i) => {
        const a = answers[q.id];
        const chosen = Array.isArray(a) ? a.map(String) : typeof a === "string" ? [a] : [];
        return (
          <fieldset key={q.id} className="glass p-6 sm:p-7">
            <legend className="sr-only">{q.prompt}</legend>
            <p className="flex items-center justify-between gap-3 text-xs tracking-[0.2em] text-gold-deep uppercase">
              <span>Question {i + 1} of {questions.length}</span>
              <span>{q.required ? "" : "Optional"}{q.private ? `${q.required ? "" : " · "}Private` : ""}</span>
            </p>
            <p className="display mt-3 text-2xl sm:text-3xl" style={{ color: "var(--burgundy)" }}>{q.prompt}</p>
            <div className="mt-5 space-y-2">
              {q.kind === "single_choice" || q.kind === "multi_choice" ? (
                q.options!.map((o) => (
                  <label key={o} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 transition hover:border-gold/60 has-[:checked]:border-gold has-[:checked]:bg-gold/10">
                    <input type={q.kind === "single_choice" ? "radio" : "checkbox"} name={q.id} value={o} defaultChecked={chosen.includes(o)} className="mt-1 accent-[var(--burgundy)]" />
                    <span>{o}</span>
                  </label>
                ))
              ) : q.kind === "long_text" ? (
                <textarea name={q.id} rows={4} maxLength={2000} defaultValue={typeof a === "string" ? a : ""} className="field w-full" />
              ) : q.kind === "date" ? (
                <input type="date" name={q.id} defaultValue={typeof a === "string" ? a : ""} className="field" required={q.required} />
              ) : q.kind === "range" ? (
                <div className="flex items-center gap-3">
                  <input type="number" name={`${q.id}.min`} min={30} max={99} defaultValue={(a as { min?: number })?.min ?? 30} className="field w-24" aria-label="From age" />
                  <span className="text-muted">to</span>
                  <input type="number" name={`${q.id}.max`} min={30} max={99} defaultValue={(a as { max?: number })?.max ?? 65} className="field w-24" aria-label="To age" />
                </div>
              ) : (
                <input name={q.id} maxLength={200} defaultValue={typeof a === "string" ? a : ""} className="field w-full" placeholder={q.kind === "location" ? "Birmingham, AL" : ""} />
              )}
              {q.reflection && (
                <label className="block pt-2 text-sm text-muted">
                  Add a reflection (optional)
                  <textarea name={`${q.id}.reflection`} rows={2} maxLength={2000} className="field mt-1.5 w-full" />
                </label>
              )}
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Save my answers"}</button>
        <Link href={nextHref} className="btn btn-ghost">{nextLabel}</Link>
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>}
      <p className="text-xs text-faint">You can leave and come back anytime — saved answers are kept.</p>
    </form>
  );
}
