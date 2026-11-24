/**
 * Hero visual: three experience orbits with members as points of light,
 * converging on a shared centre. Pure SVG + CSS, no runtime JavaScript.
 */
export function Constellation({ className = "" }: { className?: string }) {
  const orbit = (rotate: number, color: string, id: string) => (
    <g transform={`rotate(${rotate} 300 300)`}>
      <ellipse cx="300" cy="300" rx="250" ry="104" stroke={`url(#${id})`} strokeWidth="1.2" />
      <circle cx="550" cy="300" r="5" fill={color} />
      <circle cx="550" cy="300" r="16" fill={color} opacity="0.15" />
      <circle cx="120" cy="373" r="3" fill={color} opacity="0.8" />
    </g>
  );
  return (
    <svg viewBox="0 0 600 600" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="o-rose" x1="0" x2="1"><stop stopColor="#c4506d" stopOpacity="0.05" /><stop offset="0.5" stopColor="#c4506d" stopOpacity="0.9" /><stop offset="1" stopColor="#c4506d" stopOpacity="0.05" /></linearGradient>
        <linearGradient id="o-sapphire" x1="0" x2="1"><stop stopColor="#8fb0ff" stopOpacity="0.05" /><stop offset="0.5" stopColor="#8fb0ff" stopOpacity="0.9" /><stop offset="1" stopColor="#8fb0ff" stopOpacity="0.05" /></linearGradient>
        <linearGradient id="o-jade" x1="0" x2="1"><stop stopColor="#8ad1b8" stopOpacity="0.05" /><stop offset="0.5" stopColor="#8ad1b8" stopOpacity="0.9" /><stop offset="1" stopColor="#8ad1b8" stopOpacity="0.05" /></linearGradient>
        <radialGradient id="core"><stop stopColor="#f0dfbd" /><stop offset="0.35" stopColor="#d8c29d" stopOpacity="0.5" /><stop offset="1" stopColor="#d8c29d" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="300" cy="300" r="280" stroke="rgb(255 255 255 / 0.05)" />
      <circle cx="300" cy="300" r="190" stroke="rgb(255 255 255 / 0.04)" strokeDasharray="2 8" className="spin-slower" style={{ transformOrigin: "300px 300px" }} />
      <g className="spin-slow" style={{ transformOrigin: "300px 300px" }}>
        {orbit(0, "#c4506d", "o-rose")}
        {orbit(60, "#8fb0ff", "o-sapphire")}
        {orbit(120, "#8ad1b8", "o-jade")}
      </g>
      <circle cx="300" cy="300" r="70" fill="url(#core)" opacity="0.55" />
      <circle cx="300" cy="300" r="6" fill="#f0dfbd" />
    </svg>
  );
}
