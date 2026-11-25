import type { Metadata } from "next";
import Link from "next/link";
import { MembershipBuilder } from "@/components/MembershipBuilder";
import { Reveal } from "@/components/Reveal";
import { getCatalogue, getPublicOffers } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import { formatMoney, selectionFromQuery } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Build Your Membership",
  description:
    "Choose In Business, In Life, In Love — or combine them at a bundled rate. One account, one subscription, every device. Exclusively for adults 40+.",
  alternates: { canonical: "/membership" },
  openGraph: { title: "Build Your Membership · The Art of Connect", images: [{ url: "/og/membership.jpg", width: 1200, height: 630 }] },
};

export default async function MembershipPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [catalogue, launch, offers, params] = await Promise.all([getCatalogue(), getLaunchState(), getPublicOffers(), searchParams]);
  const initial = selectionFromQuery(params);
  const money = (c: number | null | undefined) => formatMoney(c, catalogue.currency);
  const showPrices = catalogue.published;

  return (
    <>
      <div className="band theme-dark">
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
          <p className="eyebrow">Memberships · Exclusively for adults {catalogue.minimum_member_age}+</p>
          <h1 className="display mt-5 max-w-4xl text-5xl sm:text-7xl">
            Build your <span className="gilded italic">membership.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Choose one experience, or combine two or all three at a bundled rate. One account, one subscription — on your
            phone, tablet and computer, with no extra device fees.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#build" className="btn btn-gold">Choose Your Experience</a>
            <a href="#compare" className="btn btn-ghost">Compare memberships</a>
          </div>
          {!launch.registrations_open && (
            <p className="mt-8 inline-flex rounded-full border border-line-strong px-4 py-2 text-sm text-gold">Membership enrollment opens soon</p>
          )}
          {offers.length > 0 && (
            <div className="mt-8 rounded-2xl border border-champagne/40 bg-champagne/10 px-5 py-4 text-sm">
              {offers.map((o) => (
                <p key={o.code}>
                  <span className="font-semibold text-gold-bright">Launch offer:</span> {o.description ?? "Special pricing"} — use code{" "}
                  <span className="font-mono font-semibold">{o.code}</span>
                  {o.ends_at ? ` · ends ${new Date(o.ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="band theme-ivory">
        <section id="build" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-8 lg:py-28">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Choose your experience</p>
            <h2 className="display mt-4 text-4xl sm:text-5xl">Your membership, your way.</h2>
          </div>
          <MembershipBuilder catalogue={catalogue} initial={initial} enrollmentOpen={launch.registrations_open} />
        </section>
      </div>

      <div className="band theme-cream">
        <section id="compare" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-8 lg:py-28">
          <p className="eyebrow">Compare memberships</p>
          <h2 className="display mt-4 text-4xl sm:text-5xl">Signature, Premier or Elite.</h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {catalogue.tiers.map((t, i) => (
              <Reveal key={t.slug} delay={i * 100}>
                <article className={`glass flex h-full flex-col p-8 ${t.experience_count === 3 ? "glass-edge" : ""}`}>
                  {t.experience_count === 3 && <span className="chip chip-locked mb-4 self-start">Best value</span>}
                  <h3 className="display text-4xl">{t.name}</h3>
                  <p className="mt-2 text-muted">{t.description}</p>
                  <p className="mt-6 text-sm font-semibold text-gold">
                    {showPrices
                      ? t.bundle_discount_percent
                        ? `Save ${Number(t.bundle_discount_percent)}% on bundled experiences`
                        : "Individual experience pricing"
                      : "Pricing announced at launch"}
                  </p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {t.benefits.map((b) => (
                      <li key={b} className="flex gap-3"><span className="mt-2 h-px w-4 shrink-0 bg-champagne" aria-hidden="true" />{b}</li>
                    ))}
                  </ul>
                  {showPrices && t.setup_fee_cents ? <p className="mt-6 text-xs text-muted">One-time setup fee {money(t.setup_fee_cents)}</p> : null}
                  {t.eligibility && <p className="mt-2 text-xs text-muted">{t.eligibility}</p>}
                  <a href="#build" className={`btn mt-8 ${t.experience_count === 3 ? "btn-gold" : "btn-ghost"}`}>Choose {t.name.replace(" Membership", "")}</a>
                </article>
              </Reveal>
            ))}
          </div>

          <div className="mt-16 overflow-x-auto">
            <table className="data-table min-w-[640px] rounded-2xl">
              <thead>
                <tr><th>Included</th>{catalogue.tiers.map((t) => <th key={t.slug}>{t.name.replace(" Membership", "")}</th>)}</tr>
              </thead>
              <tbody>
                {[
                  ["Experiences", (n: number) => (n === 3 ? "All three" : `Any ${n}`)],
                  ["One account & one subscription", () => "✓"],
                  ["Phone, tablet & desktop at no extra cost", () => "✓"],
                  ["Monthly or annual billing", () => "✓"],
                  ["Add or remove experiences any time", () => "✓"],
                  ["Couples upgrade available (with In Love)", () => "✓"],
                  ["Bundled savings", (n: number) => (n === 1 ? "—" : n === 2 ? "Bundled rate" : "Best rate")],
                ].map(([label, fn]) => (
                  <tr key={label as string}>
                    <td className="text-text">{label as string}</td>
                    {catalogue.tiers.map((t) => <td key={t.slug}>{(fn as (n: number) => string)(t.experience_count)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="band theme-ivory">
        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:py-28">
          <article className="glass p-8">
            <p className="eyebrow">For couples</p>
            <h2 className="display mt-4 text-3xl sm:text-4xl">{catalogue.couples_upgrade.name}</h2>
            <p className="mt-4 text-muted">{catalogue.couples_upgrade.description}</p>
            <p className="mt-4 text-sm text-muted">Each partner keeps a private, secure login. Individual reflections are never shared automatically.</p>
            <p className="mt-6 font-semibold text-gold">
              {showPrices && catalogue.couples_upgrade.monthly_price_cents != null ? `${money(catalogue.couples_upgrade.monthly_price_cents)} / month with In Love` : "Available with In Love"}
            </p>
          </article>
          <article className="glass p-8">
            <p className="eyebrow">For counselors, coaches & mentors</p>
            <h2 className="display mt-4 text-3xl sm:text-4xl">Professional memberships</h2>
            <p className="mt-4 text-muted">Professionals join through separate packages, with their own eligibility and credential requirements.</p>
            <Link href="/professionals" className="btn btn-ghost mt-8">Professional pathway</Link>
          </article>
        </section>
      </div>

      <div className="band theme-cream">
        <section className="mx-auto max-w-4xl px-4 py-24 sm:px-8">
          <p className="eyebrow">Questions</p>
          <h2 className="display mt-4 text-4xl">Good to know</h2>
          <dl className="mt-10 divide-y divide-line border-y border-line">
            {[
              ["Who can join?", `The Art of Connect is exclusively for adults ${catalogue.minimum_member_age} and older. We confirm eligibility with your date of birth when you register; it is never shown on your profile.`],
              ["Do I need separate subscriptions?", "No. Every experience you choose is part of one membership and one payment."],
              ["Can I change my membership later?", "Yes. Add or remove experiences, upgrade or downgrade, and switch between monthly and annual billing from your account."],
              ["Does it work on all my devices?", "Yes — phone, tablet and computer, with no additional device fees."],
              ["When does enrollment open?", "Membership enrollment opens soon. Build your membership now and we’ll let you know the moment you can join."],
            ].map(([q, a]) => (
              <div key={q} className="py-6">
                <dt className="text-lg font-semibold">{q}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
