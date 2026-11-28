"use client";
import { useEffect, useId, useRef, useState } from "react";
import { brandName } from "@/lib/brand";

/**
 * Membership distinctions (founder directive 39). Two understated shield emblems, shown next to a member's name:
 *   Executive — champagne gold and charcoal;  Elite — signature orange-gold and black, with a crown.
 * They come only from the member's actual membership (server-side), are never purchasable or self-assigned, and are
 * deliberately different from the orange identity-verification check (IdentityCheck), so the two are never confused.
 */
export type Distinction = "executive" | "elite";

const COPY: Record<Distinction, { label: string; body: string }> = {
  executive: { label: brandName("executive-private"), body: "This member holds an Executive Private membership." },
  elite: { label: brandName("elite-concierge"), body: "This member holds Elite Concierge, our highest, invitation-only membership." },
};

export function EmblemIcon({ tier, size = 18 }: { tier: Distinction; size?: number }) {
  const id = useId().replace(/:/g, "");
  const elite = tier === "elite";
  return (
    <svg width={size * 0.86} height={size} viewBox="0 0 26 30" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          {elite
            ? <><stop offset="0" stopColor="#ffcf7a" /><stop offset="0.45" stopColor="#e8892b" /><stop offset="1" stopColor="#b5651d" /></>
            : <><stop offset="0" stopColor="#f3e3bd" /><stop offset="0.5" stopColor="#cdb17a" /><stop offset="1" stopColor="#9c8152" /></>}
        </linearGradient>
      </defs>
      <path d="M13 1.5 24 5.6v8.6c0 7.2-4.7 12.4-11 14.3C6.7 26.6 2 21.4 2 14.2V5.6Z" fill={elite ? "#0d0b0a" : "#2b2a2c"} stroke={`url(#${id}-rim)`} strokeWidth="2" />
      {elite && <path d="M7.6 9.2 10 11.3 13 7.6l3 3.7 2.4-2.1-.9 4.2H8.5Z" fill={`url(#${id}-rim)`} />}
      <text x="13" y={elite ? 21.2 : 19.6} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize={elite ? 8.6 : 11} fill={`url(#${id}-rim)`}>E</text>
    </svg>
  );
}

/** The emblem, optionally with its official name, and an explanation on tap (never how or why the member qualified). */
export function MembershipEmblem({ tier, size = 18, label = false, interactive = true }: { tier: Distinction; size?: number; label?: boolean; interactive?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const c = COPY[tier];
  const text = tier === "elite" ? "text-[#c46a17]" : "text-[#8a7248]";
  const content = <><EmblemIcon tier={tier} size={size} />{label && <span className={`text-[0.7rem] font-semibold uppercase tracking-[0.14em] ${text}`}>{c.label}</span>}</>;
  if (!interactive) return <span role="img" aria-label={`${c.label} member`} className="inline-flex items-center gap-1.5 align-middle">{content}</span>;
  return (
    <span ref={box} className="relative inline-flex align-middle">
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }} aria-expanded={open} aria-describedby={open ? `${id}-tip` : undefined}
        aria-label={`${c.label} member. What does this mean?`} className="inline-flex items-center gap-1.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
        {content}
      </button>
      {open && (
        <span id={`${id}-tip`} role="tooltip" className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-[#c9a96e]/60 bg-[#211814] p-4 text-left text-xs font-normal normal-case tracking-normal text-[#f5ecdf] shadow-2xl">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#f0c98a]"><EmblemIcon tier={tier} size={18} /> {c.label}</span>
          <span className="mt-2 block">{c.body}</span>
          <span className="mt-2 block text-[#f5ecdf]/70">A membership distinction, not a verification. Identity verification shows as a separate orange check.</span>
        </span>
      )}
    </span>
  );
}

/** Identity verification (a separate orange check). Shown only when the member's identity has been verified. */
export function IdentityCheck({ size = 16 }: { size?: number }) {
  return (
    <span role="img" aria-label="Identity verified" title="Identity verified" className="inline-flex align-middle">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#e8701a" strokeWidth="2" />
        <path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="#e8701a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** A member's marks, in a fixed order: identity check, then membership emblem. */
export function MemberMarks({ distinction, verified, size = 16, label = false, interactive = false }: { distinction?: string | null; verified?: boolean | null; size?: number; label?: boolean; interactive?: boolean }) {
  const tier = distinction === "elite" || distinction === "executive" ? distinction : null;
  if (!tier && !verified) return null;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {verified && <IdentityCheck size={size} />}
      {tier && <MembershipEmblem tier={tier} size={size + 2} label={label} interactive={interactive} />}
    </span>
  );
}
