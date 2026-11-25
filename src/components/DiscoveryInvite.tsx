import Image from "next/image";
import Link from "next/link";
import { getDiscovery } from "@/lib/know-yourself-server";
import { setDiscoveryChoice } from "@/app/actions/who-am-i";

/**
 * The optional invitation to The Art of Knowing Yourself. Members who choose
 * "Save for Later" or "Skip This Section" are not invited again (it remains
 * available from the member home, the menu and search).
 */
export async function DiscoveryInvite({ userId, back }: { userId: string; back: string }) {
  const d = await getDiscovery(userId);
  if (d.choice === "explore_first" || d.choice === "later") return null;
  const started = d.percent > 0;
  return (
    <section className="theme-dark tile-in relative mt-8 overflow-hidden rounded-[28px] bg-ink">
      <div className="absolute inset-0">
        <Image src="/images/library/brand/gold-waves.webp" alt="" fill sizes="100vw" className="waves-drift object-cover opacity-55" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_45%,rgb(33_28_24/0.55),rgb(33_28_24/0.92))]" />
      </div>
      <div className="relative mx-auto max-w-3xl px-6 py-12 text-center sm:px-12 sm:py-14">
        <p className="eyebrow">The Art of Knowing Yourself</p>
        <h2 className="display mt-4 text-4xl leading-tight sm:text-5xl">Before you connect with the world, <span className="gilded italic">connect with yourself.</span></h2>
        <div className="mx-auto mt-7 h-px max-w-md bg-gradient-to-r from-transparent via-champagne/60 to-transparent" />
        <p className="mt-7 text-balance text-lg text-ivory/90">Beyond the career, the relationship, the marriage and the responsibilities, there is you.</p>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-muted">Discover who you are, understand what you value, honor your boundaries and gain the knowledge to create a life that reflects your true self.</p>
        <p className="display mt-6 text-2xl italic text-gold-bright sm:text-3xl">Your life. Your identity. Your journey.</p>
        {started && (
          <div className="mx-auto mt-6 max-w-sm">
            <div className="h-1.5 overflow-hidden rounded-full bg-ivory/15"><div className="progress-fill h-full rounded-full bg-gradient-to-r from-champagne to-gold-bright" style={{ width: `${Math.max(d.percent, 4)}%` }} /></div>
            <p className="mt-2 text-xs text-gold-bright">{d.percent}% of your journey explored</p>
          </div>
        )}
        <Link href="/app/know-yourself" className="btn btn-gold shimmer mt-8 w-full sm:w-auto sm:px-10">{started ? "Continue My Journey of Self-Discovery" : "Begin My Journey of Self-Discovery"}</Link>
        <div className="mt-5 flex items-center justify-center gap-3 text-sm text-gold-bright">
          <form action={setDiscoveryChoice}><input type="hidden" name="choice" value="later" /><input type="hidden" name="back" value={back} /><button className="underline-offset-4 hover:underline">Save for Later</button></form>
          <span aria-hidden="true" className="text-champagne/60">·</span>
          <form action={setDiscoveryChoice}><input type="hidden" name="choice" value="explore_first" /><input type="hidden" name="back" value={back} /><button className="underline-offset-4 hover:underline">Skip This Section</button></form>
        </div>
        <p className="mt-8 border-t border-champagne/20 pt-5 text-xs tracking-[0.18em] text-ivory/70">Private. Personal. Always your choice.</p>
      </div>
    </section>
  );
}
