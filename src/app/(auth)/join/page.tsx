import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/AuthForms";
import { getLaunchState } from "@/lib/launch";

export const metadata: Metadata = { title: "Join", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const launch = await getLaunchState();
  if (!launch.registrations_open) {
    return (
      <div className="text-center">
        <p className="eyebrow">By invitation</p>
        <h1 className="display mt-4 text-4xl">Doors open soon.</h1>
        <p className="mt-5 text-muted">Membership is currently by invitation. Reserve your place and we’ll reach out personally.</p>
        <Link href="/#waitlist" className="btn btn-gold mt-8 w-full">Request an invitation</Link>
      </div>
    );
  }
  return (
    <>
      <p className="eyebrow">Membership</p>
      <h1 className="display mt-4 mb-8 text-4xl">Begin your story.</h1>
      <JoinForm />
    </>
  );
}
