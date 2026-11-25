import type { Metadata } from "next";
import Link from "next/link";
import { getCatalogue } from "@/lib/catalogue";
import { getExplore } from "@/lib/business";
import { getLaunchState } from "@/lib/launch";
import { FEATURE_STATUS, HELP_NEEDED, HELP_OFFERED, US_STATES } from "@/lib/business-options";
import { formatMoney } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Explore The Professional Society — In Business",
  description: "Business owners helping business owners, across cities and states. Explore The Professional Society before you join. Exclusively for adults 40+.",
  alternates: { canonical: "/business/explore" },
};
export const dynamic = "force-dynamic";

/** Network illustration: owners in different places connected through The Art of Connect. */
function Network() {
  const nodes = [[60, 70], [250, 40], [20, 150], [95, 205], [300, 175]];
  return (
    <svg viewBox="0 0 330 240" className="mx-auto h-auto w-full max-w-md" role="img" aria-label="Business owners in different cities connected through The Art of Connect">
      {nodes.map(([x, y], i) => (
        <path key={`p${i}`} d={`M165 120 Q ${(x + 165) / 2} ${Math.min(y, 120) - 40} ${x} ${y}`} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" className="text-gold" />
      ))}
      <path d="M60 70 Q 160 10 250 40" fill="none" stroke="currentColor" strokeOpacity="0.3" className="text-gold" />
      <path d="M20 150 Q 50 150 95 205" fill="none" stroke="currentColor" strokeOpacity="0.3" className="text-gold" />
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="16" className="fill-champagne/15" />
          <circle cx={x} cy={y} r="6" className="fill-champagne" />
        </g>
      ))}
      <circle cx="165" cy="120" r="34" className="fill-champagne/10" />
      <circle cx="165" cy="120" r="26" className="fill-espresso stroke-champagne" strokeWidth="1.5" />
      <text x="165" y="127" textAnchor="middle" className="fill-ivory" style={{ font: "500 20px var(--font-display, Georgia)" }}>AC</text>
    </svg>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = FEATURE_STATUS[status] ?? FEATURE_STATUS.coming_soon;
  return <span className={`chip shrink-0 normal-case tracking-normal !text-[0.68rem] ${s.tone}`}>{s.label}</span>;
}

export default async function ExploreProfessionalSociety() {
  const [explore, catalogue, launch] = await Promise.all([getExplore(), getCatalogue(), getLaunchState()]);
  const pkg = catalogue.packages.find((p) => p.slug === "professional-society");
  const price = catalogue.published && pkg?.monthly_price_cents != null ? formatMoney(pkg.monthly_price_cents, catalogue.currency) : null;
  const tiers = [
    { key: "guest", title: "Explore as a Guest", price: "Free", note: "No registration or credit card required.", dark: false },
    { key: "free", title: "Free Business Account", price: "$0", note: "Registration without payment. No automatic subscription.", dark: false },
    { key: "premium", title: "Professional Society Membership", price: price ? `${price} / month` : "Pricing announced at launch", note: "Activated when the founding community is ready.", dark: true },
  ] as const;

  return (
    <>
      <div className="band theme-dark">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="eyebrow">The Professional Society · In Business</p>
            <h1 className="display mt-5 text-5xl sm:text-6xl">The connection your business needs may be <span className="gilded italic">miles away.</span></h1>
            <p className="display mt-5 text-2xl italic text-gold">We bring it closer.</p>
            <p className="mt-6 max-w-xl text-muted">
              From city to city and state to state — business owners helping business owners grow. Not a lead-generation service or
              a directory: a community where every owner has something to teach and something to learn.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#access" className="btn btn-gold">See what’s included</a>
              <a href="#founding" className="btn btn-ghost">Become a Founding Member</a>
            </div>
            <p className="mt-6 text-xs font-semibold tracking-wide text-gold">Exclusively for adults {catalogue.minimum_member_age}+</p>
          </div>
          <Network />
        </section>
      </div>

      <div className="band theme-cream">
        <section id="access" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-8 lg:py-24">
          <p className="eyebrow">Explore before you join</p>
          <h2 className="display mt-4 text-4xl sm:text-5xl">Three ways to take part.</h2>
          <p className="mt-4 max-w-2xl text-muted">Features are labeled honestly: what works today, what grows with the community, and what is still to come.</p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {tiers.map((t) => {
              const list = explore.features.filter((f) => f[t.key]);
              return (
                <article key={t.key} className={`flex flex-col rounded-[24px] border p-7 ${t.dark ? "theme-dark band border-champagne/40" : "glass"}`}>
                  <h3 className="display text-3xl">{t.title}</h3>
                  <p className={`display mt-3 text-4xl ${t.dark ? "text-gold-bright" : "text-gold"}`}>{t.price}</p>
                  <p className="mt-2 text-sm text-muted">{t.note}</p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {list.map((f) => (
                      <li key={f.key} className="flex items-start justify-between gap-3">
                        <span className="flex gap-2"><span className="text-gold" aria-hidden="true">✓</span>{f.name}</span>
                        <StatusChip status={f.status} />
                      </li>
                    ))}
                    {!list.length && <li className="text-muted">Details are being finalized.</li>}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <div className="band theme-ivory">
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow">How can we help your business?</p>
            <h2 className="display mt-4 text-4xl">Tell us what you’re looking for.</h2>
            <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
              {Object.values(HELP_NEEDED).map((l) => <li key={l} className="flex gap-2"><span className="text-gold" aria-hidden="true">◆</span>{l}</li>)}
            </ul>
          </div>
          <div>
            <p className="eyebrow">How can your business help others?</p>
            <h2 className="display mt-4 text-4xl">Your experience could be someone else’s breakthrough.</h2>
            <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
              {Object.values(HELP_OFFERED).map((l) => <li key={l} className="flex gap-2"><span className="text-gold" aria-hidden="true">◆</span>{l}</li>)}
            </ul>
          </div>
          <div className="glass p-7 lg:col-span-2">
            <h3 className="display text-3xl">The Business Connection Board</h3>
            <p className="mt-3 max-w-3xl text-muted">
              Members post what their business needs — or the expertise they can offer. Other owners, locally or across the country,
              respond with <span className="font-semibold text-text">“I Can Help — Connect Privately.”</span> Every introduction is private and
              accepted by both owners; email addresses and phone numbers are never shown.
            </p>
          </div>
        </section>
      </div>

      <div className="band theme-cream">
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-24">
          <p className="eyebrow">Industries represented</p>
          <h2 className="display mt-4 text-4xl">Every industry has something to share.</h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {explore.industries.map((i) => <span key={i.slug} className="nav-pill text-sm">{i.name}</span>)}
          </div>

          <h3 className="display mt-16 text-3xl">Business owners in the community</h3>
          {explore.profiles.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {explore.profiles.map((p, i) => (
                <article key={i} className="glass p-6">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted">{[p.city, p.state ? US_STATES[p.state] ?? p.state : null].filter(Boolean).join(", ")}</p>
                  {p.headline && <p className="mt-3 text-sm">{p.headline}</p>}
                  {p.help_offered?.length > 0 && <p className="mt-3 text-xs text-gold">Offers: {p.help_offered.map((h) => HELP_OFFERED[h] ?? h).join(" · ")}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 max-w-2xl rounded-2xl border border-champagne/50 bg-champagne/10 p-5 text-sm text-muted">
              Our founding community is forming. Business profiles appear here only when their owners choose to make them public.
            </p>
          )}

          {explore.resources.length > 0 && (
            <>
              <h3 className="display mt-16 text-3xl">Selected resources</h3>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {explore.resources.map((r) => (
                  <li key={r.title} className="glass p-6">
                    <p className="font-semibold">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-gold">{r.title}</a> : r.title}</p>
                    <p className="mt-2 text-sm text-muted">{r.summary}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="band theme-dark">
        <section id="founding" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 text-center sm:px-8 lg:py-24">
          <p className="eyebrow">The Professional Society</p>
          <h2 className="display mt-4 text-4xl sm:text-5xl">Every business owner has something to teach. Every business owner has something to learn.</h2>
          <p className="display mt-6 text-2xl text-gold">Become a Founding Member.</p>
          <p className="mt-3 text-muted">Build. Collaborate. Grow. Together.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {launch.registrations_open ? (
              <Link href="/join/business" className="btn btn-gold">Create a free business account</Link>
            ) : (
              <Link href="/#membership" className="btn btn-gold">Notify me when founding enrollment opens</Link>
            )}
            <Link href="/webinars" className="btn btn-ghost">The Knowledge Exchange</Link>
          </div>
          <p className="mt-6 text-xs text-faint">No credit card required for a free account. We don’t guarantee funding, partnerships or business outcomes.</p>
        </section>
      </div>
    </>
  );
}
