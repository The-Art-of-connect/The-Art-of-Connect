import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatWhen, getPublicWebinar, mediaUrl, publicWebinarUrl } from "@/lib/webinars";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const w = await getPublicWebinar((await params).id);
  if (!w) return {};
  const image = `/webinars-media/${w.id}/flyer?format=landscape`;
  const description = w.description.slice(0, 180);
  return {
    title: `${w.title} — The Knowledge Exchange`,
    description,
    alternates: { canonical: `/webinars/${w.id}` },
    openGraph: { title: w.title, description, url: `/webinars/${w.id}`, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

/** Public, shareable webinar page. Visitors explore before creating a free account. */
export default async function PublicWebinar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { id } = await params;
  const ref = ((await searchParams).ref ?? "direct").replace(/[^a-z0-9_-]/gi, "").toLowerCase().slice(0, 40) || "direct";
  const w = await getPublicWebinar(id);
  if (!w) notFound();
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  await supabase?.schema("business").rpc("record_webinar_visit", { webinar: id, src: ref });
  const img = mediaUrl(w.promo_image_path);
  const headshot = mediaUrl(w.headshot_path);
  const { date, time } = formatWhen(w.starts_at, w.time_zone);
  const ended = new Date(w.starts_at).getTime() + w.duration_minutes * 60_000 < Date.now();
  const memberLink = `/app/business/learn/${id}?ref=${ref}`;

  return (
    <div className="band theme-cream">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 lg:py-24">
        <article className="theme-dark band overflow-hidden rounded-[28px]">
          {img && <div className="relative aspect-[16/9] w-full"><Image src={img} alt="" fill priority sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" /></div>}
          <div className="p-8 text-center sm:p-12">
            <p className="eyebrow">The Professional Society presents</p>
            <h1 className="display mt-4 text-4xl sm:text-6xl">{w.title}</h1>
            <p className="mt-4 tracking-[0.2em] text-gold uppercase">Live business webinar</p>
            <div className="mx-auto my-6 h-px w-40 bg-champagne/60" />
            <p className="text-lg">{date}</p>
            <p className="text-lg">{time} · {w.duration_minutes} minutes</p>
            {ended ? (
              <p className="mt-8 text-muted">This webinar has ended. Explore upcoming webinars in The Knowledge Exchange.</p>
            ) : viewer ? (
              <Link href={memberLink} className="btn btn-gold mt-8">Register to Attend</Link>
            ) : (
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={`/join/business?next=${encodeURIComponent(memberLink)}`} className="btn btn-gold">Create a free business account to attend</Link>
                <Link href={`/sign-in?next=${encodeURIComponent(memberLink)}`} className="btn btn-ghost">Sign in</Link>
              </div>
            )}
            <p className="mt-6 text-xs tracking-[0.2em] text-gold uppercase">Hosted on The Art of Connect</p>
          </div>
        </article>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <section className="glass p-7">
            <p className="whitespace-pre-line leading-relaxed">{w.description}</p>
            {w.learning_objectives.length > 0 && (
              <ul className="mt-5 space-y-1.5 text-sm">{w.learning_objectives.map((o) => <li key={o} className="flex gap-2"><span className="text-gold">✓</span>{o}</li>)}</ul>
            )}
            {w.audience && <p className="mt-5 text-sm text-muted">For: {w.audience}</p>}
          </section>
          <aside className="glass p-7">
            <div className="flex items-center gap-4">
              {headshot && <Image src={headshot} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />}
              <div><p className="font-semibold">{w.host_display_name}</p><p className="text-xs text-muted">Your host</p></div>
            </div>
            {w.host_bio && <p className="mt-4 text-sm text-muted">{w.host_bio}</p>}
            <p className="mt-6 text-xs text-muted">Free business accounts include complimentary webinars. No credit card required. Exclusively for business owners 40+.</p>
            <p className="mt-3 break-all text-xs text-faint">{publicWebinarUrl(id)}</p>
          </aside>
        </div>
        <p className="mt-8 text-center text-sm"><Link href="/webinars" className="text-gold underline">More webinars in The Knowledge Exchange</Link> · <Link href="/business/explore" className="text-gold underline">Explore The Professional Society</Link></p>
      </div>
    </div>
  );
}
