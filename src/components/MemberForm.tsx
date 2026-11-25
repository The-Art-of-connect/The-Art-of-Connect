"use client";
import { useActionState, useEffect } from "react";

type R = { ok: boolean; message: string; url?: string } | null;

/** A member form that shows its result inline and opens secure checkout when the server returns one. */
export function MemberForm({ action, children, className = "" }: { action: (p: R, f: FormData) => Promise<R>; children: React.ReactNode; className?: string }) {
  const [state, run, pending] = useActionState(action, null);
  useEffect(() => { if (state?.ok && state.url) window.location.assign(state.url); }, [state]);
  return (
    <form action={run} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      {state && <p className={`mt-2 text-sm ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>}
    </form>
  );
}
