import Link from "next/link";
import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";
import { getCatalogue } from "@/lib/catalogue";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { LivingHero } from "@/components/business/SocietyHero";
import { KnowYourselfBanner } from "@/components/Living";
import { Greeting } from "@/components/business/Greeting";
import { reflectionsWritten } from "@/lib/know-yourself-server";

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
  const [{ data: sub }, catalogue] = await Promise.all([
    supabase.from("subscriptions").select("tier_name").eq("user_id", viewer.id).in("status", ["active", "trialing", "past_due"]).maybeSingle(),
    getCatalogue(),
  ]);
  const done = isInsidePreview(viewer) ? 0 : await reflectionsWritten(viewer.id);
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
        cta={{ href: "/app/know-yourself", label: "Know yourself first" }}
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
      <KnowYourselfBanner context="Know what you will do, what you won’t — and how to say it with respect — before dating, marriage or work." done={done} />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {EXPERIENCE_ORDER.map((key) => {
          const e = EXPERIENCES[key];
          const live = launch[`${key}_live` as const];
          const granted = viewer.experiences.includes(key);
          const open = live && granted;
          const status = open ? "Active" : !live ? "Opening soon" : "Not in your membership";
          return (
            <div key={key} className="glass lift tile-in group flex min-h-64 flex-col justify-between overflow-hidden !p-0">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={PHOTO[key]} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-espresso/50 to-transparent" />
              </div>
              <div className="flex flex-1 flex-col justify-between p-7">
              <div>
                <span className={`chip ${open ? "chip-live" : "chip-locked"}`}>{status}</span>
                <h2 className="display mt-5 text-3xl" style={{ color: e.accent }}>{e.name}</h2>
                <p className="mt-1 text-xs tracking-wide text-faint uppercase">{e.subtitle}</p>
                <p className="mt-3 text-sm text-muted">{e.caption}</p>
              </div>
              {open || staff ? (
                <Link href={`/app/${key}`} className="btn btn-ghost btn-sm mt-6 self-start">
                  {open ? "Enter" : isInsidePreview(viewer) ? "Preview" : "Preview as staff"}
                </Link>
              ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {referralLink && (
        <section className="glass mt-10 p-7">
          <p className="eyebrow">Refer a friend</p>
          <h2 className="display mt-3 text-3xl">Share The Art of Connect</h2>
          <p className="mt-2 text-sm text-muted">{catalogue.referral_reward ?? "Invite friends who would value meaningful connection."}</p>
          <p className="mt-4 break-all rounded-xl border border-line bg-ink-3 px-4 py-3 font-mono text-sm">{referralLink}</p>
        </section>
      )}
    </>
  );
}
