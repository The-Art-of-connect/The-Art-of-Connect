import Link from "next/link";

/**
 * Three equal choices (founder directive 15): begin complimentary self-discovery, try a membership for 15 days,
 * or choose a membership now. Self-discovery is encouraged, never required first.
 */
export function MembershipChoices({ trialAvailable, compact = false }: { trialAvailable: boolean; compact?: boolean }) {
  const choices = [
    { title: "Begin with yourself", body: "Start your complimentary self-discovery in The Art of Becoming. Free, private and at your own pace.", href: "/app/know-yourself", cta: "Begin self-discovery", gold: false },
    ...(trialAvailable ? [{ title: "Try a membership for 15 days", body: "Explore communities, events, connections and Journey. A card is required; you won’t be charged if you cancel before the trial ends.", href: "/app/onboarding", cta: "Start a 15-day trial", gold: true }] : []),
    { title: "Choose a membership", body: "Join The Professional Society, The Personal Society, Couples or an exclusive membership today.", href: "/app/onboarding", cta: "Choose a membership", gold: !trialAvailable },
  ];
  return (
    <div className={`${compact ? "mt-6" : "mt-10"} grid gap-4 ${choices.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {choices.map((c) => (
        <div key={c.title} className="glass flex flex-col p-6">
          <p className="display text-2xl">{c.title}</p>
          <p className="mt-2 flex-1 text-sm text-muted">{c.body}</p>
          <Link href={c.href} className={`btn ${c.gold ? "btn-gold" : "btn-ghost"} mt-5`}>{c.cta}</Link>
        </div>
      ))}
      <p className="text-xs text-faint md:col-span-full">We encourage everyone to keep discovering themselves along the way: the more you share privately, the more relevant your recommendations become. Your discovery answers are never shown to other members.</p>
    </div>
  );
}
