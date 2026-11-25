import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatWhen, getPublicWebinars, mediaUrl } from "@/lib/webinars";

export const metadata: Metadata = {
  title: "The Knowledge Exchange — Business Webinars",
  description: "Live business webinars by Professional Society members — business owners educating and helping business owners nationwide.",
  alternates: { canonical: "/webinars" },
};
export const dynamic = "force-dynamic";

export default async function WebinarCatalogue() {
  const webinars = (await getPublicWebinars()).filter((w) => w.status === "approved" && new Date(w.starts_at).getTime() + w.duration_minutes * 60_000 > Date.now());
  return (
    <>
      <div className="band theme-dark">
        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-8 lg:py-24">
          <p className="eyebrow">The Professional Society</p>
          <h1 className="display mt-4 text-5xl sm:text-6xl">The Knowledge Exchange</h1>
          <p className="mt-4 text-gold">Learn from experience. Share your expertise. Grow together.</p>
          <p className="mx-auto mt-4 max-w-2xl text-muted">Live webinars hosted by business owners for business owners — across cities and states. Free business accounts include complimentary webinars.</p>
        </section>
      </div>
      <div className="band theme-cream">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-20">
          {webinars.length ? (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {webinars.map((w) => {
                const img = mediaUrl(w.promo_image_path);
                const { date, time } = formatWhen(w.starts_at, w.time_zone);
                return (
                  <li key={w.id} className="glass overflow-hidden">
                    <Link href={`/webinars/${w.id}`} className="block">
                      {img ? <div className="relative aspect-[16/9]"><Image src={img} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" /></div> : <div className="theme-dark band flex aspect-[16/9] items-center justify-center p-6 text-center"><span className="display text-2xl text-gold">{w.title}</span></div>}
                      <div className="p-5">
                        <h2 className="display text-2xl">{w.title}</h2>
                        <p className="mt-1 text-sm text-muted">{w.host_display_name}</p>
                        <p className="mt-2 text-sm">{date} · {time}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mx-auto max-w-2xl rounded-2xl border border-champagne/60 bg-champagne/10 p-8 text-center">
              <p className="chip chip-locked mx-auto normal-case tracking-normal">Growing Community</p>
              <p className="display mt-4 text-3xl">Our first webinars are on their way.</p>
              <p className="mt-3 text-muted">Founding members are preparing to share their expertise. Webinars appear here as soon as they’re approved.</p>
              <Link href="/business/explore" className="btn btn-gold mt-6">Explore The Professional Society</Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
