import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/AuthForms";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";

export const metadata: Metadata = { title: "Free business account — The Professional Society", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Free Professional Society account: no card, no subscription. Opens when the owner authorizes it. */
export default async function JoinBusiness() {
  const [launch, catalogue] = await Promise.all([getLaunchState(), getCatalogue()]);
  const open = launch.registrations_open && launch.free_business_accounts_open;
  return (
    <>
      <p className="eyebrow">The Professional Society · Founding Member</p>
      <h1 className="display mt-4 text-4xl">{open ? "Create your free business account." : "Founding enrollment opens soon."}</h1>
      <p className="mt-4 text-muted">
        {open
          ? "No credit card and no subscription. Build your business profile, set your goals and connect with owners across cities and states."
          : "Explore The Professional Society now — we’ll open founding business accounts soon."}
      </p>
      <div className="mt-8">
        {open ? (
          <JoinForm business selection={{ experiences: ["business"], interval: "month", couples: false, addons: [], package: null }} loveStatus={null} minimumAge={catalogue.minimum_member_age} />
        ) : (
          <Link href="/business/explore" className="btn btn-gold w-full">Explore The Professional Society</Link>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-faint">Exclusively for adults {catalogue.minimum_member_age}+ · Already a member? <Link href="/sign-in" className="text-gold underline">Sign in</Link></p>
    </>
  );
}
