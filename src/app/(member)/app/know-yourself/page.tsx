import Image from "next/image";
import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { getDiscovery, moduleHref, moduleProgress, nextModuleHref } from "@/lib/know-yourself-server";
import { BRAND_MESSAGE, JOURNEY_DEEPER, MODULES, PILLARS } from "@/lib/who-am-i";
import { setDiscoveryChoice } from "@/app/actions/who-am-i";
import { LivingHero } from "@/components/business/SocietyHero";
import { PillarIcon } from "@/components/PillarIcon";

export const metadata = { title: "The Art of Knowing Yourself" };
export const dynamic = "force-dynamic";

export default async function ArtOfKnowingYourself() {
  const viewer = (await getViewer())!;
  const d = await getDiscovery(viewer.id);
  const started = d.percent > 0;
  const paused = d.choice === "explore_first" || d.choice === "later";

  return (
    <>
      <LivingHero
        slides={[
          { src: "/images/library/life/journaling.webp", alt: "A woman writing in her journal by a sunlit window" },
          { src: "/images/library/life/meditation.webp", alt: "Meditating at sunrise above the sea" },
          { src: "/images/library/life/garden-walk.webp", alt: "A calm walk through a flowering garden" },
          { src: "/images/library/business/executive-portrait.webp", alt: "A confident woman seated in a stately room" },
        ]}
        eyebrow="The Art of Knowing Yourself" title="Your first connection is" gilded="with yourself."
        subtitle="Beyond the career, the relationship, the marriage and the responsibilities, there is you. Discover who you are, understand what you value, honor your boundaries and create a life that reflects your true self."
        cta={{ href: nextModuleHref(d.answers, d.special), label: started ? "Continue My Journey of Self-Discovery" : "Begin My Journey of Self-Discovery" }}
        secondary={{ href: "/app", label: "Explore My Society" }}
      />

      {paused && (
        <p className="mt-6 rounded-2xl border border-champagne/50 bg-champagne/10 px-5 py-3 text-sm">
          Welcome back. Your journey of self-discovery is here whenever you are — explore as much or as little as feels right.
        </p>
      )}

      <section className="theme-dark relative mt-10 overflow-hidden rounded-[28px] bg-ink px-6 py-10 sm:px-12">
        <div className="glow-breathe pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgb(197_165_114/0.35),transparent_70%)]" aria-hidden="true" />
        <p className="eyebrow relative text-center">The Art of Connect</p>
        <p className="display relative mt-3 text-center text-3xl sm:text-4xl">{BRAND_MESSAGE}</p>
        <p className="display relative mt-2 text-center text-xl italic text-gold-bright">Your first and most important connection is with you.</p>
        <div className="relative mx-auto mt-8 h-px max-w-3xl bg-champagne/30" />
        <ul className="relative mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <li key={p.key} className="tile-in flex gap-4" style={{ animationDelay: `${i * 90}ms` }}>
              <PillarIcon pillar={p.key} className="mt-1 h-7 w-7 shrink-0 text-gold-bright" />
              <span><span className="display block text-2xl text-gold-bright">{p.title}</span><span className="mt-1 block text-sm text-muted">{p.line}</span></span>
            </li>
          ))}
        </ul>
        <p className="relative mt-10 text-center text-xs tracking-[0.3em] uppercase text-gold">In Business. In Life. In Love.</p>
      </section>

      <section id="who-am-i" className="mt-14 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your personal discovery program</p>
            <h2 className="display mt-2 text-5xl">Who Am I?</h2>
            <p className="mt-3 max-w-2xl text-muted">Ten private reflections to explore in any order, at your own pace. One personal profile travels with you across Business, Life, Singles and Couples — so each question is asked only once.</p>
          </div>
          {started && (
            <div className="w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-ivory"><div className="progress-fill h-full rounded-full bg-gradient-to-r from-gold-deep via-champagne to-gold-bright" style={{ width: `${Math.max(d.percent, 3)}%` }} /></div>
              <p className="mt-2 text-sm text-muted">{d.percent}% explored · {d.modulesDone} of {d.totalModules} complete</p>
            </div>
          )}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => {
            const pr = moduleProgress(m.slug, d.answers, d.special);
            const done = pr.done >= pr.total;
            const pillar = PILLARS.find((p) => p.key === m.pillar)!;
            const href = moduleHref(m.slug);
            return (
              <Link key={m.slug} href={href} className="glass lift tile-in group block overflow-hidden !p-0" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image src={m.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/75 via-espresso/10 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1 text-[0.68rem] font-semibold text-gold-deep">{done ? "✓ Complete" : pr.done ? `${pr.done} of ${pr.total}` : `${m.minutes} min`}</span>
                  <span className="absolute bottom-3 left-4 flex items-center gap-2 text-xs text-ivory"><PillarIcon pillar={m.pillar} className="h-4 w-4" />{pillar.title}</span>
                </div>
                <div className="p-5">
                  <p className="text-[0.65rem] tracking-[0.22em] uppercase text-faint">Module {i + 1}</p>
                  <h3 className="display mt-1 text-2xl">{m.title}</h3>
                  <p className="mt-2 text-sm text-muted">{m.intro}</p>
                  <p className="mt-3 text-sm font-semibold text-gold">{done ? "Revisit" : pr.done ? "Continue" : "Begin"} <span aria-hidden="true">→</span></p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14 grid gap-5 lg:grid-cols-3">
        <Link href="/app/know-yourself/learn" className="glass lift tile-in block p-7">
          <PillarIcon pillar="educate" className="h-8 w-8 text-gold" />
          <p className="display mt-4 text-3xl">Learn</p>
          <p className="mt-2 text-sm text-muted">Short lessons on values, patterns, boundaries, confidence and intentional connection — free to explore anytime.</p>
          <p className="mt-4 text-sm font-semibold text-gold">Open the lessons →</p>
        </Link>
        <Link href="/app/know-yourself/growth" className="glass lift tile-in block p-7" style={{ animationDelay: "90ms" }}>
          <PillarIcon pillar="grow" className="h-8 w-8 text-gold" />
          <p className="display mt-4 text-3xl">My growth plan</p>
          <p className="mt-2 text-sm text-muted">Set personal development goals and see how your answers have changed over time.</p>
          <p className="mt-4 text-sm font-semibold text-gold">See my growth →</p>
        </Link>
        <Link href="/app/journey" className="theme-dark lift tile-in relative block overflow-hidden rounded-[24px] bg-ink p-7" style={{ animationDelay: "180ms" }}>
          <div className="orb-halo pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.45),transparent_70%)]" aria-hidden="true" />
          <p className="eyebrow relative">Paid members</p>
          <p className="display relative mt-2 text-3xl text-gold-bright">Go deeper with Journey</p>
          <p className="relative mt-2 text-sm text-muted">Personalized guidance that helps you reflect and reach your own understanding — never decisions made for you.</p>
          <ul className="relative mt-4 flex flex-wrap gap-1.5">
            {JOURNEY_DEEPER.slice(0, 6).map((j) => <li key={j} className="rounded-full border border-champagne/40 px-2.5 py-1 text-[0.68rem] text-ivory/85">{j}</li>)}
          </ul>
          <p className="relative mt-4 text-xs text-muted">Included with paid memberships, within your Journey allowance.</p>
        </Link>
      </section>

      <section className="mt-12 rounded-2xl border border-line-strong bg-ivory/60 p-6 text-sm text-muted">
        <p className="font-semibold text-text">Private, optional and yours</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your answers and reflections are visible only to you — never to business connections, dating matches, partners, providers or our team.</li>
          <li>Participation is entirely optional and never affects your membership, matchmaking eligibility or access to features you’ve purchased.</li>
          <li>This is education and reflection — not a diagnosis, therapy or a judgment of whether you’re ready for a relationship.</li>
          <li>The basic program uses our own written content; no AI processes your answers unless you choose to talk with Journey.</li>
        </ul>
      </section>

      {!paused && !isInsidePreview(viewer) && (
        <form action={setDiscoveryChoice} className="mt-8 text-center">
          <input type="hidden" name="choice" value="later" /><input type="hidden" name="back" value="/app" />
          <button className="text-sm text-muted underline underline-offset-4 hover:text-gold">Save for Later</button>
        </form>
      )}
      <p className="display mt-10 text-center text-2xl italic text-gold-deep">Your life. Your identity. Your journey.</p>
      <p className="mt-2 text-center text-xs tracking-[0.18em] text-muted">Private. Personal. Always your choice.</p>
    </>
  );
}
