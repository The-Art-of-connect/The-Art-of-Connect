"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SITE_NAV } from "@/lib/nav";

/** Full-screen menu for phones and tablets: every link fully visible, nothing cut off. */
export function MobileMenu() {
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
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <span className="flex w-5 flex-col gap-[5px]" aria-hidden="true">
          <span className="h-px w-full bg-gold" />
          <span className="h-px w-3/4 bg-gold" />
          <span className="h-px w-full bg-gold" />
        </span>
      </button>

      {mounted && createPortal(
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`fixed inset-0 z-50 flex flex-col bg-ink transition-[opacity,visibility] duration-300 lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_80%_0%,rgb(116_63_77/0.35),transparent_70%)]" />
        <div className="relative flex h-16 items-center justify-between px-4 sm:h-20 sm:px-8">
          <span className="eyebrow">In Business. In Life. In Love.</span>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-2xl leading-none text-gold"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <nav className="relative flex-1 overflow-y-auto px-4 pb-8 sm:px-8" aria-label="Mobile">
          <ul className="divide-y divide-line border-y border-line">
            {SITE_NAV.map((item, i) => (
              <li key={item.href} style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }} className={`transition-all duration-500 ${open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
                <Link href={item.href} className="flex items-baseline justify-between gap-4 py-5" onClick={() => setOpen(false)}>
                  <span className="display text-4xl">{item.label}</span>
                  <span className="text-right text-xs text-muted">{item.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid gap-3">
            <Link href="/#invitation" className="btn btn-gold w-full" onClick={() => setOpen(false)}>Request your invitation</Link>
            <Link href="/sign-in" className="btn btn-ghost w-full" onClick={() => setOpen(false)}>Member sign in</Link>
          </div>
          <a href="mailto:info@theartofconnect.com" className="mt-8 block text-center text-sm text-gold">info@theartofconnect.com</a>
        </nav>
      </div>,
      document.body,
      )}
    </>
  );
}
