import Link from "next/link";
import { Constellation } from "@/components/Constellation";
import { Monogram, Ornament } from "@/components/Emblem";
import { WaitlistForm } from "@/components/WaitlistForm";
import { EXPERIENCES, type Experience } from "@/lib/experiences";

const order: Experience[] = ["relationships", "business", "counseling"];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div>
          <p className="eyebrow rise">In business. In life. In love.</p>
          <h1 className="display rise rise-2 mt-6 text-[3.4rem] sm:text-7xl lg:text-[6.2rem]">
            The art of <br />
            <span className="gilded italic">being known.</span>
          </h1>
          <p className="rise rise-3 mt-8 max-w-xl text-lg leading-relaxed text-muted">
            One membership for the connections that shape a life — the person you build a future with, the partners who
            build your business, and the counselor who helps you grow.
          </p>
          <div className="rise rise-4 mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="#waitlist" className="btn btn-gold">Request your invitation</Link>
            <Link href="#experiences" className="btn btn-ghost">Explore the experiences</Link>
          </div>
          <dl className="rise rise-4 mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
            {[
              ["3", "Experiences"],
              ["1", "Membership"],
              ["100%", "Verified counselors"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="display text-3xl text-gold-bright">{n}</dt>
                <dd className="mt-1 text-xs tracking-wide text-faint">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <Constellation className="w-full opacity-45" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute h-1/2 w-1/2 rounded-full bg-gold/10 blur-3xl" />
            <Monogram height={250} priority className="relative h-auto w-[72%] drop-shadow-[0_10px_40px_rgba(201,173,131,0.25)]" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-5 text-[0.65rem] tracking-[0.25em] uppercase text-faint">
            <span className="text-business">Business</span>
            <span className="text-counseling">Life</span>
            <span className="text-relationships">Love</span>
          </div>
        </div>
      </section>

      {/* ── Three experiences ────────────────────────────────── */}
      <section id="experiences" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Three experiences, one identity</p>
          <h2 className="display mt-5 text-5xl sm:text-6xl">Every connection, curated.</h2>
          <p className="mt-6 text-muted">
            Each experience has its own space, its own profile and its own permissions. You decide what each one sees.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {order.map((key) => {
            const e = EXPERIENCES[key];
            return (
              <Link
                key={key}
                href={e.href}
                className="glass glass-edge group flex min-h-[420px] flex-col justify-between overflow-hidden p-7 transition-transform duration-500 hover:-translate-y-1"
              >
                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
                  style={{ background: e.accent }}
                />
                <div>
                  <p className="text-xs tracking-[0.28em] uppercase" style={{ color: e.accent }}>{e.eyebrow}</p>
                  <h3 className="display mt-4 text-4xl">{e.name}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted">{e.tagline}</p>
                </div>
                <ul className="mt-8 space-y-3 text-sm">
                  {e.pillars.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-muted">
                      <span className="h-px w-5" style={{ background: e.accent }} />
                      {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-8 text-sm text-gold transition-colors group-hover:text-gold-bright">Discover {e.name} →</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Privacy architecture ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="glass glass-edge grid gap-12 overflow-hidden p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Private by design</p>
            <h2 className="display mt-5 text-4xl sm:text-5xl">
              Your counseling life <span className="italic gilded">stays yours.</span>
            </h2>
            <p className="mt-6 leading-relaxed text-muted">
              Counseling lives in its own sealed space. It never touches your dating or business profiles, your matches
              never learn you see a counselor, and session notes are visible only to your counselor — not to other
              members, and not to our staff.
            </p>
          </div>
          <ul className="grid gap-4 self-center sm:grid-cols-2">
            {[
              ["Separate identities", "A distinct profile for each experience, never merged."],
              ["Verified providers", "Every counselor’s license is reviewed before listing."],
              ["You hold the keys", "Choose exactly which experiences you join and who sees you."],
              ["Encrypted in transit and at rest", "Industry-standard protection on every connection and in storage."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl border border-line bg-white/[0.02] p-5">
                <p className="font-semibold text-text">{t}</p>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <p className="eyebrow">The journey</p>
        <div className="mt-10 grid gap-10 md:grid-cols-4">
          {[
            ["01", "Request", "Membership is by invitation while we open our doors."],
            ["02", "Reveal", "Thoughtful assessments uncover what truly matters to you."],
            ["03", "Connect", "Curated introductions — never an endless scroll."],
            ["04", "Grow", "Tools, circles and counsel that deepen every connection."],
          ].map(([n, t, d]) => (
            <div key={n} className="border-t border-line pt-6">
              <p className="display text-5xl text-gold/60">{n}</p>
              <p className="mt-4 text-lg font-semibold">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Invitation ───────────────────────────────────────── */}
      <Ornament className="px-4 pt-10" />
      <section id="waitlist" className="mx-auto max-w-3xl scroll-mt-28 px-4 py-20 sm:px-8">
        <div className="glass glass-edge p-7 sm:p-12">
          <p className="eyebrow">By invitation</p>
          <h2 className="display mt-5 text-4xl sm:text-5xl">Reserve your place.</h2>
          <p className="mt-4 mb-10 text-muted">
            Founding members receive priority access, founding pricing, and a personal welcome from our team.
          </p>
          <WaitlistForm />
        </div>
      </section>
    </>
  );
}
