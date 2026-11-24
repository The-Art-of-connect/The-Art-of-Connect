import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";

export const metadata: Metadata = { title: "Membership", description: "One account, three experiences. Membership options are announced to invited members first." };

export default function MembershipPage() {
  return (
    <>
    <div className="band theme-dark">
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
      <p className="eyebrow">Membership</p>
      <h1 className="display mt-5 max-w-4xl text-5xl sm:text-7xl">One account. Every connection that matters.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        Membership options are being finalized and will be shared with invited members first. Here is how membership will
        work.
      </p>
    </div>
    </div>
    <div className="band theme-ivory">
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
      <div className="mt-16 grid gap-5 lg:grid-cols-3">
        {[
          ["One secure account", "Sign in once. Your account connects every experience you choose to join."],
          ["Choose your experiences", "Join In Business, In Life, In Love — or any combination. Each has its own profile and permissions."],
          ["You stay in control", "Add or pause experiences as your life changes. What you share in one never appears in another."],
        ].map(([t, d], i) => (
          <Reveal key={t} delay={i * 100}>
            <article className="glass h-full p-8">
              <p className="display text-4xl text-gold">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-4 text-xl font-semibold">{t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{d}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {EXPERIENCE_ORDER.map((k) => (
          <Link key={k} href={EXPERIENCES[k].href} className="rounded-2xl border border-line p-6 transition-colors hover:border-gold/50">
            <p className="eyebrow">{EXPERIENCES[k].subtitle}</p>
            <p className="display mt-3 text-3xl">{EXPERIENCES[k].name}</p>
          </Link>
        ))}
      </div>

    </div>
    </div>
    <div className="band theme-cream">
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
      <div className="glass glass-edge grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="eyebrow">For professionals</p>
          <h2 className="display mt-4 text-4xl">Professional memberships</h2>
          <p className="mt-4 text-muted">Counselors, coaches and mentors join through a separate professional membership, after their application is approved.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <Link href="/professionals" className="btn btn-ghost">Professional pathway</Link>
          <Link href="/#invitation" className="btn btn-gold">Request invitation</Link>
        </div>
      </div>
    </div>
    </div>
    </>
  );
}
