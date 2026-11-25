import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { EI_AREAS } from "@/lib/emotional-intelligence";
import { EIIcon } from "@/components/EIIcon";

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
            <p className="display mt-3 text-2xl italic leading-snug text-text/80 sm:text-3xl">Understand yourself. Manage your emotions.<br className="hidden sm:block" /> Build stronger, healthier connections.</p>
            <div className="mt-6 h-px w-24 bg-gold" />
            <p className="mt-6 max-w-xl text-lg text-text/80">Build greater self-awareness, manage your emotions, strengthen your relationships and make choices that align with the person you are becoming.</p>
          </div>
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl md:hidden">
            <Image src="/images/library/life/ei-portrait.webp" alt="" fill sizes="100vw" className="object-cover object-[60%_30%]" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-8 lg:py-16">
        <section aria-labelledby="choose">
          <div className="flex items-center justify-center gap-5">
            <span className="hidden h-px w-48 bg-gradient-to-r from-transparent to-gold sm:block" />
            <h2 id="choose" className="display text-center text-4xl sm:text-5xl">Choose Your Experience</h2>
            <span className="hidden h-px w-48 bg-gradient-to-l from-transparent to-gold sm:block" />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
            <div className="flex flex-col items-center rounded-[22px] border border-champagne bg-ivory/80 px-7 py-9 text-center">
              <span className="text-gold"><EIIcon name="book" className="h-14 w-14" /></span>
              <h3 className="display mt-3 text-4xl text-burgundy">Free Experience</h3>
              <p className="mt-2 text-lg text-text/80">Learn, reflect and build your emotional intelligence at your own pace.</p>
              <ul className="mt-6 space-y-3 text-left text-lg">
                {["Educational Lessons", "Interactive Questions & Answers", "Real-Life Scenarios", "Self-Reflection Exercises"].map((t) => (
                  <li key={t} className="flex items-center gap-3"><span className="text-gold"><EIIcon name="check" className="h-6 w-6" /></span>{t}</li>
                ))}
              </ul>
              <a href="#lessons" className="mt-8 inline-flex items-center gap-3 rounded-full border border-burgundy px-10 py-3.5 text-lg text-burgundy transition hover:bg-burgundy/5">Start Learning <span className="italic">(Free)</span> <span aria-hidden="true">→</span></a>
            </div>
            <div className="theme-dark relative overflow-hidden rounded-[22px] border border-gold/50 px-7 py-9 text-ivory" style={{ background: "linear-gradient(135deg, #5c1428 0%, #781f35 55%, #4a1020 100%)" }}>
              <span className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-champagne to-gold-bright px-4 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase text-espresso">Member Experience</span>
              <div className="flex items-center gap-4 pt-8 sm:pt-4">
                <span className="text-gold-bright"><EIIcon name="crown" className="h-12 w-12" /></span>
                <h3 className="display text-3xl sm:text-4xl">Interactive Experience with Journey</h3>
              </div>
              <p className="mt-3 text-lg text-ivory/85">Go deeper with personalized education, real conversations and live voice guidance from Journey.</p>
              <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
                <ul className="space-y-2.5">
                  {["Everything in the Free Experience, plus:", "Personalized Learning & Feedback", "One-on-One Conversations with Journey", "Live Voice Sessions", "Real-World Guidance for Your Life & Relationships", "Ongoing Growth & Accountability"].map((t) => (
                    <li key={t} className="flex items-center gap-3"><span className="text-gold-bright"><EIIcon name="check" className="h-5 w-5" /></span>{t}</li>
                  ))}
                </ul>
                <Link href="/app/journey/voice" aria-label="Start a live voice session with Journey" className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-gold-bright text-gold-bright shadow-[0_0_40px_rgba(230,201,143,0.35)]">
                  <span className="orb-halo absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(230_201_143/0.25),transparent_70%)]" aria-hidden="true" />
                  <EIIcon name="mic" className="relative h-12 w-12" />
                </Link>
              </div>
              <div className="mt-8 text-center">
                <Link href={`/app/journey?lesson=emotional-intelligence&ask=${encodeURIComponent("I’d like to learn about emotional intelligence and how it shows up in my life.")}#chat`} className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-champagne via-gold-bright to-champagne px-12 py-4 text-lg font-semibold text-espresso shadow-lg transition hover:brightness-105">
                  Continue with Journey <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="lessons" aria-label="Learning areas" className="grid scroll-mt-24 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {EI_AREAS.map((a) => (
            <Link key={a.slug} href={`/emotional-intelligence/${a.slug}`} className="group flex flex-col items-center rounded-[20px] border border-champagne/70 bg-ivory/70 px-5 py-7 text-center transition hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_14px_30px_-18px_rgba(116,63,77,0.35)]">
              <span className="text-gold"><EIIcon name={a.icon} /></span>
              <span className="display mt-3 text-2xl text-burgundy">{a.title}</span>
              <span className="mt-2 flex-1 text-sm text-text/75">{a.tagline}</span>
              <span className="mt-4 text-xl text-burgundy transition group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
          ))}
        </section>

        <Link href={viewer ? "/app/know-yourself/emotional-intelligence/lessons" : "/sign-in?next=/app/know-yourself/emotional-intelligence/lessons"} className="group grid items-center overflow-hidden rounded-[24px] border border-champagne/70 bg-ivory/80 shadow-[0_20px_40px_-28px_rgba(116,63,77,0.45)] transition hover:border-gold md:grid-cols-[1.2fr_1fr]">
          <span className="relative block aspect-[16/9]">
            <Image src="/images/self/emotional-intelligence.webp" alt="Emotional Intelligence: Understand your emotions. Respond with intention." fill sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
          </span>
          <span className="flex flex-col justify-center p-7 sm:p-9">
            <span className="text-xs tracking-[0.28em] uppercase text-gold-deep">Season One · Founding Curriculum</span>
            <span className="display mt-3 block text-3xl leading-snug text-burgundy">Six lessons in emotional intelligence</span>
            <span className="mt-3 block text-text/75">Who controls your reaction, your triggers, empathy, the power of your delivery, accountability and emotional maturity, with a written personal analysis at the end.</span>
            <span className="mt-5 font-medium text-burgundy">{viewer ? "Begin the lessons" : "Sign in to begin"} <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span></span>
          </span>
        </Link>

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
