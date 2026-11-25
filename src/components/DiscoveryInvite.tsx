import Image from "next/image";
import Link from "next/link";
import { getDiscovery } from "@/lib/know-yourself-server";
import { setDiscoveryChoice } from "@/app/actions/who-am-i";

/**
 * The optional invitation to The Art of Knowing Yourself. Members who choose
 * "Explore my society first" or "Return when I'm ready" are not prompted again
 * (they can always open it from search or the member home).
 */
export async function DiscoveryInvite({ userId, back, context }: { userId: string; back: string; context?: string }) {
  const d = await getDiscovery(userId);
  if (d.choice === "explore_first" || d.choice === "later") return null;
  const started = d.percent > 0;
  return (
    <section className="theme-dark tile-in relative mt-8 overflow-hidden rounded-[26px] bg-ink">
      <div className="absolute inset-0">
        <Image src="/images/library/brand/gold-waves.webp" alt="" fill sizes="100vw" className="waves-drift object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/85 to-espresso/40" />
      </div>
      <div className="relative p-7 sm:p-10">
        <p className="eyebrow">The Art of Knowing Yourself</p>
        <p className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl">{started ? "Welcome back to your personal journey." : "Your first connection is with yourself."}</p>
        <p className="mt-3 max-w-2xl text-muted">{context ?? "Before the career, the relationship, the marriage and the responsibilities, there is you. Discover who you are, what you value and what you want your life to become."}</p>
        {started && (
          <div className="mt-5 max-w-md">
            <div className="h-1.5 overflow-hidden rounded-full bg-ivory/15"><div className="progress-fill h-full rounded-full bg-gradient-to-r from-champagne to-gold-bright" style={{ width: `${Math.max(d.percent, 4)}%` }} /></div>
            <p className="mt-2 text-xs text-gold-bright">{d.percent}% of “Who Am I?” explored · {d.modulesDone} of {d.totalModules} modules complete</p>
          </div>
        )}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/app/know-yourself#who-am-i" className="btn btn-gold shimmer">{started ? "Continue My Personal Journey" : "Begin My Personal Journey"}</Link>
          <form action={setDiscoveryChoice}><input type="hidden" name="choice" value="explore_first" /><input type="hidden" name="back" value={back} /><button className="btn btn-ghost w-full sm:w-auto">Explore My Society First</button></form>
          <form action={setDiscoveryChoice}><input type="hidden" name="choice" value="later" /><input type="hidden" name="back" value={back} /><button className="px-2 py-2 text-sm text-ivory/80 underline underline-offset-4 hover:text-gold-bright">Return When I’m Ready</button></form>
        </div>
        <p className="mt-6 border-t border-champagne/25 pt-4 text-xs tracking-wide text-gold-bright">Your discovery. Your pace. Your choice.</p>
      </div>
    </section>
  );
}
