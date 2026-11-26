"use client";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The Elite Concierge verification badge: a metallic-gold rounded square with an orange checkmark.
 * Shown only for members the system or the owner has issued an active badge to (never purchasable or self-assigned).
 * Tapping it explains the distinction without revealing how, or on what basis, the member qualified.
 */
export function EliteBadge({ size = 18, interactive = true }: { size?: number; interactive?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const icon = (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3a9" /><stop offset="0.35" stopColor="#d4ad5c" /><stop offset="0.65" stopColor="#b8893a" /><stop offset="1" stopColor="#f1d58d" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill={`url(#${id}-gold)`} stroke="#8a6a2c" strokeWidth="0.75" />
      <rect x="2.5" y="2.5" width="19" height="9" rx="5" fill={`url(#${id}-shine)`} />
      <path d="M6.6 12.4l3.4 3.4 7.4-7.6" fill="none" stroke="#e8701a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (!interactive) return <span role="img" aria-label="Elite Concierge verified member" className="inline-flex align-middle">{icon}</span>;
  return (
    <span ref={box} className="relative inline-flex align-middle">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-describedby={open ? `${id}-tip` : undefined}
        aria-label="Elite Concierge verified member. What does this mean?" className="inline-flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8701a]">
        {icon}
      </button>
      {open && (
        <span id={`${id}-tip`} role="tooltip" className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-[#c9a96e]/60 bg-[#211814] p-4 text-left text-xs font-normal normal-case tracking-normal text-[#f5ecdf] shadow-2xl">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#f0c98a]">{icon} Elite Concierge</span>
          <span className="mt-2 block">This member belongs to the Elite Concierge Society of The Art of Connect, our highest distinction, awarded only after qualification and verification.</span>
          <span className="mt-2 block text-[#f5ecdf]/70">Every Elite member has satisfied a verified admission pathway. Their personal, financial and verification details are always kept confidential.</span>
        </span>
      )}
    </span>
  );
}
