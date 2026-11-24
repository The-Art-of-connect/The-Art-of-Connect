import Link from "next/link";
import { EXPERIENCES, type Experience } from "@/lib/experiences";

type Feature = { title: string; body: string };

export function ExperiencePage({
  experience,
  headline,
  intro,
  features,
  children,
}: {
  experience: Experience;
  headline: React.ReactNode;
  intro: string;
  features: Feature[];
  children?: React.ReactNode;
}) {
  const e = EXPERIENCES[experience];
  return (
    <>
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-8 lg:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]" style={{ background: e.accent }} />
        <p className="rise text-xs tracking-[0.3em] uppercase" style={{ color: e.accent }}>{e.eyebrow}</p>
        <h1 className="display rise rise-2 mt-6 max-w-4xl text-5xl sm:text-7xl">{headline}</h1>
        <p className="rise rise-3 mt-8 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
        <div className="rise rise-4 mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/#waitlist" className="btn btn-gold">Request your invitation</Link>
          <Link href="/membership" className="btn btn-ghost">View membership</Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article key={f.title} className="glass p-7">
              <p className="display text-2xl" style={{ color: e.accent }}>{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
      {children}
    </>
  );
}
