import Link from "next/link";

const TABS = [
  ["/app/sanctuary", "Today"], ["/app/sanctuary/week", "This week & month"], ["/app/sanctuary/library", "Library"],
  ["/app/sanctuary/discover", "Self-discovery"], ["/app/sanctuary/vision", "My Vision Board"], ["/app/sanctuary/settings", "Reminders & privacy"],
] as const;

export function SanctuaryTabs({ current }: { current: string }) {
  return (
    <nav aria-label="My Daily Sanctuary" className="mb-10 flex gap-2 overflow-x-auto pb-1">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={current === href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${current === href ? "bg-gold font-semibold text-espresso" : "border border-line-strong text-muted hover:text-text"}`}>{label}</Link>
      ))}
    </nav>
  );
}

/** Shown when the owner hasn't published content of a kind yet. Honest: nothing is invented. */
export function AwaitingContent({ what }: { what: string }) {
  return <p className="text-sm text-muted">Today&rsquo;s {what} will appear here once The Art of Connect publishes it.</p>;
}
