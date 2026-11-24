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
        <linearGradient id="o-rel" x1="0" x2="1"><stop stopColor="#c98f9d" stopOpacity="0.05" /><stop offset="0.5" stopColor="#c98f9d" stopOpacity="0.9" /><stop offset="1" stopColor="#c98f9d" stopOpacity="0.05" /></linearGradient>
        <linearGradient id="o-biz" x1="0" x2="1"><stop stopColor="#c9ad83" stopOpacity="0.05" /><stop offset="0.5" stopColor="#c9ad83" stopOpacity="0.9" /><stop offset="1" stopColor="#c9ad83" stopOpacity="0.05" /></linearGradient>
        <linearGradient id="o-couns" x1="0" x2="1"><stop stopColor="#f5efe6" stopOpacity="0.05" /><stop offset="0.5" stopColor="#f5efe6" stopOpacity="0.9" /><stop offset="1" stopColor="#f5efe6" stopOpacity="0.05" /></linearGradient>
        <radialGradient id="core"><stop stopColor="#e4d2b4" /><stop offset="0.35" stopColor="#c9ad83" stopOpacity="0.5" /><stop offset="1" stopColor="#c9ad83" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="300" cy="300" r="280" stroke="rgb(255 255 255 / 0.05)" />
      <circle cx="300" cy="300" r="190" stroke="rgb(255 255 255 / 0.04)" strokeDasharray="2 8" className="spin-slower" style={{ transformOrigin: "300px 300px" }} />
      <g className="spin-slow" style={{ transformOrigin: "300px 300px" }}>
        {orbit(0, "#c98f9d", "o-rel")}
        {orbit(60, "#c9ad83", "o-biz")}
        {orbit(120, "#f5efe6", "o-couns")}
      </g>
      <circle cx="300" cy="300" r="70" fill="url(#core)" opacity="0.55" />
      <circle cx="300" cy="300" r="6" fill="#e4d2b4" />
    </svg>
  );
}
