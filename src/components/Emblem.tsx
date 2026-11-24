import Image from "next/image";

/** The AC monogram from the brand logo (transparent cut-out). */
export function Monogram({ height = 32, className = "", priority = false }: { height?: number; className?: string; priority?: boolean }) {
  const width = Math.round(height * (640 / 402));
  return <Image src="/brand/monogram.webp" alt="" width={width} height={height} className={className} priority={priority} aria-hidden="true" />;
}

/** Lotus mark from the brand logo, used as a section ornament. */
export function Lotus({ width = 56, className = "" }: { width?: number; className?: string }) {
  return <Image src="/brand/lotus.webp" alt="" width={width} height={Math.round(width * (91 / 170))} className={className} aria-hidden="true" />;
}

/** Lotus flanked by burgundy light-lines, as in the logo. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
      <span className="ribbon-line h-px flex-1 max-w-48" />
      <Lotus width={48} />
      <span className="ribbon-line h-px flex-1 max-w-48 rotate-180" />
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Monogram height={30} priority />
      <span className="display text-[1.3rem] leading-none tracking-tight">
        The Art <span className="italic text-gold">of</span> Connect
      </span>
    </span>
  );
}
