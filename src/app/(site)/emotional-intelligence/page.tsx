import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { EI_AREAS } from "@/lib/emotional-intelligence";
import { EIIcon } from "@/components/EIIcon";
import { EIJourneyBand } from "@/components/EIJourneyBand";

export const metadata: Metadata = {
  title: "The Art of Emotional Intelligence",
  description: "Understand yourself. Respond with intention. Build self-awareness, manage your emotions and strengthen your relationships — with Journey as your personal educator.",
  alternates: { canonical: "/emotional-intelligence" },
};

export default async function EmotionalIntelligence() {
  const viewer = await getViewer();
  return (
    <div className="band theme-cream">
      <section className="relative overflow-hidden border-b border-champagne/60">
        <div className="absolute inset-y-0 right-0 hidden w-[52%] md:block">
          <Image src="/images/library/life/ei-portrait.webp" alt="A woman in quiet reflection" fill priority sizes="52vw" className="object-cover object-[60%_30%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/40 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-8 md:py-20">
          <div className="max-w-2xl">
            <p className="display text-4xl italic text-burgundy sm:text-5xl">The Art of</p>
            <h1 className="display text-5xl leading-[1.05] sm:text-7xl">Emotional Intelligence</h1>
            <p className="display mt-3 text-2xl italic text-text/80 sm:text-3xl">Understand yourself. Respond with intention.</p>
            <div className="mt-6 h-px w-24 bg-gold" />
            <p className="mt-6 max-w-xl text-lg text-text/80">Build greater self-awareness, manage your emotions, strengthen your relationships and make choices that align with the person you are becoming.</p>
          </div>
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl md:hidden">
            <Image src="/images/library/life/ei-portrait.webp" alt="" fill sizes="100vw" className="object-cover object-[60%_30%]" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-8 lg:py-16">
        <EIJourneyBand ask="I’d like to learn about emotional intelligence and how it shows up in my life." />

        <section aria-label="Learning areas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {EI_AREAS.map((a) => (
            <Link key={a.slug} href={`/emotional-intelligence/${a.slug}`} className="group flex flex-col items-center rounded-[20px] border border-champagne/70 bg-ivory/70 px-5 py-7 text-center transition hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_14px_30px_-18px_rgba(116,63,77,0.35)]">
              <span className="text-gold"><EIIcon name={a.icon} /></span>
              <span className="display mt-3 text-2xl text-burgundy">{a.title}</span>
              <span className="mt-2 flex-1 text-sm text-text/75">{a.tagline}</span>
              <span className="mt-4 text-xl text-burgundy transition group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[22px] border border-champagne/70 bg-ivory/70 p-7 sm:p-9">
            <p className="text-xs tracking-[0.28em] uppercase text-gold-deep">Why it matters</p>
            <p className="display mt-3 text-3xl leading-snug">Not simply knowing what emotional intelligence means — practicing it in everyday life.</p>
            <p className="mt-4 text-text/75">In love, in parenting, in friendship and at work, the moments that shape us most are emotional ones. Emotional intelligence is the art of feeling everything and choosing wisely: honoring your emotions without letting them decide for you.</p>
          </div>
          <div className="rounded-[22px] border border-champagne/70 bg-ivory/70 p-7 sm:p-9">
            <p className="text-xs tracking-[0.28em] uppercase text-gold-deep">Your private profile</p>
            <p className="display mt-3 text-3xl leading-snug">Reflect on your strengths, triggers and growth — over time.</p>
            <p className="mt-3 text-text/75">Optional, private and always yours. Never a label, never a diagnosis.</p>
            <Link href={viewer ? "/app/know-yourself/emotional-intelligence" : "/sign-in?next=/app/know-yourself/emotional-intelligence"} className="mt-5 inline-block font-medium text-burgundy underline-offset-4 hover:underline">
              {viewer ? "Open my Emotional Intelligence Profile →" : "Sign in to create your profile →"}
            </Link>
          </div>
        </section>
        <p className="text-center text-xs text-muted">Educational content for personal growth — not therapy, counseling or a diagnosis. Participation is always optional and at your own pace.</p>
      </div>
    </div>
  );
}
