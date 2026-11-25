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
