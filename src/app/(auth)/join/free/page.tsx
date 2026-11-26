import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/AuthForms";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import { getViewer, hasRole } from "@/lib/auth";
import { OwnerPreviewNote } from "@/components/OwnerPreviewNote";

export const metadata: Metadata = { title: "Begin Free", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JoinFree({ searchParams }: { searchParams: Promise<{ society?: string }> }) {
  const [launch, catalogue, sp] = await Promise.all([getLaunchState(), getCatalogue(), searchParams]);
  const society = ["business", "singles", "couples"].includes(sp.society ?? "") ? sp.society! : null;
  const owner = hasRole(await getViewer(), ["owner"]);
  if (!launch.registrations_open && !owner) {
    return (
      <div className="text-center">
        <p className="eyebrow">Begin free</p>
        <h1 className="display mt-4 text-4xl">Free memberships open soon.</h1>
        <p className="mt-5 text-muted">Every member receives The Art of Self, plus the society they choose.</p>
        <Link href="/membership" className="btn btn-gold mt-8 w-full">Explore memberships</Link>
      </div>
    );
  }
  return (
    <>
      {!launch.registrations_open && <OwnerPreviewNote what="Free registration" />}
      <p className="eyebrow">Begin free · No payment details</p>
      <h1 className="display mt-4 text-4xl">Create your free account.</h1>
      <p className="mt-3 mb-6 text-sm text-muted">Your free membership includes The Art of Self and the complimentary features of the one society you choose. Journey is included with paid memberships, whenever you&rsquo;re ready.</p>
      <JoinForm selection={{ experiences: [], addons: [], interval: "month", package: null, couples: false } as never} loveStatus={null} minimumAge={catalogue.minimum_member_age} free society={society} />
      <p className="mt-6 text-center text-sm text-muted">Prefer a paid membership with Journey? <Link href="/membership#build" className="text-gold underline">Build your membership</Link></p>
    </>
  );
}
