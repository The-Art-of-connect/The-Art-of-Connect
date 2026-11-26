import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getMembership } from "@/lib/membership-server";
import { LEVEL_LABEL } from "@/lib/membership-level";
import { whatsNew } from "@/lib/features";
import { FeatureDirectory } from "@/components/FeatureDirectory";
import { WhatsNewCarousel } from "@/components/WhatsNewCarousel";

export const metadata: Metadata = { title: "What Does This Website Offer?", description: "A complete guide to the features, communities and connections of The Art of Connect, and which membership includes each.", alternates: { canonical: "/what-we-offer" } };
export const dynamic = "force-dynamic";

/** The feature directory (founder directive 20, section 2): one central registry, personalized when signed in. No AI. */
export default async function WhatWeOffer() {
  const viewer = await getViewer().catch(() => null);
  const m = viewer ? await getMembership(viewer) : null;
  const news = whatsNew().filter((f) => f.image);
  return (
    <>
      <div className="theme-dark relative overflow-hidden" style={{ background: "radial-gradient(70% 90% at 85% 10%, rgb(122 28 40 / 0.65), transparent 60%), radial-gradient(60% 80% at 0% 100%, rgb(80 20 26 / 0.6), transparent 60%), linear-gradient(160deg, #1f1011 0%, #120a0a 55%, #0c0808 100%)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-screen" style={{ backgroundImage: "url(/images/library/brand/gold-waves.webp)", backgroundSize: "cover", backgroundPosition: "center" }} aria-hidden="true" />
        <section className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-8 lg:pt-24">
          <div className="flex items-center gap-4"><p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f0c98a]">Discover The Art of Connect</p><span className="hidden h-px w-32 bg-[#c9a96e]/50 sm:block" /></div>
          <h1 className="display mt-5 max-w-4xl text-5xl text-[#f6e7c8] sm:text-7xl">What does this website offer?</h1>
          <p className="display mt-5 max-w-2xl text-xl italic text-[#f5ecdf]/85 sm:text-2xl">A complete guide to the features, communities and connections available to you{m ? <> as a <span className="not-italic text-[#f0c98a]">{LEVEL_LABEL[m.level]}</span> member</> : " as a member"}.</p>
          <div className="mt-7 flex flex-wrap gap-5 text-sm">
            <Link href="/membership#compare" className="border-b border-[#c9a96e]/70 pb-0.5 text-[#f0c98a] hover:text-[#f6e7c8]">Compare memberships →</Link>
            {!viewer && <Link href="/join" className="border-b border-[#c9a96e]/40 pb-0.5 text-[#f5ecdf]/80 hover:text-[#f6e7c8]">Begin free or start a 15-day trial →</Link>}
          </div>
          {news.length > 0 && <div className="mt-14"><WhatsNewCarousel items={news} /></div>}
        </section>
      </div>
      <div className="band theme-ivory">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:py-16">
          <FeatureDirectory signedIn={Boolean(m)} viewer={m ? { level: m.level, experiences: m.experiences, elite: m.elite } : null} />
          <p className="mt-14 text-center text-xs text-faint">Features marked Coming soon are not available yet. Descriptions never grant access; every membership benefit is checked securely on our servers.</p>
        </section>
      </div>
    </>
  );
}
