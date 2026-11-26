"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, FEATURES, STATUS_LABEL, included, needsLabel, type Viewer } from "@/lib/features";

/**
 * "What Does This Website Offer?" (founder directive 20): searchable, expandable, Expand All / Collapse All. Descriptions of
 * paid features are readable by everyone; using them is enforced separately on the server and in the database.
 */
export function FeatureDirectory({ viewer, signedIn }: { viewer: Viewer | null; signedIn: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FEATURES.filter((f) => (cat === "All" || f.category === cat) && (!s || `${f.name} ${f.what} ${f.provides} ${f.category}`.toLowerCase().includes(s)));
  }, [q, cat]);
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const groups = CATEGORIES.filter((c) => list.some((f) => f.category === c));
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search features (e.g. travel, Journey, couples)" className="field flex-1" aria-label="Search features" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="field sm:w-64" aria-label="Category"><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(new Set(list.map((f) => f.key)))} className="btn btn-ghost btn-sm">Expand all</button>
          <button type="button" onClick={() => setOpen(new Set())} className="btn btn-ghost btn-sm">Collapse all</button>
        </div>
      </div>
      {!list.length && <p className="mt-8 text-sm text-muted">No features match that search.</p>}
      {groups.map((c) => (
        <section key={c} className="mt-10">
          <h2 className="eyebrow">{c}</h2>
          <ul className="mt-3 space-y-2">
            {list.filter((f) => f.category === c).map((f) => {
              const inc = included(f, viewer);
              const live = f.status === "available";
              const isOpen = open.has(f.key);
              return (
                <li key={f.key} className={`rounded-2xl border ${inc && live ? "border-champagne/60 bg-white" : "border-line bg-stone-100/70"}`}>
                  <button type="button" onClick={() => toggle(f.key)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-4 text-left">
                    <span className={`font-semibold ${inc && live ? "" : "text-muted"}`}>{f.name}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      {!live && <span className="chip">{STATUS_LABEL[f.status]}</span>}
                      {signedIn ? (inc ? <span className="chip chip-live">Included</span> : <span className="chip chip-locked">🔒 Upgrade</span>) : <span className="text-faint">{needsLabel(f)}</span>}
                      <span aria-hidden="true" className="text-gold">{isOpen ? "−" : "+"}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="grid gap-3 border-t border-line px-5 py-4 text-sm sm:grid-cols-2">
                      <p><span className="font-semibold">What it is. </span>{f.what}</p>
                      <p><span className="font-semibold">What it provides. </span>{f.provides}</p>
                      <p><span className="font-semibold">How it helps you. </span>{f.benefit}</p>
                      <p><span className="font-semibold">How to use it. </span>{f.how}</p>
                      <p><span className="font-semibold">Who it&rsquo;s for. </span>{needsLabel(f)}{f.eligibility ? ` · ${f.eligibility}` : ""}</p>
                      <p><span className="font-semibold">Status. </span>{STATUS_LABEL[f.status]}{live ? "" : ": not available yet"}</p>
                      <div className="flex flex-wrap gap-3 sm:col-span-2">
                        {live && f.href && (inc || !signedIn) && <Link href={f.href} className="btn btn-gold btn-sm">{signedIn ? "Open" : "See it"}</Link>}
                        {live && !inc && (signedIn ? (
                          "elite" in f.needs ? <Link href="/app/elite/eligibility" className="btn btn-ghost btn-sm">Apply for Elite</Link>
                            : <Link href="/app/onboarding" className="btn btn-ghost btn-sm">Start a 15-day trial or upgrade</Link>
                        ) : <Link href="/join" className="btn btn-ghost btn-sm">Join or begin free</Link>)}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
