"use client";
import { useEffect, useId, useRef, useState } from "react";
import { brandName } from "@/lib/brand";

/**
 * Membership distinctions (founder directive 39). Two understated shield emblems, shown next to a member's name:
 *   Executive Member — champagne gold and charcoal;  Elite Member — signature orange-gold and black, with a crown.
 * They come only from the member's actual membership (server-side), are never purchasable or self-assigned, and are
 * deliberately different from the orange identity-verification check (IdentityCheck), so the two are never confused.
 */
export type Distinction = "executive" | "elite";

const COPY: Record<Distinction, { label: string; body: string }> = {
  executive: { label: brandName("executive-member"), body: "Identifies an active Executive Private member." },
  elite: { label: brandName("elite-member"), body: "Identifies an active Elite Concierge member, our highest, invitation-only membership." },
};

/** Founder-approved emblems (November 28, 2026): shield, rim, inner outline; Executive "E" with a rule; Elite crown, "E" and ELITE. */
export function EmblemIcon({ tier, size = 18 }: { tier: Distinction; size?: number }) {
  const id = useId().replace(/:/g, "");
  const elite = tier === "elite";
  const rim = elite ? "#d18a3a" : "#cbb487";
  const ink = elite ? "#e7b25e" : "#e3cf9f";
  const shield = "M20 2 37 8.4v13.2C37 32.6 29.9 40.4 20 43.4 10.1 40.4 3 32.6 3 21.6V8.4Z";
  const inner = "M20 6.2 33.4 11.2v10.6c0 8.7-5.6 14.9-13.4 17.5-7.8-2.6-13.4-8.8-13.4-17.5V11.2Z";
  return (
    <svg width={size * 0.87} height={size} viewBox="0 0 40 46" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          {elite
            ? <><stop offset="0" stopColor="#f2b765" /><stop offset="0.5" stopColor="#d18a3a" /><stop offset="1" stopColor="#a9652a" /></>
            : <><stop offset="0" stopColor="#e6d4a8" /><stop offset="0.5" stopColor="#cbb487" /><stop offset="1" stopColor="#a8916a" /></>}
        </linearGradient>
      </defs>
      <path d={shield} fill={elite ? "#17120f" : "#2a2622"} stroke={`url(#${id}-rim)`} strokeWidth="3.2" strokeLinejoin="round" />
      <path d={inner} fill="none" stroke={rim} strokeOpacity="0.85" strokeWidth="0.9" />
      {elite ? (
        <>
          <path d="M12.2 14.6 15.6 17.6 20 12.2l4.4 5.4 3.4-3-1.3 6H13.5Z" fill={ink} />
          <text x="20" y="31.5" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="12.5" fill={ink}>E</text>
          <text x="20" y="37.6" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="4.1" letterSpacing="0.9" fill={ink}>ELITE</text>
        </>
      ) : (
        <>
          <text x="20" y="27.4" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="15.5" fill={ink}>E</text>
          <line x1="14.4" y1="31.4" x2="25.6" y2="31.4" stroke={ink} strokeWidth="0.9" />
        </>
      )}
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
  if (!interactive) return <span role="img" aria-label={c.label} className="inline-flex items-center gap-1.5 align-middle">{content}</span>;
  return (
    <span ref={box} className="relative inline-flex align-middle">
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }} aria-expanded={open} aria-describedby={open ? `${id}-tip` : undefined}
        aria-label={`${c.label}. What does this mean?`} className="inline-flex items-center gap-1.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
        {content}
      </button>
      {open && (
        <span id={`${id}-tip`} role="tooltip" className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-[#c9a96e]/60 bg-[#211814] p-4 text-left text-xs font-normal normal-case tracking-normal text-[#f5ecdf] shadow-2xl">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#f0c98a]"><EmblemIcon tier={tier} size={18} /> {c.label}</span>
          <span className="mt-2 block">{c.body}</span>
          <span className="mt-2 block text-[#f5ecdf]/70">A membership distinction only. It does not imply identity, financial or professional credential verification; Identity Verified shows as a separate orange checkmark.</span>
        </span>
      )}
    </span>
  );
}

/** Identity Verified (founder-approved): the orange checkmark, for identity verification only, regardless of membership level. */
export function IdentityCheck({ size = 16 }: { size?: number }) {
  return (
    <span role="img" aria-label={brandName("identity-verified")} title={brandName("identity-verified")} className="inline-flex align-middle">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10.4" fill="#f4ebda" stroke="#c4a26b" strokeWidth="1.3" />
        <path d="M7.3 12.3l3.1 3.1 6.3-6.6" fill="none" stroke="#dc8137" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** A member's marks, in a fixed order: identity check, then membership emblem. */
export function MemberMarks({ distinction, verified, testVerified, size = 16, label = false, interactive = false }: { distinction?: string | null; verified?: boolean | null; testVerified?: boolean | null; size?: number; label?: boolean; interactive?: boolean }) {
  const tier = distinction === "elite" || distinction === "executive" ? distinction : null;
  if (!tier && !verified && !testVerified) return null;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {verified && <IdentityCheck size={size} />}
      {/* Fictional QA accounts only: never shown as Identity Verified. */}
      {!verified && testVerified && <span title="Fictional test account: test verification only" className="rounded-full border border-dashed border-muted px-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">Test</span>}
      {tier && <MembershipEmblem tier={tier} size={size + 2} label={label} interactive={interactive} />}
    </span>
  );
}
