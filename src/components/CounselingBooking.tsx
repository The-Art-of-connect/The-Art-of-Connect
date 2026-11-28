import Link from "next/link";
import { CRISIS } from "@/lib/wellness";

/** The honest "not open yet" state for counseling appointments (no redirect, no upgrade prompt). */
export function NotOpenYet() {
  return (
    <>
      <Link href="/app/wellness" className="text-sm font-semibold text-gold">← Counseling &amp; Wellness Center</Link>
      <section className="glass mx-auto mt-6 max-w-2xl p-8 text-center sm:p-10" aria-labelledby="not-open">
        <p className="eyebrow">Counseling appointments</p>
        <h1 id="not-open" className="display mt-3 text-4xl">Not open yet</h1>
        <p className="mt-4 text-muted">Booking appointments with verified counselors opens after our legal, licensing and privacy review is complete. Nothing is wrong with your account, and no membership is required: when it opens, every member will be able to request a time here.</p>
        <p className="mt-3 text-sm text-muted">Until then, you can save your private support preferences so we can suggest counselors who fit you.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/app/wellness#prefs" className="btn btn-gold">Save my support preferences</Link>
          <Link href="/app/know-yourself" className="btn btn-ghost">The Art of Knowing Yourself</Link>
        </div>
      </section>
      <section aria-label="If you need help right now" className="mx-auto mt-8 max-w-2xl rounded-[24px] border border-danger/30 bg-danger/5 p-6">
        <h2 className="display text-2xl">If you need help right now</h2>
        <ul className="mt-3 space-y-2 text-sm">{CRISIS.map((c) => <li key={c.label}><span className="font-semibold">{c.label}:</span> {c.detail}</li>)}</ul>
      </section>
    </>
  );
}

/** Shown to staff and the owner-listed QA account while appointments are closed to members. */
export function TestingNotice() {
  return (
    <p className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold" role="note">
      Pre-launch testing: appointments are not open to members. You can test the full flow with fictional (test) counselors only, and no payment is ever taken.
    </p>
  );
}
