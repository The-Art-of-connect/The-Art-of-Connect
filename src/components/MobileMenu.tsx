"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MEMBER_TABS, PUBLIC_PRIMARY } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";
import { NavIcon } from "@/components/nav/NavIcons";
import { ProfileList } from "@/components/nav/ProfileMenu";
import { GatedLink } from "@/components/Upgrade";

/** Phones and tablets (directive 35): the same few destinations as everywhere else, plus the three experiences. */
export function MobileMenu({ state }: { state: NavState }) {
  const [open, setOpen] = useState(false);
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
              {(state.signedIn
                ? [...MEMBER_TABS.map((t) => ({ href: t.href, label: t.label, note: "" })), { href: "/app/life", label: "In Life", note: "Discover yourself. Become more." }, { href: "/app/relationships", label: "In Love", note: "Create meaningful connections." }, { href: "/app/business", label: "In Business", note: "Connect. Collaborate. Prosper." }, { href: "/app/explore", label: "Everything available to me", note: "" }]
                : PUBLIC_PRIMARY.map((t) => ({ href: t.href, label: t.label, note: "" }))
              ).map((l) => (
                <li key={l.href + l.label}>
                  <GatedLink href={l.href} feature={{ name: l.label, what: l.note || undefined }} onClick={() => setOpen(false)} className="flex items-center justify-between py-4">
                    <span><span className="display block text-3xl">{l.label}</span>{l.note && <span className="block text-xs text-muted">{l.note}</span>}</span>
                    <NavIcon name="chevron" className="h-5 w-5 -rotate-90 text-gold" />
                  </GatedLink>
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
