"use client";
import { useActionState } from "react";
import { fileAppeal } from "@/app/actions/journey-member";

export function AppealForm() {
  const [state, action, pending] = useActionState(fileAppeal, null);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input name="regarding" required maxLength={200} className="field w-full" placeholder="What is this about? e.g. Account restriction on Nov 20" />
      <textarea name="explanation" required rows={4} maxLength={4000} className="field w-full" placeholder="Tell us what happened and anything you'd like us to consider." />
      <button className="btn btn-ghost" disabled={pending}>{pending ? "Sending…" : "Send my appeal"}</button>
      {state && <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>}
    </form>
  );
}
