import type { Metadata } from "next";
import { LegalDirectory } from "@/components/LegalDirectory";
import { CATEGORY_LABEL, getPublicLegal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Legal & Policy Center",
  description: "Terms, privacy, membership, safety and professional policies of The Art of Connect, LLC.",
  alternates: { canonical: "/legal" },
};
export const dynamic = "force-dynamic";

export default async function LegalCenter() {
  const docs = await getPublicLegal();
  const inEffect = docs.filter((d) => d.in_effect).length;
  return (
    <div className="band theme-cream">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-8 lg:py-28">
        <p className="eyebrow">The Art of Connect, LLC</p>
        <h1 className="display mt-5 text-5xl sm:text-6xl">Legal & Policy Center</h1>
        <p className="mt-5 max-w-2xl text-muted">
          The agreements and policies for The Professional Society, The Art of Becoming and The Personal Society — written for
          our members in plain language.
        </p>
        {inEffect < docs.length && (
          <p className="mt-6 max-w-2xl rounded-2xl border border-champagne/60 bg-champagne/10 p-5 text-sm">
            Our policies are being finalized with legal counsel ahead of launch. Each document is published here, with its effective
            date and version, once it is approved. Membership enrollment opens only after the required agreements are in effect.
          </p>
        )}
        <div className="mt-12">
          <LegalDirectory docs={docs.map(({ body: _b, ...d }) => d)} categories={CATEGORY_LABEL} />
        </div>
        <p className="mt-16 text-sm text-muted">Questions about these policies? Write to <span className="select-all text-gold">info@theartofconnect.com</span>.</p>
      </div>
    </div>
  );
}
