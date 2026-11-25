"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";
import { NavIcon } from "@/components/nav/NavIcons";
import { badgeFor, linkFor } from "@/components/nav/linkFor";

export const inGroup = (path: string, hrefs: string[]) => hrefs.some((h) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/")));

/** Six categories with elegant dropdowns (hover or tap; keyboard accessible). */
export function DesktopNav({ state }: { state: NavState }) {
  const [open, setOpen] = useState<string | null>(null);
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("click", onClick); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", onClick); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <nav ref={ref} className="hidden items-center gap-0.5 text-[0.82rem] text-ivory/85 xl:flex" aria-label="Primary">
      {NAV.map((g) => {
        const active = g.key === "home" ? path === "/" : inGroup(path, [g.href, ...g.links.map((l) => l.href)]);
        return (
          <div key={g.key} className="relative" onMouseEnter={() => setOpen(g.key)} onMouseLeave={() => setOpen(null)}>
            <button type="button" aria-expanded={open === g.key} aria-haspopup="true" onClick={() => setOpen(open === g.key ? null : g.key)}
              className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 transition ${active ? "bg-burgundy text-ivory" : "hover:bg-white/10"}`}>
              {g.label}<NavIcon name="chevron" className="h-3.5 w-3.5 opacity-70" />
            </button>
            {open === g.key && (
              <div className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-3">
                <div className="theme-ivory overflow-hidden rounded-2xl border border-champagne/70 bg-ivory text-left shadow-2xl">
                  <div className="border-b border-champagne/50 px-5 py-4">
                    <p className="display text-xl text-burgundy">{g.label}</p>
                    <p className="text-xs text-muted">{g.intro}</p>
                  </div>
                  <ul className="py-2">
                    {g.links.map((l) => {
                      const badge = badgeFor(l, state);
                      return (
                        <li key={l.href + l.label}>
                          <Link href={linkFor(l, state)} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm text-text transition hover:bg-champagne/15">
                            <span><span className="block">{l.label}</span>{l.note && <span className="block text-xs text-muted">{l.note}</span>}</span>
                            {badge ? <span className="shrink-0 rounded-full border border-champagne/70 px-2 py-0.5 text-[0.65rem] text-gold-deep">{badge}</span> : <span className="text-gold-deep" aria-hidden="true">›</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
