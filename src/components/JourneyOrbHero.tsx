import Image from "next/image";
import Link from "next/link";

/** Journey's hero: a breathing orb of light over drifting gold waves. */
export function JourneyOrbHero() {
  return (
    <section className="theme-dark relative overflow-hidden rounded-[28px] bg-ink">
      <div className="absolute inset-0 overflow-hidden">
        <Image src="/images/library/brand/gold-waves.webp" alt="" fill priority sizes="100vw" className="waves-drift object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/60 to-ink" />
      </div>
      <div className="relative grid items-center gap-8 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow rise">The Art of Connect</p>
          <h1 className="display rise rise-2 mt-4 text-6xl text-gold-bright sm:text-7xl">Journey</h1>
          <p className="display rise rise-3 mt-4 text-2xl italic text-muted sm:text-3xl">Understanding. Clarity. Connection.</p>
          <p className="rise rise-3 mt-5 max-w-xl text-muted">Your personal connection concierge — a private space to be heard and a place to grow. Journey listens before advising, asks meaningful questions and helps you discover your own answers.</p>
          <div className="rise rise-4 mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/app/journey/voice" className="btn btn-gold shimmer">Talk to Journey</Link>
            <a href="#chat" className="btn btn-ghost">Chat with Journey</a>
          </div>
        </div>
        <div className="relative order-first mx-auto aspect-square w-full max-w-[15rem] sm:max-w-sm lg:order-none">
          <div className="orb-halo absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.55),rgb(116_63_77/0.25)_55%,transparent_72%)] blur-2xl" aria-hidden="true" />
          <div className="orb-breathe absolute inset-[12%] overflow-hidden rounded-full">
            <Image src="/images/library/journey/orb-glow.webp" alt="Journey's glowing orb of light" fill sizes="384px" className="scale-[1.18] object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
