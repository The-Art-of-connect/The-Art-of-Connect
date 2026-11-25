"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";
import { NavIcon } from "@/components/nav/NavIcons";
import { badgeFor, linkFor } from "@/components/nav/linkFor";
import { ProfileList } from "@/components/nav/ProfileMenu";

/** Phones and tablets: six expandable categories — easy to discover, never everything at once. */
export function MobileMenu({ state }: { state: NavState }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong lg:hidden" aria-label="Open menu" aria-expanded={open} aria-controls="mobile-menu">
        <span className="flex w-5 flex-col gap-[5px]" aria-hidden="true"><span className="h-px w-full bg-gold" /><span className="h-px w-3/4 bg-gold" /><span className="h-px w-full bg-gold" /></span>
      </button>

      {mounted && createPortal(
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu"
          className={`theme-dark fixed inset-0 z-50 flex flex-col bg-ink transition-[opacity,visibility] duration-300 lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_80%_0%,rgb(116_63_77/0.35),transparent_70%)]" />
          <div className="relative flex h-16 items-center justify-between px-4 sm:px-8">
            <span className="eyebrow">The Art of Connect</span>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-2xl leading-none text-gold" aria-label="Close menu">×</button>
          </div>
          <nav className="relative flex-1 overflow-y-auto px-4 pb-10 sm:px-8" aria-label="Mobile">
            <form action="/search" role="search" className="mb-5 flex gap-2" onSubmit={() => setOpen(false)}>
              <input name="q" placeholder="Search the site" aria-label="Search the site" enterKeyHint="search" className="field !bg-white/5 !text-ivory placeholder:!text-ivory/50" />
              <button className="btn btn-gold shrink-0 !px-5">Search</button>
            </form>
            <ul className="divide-y divide-line border-y border-line">
              {NAV.map((g) => (
                <li key={g.key}>
                  <button type="button" onClick={() => setExpanded(expanded === g.key ? null : g.key)} aria-expanded={expanded === g.key}
                    className="flex w-full items-center justify-between py-4 text-left">
                    <span><span className="display block text-3xl">{g.label}</span><span className="block text-xs text-muted">{g.intro}</span></span>
                    <NavIcon name="chevron" className={`h-5 w-5 text-gold transition ${expanded === g.key ? "rotate-180" : ""}`} />
                  </button>
                  {expanded === g.key && (
                    <ul className="mb-4 space-y-1 border-l border-champagne/40 pl-4">
                      {g.links.map((l) => {
                        const badge = badgeFor(l, state);
                        return (
                          <li key={l.href + l.label}>
                            <Link href={linkFor(l, state)} onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 py-2.5 text-ivory/90">
                              <span>{l.label}</span>{badge && <span className="rounded-full border border-champagne/40 px-2 py-0.5 text-[0.62rem] text-gold">{badge}</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {state.signedIn ? (
              <div className="mt-8"><ProfileList state={state} onNavigate={() => setOpen(false)} /></div>
            ) : (
              <div className="mt-8 grid gap-3">
                <Link href="/membership#build" className="btn btn-gold w-full" onClick={() => setOpen(false)}>Build Your Membership</Link>
                <Link href="/sign-in" className="btn btn-ghost w-full" onClick={() => setOpen(false)}>Member sign in</Link>
              </div>
            )}
            <a href="mailto:info@theartofconnect.com" className="mt-8 block text-center text-sm text-gold">info@theartofconnect.com</a>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
