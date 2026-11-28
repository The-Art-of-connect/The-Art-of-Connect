"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MEMBER_TABS, PUBLIC_PRIMARY } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";

export const inGroup = (path: string, hrefs: readonly string[]) => hrefs.some((h) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/")));

/** Luxury Through Simplicity (directive 35): a few clear destinations, no dropdowns. */
export function DesktopNav({ state }: { state: NavState }) {
  const path = usePathname();
  const items = state.signedIn
    ? MEMBER_TABS.map((t) => ({ href: t.href, label: t.label, on: t.href === "/app" ? path === "/app" : inGroup(path, t.match) }))
    : PUBLIC_PRIMARY.map((t) => ({ href: t.href, label: t.label, on: t.href === "/" ? path === "/" : inGroup(path, [t.href]) }));
  return (
    <nav className="hidden items-center gap-1 text-[0.86rem] text-ivory/85 lg:flex" aria-label="Primary">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.on ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 transition ${i.on ? "bg-burgundy text-ivory" : "hover:bg-white/10"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}
