import type { Metadata } from "next";
import Link from "next/link";
import { ProfessionalApplicationForm, ProfessionalInterestForm } from "@/components/ProfessionalForms";
import { getViewer } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";

export const metadata: Metadata = { title: "Professional application", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const [launch, viewer] = await Promise.all([getLaunchState(), getViewer()]);
  const open = launch.counselor_applications_open;

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-8 lg:py-28">
      <Link href="/professionals" className="text-sm text-gold hover:text-gold-bright">← Professional pathway</Link>
      <h1 className="display mt-6 text-5xl">{open ? "Professional application" : "Express your interest"}</h1>
      <p className="mt-4 text-muted">
        {open
          ? "Tell us about your practice. Our team reviews every application personally."
          : "Applications open ahead of our launch. Share your details and we’ll invite you to apply as soon as they do."}
      </p>
      <div className="glass glass-edge mt-10 p-7 sm:p-10">
        {open && viewer ? (
          <ProfessionalApplicationForm />
        ) : open ? (
          <div className="text-center">
            <p className="text-muted">Please sign in to submit your application.</p>
            <Link href="/sign-in?next=/professionals/apply" className="btn btn-gold mt-6">Sign in</Link>
          </div>
        ) : (
          <ProfessionalInterestForm />
        )}
      </div>
    </div>
  );
}
