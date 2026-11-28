"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** In Love's own short navigation (directive 38). The four global destinations stay unchanged. */
export function InLoveTabs({ tabs }: { tabs: readonly { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app/relationships" ? path === href : path.startsWith(href));
  return (
    <nav aria-label="In Love" className="mt-6 grid border-b border-line" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={active(t.href) ? "page" : undefined}
          className={`-mb-px px-0.5 py-3 text-center text-[0.74rem] leading-tight tracking-tight transition min-[400px]:text-[0.8rem] sm:text-[0.95rem] sm:tracking-normal ${active(t.href) ? "border-b-2 border-gold font-semibold text-text" : "text-muted hover:text-text"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
