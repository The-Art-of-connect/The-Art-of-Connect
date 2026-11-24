import Image from "next/image";
import Link from "next/link";
import { Constellation } from "@/components/Constellation";
import { Monogram, Ornament } from "@/components/Emblem";
import { ExperienceExplorer } from "@/components/ExperienceExplorer";
import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";

export default function HomePage() {
  return (
    <>
      <div className="band theme-dark">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-24">
          <div>
            <p className="eyebrow rise">In Business. In Life. In Love.</p>
            <h1 className="display rise rise-2 mt-6 text-[3.3rem] sm:text-7xl lg:text-[6.2rem]">
              The art of <br />
              <span className="gilded italic">being known.</span>
            </h1>
            <p className="rise rise-3 mt-8 max-w-xl text-lg leading-relaxed text-muted">
              Meaningful connections begin with understanding who you are. Discover yourself, build intentional
              relationships, connect with compatible business professionals, and access trusted guidance — all within one
              extraordinary ecosystem.
            </p>
            <div className="rise rise-4 mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="#invitation" className="btn btn-gold">Request your invitation</Link>
              <Link href="#experiences" className="btn btn-ghost">Explore the experiences</Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[560px]">
            <Constellation className="w-full opacity-45" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute h-1/2 w-1/2 rounded-full bg-gold/10 blur-3xl" />
              <Monogram height={250} priority className="relative h-auto w-[72%] drop-shadow-[0_10px_40px_rgba(201,173,131,0.25)]" />
            </div>
          </div>
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
              The Art of Connect is not a dating site, a business directory or a counseling listing. It is one place to
              understand yourself — and, from that understanding, to find the people who genuinely align with you:
              personally, professionally and romantically.
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
        {/* ── Invitation ───────────────────────────────────────── */}
        <Ornament className="px-4 pt-20 lg:pt-28" />
        <section id="invitation" className="mx-auto max-w-3xl scroll-mt-28 px-4 pb-24 pt-12 sm:px-8 lg:pb-32">
          <div className="glass glass-edge p-7 sm:p-12">
            <p className="eyebrow">By invitation</p>
            <h2 className="display mt-5 text-4xl sm:text-5xl">Reserve your place.</h2>
            <p className="mt-4 mb-10 text-muted">
              We’re opening our doors to a small number of founding members first. Request an invitation and we’ll reach
              out personally before launch.
            </p>
            <WaitlistForm />
          </div>
        </section>
      </div>
    </>
  );
}
