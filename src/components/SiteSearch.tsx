"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchEntries, type SearchEntry } from "@/lib/search-index";

function Glass({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

/**
 * Search for the area you're in. Opens with the button, “/” or Ctrl/⌘+K.
 * Shows instant results from the page index and always offers a way home.
 */
export function SiteSearch({
  entries,
  quick,
  home = { href: "/", label: "Home" },
  allResults = true,
  label = "Search",
}: {
  entries: SearchEntry[];
  quick: SearchEntry[];
  home?: { href: string; label: string };
  allResults?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "") || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    setTimeout(() => input.current?.focus(), 30);
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const results = useMemo(() => (q.trim() ? searchEntries(entries, q, 12) : quick), [q, entries, quick]);
  useEffect(() => setActive(0), [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    if (href.startsWith("mailto:")) window.location.href = href;
    else router.push(href);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].href);
      else if (allResults && q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="nav-pill inline-flex h-11 items-center gap-2 !px-3 text-[0.82rem] text-ivory/85 sm:!px-4"
        aria-label="Search the site"
        aria-haspopup="dialog"
      >
        <Glass className="h-[18px] w-[18px] text-gold" />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[8vh] sm:px-6" role="dialog" aria-modal="true" aria-label="Search">
          <button type="button" className="absolute inset-0 bg-ink/70 backdrop-blur-sm" aria-label="Close search" onClick={() => setOpen(false)} />
          <div className="theme-ivory relative w-full max-w-xl overflow-hidden rounded-[22px] border border-champagne/50 bg-ivory shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
              <Glass className="h-5 w-5 shrink-0 text-gold" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="What are you looking for?"
                className="min-h-[44px] w-full bg-transparent text-base text-text outline-none placeholder:text-faint"
                aria-label="Search"
                aria-controls="search-results"
                aria-activedescendant={results[active] ? `sr-${active}` : undefined}
                enterKeyHint="search"
                autoComplete="off"
              />
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-muted">Close</button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {!q.trim() && <p className="px-5 pt-2 pb-1 text-[0.65rem] tracking-[0.25em] uppercase text-faint">Popular</p>}
              {results.length ? (
                <ul id="search-results" role="listbox">
                  {results.map((r, i) => (
                    <li key={r.href + r.title} id={`sr-${i}`} role="option" aria-selected={i === active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r.href)}
                        className={`flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition-colors ${i === active ? "bg-champagne/15" : ""}`}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-text">{r.title}</span>
                          <span className="block truncate text-xs text-muted">{r.summary}</span>
                        </span>
                        <span className="shrink-0 rounded-full border border-champagne/50 px-2 py-0.5 text-[0.65rem] text-gold">{r.section}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-6 text-center text-sm text-muted">
                  <p>No pages match “{q}”.</p>
                  <p className="mt-1">Try a simpler word — like “price”, “webinar”, “cancel” or “journal”.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-sm">
              <Link href={home.href} onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 font-semibold text-gold">
                <span aria-hidden="true">←</span> {home.label}
              </Link>
              {allResults && q.trim() ? (
                <Link href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={() => setOpen(false)} className="text-gold underline">
                  See all results
                </Link>
              ) : (
                <span className="hidden text-xs text-faint sm:inline">Tip: press / to search from anywhere</span>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
