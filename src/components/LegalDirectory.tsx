"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type Doc = { slug: string; title: string; category: string; summary: string; in_effect: boolean; version: string | null; effective_date: string | null };

/** Searchable list of policies, grouped by category. */
export function LegalDirectory({ docs, categories }: { docs: Doc[]; categories: Record<string, string> }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? docs.filter((d) => `${d.title} ${d.summary}`.toLowerCase().includes(t)) : docs;
  }, [q, docs]);
  const groups = Object.keys(categories).filter((c) => filtered.some((d) => d.category === c));

  return (
    <div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Search policies</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search policies — e.g. refund, privacy, couples" className="field !pl-11" />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold" aria-hidden="true">⌕</span>
      </label>
      <p className="mt-3 text-sm text-muted" aria-live="polite">{filtered.length} of {docs.length} documents</p>
      <div className="mt-10 space-y-12">
        {groups.map((c) => (
          <section key={c}>
            <h2 className="eyebrow">{categories[c]}</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {filtered.filter((d) => d.category === c).map((d) => (
                <li key={d.slug}>
                  <Link href={`/legal/${d.slug}`} className="group flex flex-col gap-1 py-5 transition-colors hover:bg-champagne/10 sm:flex-row sm:items-baseline sm:justify-between sm:px-3">
                    <span>
                      <span className="display text-2xl text-text group-hover:text-gold">{d.title}</span>
                      <span className="block text-sm text-muted">{d.summary}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {d.in_effect ? `Effective ${d.effective_date ?? ""} · v${d.version}` : <span className="chip chip-locked normal-case tracking-normal">Being finalized</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!filtered.length && <p className="text-muted">No policies match “{q}”.</p>}
      </div>
    </div>
  );
}
