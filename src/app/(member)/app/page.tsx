import Link from "next/link";
import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";
import { getCatalogue } from "@/lib/catalogue";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { LivingHero } from "@/components/business/SocietyHero";
import { DiscoveryInvite } from "@/components/DiscoveryInvite";
import { Greeting } from "@/components/business/Greeting";
import { ReferralShare } from "@/components/ReferralShare";
import { DashboardHub } from "@/components/DashboardHub";
import { getNavState } from "@/lib/nav-state";
import { getDiscovery, nextModuleHref } from "@/lib/know-yourself-server";

const SOCIETY_NAME: Record<string, string> = { business: "The Professional Society", relationships: "The Personal Society", counseling: "The Art of Becoming" };
const PHOTO: Record<string, string> = {
  business: "/images/society/roundtable.webp",
  counseling: "/images/library/life/meditation.webp",
  relationships: "/images/library/love/candlelit-dinner.webp",
};

export default async function MemberHome() {
  const viewer = (await getViewer())!;
  const launch = await getLaunchState();
  const staff = isStaff(viewer) || isInsidePreview(viewer);
  const supabase = (await createClient())!;
  const [{ data: sub }, catalogue, nav, discovery] = await Promise.all([
    supabase.from("subscriptions").select("tier_name").eq("user_id", viewer.id).in("status", ["active", "trialing", "past_due"]).maybeSingle(),
    getCatalogue(),
    getNavState(),
    getDiscovery(viewer.id),
  ]);
  // Only the experiences this member actually has (staff in their own view see everything for review).
  const mine = staff ? EXPERIENCE_ORDER : EXPERIENCE_ORDER.filter((k) => viewer.experiences.includes(k));
  const others = EXPERIENCE_ORDER.filter((k) => !mine.includes(k));
  const subName = (k: string) => (k === "relationships" && viewer.society === "singles" ? "Singles" : k === "relationships" && viewer.society === "couples" ? "Couples" : null);
  const referralLink = viewer.referralCode ? `${env.siteUrl}/membership?ref=${viewer.referralCode}` : null;

  return (
    <>
      <LivingHero
        slides={[
          { src: "/images/library/life/journaling.webp", alt: "Writing in a journal by a sunlit window" },
          { src: "/images/society/roundtable.webp", alt: "Business owners gathered around a boardroom table" },
          { src: "/images/library/love/sunlit-anniversary.webp", alt: "A couple celebrating in warm afternoon light" },
          { src: "/images/library/life/meditation.webp", alt: "Meditating at sunrise above the sea" },
        ]}
        eyebrow="The Art of Connect" title="In Business. In Life." gilded="In Love."
        subtitle="Every meaningful connection begins with understanding yourself. Your journey starts here."
        cta={{ href: "/app/know-yourself", label: "The Art of Knowing Yourself" }}
        secondary={{ href: "/app/journey", label: "Meet Journey" }}
      />
      <div className="mt-10">
        <Greeting name={viewer.displayName} />
        <p className="mt-2 max-w-xl text-muted">Each experience is a separate space with its own profile. What you share in one never appears in another.</p>
      </div>
      {viewer.accountType === "member" && !sub && (
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-champagne/50 bg-champagne/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Complete your membership</p>
            <p className="mt-1 text-sm text-muted">Review your experiences and finish setting up your account.</p>
          </div>
          <Link href="/app/onboarding" className="btn btn-gold btn-sm">Continue</Link>
        </div>
      )}
      {sub && (
        <p className="mt-6 text-sm text-muted">
          {sub.tier_name} · <Link href="/app/membership" className="text-gold underline">Manage membership</Link>
        </p>
      )}
      <DashboardHub state={nav} experiences={staff ? [...EXPERIENCE_ORDER] : viewer.experiences} discovery={{ percent: discovery.percent, modulesDone: discovery.modulesDone, totalModules: discovery.totalModules, nextHref: nextModuleHref(discovery.answers, discovery.special) }} />
      <DiscoveryInvite userId={viewer.id} back="/app" />
      <section aria-labelledby="mine" className="mt-12">
        <p className="eyebrow">Your memberships</p>
        <h2 id="mine" className="display mt-2 text-3xl sm:text-4xl">Your experiences</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="glass lift tile-in group flex min-h-64 flex-col justify-between overflow-hidden !p-0">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image src="/images/self/identity-self-love.webp" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover object-right transition-transform duration-[1200ms] group-hover:scale-110" />
            </div>
            <div className="flex flex-1 flex-col justify-between p-7">
              <div>
                <span className="chip chip-live">Included for every member</span>
                <h3 className="display mt-5 text-3xl text-burgundy">The Art of Self</h3>
                <p className="mt-1 text-xs tracking-wide text-faint uppercase">Self-discovery · Self-love · Reflection</p>
                <p className="mt-3 text-sm text-muted">Know yourself, emotional intelligence, love languages and your Personal Discovery Portfolio.</p>
              </div>
              <Link href="/app/know-yourself" className="btn btn-ghost btn-sm mt-6 self-start">Enter</Link>
            </div>
          </div>
          {mine.map((key) => {
            const e = EXPERIENCES[key];
            const live = launch[`${key}_live` as const];
            const open = live && viewer.experiences.includes(key);
            return (
              <div key={key} className="glass lift tile-in group flex min-h-64 flex-col justify-between overflow-hidden !p-0">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={PHOTO[key]} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/50 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col justify-between p-7">
                  <div>
                    <span className={`chip ${open ? "chip-live" : "chip-locked"}`}>{open ? (subName(key) ?? "Active") : live ? "Staff preview" : "Opening soon"}</span>
                    <h3 className="display mt-5 text-3xl" style={{ color: e.accent }}>{SOCIETY_NAME[key]}</h3>
                    <p className="mt-1 text-xs tracking-wide text-faint uppercase">{e.name} · {e.subtitle}</p>
                    <p className="mt-3 text-sm text-muted">{e.caption}</p>
                  </div>
                  {(open || staff) && <Link href={`/app/${key}`} className="btn btn-ghost btn-sm mt-6 self-start">{open ? "Enter" : "Preview as staff"}</Link>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {others.length > 0 && (
        <section aria-labelledby="explore" className="mt-14 rounded-[28px] border border-champagne/60 bg-ivory/70 p-6 sm:p-9">
          <p className="eyebrow">Explore Memberships</p>
          <h2 id="explore" className="display mt-2 text-3xl">Discover more of The Art of Connect</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">These experiences aren&rsquo;t part of your membership yet. Explore them whenever you&rsquo;re curious, and add them if they feel right for you.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {others.map((key) => (
              <Link key={key} href={EXPERIENCES[key].href} className="group flex items-center gap-4 rounded-2xl border border-champagne/60 bg-ivory p-4 transition hover:border-gold">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"><Image src={PHOTO[key]} alt="" fill sizes="64px" className="object-cover" /></span>
                <span><span className="display block text-xl" style={{ color: EXPERIENCES[key].accent }}>{SOCIETY_NAME[key]}</span><span className="block text-xs text-muted">{EXPERIENCES[key].caption} Explore →</span></span>
              </Link>
            ))}
          </div>
          <Link href="/membership#build" className="btn btn-gold btn-sm mt-6">Explore memberships</Link>
        </section>
      )}

      {referralLink && (
        <section className="glass mt-10 p-7">
          <p className="eyebrow">Refer a friend</p>
          <h2 className="display mt-3 text-3xl">Share The Art of Connect</h2>
          <p className="mt-2 text-sm text-muted">{catalogue.referral_reward ?? "Know someone who would treasure meaningful connection? Share your personal invitation — by text, email, social media or in person."}</p>
          <ReferralShare url={referralLink} name={viewer.displayName} />
        </section>
      )}
    </>
  );
}
