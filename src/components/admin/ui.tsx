export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: string }) {
  return (
    <div className="glass p-5">
      <p className="text-[0.65rem] tracking-[0.22em] uppercase text-faint">{label}</p>
      <p className="display mt-3 text-4xl" style={accent ? { color: accent } : undefined}>{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-faint">{children}</p>;
}

export function NotConnected() {
  return (
    <div className="mb-8 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm text-gold">
      Supabase is not connected yet. Add the Supabase environment variables (see docs/SETUP.md) to see live data.
    </div>
  );
}
