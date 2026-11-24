"use client";
import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";

const options = [
  { value: "relationships", label: "Relationships", color: "var(--relationships)" },
  { value: "business", label: "Business", color: "var(--business)" },
  { value: "counseling", label: "Counseling", color: "var(--counseling)" },
];

export function WaitlistForm() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);

  if (state?.ok) {
    return (
      <div className="py-10 text-center" role="status">
        <p className="display text-3xl text-gold-bright">Welcome to the inner circle.</p>
        <p className="mt-3 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs tracking-wide text-faint">Full name</span>
          <input name="fullName" autoComplete="name" className="field" placeholder="Your name" />
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-wide text-faint">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" placeholder="you@domain.com" />
        </label>
      </div>
      <fieldset>
        <legend className="mb-3 text-xs tracking-wide text-faint">I’m interested in</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <label key={o.value} className="chip cursor-pointer has-[:checked]:border-gold has-[:checked]:text-text">
              <input type="checkbox" name="interests" value={o.value} className="sr-only" />
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: o.color }} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3 text-sm text-muted">
        <input type="checkbox" name="isCounselor" className="h-4 w-4 accent-[var(--gold)]" />
        I’m a licensed counselor interested in joining as a provider
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold w-full sm:w-auto" disabled={pending}>
        {pending ? "Reserving…" : "Request your invitation"}
      </button>
      <p className="text-xs text-faint">We’ll only use your email to contact you about membership. No spam, ever.</p>
    </form>
  );
}
