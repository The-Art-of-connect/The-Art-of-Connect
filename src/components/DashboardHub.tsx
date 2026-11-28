import Link from "next/link";
import { NAV } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";
import { NavIcon } from "@/components/nav/NavIcons";
import { badgeFor, linkFor } from "@/components/nav/linkFor";
import type { NextStep } from "@/lib/next-step";

const SPACE_ICON: Record<string, string> = { self: "self", relationships: "connect", professional: "professional", journey: "journey", counseling: "counseling" };
const QUICK = [
  { href: "/app/know-yourself", label: "Who Am I?" },
  { href: "/emotional-intelligence", label: "Emotional Intelligence" },
  { href: "/app/relationships/calendar", label: "Couples calendar", exp: "relationships" },
  { href: "/app/journey/check-ins", label: "Daily manifestations" },
  { href: "/app/business", label: "Business dashboard", exp: "business" },
];

type Discovery = { percent: number; modulesDone: number; totalModules: number; nextHref: string };

/** The member's home base: one clear next step and the one primary search, pick up where you left off, and every space one tap away. */
const GROUP_EXPERIENCE: Record<string, string> = { relationships: "relationships", professional: "business" };

export function DashboardHub({ state, discovery, experiences, next }: { state: NavState; discovery: Discovery; experiences: string[]; next: NextStep }) {
  // The Art of Knowing Yourself and Journey are for everyone; society spaces only for members who have them.
  const groups = NAV.filter((g) => g.key !== "home" && (!GROUP_EXPERIENCE[g.key] || experiences.includes(GROUP_EXPERIENCE[g.key])));
  const ring = 2 * Math.PI * 34;
  const started = discovery.percent > 0;
  return (
    <section aria-labelledby="hub-title" className="mt-8 scroll-mt-24 space-y-6">
      {/* Command centre */}
      <div className="theme-dark tile-in relative overflow-hidden rounded-[2rem] bg-ink p-6 text-ivory shadow-2xl sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_85%_0%,rgb(116_63_77/0.55),transparent_70%),radial-gradient(40%_50%_at_0%_100%,rgb(201_169_110/0.18),transparent_70%)]" />
        <div className="relative">
          <p className="eyebrow">Your next step</p>
          <h2 id="hub-title" className="display mt-3 text-4xl sm:text-5xl">{next.label}</h2>
          <p className="mt-3 max-w-2xl text-ivory/75">{next.line}</p>
          <Link href={next.href} className="btn btn-gold mt-6 inline-flex">{next.label} <span aria-hidden="true">→</span></Link>
          {/* Directive 51: the one primary search lives on Home; the header keeps only a compact global search. */}
          <form action="/search" role="search" className="mt-6 flex items-center gap-2 rounded-full border border-champagne/40 bg-white/5 p-1.5 pl-5 backdrop-blur-xl focus-within:border-champagne">
            <NavIcon name="search" className="h-5 w-5 shrink-0 text-gold" />
            <input name="q" aria-label="Search everything" enterKeyHint="search" placeholder="Search lessons, couples, Journey, business…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-ivory outline-none placeholder:text-ivory/45" />
            <button className="btn btn-ghost btn-sm shrink-0">Search</button>
          </form>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {QUICK.filter((q: { exp?: string }) => !q.exp || experiences.includes(q.exp)).map((q) => (
              <Link key={q.href} href={q.href} className="shrink-0 rounded-full border border-champagne/30 px-4 py-1.5 text-xs text-ivory/85 transition hover:border-champagne hover:bg-white/10">{q.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Pick up where you left off */}
      <div>
        <p className="eyebrow">Pick up where you left off</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Link href={discovery.nextHref} className="glass lift group flex items-center gap-5 p-6">
            <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 -rotate-90" aria-hidden="true">
              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-champagne/30" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-burgundy"
                strokeDasharray={ring} strokeDashoffset={ring * (1 - discovery.percent / 100)} />
            </svg>
            <div>
              <p className="text-xs uppercase tracking-wide text-faint">The Art of Knowing Yourself</p>
              <p className="display mt-1 text-2xl text-burgundy">{started ? `${discovery.modulesDone} of ${discovery.totalModules} explored` : "Your discovery awaits"}</p>
              <p className="mt-1 text-sm text-muted">{started ? "Continue where you left off" : "Begin whenever you're ready"} <span aria-hidden="true">→</span></p>
            </div>
          </Link>

          <Link href={state.paid ? "/app/journey" : "/membership"} className="glass lift flex flex-col justify-between p-6">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-burgundy text-ivory"><NavIcon name="journey" /></span><p className="text-xs uppercase tracking-wide text-faint">Journey</p></div>
            {state.paid ? (
              <><p className="display mt-3 text-2xl text-burgundy">{state.balance ?? "Journey is included"}</p><p className="mt-1 text-sm text-muted">Your included Journey allowance, measured at actual AI cost. Self-guided learning never uses it.</p></>
            ) : (
              <><p className="display mt-3 text-2xl text-burgundy">Self-guided learning</p><p className="mt-1 text-sm text-muted">Every lesson is open to you. Journey is included with paid memberships.</p></>
            )}
          </Link>

          <Link href="/app/journey/check-ins" className="glass lift flex flex-col justify-between p-6">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-champagne/40 text-burgundy"><NavIcon name="spark" /></span><p className="text-xs uppercase tracking-wide text-faint">Today</p></div>
            <p className="display mt-3 text-2xl text-burgundy">Today&rsquo;s intention</p>
            <p className="mt-1 text-sm text-muted">Your manifestations, reflections and gentle check-ins — always on your terms.</p>
          </Link>
        </div>
      </div>

      {/* Every space, one tap away */}
      <div>
        <p className="eyebrow">Your spaces</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <div key={g.key} className={`glass tile-in flex flex-col p-6`} style={{ animationDelay: `${i * 70}ms` }}>
              <Link href={linkFor({ href: g.href, label: g.label, access: g.href.startsWith("/app") ? "member" : undefined }, state)} className="group flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-burgundy text-ivory transition group-hover:scale-105"><NavIcon name={SPACE_ICON[g.key]} className="h-6 w-6" /></span>
                <span><span className="display block text-2xl text-burgundy">{g.label}</span><span className="block text-sm text-muted">{g.intro}</span></span>
              </Link>
              <ul className="mt-4 divide-y divide-champagne/30 border-t border-champagne/30">
                {g.links.slice(0, 5).map((l) => {
                  const badge = badgeFor(l, state);
                  return (
                    <li key={l.href + l.label}>
                      <Link href={linkFor(l, state)} className="flex items-center justify-between gap-3 py-2.5 text-sm transition hover:text-burgundy">
                        <span>{l.label}</span>
                        {badge ? <span className="shrink-0 rounded-full border border-champagne/70 px-2 py-0.5 text-[0.62rem] text-gold-deep">{badge}</span> : <NavIcon name="arrow" className="h-4 w-4 shrink-0 text-gold-deep" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {g.links.length > 5 && <Link href={g.href} className="mt-3 text-xs font-semibold text-burgundy">See all in {g.label} →</Link>}
            </div>
          ))}
          <Link href="/app/membership" className="glass lift flex items-start gap-4 p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-champagne/40 text-burgundy"><NavIcon name="profile" className="h-6 w-6" /></span>
            <span><span className="display block text-2xl text-burgundy">My account</span><span className="block text-sm text-muted">Membership, Journey allowance, notifications, privacy and verification.</span></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
