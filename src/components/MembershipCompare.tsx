import Link from "next/link";
import { getGateContext } from "@/lib/gate-server";
import { bestValue, COUPLES_SUFFIX, describe, losses, mostComprehensive, recommendedForYou, type Plan } from "@/lib/recommend";
import { brandName } from "@/lib/brand";

const money = (c: number | null) => (c == null ? null : `$${(c / 100).toFixed(2)}`);
const LABEL = { current: "Current Membership", recommended: "Recommended for You", value: "Best Value", comprehensive: "Most Comprehensive Access" } as const;

/**
 * Every published membership, compared (founder directive 42): what the member already receives, what an upgrade adds,
 * the price difference, and four honest distinctions. Best Value is the genuine bundle saving; with no published prices,
 * no value claim is made. Elite Concierge is invitation-only and never sold here.
 */
export async function MembershipCompare({ interest }: { interest?: "business" | "relationships" | null }) {
  const gate = await getGateContext();
  if (!gate || gate.current.level === "elite") return null;
  const { current, offers } = gate;
  // Couples options are shown to couples (and to anyone who already has one); singles see the singles plans.
  const couple = current.society === "couples" || Boolean(current.packageSlug?.endsWith(COUPLES_SUFFIX)) || current.packageSlug === "couples-membership";
  const plans = gate.plans.filter((p) => couple ? p.love_track !== "single" : !p.slug.endsWith(COUPLES_SUFFIX));
  const rec = recommendedForYou(current, interest ? [interest] : [], plans);
  const value = bestValue(plans);
  const top = mostComprehensive(plans);
  const tags = (p: Plan) => [
    p.slug === current.packageSlug && LABEL.current,
    p.slug === rec && LABEL.recommended,
    p.slug === value?.slug && LABEL.value,
    p.slug === top && LABEL.comprehensive,
  ].filter(Boolean) as string[];
  const currentPlan = plans.find((x) => x.slug === current.packageSlug) ?? null;
  const have = current.experiences.filter((e) => e === "business" || e === "relationships").map((e) => (e === "business" ? "In Business" : "In Love"));
  return (
    <section id="compare" className="mt-14 scroll-mt-24">
      <p className="eyebrow">Compare memberships</p>
      <h2 className="display mt-2 text-3xl">Choose what fits your goals.</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted"><span className="font-semibold text-text">Every level up: everything you enjoy today, plus more.</span> You already receive The Art of Becoming{have.length ? `, ${have.join(" and ")}` : ""}. Upgrading never takes away what you have. Nothing changes until you choose, and nothing is charged before you confirm.</p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => {
          const t = tags(p);
          const d = describe(p, current, plans);
          const isCurrent = p.slug === current.packageSlug;
          const invitation = p.all_access;
          return (
            <li key={p.slug} className={`glass flex flex-col p-6 ${t.includes(LABEL.recommended) ? "ring-2 ring-gold" : ""}`}>
              {t.length > 0 && <p className="flex flex-wrap gap-1.5">{t.map((x) => <span key={x} className="rounded-full border border-gold/50 bg-gold/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">{x}</span>)}</p>}
              <h3 className="display mt-3 text-2xl">{p.name}</h3>
              <p className="mt-1 text-sm">{money(p.monthly_price_cents) ? <><span className="font-semibold">{money(p.monthly_price_cents)}</span> per month</> : <span className="text-muted">Pricing shown when memberships open</span>}</p>
              {!isCurrent && !invitation && current.packageSlug && d.priceDifferenceCents != null && d.priceDifferenceCents > 0 && <p className="text-xs text-muted">{money(d.priceDifferenceCents)} more per month than your current membership</p>}
              {p.slug === value?.slug && value.savingCents > 0 && <p className="text-xs text-muted">Saves {money(value.savingCents)} a month compared with each society separately</p>}
              {!isCurrent && losses(currentPlan, p).length > 0 ? <p className="mt-3 text-sm text-muted">Not a level up for you: it would remove {losses(currentPlan, p).join(", ")}.</p>
                : !isCurrent && d.gains.length > 0 && <p className="mt-3 text-sm"><span className="font-semibold">You gain:</span> {d.gains.join(", ")}</p>}
              <ul className="mt-3 space-y-1 text-sm text-muted">{(p.benefits ?? []).slice(0, 4).map((b) => <li key={b} className="flex gap-2"><span className="text-gold" aria-hidden="true">✓</span>{b}</li>)}</ul>
              <div className="mt-auto pt-5">
                {isCurrent ? <p className="text-sm font-semibold text-gold-deep">Your current membership</p>
                  : invitation ? <Link href="/elite" className="btn btn-ghost btn-sm w-full">Learn about {brandName("elite-concierge")} · by invitation</Link>
                  : <Link href={offers[p.slug]?.href ?? "/membership#build"} className="btn btn-gold btn-sm w-full">{offers[p.slug]?.trial ? `Start Your Free ${gate.trialDays}-Day Experience` : `Choose ${p.name}`}</Link>}
              </div>
            </li>
          );
        })}
      </ul>
      {!gate.paymentsLive && <p className="mt-4 text-center text-xs text-muted">Memberships open soon. Nothing is charged today.</p>}
    </section>
  );
}
