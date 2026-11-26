import type { readiness } from "@/lib/sanctuary";

/** The private Connection Readiness indicator: information completeness only, never a person's worth or maturity. */
export function ReadinessCard({ r }: { r: ReturnType<typeof readiness> }) {
  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">Connection Readiness · private to you</p>
        <p className="display text-3xl text-gold">{r.percent}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gold/15" role="progressbar" aria-valuenow={r.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Connection Readiness"><div className="h-full rounded-full bg-gold" style={{ width: `${r.percent}%` }} /></div>
      <p className="mt-3 text-xs text-muted">This shows how much you&rsquo;ve chosen to share for suggestions. It measures information, not your worth or maturity, and nobody else can see it.</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {r.parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-3"><span>{p.label}</span><span className="text-xs text-muted">{p.key === "discovery" ? `${p.done}%` : `${p.done} of ${p.of}`}</span></li>
        ))}
      </ul>
      {r.needsConsent && <p className="mt-3 text-xs text-gold-deep">Scenario answers and Who Am I? progress count only if you allow them to be used for your suggestions, in <a href="/app/sanctuary/settings" className="underline">Reminders &amp; privacy</a>.</p>}
      {!r.sufficient && <p className="mt-3 text-sm text-muted">Completing a few more discovery activities will make suggestions more relevant to you.</p>}
    </div>
  );
}
