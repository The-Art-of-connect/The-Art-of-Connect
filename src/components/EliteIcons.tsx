/** Line icons for the three Elite experiences (gold stroke, inherits color). */
export function EliteExperienceIcon({ kind, size = 26 }: { kind: "briefcase" | "sparkle" | "heart"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "briefcase") return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M10.5 12.5v1.5h3v-1.5" /></svg>;
  if (kind === "sparkle") return <svg {...common}><path d="M10 3.5l1.6 4.4a2 2 0 0 0 1.2 1.2L17.2 11l-4.4 1.6a2 2 0 0 0-1.2 1.2L10 18.5l-1.6-4.7a2 2 0 0 0-1.2-1.2L2.8 11l4.4-1.9a2 2 0 0 0 1.2-1.2z" /><path d="M18.5 3v3M17 4.5h3" /></svg>;
  return <svg {...common}><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" /></svg>;
}
