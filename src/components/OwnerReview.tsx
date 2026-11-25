"use client";
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { savePageReview } from "@/app/actions/review";

const CHOICES = [
  { value: "approve", label: "I approve", hint: "Ready for members." },
  { value: "changes", label: "Needs changes", hint: "Tell us what to change." },
  { value: "add_more", label: "Add more", hint: "Tell us what to add." },
  { value: "coming_soon", label: "Coming soon", hint: "Members see Coming soon." },
] as const;

/**
 * Owner review bar, shown on every member page to the owner and executives.
 * Floats at the bottom on phones and sits at the corner on larger screens.
 */
export function OwnerReview({ status }: { status: Record<string, string> }) {
  const path = usePathname() ?? "/app";
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<string>("");
  const [state, action, pending] = useActionState(savePageReview, null);
  const current = status[path] === "coming_soon" ? "Coming soon for members" : "Open to members";

  return (
    <div className="theme-dark fixed inset-x-3 bottom-[5.5rem] z-50 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[24rem] lg:bottom-6">
      {open ? (
        <form action={action} className="rounded-2xl border border-gold/40 !bg-espresso/95 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Owner review</p>
              <p className="mt-1 text-xs text-muted">{path} · {current}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-text" aria-label="Close review">Close</button>
          </div>
          <input type="hidden" name="path" value={path} />
          <fieldset className="mt-4 grid grid-cols-2 gap-2" disabled={pending}>
            <legend className="sr-only">Your decision</legend>
            {CHOICES.map((c) => (
              <label key={c.value} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition ${decision === c.value ? "border-gold bg-gold/15" : "border-line-strong hover:border-gold/60"}`}>
                <input type="radio" name="decision" value={c.value} className="sr-only" onChange={() => setDecision(c.value)} checked={decision === c.value} />
                <span className="block text-sm font-semibold text-text">{c.label}</span>
                <span className="block text-[0.7rem] text-faint">{c.hint}</span>
              </label>
            ))}
          </fieldset>
          <label className="mt-3 block text-xs text-muted">
            Notes {decision === "changes" || decision === "add_more" ? "(required)" : "(optional)"}
            <textarea name="notes" rows={3} maxLength={4000} className="field mt-1.5 w-full" placeholder="What would you like changed, added or clarified?" />
          </label>
          <button className="btn btn-gold btn-sm mt-3 w-full" disabled={pending || !decision}>{pending ? "Saving…" : "Save my review"}</button>
          {state && <p className={`mt-2 text-xs ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>}
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="btn btn-gold w-full shadow-2xl sm:w-auto">
          Review this page
        </button>
      )}
    </div>
  );
}

/** What members see on a page the owner has marked Coming soon. Staff see the page with a notice instead. */
export function SectionGate({ status, notes, staff, children }: { status: Record<string, string>; notes: Record<string, string | null>; staff: boolean; children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const soon = status[path] === "coming_soon";
  if (soon && staff) {
    return (
      <>
        <div className="mb-8 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold-deep">
          Members see this page as <strong>Coming soon</strong>. You&rsquo;re seeing the full design for review.
        </div>
        {children}
      </>
    );
  }
  if (soon) {
    return (
      <section className="theme-dark relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] px-8 py-16 text-center sm:px-14 sm:py-20" style={{ background: "var(--ink)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--glow)" }} aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow">The Art of Connect</p>
          <h1 className="display mt-4 text-5xl text-gold-bright sm:text-6xl">Coming soon</h1>
          <p className="mx-auto mt-5 max-w-md text-muted">{notes[path] ?? "We're preparing something beautiful here. It will open to members soon."}</p>
          <div className="mx-auto mt-8 h-px w-24 bg-gold/60" />
          <p className="mt-6 text-xs tracking-[0.3em] text-gold uppercase">In Business · In Life · In Love</p>
        </div>
      </section>
    );
  }
  return <>{children}</>;
}
