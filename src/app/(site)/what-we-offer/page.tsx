import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getMembership } from "@/lib/membership-server";
import { LEVEL_LABEL } from "@/lib/membership-level";
import { whatsNew } from "@/lib/features";
import { FeatureDirectory } from "@/components/FeatureDirectory";

export const metadata: Metadata = { title: "What Does This Website Offer?", description: "Every feature of The Art of Connect: what it is, how it helps and which membership includes it.", alternates: { canonical: "/what-we-offer" } };
export const dynamic = "force-dynamic";

/** The feature directory (founder directive 20, section 2): one central registry, personalized when signed in. No AI. */
export default async function WhatWeOffer() {
  const viewer = await getViewer().catch(() => null);
  const m = viewer ? await getMembership(viewer) : null;
  const news = whatsNew().slice(0, 6);
  return (
    <div className="band theme-ivory">
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8 lg:py-24">
        <p className="eyebrow">Discover The Art of Connect</p>
        <h1 className="display mt-4 text-5xl sm:text-6xl">What does this website offer?</h1>
        <p className="mt-4 max-w-2xl text-muted">Every experience, explained: what it is, how it helps and whether it&rsquo;s part of {m ? <>your <strong>{LEVEL_LABEL[m.level]}</strong> membership</> : "each membership"}. Features marked Coming soon are not available yet.</p>
        {!viewer && <p className="mt-3 text-sm"><Link href="/join" className="text-gold underline">Begin free, start a 15-day trial or choose a membership</Link></p>}

        {news.length > 0 && (
          <div className="mt-10 rounded-[24px] border border-champagne/50 bg-white p-6">
            <p className="eyebrow">What&rsquo;s new at The Art of Connect</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">{news.map((f) => (
              <li key={f.key} className="text-sm"><span className="font-semibold">{f.name}</span> <span className="text-muted">· {new Date(`${f.released}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span><span className="block text-muted">{f.what}</span></li>
            ))}</ul>
          </div>
        )}

        <div className="mt-12">
          <FeatureDirectory signedIn={Boolean(m)} viewer={m ? { level: m.level, experiences: m.experiences, elite: m.elite } : null} />
        </div>
      </section>
    </div>
  );
}
