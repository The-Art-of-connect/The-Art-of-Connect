import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { EXPERIENCES, type Experience } from "@/lib/experiences";

type Feature = { title: string; body: string };
const URL_KEY: Record<Experience, string> = { business: "business", counseling: "life", relationships: "love" };

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
      <div className="band theme-dark">
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
        <div>
          <p className="eyebrow rise">{e.subtitle} · {experience === "relationships" ? "Singles 30+ · Couples 21+" : "Adults 21+"}</p>
          <h1 className="display rise rise-2 mt-6 text-5xl sm:text-7xl">{headline}</h1>
          <p className="rise rise-3 mt-8 max-w-xl text-lg leading-relaxed text-muted">{intro}</p>
          <div className="rise rise-4 mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={`/membership?experiences=${URL_KEY[experience]}#build`} className="btn btn-gold">Choose {e.name}</Link>
            {experience === "business" ? (
              <Link href="/business/explore" className="btn btn-ghost">Explore The Professional Society</Link>
            ) : (
              <Link href="/membership" className="btn btn-ghost">Explore Memberships</Link>
            )}
          </div>
        </div>
        <div className="rise rise-3 relative aspect-[4/5] overflow-hidden rounded-[32px] border border-line-strong sm:aspect-[4/3] lg:aspect-[4/5]">
          <Image src={e.image} alt={e.imageAlt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-onyx/85 via-onyx/10 to-transparent" />
          <p className="display absolute bottom-6 left-6 text-3xl text-ivory sm:text-4xl">{e.caption}</p>
        </div>
      </section>
      </div>
      <div className="band theme-ivory">
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <article className="glass h-full p-7">
                <p className="display text-3xl text-gold">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      </div>
      {children && <div className="band theme-cream">{children}</div>}
    </>
  );
}
