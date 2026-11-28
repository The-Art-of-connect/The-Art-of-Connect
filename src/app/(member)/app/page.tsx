import Link from "next/link";
import { GrowthPanel } from "@/components/GrowthPanel";
import { EliteBadge } from "@/components/EliteBadge";
import { EliteHome } from "@/components/EliteHome";
import { getViewer, hasPaidAccess, isInsidePreview, isStaff } from "@/lib/auth";
import { PossibilitiesGrid } from "@/components/PossibilitiesGrid";
import { PaidHome } from "@/components/PaidHome";
import { getMembership } from "@/lib/membership-server";
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
import { AskJourney } from "@/components/AskJourney";
import { ExperienceDoors } from "@/components/ExperienceDoors";
import { nextStep } from "@/lib/next-step";
import { isQaAccount } from "@/lib/qa-access";

const SOCIETY_NAME: Record<string, string> = { business: "The Professional Society", relationships: "The Personal Society", counseling: "The Art of Becoming" };
const PHOTO: Record<string, string> = {
  business: "/images/society/roundtable.webp",
  counseling: "/images/library/life/meditation.webp",
  relationships: "/images/library/love/candlelit-dinner.webp",
};

const LOCKED: Record<string, string> = { relationships: "In Love", business: "In Business" };

export default async function MemberHome({ searchParams }: { searchParams: Promise<{ locked?: string }> }) {
  const { locked } = await searchParams;
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

  const [{ data: elite }, { data: badge }] = isInsidePreview(viewer) ? [{ data: null }, { data: null }] : await Promise.all([
    supabase.from("elite_candidates").select("status").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("elite_badges").select("status, issued_at").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const isElite = badge?.status === "active";
  const membership = await getMembership(viewer);
  // The QA account previews experiences before launch; its cards must match what actually opens (audit priority 2).
  const qaPreview = !staff && (await isQaAccount(viewer.id));
  const { data: cm } = viewer.society === "couples" && !isInsidePreview(viewer) ? await supabase.schema("relationships").from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle() : { data: null };
  const { data: partners } = cm ? await supabase.schema("relationships").from("couple_members").select("user_id").eq("couple_id", cm.couple_id) : { data: null };
  const next = nextStep({
    discoveryStarted: discovery.percent > 0, discoveryHref: nextModuleHref(discovery.answers, discovery.special), level: membership?.level ?? "free",
    experiences: viewer.experiences, society: viewer.society ?? null, coupleJoined: viewer.society === "couples" ? (partners ?? []).some((p) => p.user_id !== viewer.id) : null, paidJourney: nav.paid,
  });
  return (
    <>
      {locked && LOCKED[locked] && (
        <p role="status" className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm">
          <span className="font-semibold text-gold">{LOCKED[locked]} is opening soon.</span> It&rsquo;s included in your membership, and we&rsquo;ll let you know the moment it opens.
          In the meantime, <Link href="/app/life" className="text-gold underline">continue In Life</Link> or <Link href="/app/journey" className="text-gold underline">ask Journey</Link>.
        </p>
      )}
      {elite?.status === "invitation_issued" && (
        <Link href="/app/elite/eligibility" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border-2 border-[#e8892b]/60 px-6 py-4 text-[#f6e7c8]" style={{ background: "#1b1310" }}>
          <span className="flex items-center gap-3"><EliteBadge size={22} interactive={false} /><span><span className="display block text-2xl">You&rsquo;re invited to Elite Concierge.</span><span className="text-xs text-[#f5ecdf]/70">A private invitation is waiting for you. Nothing is charged until you choose.</span></span></span>
          <span className="text-sm font-semibold text-[#f0a35a]">View my invitation →</span>
        </Link>
      )}
      <section className="mb-10 rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] px-5 py-8 shadow-sm sm:px-10 sm:py-12">
        <p className="eyebrow">Your world. Your possibilities.</p>
        <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">What would you like to experience today?</h1>
        <div className="mt-6 max-w-2xl"><AskJourney level={membership?.level ?? "free"} journey={nav.paid} /></div>
        <div className="mt-8"><ExperienceDoors love={viewer.experiences.includes("relationships")} business={viewer.experiences.includes("business")} /></div>
        {!isInsidePreview(viewer) && <div className="mt-8"><GrowthPanel userId={viewer.id} compact /></div>}
      </section>
      {isElite ? <EliteHome name={viewer.displayName} since={badge?.issued_at ? new Date(badge.issued_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null} /> : <LivingHero headingLevel="h2"
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
      />}
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
      <DashboardHub next={next} state={nav} experiences={staff ? [...EXPERIENCE_ORDER] : viewer.experiences} discovery={{ percent: discovery.percent, modulesDone: discovery.modulesDone, totalModules: discovery.totalModules, nextHref: nextModuleHref(discovery.answers, discovery.special) }} />
      <DiscoveryInvite userId={viewer.id} back="/app" />
      <section aria-labelledby="mine" className="mt-12">
        <p className="eyebrow">Your memberships</p>
        <h2 id="mine" className="display mt-2 text-3xl sm:text-4xl">Your experiences</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="glass lift tile-in group flex min-h-64 flex-col justify-between overflow-hidden !p-0">
            {/* The banner's exact proportions, so the whole artwork (including its title) always shows. */}
            <div className="relative aspect-[1672/941] overflow-hidden">
              <Image src="/images/self/identity-self-love.webp" alt="Identity & Self-Love: Discover who you are beyond roles, responsibilities and expectations." fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between p-7">
              <div>
                <span className="chip chip-live">Included for every member</span>
                <h3 className="display mt-5 text-3xl text-burgundy">The Art of Knowing Yourself</h3>
                <p className="mt-1 text-xs tracking-wide text-faint uppercase">Self-discovery · Self-love · Reflection</p>
                <p className="mt-3 text-sm text-muted">Know yourself, emotional intelligence, love languages and My Personal Discovery Portfolio.</p>
              </div>
              <Link href="/app/know-yourself" className="btn btn-ghost btn-sm mt-6 self-start">Enter</Link>
            </div>
          </div>
          {mine.map((key) => {
            const e = EXPERIENCES[key];
            const live = launch[`${key}_live` as const] || qaPreview;
            const open = live && viewer.experiences.includes(key);
            return (
              <div key={key} className="glass lift tile-in group flex min-h-64 flex-col justify-between overflow-hidden !p-0">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={PHOTO[key]} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/50 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col justify-between p-7">
                  <div>
                    <span className={`chip ${open ? "chip-live" : "chip-locked"}`}>{open ? (key === "counseling" ? "Free · included with every account" : subName(key) ?? "Active") : live ? "Staff preview" : "Opening soon"}{qaPreview && open ? " · QA preview" : ""}</span>
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

      {/* Your world of possibilities (founder directive 19): complimentary experiences and greyed-out paid previews. */}
      {/* Paid members (founder directive 20): their conversations, events, connections, goals and what's new. */}
      {membership && membership.level !== "free" && !isInsidePreview(viewer) && <PaidHome userId={viewer.id} level={membership.level} />}
      {!isElite && <div className="mt-14"><PossibilitiesGrid paid={hasPaidAccess(viewer)} /></div>}

      {/* The Art of Becoming (founder directives 17 and 18): daily value for every account, and what's possible next. */}
      <section aria-labelledby="sanctuary" className="mt-14 grid gap-5 md:grid-cols-2">
        <Link href="/app/sanctuary" className="glass lift group block p-7">
          <span className="chip chip-live">Free with every account</span>
          <h2 id="sanctuary" className="display mt-4 text-3xl text-burgundy">My Daily Sanctuary</h2>
          <p className="mt-2 text-sm text-muted">Today&rsquo;s manifestation, check-in, lesson, scenario, gratitude and evening reflection, plus your weekly reflections, letters to your future self and My Vision Board.</p>
          <span className="mt-4 inline-block text-sm text-gold">Enter my Sanctuary →</span>
        </Link>
        <Link href="/app/discover" className="glass lift group block p-7">
          <span className="chip">Personalized to you</span>
          <h2 className="display mt-4 text-3xl">Discover What&rsquo;s Possible</h2>
          <p className="mt-2 text-sm text-muted">See what&rsquo;s happening inside Connect and the communities, events and learning that match what you&rsquo;ve chosen to share.</p>
          <span className="mt-4 inline-block text-sm text-gold">Explore →</span>
        </Link>
      </section>

      {others.length > 0 && !isElite && (
        <section aria-labelledby="explore" className="mt-14 rounded-[28px] border border-champagne/60 bg-ivory/70 p-6 sm:p-9">
          <p className="eyebrow">Explore Memberships</p>
          <h2 id="explore" className="display mt-2 text-3xl">Discover more of The Art of Connect</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">These experiences aren&rsquo;t part of your membership yet. Explore them whenever you&rsquo;re curious. New members can try a membership free for 15 days (card required; cancel before it ends and you won&rsquo;t be charged).</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {others.map((key) => (
              <Link key={key} href={EXPERIENCES[key].href} className="group flex items-center gap-4 rounded-2xl border border-champagne/60 bg-ivory p-4 transition hover:border-gold">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"><Image src={PHOTO[key]} alt="" fill sizes="64px" className="object-cover" /></span>
                <span><span className="display block text-xl" style={{ color: EXPERIENCES[key].accent }}>{SOCIETY_NAME[key]}</span><span className="block text-xs text-muted">{EXPERIENCES[key].caption} Explore →</span></span>
              </Link>
            ))}
          </div>
          <Link href="/app/onboarding" className="btn btn-gold btn-sm mt-6">Start a trial or choose a membership</Link>
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
