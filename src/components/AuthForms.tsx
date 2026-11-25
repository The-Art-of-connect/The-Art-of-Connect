"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import type { Selection } from "@/lib/pricing";

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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function JoinForm({ selection, loveStatus, minimumAge }: { selection: Selection; loveStatus: "single" | "couple" | null; minimumAge: number }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, null);
  if (state?.notice) return <p className="py-6 text-center text-muted" role="status">{state.notice}</p>;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => thisYear - minimumAge - i);
  return (
    <form action={action} className="space-y-4">
      {selection.experiences.map((e) => <input key={e} type="hidden" name="experiences" value={e} />)}
      {selection.addons.map((a) => <input key={a} type="hidden" name="addons" value={a} />)}
      <input type="hidden" name="interval" value={selection.interval} />
      <input type="hidden" name="couples" value={selection.couples ? "1" : ""} />
      <input type="hidden" name="loveStatus" value={loveStatus ?? ""} />

      <input name="displayName" required autoComplete="given-name" placeholder="First name" className="field" aria-label="First name" />
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className="field" aria-label="Email" />
      <input name="password" type="password" required minLength={12} autoComplete="new-password" placeholder="Password (12+ characters)" className="field" aria-label="Password" />

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Date of birth <span className="text-faint">— confirms you’re {minimumAge}+; never shown on your profile</span></legend>
        <div className="grid grid-cols-[1.4fr_1fr_1.2fr] gap-2">
          <select name="dobMonth" required className="field" aria-label="Birth month" defaultValue="">
            <option value="" disabled>Month</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select name="dobDay" required className="field" aria-label="Birth day" defaultValue="">
            <option value="" disabled>Day</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
          <select name="dobYear" required className="field" aria-label="Birth year" defaultValue="">
            <option value="" disabled>Year</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
        <span>I agree to the <Link href="/legal/terms-of-service" className="text-gold underline">Terms of Service</Link>, <Link href="/legal/membership-agreement" className="text-gold underline">Membership Agreement</Link>, <Link href="/legal/community-standards" className="text-gold underline">Community Standards</Link> and <Link href="/legal/refund-policy" className="text-gold underline">Refund Policy</Link>, and I have read the <Link href="/legal/privacy-policy" className="text-gold underline">Privacy Policy</Link>.</span>
      </label>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-gold w-full" disabled={pending}>{pending ? "Creating your account…" : "Become a Member"}</button>
    </form>
  );
}
