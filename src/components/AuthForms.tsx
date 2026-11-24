"use client";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className="field" aria-label="Email" />
      <input name="password" type="password" required minLength={8} autoComplete="current-password" placeholder="Password" className="field" aria-label="Password" />
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-gold w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function JoinForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, null);
  if (state?.notice) return <p className="text-center text-muted" role="status">{state.notice}</p>;
  return (
    <form action={action} className="space-y-4">
      <input name="displayName" required autoComplete="given-name" placeholder="First name" className="field" aria-label="First name" />
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className="field" aria-label="Email" />
      <input name="password" type="password" required minLength={12} autoComplete="new-password" placeholder="Password (12+ characters)" className="field" aria-label="Password" />
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-gold w-full" disabled={pending}>{pending ? "Creating…" : "Create membership"}</button>
    </form>
  );
}
