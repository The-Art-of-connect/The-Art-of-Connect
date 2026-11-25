import Image from "next/image";
import Link from "next/link";
import { Ornament } from "@/components/Emblem";
import { ExperienceExplorer } from "@/components/ExperienceExplorer";
import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { getCatalogue } from "@/lib/catalogue";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";
import { getLaunchState } from "@/lib/launch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [catalogue, launch] = await Promise.all([getCatalogue(), getLaunchState()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The Art of Connect, LLC",
    alternateName: "The Art of Connect",
    url: "https://theartofconnect.com",
    logo: "https://theartofconnect.com/icon-512.png",
    email: "info@theartofconnect.com",
    slogan: "In Business. In Life. In Love.",
    description: "A premium membership platform for adults 40 and older seeking meaningful personal, professional and romantic connections.",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="band theme-dark relative overflow-hidden">
        {/* ── Hero artwork: burgundy glow, the AC monogram and lotus ── */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_35%,rgba(120,31,53,0.5),transparent_62%)]" />
        <div aria-hidden="true" className="hero-art hero-art-mask pointer-events-none absolute inset-y-0 right-0 w-[64%] opacity-80 sm:w-[58%] lg:right-[4%] lg:aspect-[0.62] lg:w-auto lg:opacity-100">
          <div className="hero-art-float absolute inset-0">
            <Image src="/brand/hero-art.webp" alt="" fill priority sizes="(min-width: 1024px) 40vw, 64vw" className="object-cover object-[center_55%] lg:object-[center_58%]" />
          </div>
          <div className="hero-glow absolute left-[55%] top-[68%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(233,196,128,0.55),transparent_70%)] blur-2xl" />
        </div>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-24">
          <div>
            <p className="eyebrow rise">In Business. In Life. In Love.</p>
            <p className="rise mt-4 inline-flex rounded-full border border-champagne/50 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              Exclusively for adults {catalogue.minimum_member_age}+
            </p>
            <h1 className="display rise rise-2 mt-6 text-[3.3rem] sm:text-7xl lg:text-[6.2rem]">
              The art of <br />
              <span className="gilded italic">being known.</span>
            </h1>
            <p className="display rise rise-2 mt-6 text-2xl italic text-ivory sm:text-3xl">Life after 40. Connection with intention.</p>
            <p className="rise rise-3 mt-8 max-w-xl text-lg leading-relaxed text-muted">
              Meaningful connections begin with understanding who you are. Discover yourself, build intentional
              relationships, connect with compatible business professionals, and access trusted guidance — all within one
              extraordinary ecosystem.
            </p>
            <div className="rise rise-4 mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/membership#build" className="btn btn-gold">Build Your Membership</Link>
              <Link href="#experiences" className="btn btn-ghost">Choose Your Experience</Link>
            </div>
          </div>
          {/* Right column is the artwork behind (desktop). */}
          <div className="hidden lg:block" />
        </section>
      </div>

      <div className="band theme-ivory">
        {/* ── Three experiences, visually ──────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-5 md:grid-cols-3">
            {EXPERIENCE_ORDER.map((key, i) => {
              const e = EXPERIENCES[key];
              return (
                <Reveal key={key} delay={i * 120}>
                  <Link href={e.href} className="zoom-img theme-dark group relative block aspect-[4/5] overflow-hidden rounded-[28px] border border-line-strong">
                    <Image src={e.image} alt={e.imageAlt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-onyx from-15% via-onyx/80 via-45% to-transparent to-80%" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                      <p className="eyebrow">{e.subtitle}</p>
                      <h2 className="display mt-3 text-4xl text-ivory sm:text-5xl">{e.name}</h2>
                      <p className="mt-2 text-ivory/90">{e.caption}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm text-gold transition-colors group-hover:text-gold-bright">
                        Discover {e.name} <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      </div>

      <div className="band theme-ivory">
        {/* ── Philosophy ───────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-8 lg:py-32">
          <Reveal>
            <Ornament />
            <p className="display mt-10 text-4xl leading-tight sm:text-6xl">
              Every meaningful connection begins <span className="gilded italic">with you.</span>
            </p>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted">
              The Art of Connect is a premium membership platform designed for adults 40 and older seeking meaningful
              personal, professional and romantic connections. Not a dating site, a business directory or a counseling
              listing — one place to understand yourself, and to find the people who genuinely align with you.
            </p>
          </Reveal>
          <ol className="mt-16 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Discover", "Reflect on who you are, what you value and how you love, lead and grow."],
              ["Understand", "Explore your patterns through thoughtful assessments and private reflection."],
              ["Connect", "Meet people aligned with you — in business, in life and in love."],
              ["Grow", "Deepen every connection with tools, guidance and trusted professionals."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 100}>
                <li className="glass h-full p-6">
                  <p className="display text-4xl text-gold">{String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-4 text-lg font-semibold">{t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>
      </div>

      <div className="band theme-dark">
        {/* ── Interactive explorer ─────────────────────────────── */}
        <section id="experiences" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-24 sm:px-8 lg:py-32">
          <Reveal>
            <div className="mb-10 max-w-2xl">
              <p className="eyebrow">One account · Three experiences</p>
              <h2 className="display mt-5 text-5xl sm:text-6xl">Explore the ecosystem.</h2>
              <p className="mt-5 text-muted">
                Each experience has its own space, its own profile and its own permissions — connected through one secure
                account that you control.
              </p>
            </div>
          </Reveal>
          <ExperienceExplorer />
        </section>
      </div>

      <div className="band theme-ivory">
        {/* ── In Love: singles and couples, clearly separate ───── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-32">
          <Reveal>
            <p className="eyebrow">In Love · Two distinct paths</p>
            <h2 className="display mt-5 max-w-3xl text-5xl sm:text-6xl">Whether you’re seeking love or growing it.</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {[
              {
                title: "For singles",
                line: "Seeking a meaningful connection",
                points: ["Personality & compatibility assessments", "Relationship readiness", "Intentional matchmaking", "Meaningful introductions"],
              },
              {
                title: "For couples",
                line: "Already together, growing deeper",
                points: ["Secure partner invitation", "Shared relationship goals", "Communication & connection exercises", "Private reflections never shared automatically"],
              },
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 120}>
                <article className="glass glass-edge h-full p-8">
                  <h3 className="display text-4xl">{p.title}</h3>
                  <p className="mt-2 text-sm text-relationships">{p.line}</p>
                  <ul className="mt-7 space-y-3">
                    {p.points.map((x) => (
                      <li key={x} className="flex items-center gap-3 text-sm text-text">
                        <span className="h-px w-5 shrink-0 bg-wine-bright" aria-hidden="true" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            Couples are never shown in matchmaking, and singles never see couples’ spaces. The two paths are kept separate by design.
          </p>
        </section>
      </div>

      <div className="band theme-cream">
        {/* ── Privacy by design ────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-32">
          <Reveal>
            <div className="glass glass-edge grid gap-12 overflow-hidden p-8 sm:p-12 lg:grid-cols-2">
              <div>
                <p className="eyebrow">Private by design</p>
                <h2 className="display mt-5 text-4xl sm:text-5xl">
                  Your inner life <span className="gilded italic">stays yours.</span>
                </h2>
                <p className="mt-6 leading-relaxed text-muted">
                  You decide what each experience can see. Your journal is yours alone, your personal growth never appears on
                  your dating or business profile, and in a couple, your individual reflections are only shared when you
                  choose to share them.
                </p>
              </div>
              <ul className="grid gap-4 self-center sm:grid-cols-2">
                {[
                  ["Separate profiles", "A distinct profile for each experience, never merged."],
                  ["A private journal", "Visible only to you — not to partners, matches or our team."],
                  ["Consent first", "Nothing is shared with a partner or professional without your permission."],
                  ["Reviewed professionals", "Every counselor and coach is reviewed before joining."],
                ].map(([t, d]) => (
                  <li key={t} className="rounded-2xl border border-line bg-ink-2/60 p-5">
                    <p className="font-semibold text-text">{t}</p>
                    <p className="mt-2 text-sm text-muted">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>
      </div>

      <div className="band theme-burgundy">
        {/* ── Professionals ────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-32">
          <Reveal>
            <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="eyebrow">For counselors, coaches & mentors</p>
                <hr className="gold-rule mt-5 w-24 opacity-100" />
                <h2 className="display mt-6 text-4xl sm:text-5xl">Bring your expertise to a community that values it.</h2>
                <p className="mt-5 max-w-2xl text-muted">
                  Licensed mental health professionals, coaches and business mentors can apply to join The Art of Connect.
                  Every application is reviewed personally before approval.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link href="/professionals" className="btn btn-gold">Professional pathway</Link>
                <Link href="/professionals/apply" className="btn btn-ghost">Express interest</Link>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      <div className="band theme-ivory">
        {/* ── Become a member ──────────────────────────────────── */}
        <Ornament className="px-4 pt-20 lg:pt-28" />
        <section id="membership" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-24 pt-12 sm:px-8 lg:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Become a member · Adults {catalogue.minimum_member_age}+</p>
            <h2 className="display mt-5 text-4xl sm:text-6xl">Choose one experience, or all three.</h2>
            <p className="mt-5 text-muted">One account and one subscription. Combine experiences for bundled savings, and change your membership whenever life does.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {catalogue.tiers.map((t, i) => (
              <Reveal key={t.slug} delay={i * 100}>
                <Link href={`/membership#build`} className={`glass group flex h-full flex-col p-7 transition-transform duration-500 hover:-translate-y-1 ${t.experience_count === 3 ? "glass-edge" : ""}`}>
                  <p className="eyebrow">{t.experience_count === 3 ? "All three experiences" : `Any ${t.experience_count === 1 ? "one experience" : "two experiences"}`}</p>
                  <h3 className="display mt-3 text-3xl">{t.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{t.description}</p>
                  <span className="mt-6 text-sm text-gold">Explore {t.name.replace(" Membership", "")} →</span>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/membership#build" className="btn btn-gold">Build Your Membership</Link>
            <Link href="/membership#compare" className="btn btn-ghost">Explore Memberships</Link>
          </div>
          {!launch.registrations_open && (
            <div className="glass glass-edge mx-auto mt-16 max-w-3xl p-7 sm:p-10">
              <p className="eyebrow">Membership enrollment opens soon</p>
              <h3 className="display mt-4 text-3xl sm:text-4xl">Be the first to know.</h3>
              <p className="mt-3 mb-8 text-muted">Leave your details and we’ll email you the moment enrollment opens.</p>
              <WaitlistForm />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
