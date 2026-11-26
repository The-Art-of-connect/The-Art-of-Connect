"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, signUpBusiness, signUpElite, signUpFree, type AuthState } from "@/app/actions/auth";
import type { Selection } from "@/lib/pricing";
import { LEGAL_TITLES, REGISTRATION_DOCS } from "@/lib/legal-requirements";
import { Turnstile, useTurnstileReady } from "@/components/Turnstile";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, null);
  const [verified, setVerified] = useTurnstileReady();
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className="field" aria-label="Email" />
      <input name="password" type="password" required minLength={8} autoComplete="current-password" placeholder="Password" className="field" aria-label="Password" />
      <Turnstile action="sign_in" resetSignal={state} onReady={setVerified} />
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-gold w-full" disabled={pending || !verified}>{pending ? "Signing in…" : verified ? "Sign in" : "Verifying…"}</button>
    </form>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const SOCIETIES = [
  { id: "business", title: "The Professional Society", line: "Business · Adults 21+" },
  { id: "singles", title: "The Personal Society · Singles", line: "Intentional dating · Adults 30+" },
  { id: "couples", title: "The Personal Society · Couples", line: "Growing together · Both partners 21+" },
];

export function JoinForm({ selection, loveStatus, minimumAge, business = false, free = false, elite = false, society = null }: { selection: Selection; loveStatus: "single" | "couple" | null; minimumAge: number; business?: boolean; free?: boolean; elite?: boolean; society?: string | null }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(elite ? signUpElite : free ? signUpFree : business ? signUpBusiness : signUp, null);
  const [verified, setVerified] = useTurnstileReady();
  if (state?.notice) return <p className="py-6 text-center text-muted" role="status">{state.notice}</p>;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => thisYear - minimumAge - i);
  return (
    <form action={action} className="space-y-4">
      {free && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm text-muted">Choose your society <span className="text-faint">(one to begin; The Art of Self is included for everyone)</span></legend>
          {SOCIETIES.map((x) => (
            <label key={x.id} className="block cursor-pointer">
              <input type="radio" name="society" value={x.id} required defaultChecked={society === x.id} className="peer sr-only" />
              <span className="block rounded-2xl border border-line px-4 py-3 transition peer-checked:border-gold peer-checked:bg-gold/10 peer-focus-visible:ring-2 peer-focus-visible:ring-gold">
                <span className="block font-semibold">{x.title}</span><span className="block text-xs text-muted">{x.line}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {selection.experiences.map((e) => <input key={e} type="hidden" name="experiences" value={e} />)}
      {selection.addons.map((a) => <input key={a} type="hidden" name="addons" value={a} />)}
      <input type="hidden" name="interval" value={selection.interval} />
      <input type="hidden" name="package" value={selection.package ?? ""} />
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
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--champagne)]" />
        <span>
          I have read and agree to the{" "}
          {REGISTRATION_DOCS.map((slug, i) => (
            <span key={slug}>
              <Link href={`/legal/${slug}`} target="_blank" className="text-gold underline">{LEGAL_TITLES[slug]}</Link>
              {i < REGISTRATION_DOCS.length - 2 ? ", " : i === REGISTRATION_DOCS.length - 2 ? " and " : "."}
            </span>
          ))}
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketing" className="mt-1 h-4 w-4 shrink-0 accent-[var(--champagne)]" />
        <span>Optional: send me occasional news, events and offers from The Art of Connect. You can unsubscribe at any time.</span>
      </label>
      <Turnstile action="sign_up" resetSignal={state} onReady={setVerified} />
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-gold w-full" disabled={pending || !verified}>{pending ? "Creating your account…" : verified ? (elite ? "Create my account and apply" : business ? "Create my free business account" : "Become a Member") : "Verifying…"}</button>
    </form>
  );
}
