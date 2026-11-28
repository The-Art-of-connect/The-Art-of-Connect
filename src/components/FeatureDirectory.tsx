"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, FEATURES as ALL_FEATURES, STATUS_LABEL, included, needsLabel, ownerStatus, type Feature, type Viewer } from "@/lib/features";

/** Line icons for each category (original artwork, drawn inline). */
const ICON: Record<string, string> = {
  "Personal development": "M12 3c-2 3-2 6 0 9 2-3 2-6 0-9ZM5 9c1 3.5 3.5 5.5 7 6-1-3.5-3.5-5.5-7-6Zm14 0c-3.5.5-6 2.5-7 6 3.5-.5 6-2.5 7-6ZM12 15v6",
  "Journey AI": "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8ZM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z",
  Communities: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 14.3c.6-.2 1.3-.3 2-.3 3.3 0 6 2.7 6 6",
  "Live conversations": "M4 5h16v10H9l-5 4V5Zm4 4h8m-8 3h5",
  "Individual connections": "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M18 8v6m-3-3h6",
  "Professional networking": "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  "Business opportunities": "M4 19l5-6 4 3 7-9M15 7h5v5",
  Friendships: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  Singles: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  Couples: "M9 18s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7Zm6 2s-4-2.5-4-5.5",
  Travel: "M3 13l18-8-8 18-2-8-8-2Z",
  "Events and experiences": "M4 6h16v14H4zM4 10h16M8 3v5m8-5v5",
  "Educational webinars": "M3 9l9-5 9 5-9 5-9-5Zm4 2.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5",
  "Counseling and wellness": "M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11Zm-4-9h3l1-2 2 4 1-2h3",
  "Private meetings": "M3 7h12v10H3zM15 10l6-3v10l-6-3",
  "Executive services": "M12 3l9 7-9 11L3 10l9-7ZM3 10h18M9 10l3 11 3-11",
  "Elite services": "M3 18h18M4 8l4 4 4-7 4 7 4-4-2 10H6L4 8Z",
  "Privacy and safety": "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3Zm-3 9l2 2 4-4",
  "Membership management": "M4 6h16v12H4zM4 10h16M8 15h3",
};
const Icon = ({ name, className = "h-5 w-5" }: { name: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={ICON[name] ?? ICON["Membership management"]} /></svg>
);

/**
 * "What Does This Website Offer?" (founder directive 20): searchable, expandable, Expand All / Collapse All, category chips.
 * Each feature carries exactly one honest status. Using a paid feature is enforced on the server, never by this page.
 */
export function FeatureDirectory({ viewer, signedIn, soon = [] }: { viewer: Viewer | null; signedIn: boolean; soon?: string[] }) {
  const FEATURES = useMemo(() => ALL_FEATURES.map((f) => ownerStatus(f, soon)), [soon]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FEATURES.filter((f) => (cat === "All" || f.category === cat) && (!s || `${f.name} ${f.what} ${f.provides} ${f.category}`.toLowerCase().includes(s)));
  }, [q, cat, FEATURES]);
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const groups = CATEGORIES.filter((c) => list.some((f) => f.category === c));

  const Card = ({ f, dark }: { f: Feature; dark?: boolean }) => {
    const inc = included(f, viewer);
    const live = f.status === "available";
    const isOpen = open.has(f.key);
    const muted = dark ? "text-[#f5ecdf]/70" : "text-muted";
    return (
      <li className={`group flex flex-col rounded-[22px] border p-6 transition duration-300 ${dark
        ? "border-[#c9a96e]/40 bg-gradient-to-br from-[#2a1416] to-[#140c0b] hover:border-[#c9a96e]/80"
        : "border-champagne/50 bg-gradient-to-b from-white to-[#fbf7f0] shadow-[0_18px_40px_-28px_rgb(60_30_20/0.45)] hover:-translate-y-0.5 hover:border-champagne"} ${!live && !dark ? "opacity-90" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${dark ? "bg-[#c9a96e]/15 text-[#f0c98a]" : "bg-champagne/15 text-gold-deep"}`}><Icon name={f.category} /></span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${live
            ? (dark ? "border-[#c9a96e]/60 text-[#f0c98a]" : "border-champagne text-gold-deep")
            : (dark ? "border-[#f5ecdf]/25 text-[#f5ecdf]/60" : "border-line-strong text-faint")}`}>
            {live ? "✓" : "🔒"} {STATUS_LABEL[f.status]}
          </span>
        </div>
        <h3 className={`display mt-4 text-2xl ${dark ? "text-[#f6e7c8]" : ""}`}>{f.name}</h3>
        <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{f.what}</p>
        <p className={`mt-3 text-xs ${dark ? "text-[#f0c98a]/80" : "text-gold-deep"}`}>
          {signedIn ? (inc ? (live ? "✓ Included in your membership" : "Will be included in your membership") : `🔒 ${needsLabel(f)}`) : needsLabel(f)}
        </p>
        {isOpen && (
          <dl className={`mt-4 space-y-2 border-t pt-4 text-sm ${dark ? "border-[#c9a96e]/25 text-[#f5ecdf]/85" : "border-line"}`}>
            <div><dt className="font-semibold">What it provides</dt><dd className={muted}>{f.provides}</dd></div>
            <div><dt className="font-semibold">How it helps you</dt><dd className={muted}>{f.benefit}</dd></div>
            <div><dt className="font-semibold">How to use it</dt><dd className={muted}>{f.how}</dd></div>
            <div><dt className="font-semibold">Who it&rsquo;s for</dt><dd className={muted}>{needsLabel(f)}{f.eligibility ? ` · ${f.eligibility}` : ""}</dd></div>
          </dl>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          {live && f.href && (inc || !signedIn) && <Link href={f.href} className="btn btn-gold btn-sm">{signedIn ? "Open" : "See it"} →</Link>}
          {live && !inc && (signedIn
            ? ("elite" in f.needs ? <Link href="/app/elite/eligibility" className="btn btn-ghost btn-sm">Apply for Elite</Link> : <Link href="/app/onboarding" className="btn btn-ghost btn-sm">Start a 15-day trial</Link>)
            : <Link href="/join" className={`btn btn-sm ${dark ? "border border-[#c9a96e]/60 text-[#f0c98a]" : "btn-ghost"}`}>Join or begin free</Link>)}
          <button type="button" onClick={() => toggle(f.key)} aria-expanded={isOpen} className={`ml-auto text-xs underline underline-offset-4 ${dark ? "text-[#f0c98a]" : "text-gold-deep"}`}>{isOpen ? "Show less" : "Learn more"}</button>
        </div>
      </li>
    );
  };

  const chips = ["All", ...CATEGORIES];
  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 bg-[#f7f1e8]/92 px-4 py-4 backdrop-blur sm:top-20 sm:mx-0 sm:rounded-full sm:border sm:border-champagne/40 sm:px-5 sm:shadow-[0_10px_30px_-20px_rgb(60_30_20/0.5)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search features</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search features, topics or communities…" className="field w-full !rounded-full !pl-11" />
          </label>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setOpen(new Set(list.map((f) => f.key)))} className="btn btn-ghost btn-sm">Expand all ⌄</button>
            <button type="button" onClick={() => setOpen(new Set())} className="btn btn-ghost btn-sm">Collapse all ⌃</button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categories">
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${cat === c ? "bg-gradient-to-b from-[#e8c88a] to-[#b8925a] text-espresso shadow" : "border border-champagne/50 bg-white/70 text-muted hover:text-text"}`}>{c}</button>
          ))}
        </div>
      </div>

      {!list.length && <p className="mt-10 text-sm text-muted">No features match that search.</p>}
      {groups.map((c) => {
        const items = list.filter((f) => f.category === c);
        const dark = c === "Elite services" || c === "Executive services";
        const header = (
          <div className="flex items-center gap-4">
            <span className={dark ? "text-[#f0c98a]" : "text-gold-deep"}><Icon name={c} className="h-7 w-7" /></span>
            <h2 className={`display text-xl uppercase tracking-[0.25em] sm:text-2xl ${dark ? "text-[#f6e7c8]" : ""}`}>{c}</h2>
            <span className={`h-px flex-1 ${dark ? "bg-[#c9a96e]/40" : "bg-champagne/50"}`} />
            <span className={`text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${dark ? "text-[#f0c98a]" : "text-gold-deep"}`}>{items.length} feature{items.length === 1 ? "" : "s"}</span>
          </div>
        );
        return dark ? (
          <section key={c} className="relative mt-14 overflow-hidden rounded-[32px] p-6 sm:p-9" style={{ background: "radial-gradient(80% 120% at 100% 0%, rgb(110 26 34 / 0.55), transparent 60%), linear-gradient(135deg, #1d0f10, #0e0909)" }}>
            {header}
            <ul className="mt-6 grid gap-5 md:grid-cols-2">{items.map((f) => <Card key={f.key} f={f} dark />)}</ul>
          </section>
        ) : (
          <section key={c} className="mt-14">
            {header}
            <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((f) => <Card key={f.key} f={f} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
