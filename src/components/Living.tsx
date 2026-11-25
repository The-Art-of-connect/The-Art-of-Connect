import Image from "next/image";
import Link from "next/link";

/** Photo-led card with a slow zoom on hover. Without href it shows its status instead of a link. */
export function PhotoCard({ image, title, body, href, status, delay = 0, position }: {
  image: string; title: string; body: string; href?: string; status?: string; delay?: number; position?: string;
}) {
  const inner = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110" style={position ? { objectPosition: position } : undefined} />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-transparent to-transparent" />
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[0.68rem] font-semibold backdrop-blur ${href ? "bg-ivory/90 text-gold-deep" : "bg-ink/60 text-ivory"}`}>{href ? "Open" : status ?? "Coming soon"}</span>
      </div>
      <div className="p-5 sm:p-6">
        <h3 className="display text-2xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        {href && <p className="mt-3 text-sm font-semibold text-gold">Explore <span aria-hidden="true">→</span></p>}
      </div>
    </>
  );
  const cls = "glass lift tile-in group block overflow-hidden !p-0";
  return href ? (
    <Link href={href} className={cls} style={{ animationDelay: `${delay}ms` }}>{inner}</Link>
  ) : (
    <div className={cls} style={{ animationDelay: `${delay}ms` }}>{inner}</div>
  );
}

/** The invitation to begin with yourself — shown in every area. */
export function KnowYourselfBanner({ context, done = 0 }: { context: string; done?: number }) {
  return (
    <Link href="/app/know-yourself" className="theme-dark lift tile-in group relative mt-8 block overflow-hidden rounded-[26px] bg-ink">
      <div className="absolute inset-0">
        <Image src="/images/library/brand/gold-waves.webp" alt="" fill sizes="100vw" className="object-cover opacity-70 transition-transform duration-[2000ms] group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
      </div>
      <div className="relative grid items-center gap-6 p-7 sm:p-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow">Know yourself first</p>
          <p className="display mt-3 text-3xl leading-tight sm:text-4xl">{context}</p>
          <p className="mt-3 max-w-xl text-muted">What you will do. What you won’t. And how to say it with respect. Private to you — always.</p>
          {done > 0 && <p className="mt-3 text-sm text-gold-bright">{done} of 4 reflections written — continue where you left off.</p>}
        </div>
        <span className="btn btn-gold shimmer">{done ? "Continue my reflection" : "Begin my reflection"}</span>
      </div>
    </Link>
  );
}
