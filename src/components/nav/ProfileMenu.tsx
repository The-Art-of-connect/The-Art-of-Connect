"use client";
import Link from "next/link";
import { messagesLeft } from "@/lib/journey";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PROFILE_LINKS } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";
import { NavIcon } from "@/components/nav/NavIcons";

/** The member's own menu: dashboard, profile, membership, Journey allowance, notifications, privacy and sign out. */
export function ProfileList({ state, onNavigate }: { state: NavState; onNavigate?: () => void }) {
  return (
    <div className="theme-ivory overflow-hidden rounded-2xl border border-champagne/70 bg-ivory text-left text-text shadow-2xl">
      <div className="border-b border-champagne/50 px-5 py-4">
        <p className="display text-xl text-burgundy">{state.name ?? "My account"}</p>
        {state.paid ? (
          <p className="mt-1 text-xs text-muted">Journey: <span className="font-semibold text-gold-deep">{state.balance ?? "included"}</span></p>
        ) : state.staff ? (
          <p className="mt-1 text-xs text-muted">Team account</p>
        ) : (
          <p className="mt-1 text-xs text-muted">Self-guided education · <Link href="/membership" onClick={onNavigate} className="text-burgundy underline">Explore Journey</Link></p>
        )}
      </div>
      <ul className="py-2">
        {PROFILE_LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} onClick={onNavigate} className="flex items-center justify-between px-5 py-2.5 text-sm transition hover:bg-champagne/15">
              {l.label}
            </Link>
          </li>
        ))}
        {state.staff && <li><Link href="/admin" onClick={onNavigate} className="block px-5 py-2.5 text-sm font-semibold text-burgundy hover:bg-champagne/15">Owner Portal</Link></li>}
      </ul>
      <form action="/auth/sign-out" method="post" className="border-t border-champagne/50">
        <button className="w-full px-5 py-3 text-left text-sm text-muted hover:bg-champagne/15">Sign out</button>
      </form>
    </div>
  );
}

export function ProfileMenu({ state }: { state: NavState }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("click", onClick); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", onClick); window.removeEventListener("keydown", onKey); };
  }, []);
  if (!state.signedIn) return <Link href="/sign-in" className="nav-pill hidden text-[0.82rem] text-ivory/85 lg:inline-flex">Sign in</Link>;
  return (
    <div ref={ref} className="relative hidden lg:block">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-label="My account"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-gold transition hover:border-gold">
        <NavIcon name="profile" className="h-6 w-6" />
      </button>
      {open && <div className="absolute right-0 top-full z-50 w-72 pt-3"><ProfileList state={state} /></div>}
    </div>
  );
}
