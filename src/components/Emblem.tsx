/** The Art of Connect emblem: three interlocking orbits — one per experience — meeting at a single point of light. */
export function Emblem({ size = 32, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="emblem-gold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0dfbd" />
          <stop offset="0.55" stopColor="#d8c29d" />
          <stop offset="1" stopColor="#a88b5c" />
        </linearGradient>
      </defs>
      <g className={animated ? "spin-slow" : undefined} style={{ transformOrigin: "32px 32px" }}>
        <ellipse cx="32" cy="32" rx="26" ry="11" stroke="url(#emblem-gold)" strokeWidth="1.4" />
        <ellipse cx="32" cy="32" rx="26" ry="11" stroke="url(#emblem-gold)" strokeWidth="1.4" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="26" ry="11" stroke="url(#emblem-gold)" strokeWidth="1.4" transform="rotate(120 32 32)" />
      </g>
      <circle cx="32" cy="32" r="3.2" fill="url(#emblem-gold)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Emblem size={30} />
      <span className="display text-[1.35rem] leading-none tracking-tight">
        The Art <span className="italic text-gold">of</span> Connect
      </span>
    </span>
  );
}
