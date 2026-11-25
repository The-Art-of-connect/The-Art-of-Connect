"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";
import { EXPERIENCES, EXPERIENCE_ORDER, type Experience } from "@/lib/experiences";
import { Turnstile, useTurnstileReady } from "@/components/Turnstile";

/** Optional pre-launch "notify me when enrollment opens" form. */
export function WaitlistForm() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);
  const [chosen, setChosen] = useState<Experience[]>([]);
  const [verified, setVerified] = useTurnstileReady();
  const love = chosen.includes("relationships");

  if (state?.ok) {
    return (
      <div className="py-8 text-center" role="status">
        <p className="display text-3xl text-gold">Thank you.</p>
        <p className="mt-3 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-muted">Full name</span>
          <input name="fullName" autoComplete="name" className="field" placeholder="Your name" />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-muted">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" placeholder="you@domain.com" />
        </label>
      </div>
      <fieldset>
        <legend className="mb-3 text-sm text-muted">I’m interested in</legend>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_ORDER.map((key) => (
            <label key={key} className="chip min-h-11 cursor-pointer !px-4 !text-[0.72rem] has-[:checked]:border-champagne has-[:checked]:bg-champagne/15 has-[:checked]:text-text">
              <input
                type="checkbox"
                name="interests"
                value={key}
                className="sr-only"
                onChange={(e) => setChosen((c) => (e.target.checked ? [...c, key] : c.filter((x) => x !== key)))}
              />
              {EXPERIENCES[key].name}
            </label>
          ))}
        </div>
      </fieldset>
      {love && (
        <fieldset className="explorer-panel">
          <legend className="mb-3 text-sm text-muted">For In Love, I am</legend>
          <div className="flex flex-wrap gap-2">
            {([["single", "Single, seeking a connection"], ["couple", "In a relationship"]] as const).map(([value, label]) => (
              <label key={value} className="chip min-h-11 cursor-pointer !px-4 normal-case !tracking-normal !text-sm has-[:checked]:border-champagne has-[:checked]:bg-champagne/15 has-[:checked]:text-text">
                <input type="radio" name="loveTrack" value={value} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Turnstile action="waitlist" resetSignal={state} onReady={setVerified} />
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold w-full sm:w-auto" disabled={pending || !verified}>{pending ? "Saving…" : verified ? "Notify me" : "Verifying…"}</button>
      <p className="text-sm text-muted">
        Are you a counselor, coach or mentor? <Link href="/professionals" className="text-gold underline underline-offset-4">Visit the professional pathway</Link>.
      </p>
      <p className="text-xs text-faint">We’ll only use your email to tell you when enrollment opens. No spam, ever.</p>
    </form>
  );
}
