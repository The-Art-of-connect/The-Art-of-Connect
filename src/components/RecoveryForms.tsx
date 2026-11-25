"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, setNewPassword, type AuthState } from "@/app/actions/auth";
import { Turnstile, useTurnstileReady } from "@/components/Turnstile";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  const [verified, setVerified] = useTurnstileReady();
  if (state?.notice) return <p className="text-muted" role="status">{state.notice}</p>;
  return (
    <form action={action} className="space-y-4">
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className="field" aria-label="Email" />
      <Turnstile action="password_reset" resetSignal={state} onReady={setVerified} />
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-gold w-full" disabled={pending || !verified}>{pending ? "Sending…" : verified ? "Send reset link" : "Verifying…"}</button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setNewPassword, null);
  if (state?.notice) return <p className="text-muted" role="status">{state.notice} <Link href="/sign-in" className="text-gold underline">Sign in</Link></p>;
  return (
    <form action={action} className="space-y-4">
      <input name="password" type="password" required minLength={12} autoComplete="new-password" placeholder="New password (12+ characters)" className="field" aria-label="New password" />
      <input name="confirm" type="password" required minLength={12} autoComplete="new-password" placeholder="Confirm new password" className="field" aria-label="Confirm new password" />
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-gold w-full" disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}
