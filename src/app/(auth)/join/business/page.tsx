import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/AuthForms";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import { getViewer, hasRole } from "@/lib/auth";
import { OwnerPreviewNote } from "@/components/OwnerPreviewNote";

export const metadata: Metadata = { title: "Join The Professional Society", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * The Professional Society (membership access v2): a paid membership, which new members may begin with a 15-day trial.
 * Creates the account; the membership or trial is chosen and confirmed at checkout. Opens when registration opens.
 */
export default async function JoinBusiness() {
  const [launch, catalogue] = await Promise.all([getLaunchState(), getCatalogue()]);
  const live = launch.registrations_open;
  const open = live || hasRole(await getViewer(), ["owner"]);
  return (
    <>
      {!live && open && <OwnerPreviewNote what="Professional Society registration" />}
      <p className="eyebrow">The Professional Society · In Business</p>
      <h1 className="display mt-4 text-4xl">{open ? "Join The Professional Society." : "Enrollment opens soon."}</h1>
      <p className="mt-4 text-muted">
        {open
          ? "Create your account, then begin with a 15-day free trial or join today. A card is required for the trial, and you won’t be charged if you cancel before it ends. The Art of Becoming is free with every account."
          : "Explore The Professional Society now. We’ll open enrollment soon."}
      </p>
      <div className="mt-8">
        {open ? (
          <JoinForm selection={{ experiences: ["business"], interval: "month", couples: false, addons: [], package: null }} loveStatus={null} minimumAge={catalogue.minimum_member_age} />
        ) : (
          <Link href="/business/explore" className="btn btn-gold w-full">Explore The Professional Society</Link>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-faint">For adults {catalogue.minimum_member_age}+ · Already a member? <Link href="/sign-in" className="text-gold underline">Sign in</Link></p>
    </>
  );
}
