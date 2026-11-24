"use client";
import { useActionState } from "react";
import type { ActionResult } from "@/app/actions/admin";

/** Wraps a server action form and shows its result inline. */
export function ActionForm({
  action,
  children,
  className = "",
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      {state && (
        <p className={`mt-2 text-xs ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>
      )}
    </form>
  );
}
