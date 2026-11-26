import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/AuthForms";
import { EliteBadge } from "@/components/EliteBadge";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import { getViewer, hasRole } from "@/lib/auth";
import { OwnerPreviewNote } from "@/components/OwnerPreviewNote";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Apply for Elite Membership", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Direct Elite application: create an account (no other membership needed), then apply. */
export default async function JoinElite() {
  const [launch, catalogue, viewer] = await Promise.all([getLaunchState(), getCatalogue(), getViewer()]);
  if (viewer && !hasRole(viewer, ["owner"])) redirect("/app/elite/eligibility");
  const owner = hasRole(viewer, ["owner"]);
  if (!launch.registrations_open && !owner) {
    return (
      <div className="text-center">
        <p className="eyebrow">Elite Concierge</p>
        <h1 className="display mt-4 text-4xl">Elite applications open soon.</h1>
        <Link href="/elite" className="btn btn-gold mt-8 w-full">About Elite Concierge</Link>
      </div>
    );
  }
  return (
    <>
      {!launch.registrations_open && <OwnerPreviewNote what="Elite applications" />}
      <p className="eyebrow flex items-center gap-2"><EliteBadge size={16} interactive={false} /> Elite Concierge</p>
      <h1 className="display mt-4 text-4xl">Apply for Elite Membership</h1>
      <p className="mt-3 mb-6 text-sm text-muted">Qualification and verification required. Create your account to begin: no other membership is needed, nothing is charged, and standard verification is complimentary.</p>
      <JoinForm selection={{ experiences: [], addons: [], interval: "month", package: null, couples: false } as never} loveStatus={null} minimumAge={catalogue.minimum_member_age} elite />
      <p className="mt-6 text-center text-sm text-muted">Already a member? <Link href="/sign-in?next=/app/elite/eligibility" className="text-gold underline">Sign in to apply</Link></p>
    </>
  );
}
