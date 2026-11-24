"use client";
import Link from "next/link";
import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";

export function WaitlistForm() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);

  if (state?.ok) {
    return (
      <div className="py-10 text-center" role="status">
        <p className="display text-3xl text-gold-bright">Thank you. Your place is reserved.</p>
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
            <label key={key} className="chip min-h-11 cursor-pointer !px-4 !text-[0.72rem] has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-text">
              <input type="checkbox" name="interests" value={key} className="sr-only" />
              {EXPERIENCES[key].name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm text-muted">For In Love, I am</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["single", "Single, seeking a connection"],
            ["couple", "In a relationship"],
            ["", "Not applicable"],
          ].map(([value, label]) => (
            <label key={label} className="chip min-h-11 cursor-pointer !px-4 normal-case !tracking-normal !text-sm has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-text">
              <input type="radio" name="loveTrack" value={value} defaultChecked={value === ""} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold w-full sm:w-auto" disabled={pending}>
        {pending ? "Reserving…" : "Request your invitation"}
      </button>
      <p className="text-sm text-muted">
        Are you a counselor, coach or mentor? <Link href="/professionals" className="text-gold underline-offset-4 hover:underline">Visit the professional pathway</Link>.
      </p>
      <p className="text-xs text-faint">We’ll only use your email to contact you about membership. No spam, ever.</p>
    </form>
  );
}
