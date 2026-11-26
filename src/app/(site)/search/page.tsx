import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getPublicLegal } from "@/lib/legal";
import { getPublicWebinars, formatWhen } from "@/lib/webinars";
import { searchEntries, type SearchEntry } from "@/lib/search-index";
import { entriesFor } from "@/lib/search-scope";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

const SUGGESTIONS = ["Memberships & pricing", "Webinars", "15-day free trial", "Cancel membership", "Privacy", "Sign in"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 100);
  const viewer = await getViewer();
  const [legal, webinars] = q ? await Promise.all([getPublicLegal(), getPublicWebinars()]) : [[], []];

  const dynamicEntries: SearchEntry[] = [
    ...legal.filter((d) => d.in_effect).map((d) => ({ href: `/legal/${d.slug}`, title: d.title, section: "Legal & policies", summary: d.summary, keywords: `${d.category} policy terms`, area: "site" as const })),
    ...webinars
      .filter((w) => w.status === "approved" && new Date(w.starts_at).getTime() + w.duration_minutes * 60_000 > Date.now())
      .map((w) => {
        const { date, time } = formatWhen(w.starts_at, w.time_zone);
        return { href: `/webinars/${w.id}`, title: w.title, section: "Webinar", summary: `${w.host_display_name} · ${date} · ${time}`, keywords: `webinar ${w.topic ?? ""} ${w.industry ?? ""} ${w.description}`, area: "site" as const };
      }),
  ];
  const results = q ? searchEntries([...entriesFor(viewer), ...dynamicEntries], q, 40) : [];
  const groups = [...new Set(results.map((r) => r.section))];

  return (
    <div className="band theme-cream min-h-[70vh]">
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-8 lg:py-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold"><span aria-hidden="true">←</span> Back to home</Link>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Search</h1>
        <form action="/search" className="mt-6 flex gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="What are you looking for?" className="field" aria-label="Search" autoFocus={!q} enterKeyHint="search" />
          <button className="btn btn-gold shrink-0">Search</button>
        </form>

        {!q ? (
          <div className="mt-8">
            <p className="text-sm text-muted">Popular searches</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="nav-pill text-sm">{s}</Link>)}
            </div>
          </div>
        ) : results.length ? (
          <div className="mt-10 space-y-8">
            <p className="text-sm text-muted">{results.length} result{results.length === 1 ? "" : "s"} for “{q}”</p>
            {groups.map((g) => (
              <div key={g}>
                <p className="eyebrow">{g}</p>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-ivory/70">
                  {results.filter((r) => r.section === g).map((r) => (
                    <li key={r.href + r.title}>
                      <Link href={r.href} className="block px-5 py-4 transition-colors hover:bg-champagne/10">
                        <span className="block font-semibold">{r.title}</span>
                        <span className="block text-sm text-muted">{r.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-champagne/50 bg-champagne/10 p-6 text-sm">
            <p className="font-semibold">No pages match “{q}”.</p>
            <p className="mt-2 text-muted">Try a simpler word, or <Link href="/" className="text-gold underline">return to the home page</Link>. We’re also happy to help at <a href="mailto:info@theartofconnect.com" className="text-gold underline">info@theartofconnect.com</a>.</p>
          </div>
        )}
      </section>
    </div>
  );
}
