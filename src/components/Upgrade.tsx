"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { decide, needForHref, type GateDecision, type Need } from "@/lib/gate";
import type { GateContext, Offer } from "@/lib/gate-server";
import { brandName } from "@/lib/brand";

/**
 * The membership-aware pop-up (founder directive 36). One elegant card everywhere: explains the feature, its benefits,
 * the membership price and the right next step; offers the complimentary 15-day experience where eligible. "Maybe later"
 * closes it and the member stays where they are. Elite Members never see an upgrade. After an authorized purchase,
 * checkout returns the member to the feature they chose.
 */
export type FeatureInfo = { name: string; what?: string; benefits?: string[] };
type Open = (need: Need, feature: FeatureInfo, href: string) => void;
const Ctx = createContext<{ gate: GateContext | null; open: Open }>({ gate: null, open: () => {} });
export const useUpgrade = () => useContext(Ctx);

const RETURN_COOKIE = "aoc_return";
const money = (c: number | null) => (c == null ? null : `$${(c / 100).toFixed(2)}`);

export function UpgradeProvider({ gate, children }: { gate: GateContext | null; children: React.ReactNode }) {
  const [state, setState] = useState<{ decision: GateDecision; feature: FeatureInfo; href: string; need: Need } | null>(null);
  const open: Open = (need, feature, href) => { if (gate) setState({ decision: decide(need, gate.facts), feature, href, need }); };
  return (
    <Ctx.Provider value={{ gate, open }}>
      {children}
      {state && gate && state.decision.kind !== "allowed" && <UpgradeDialog gate={gate} {...state} onClose={() => setState(null)} />}
    </Ctx.Provider>
  );
}

/** A link that opens the feature when included, or the pop-up when not — never a silent redirect. */
export function GatedLink({ href, need, feature, className, onClick, children }: { href: string; need?: Need | null; feature: FeatureInfo; className?: string; onClick?: () => void; children: React.ReactNode }) {
  const { gate, open } = useUpgrade();
  const n = need === undefined ? needForHref(href) : need;
  const allowed = !n || !gate || decide(n, gate.facts).kind === "allowed";
  if (allowed) return <Link href={href} className={className} onClick={onClick}>{children}</Link>;
  return <button type="button" className={`${className ?? ""} w-full text-left`} aria-haspopup="dialog" onClick={() => { onClick?.(); open(n!, feature, href); }}>{children}</button>;
}

const TITLE: Record<GateDecision["kind"], string> = {
  allowed: "", membership: "", verification: "By invitation and verification",
  opening_soon: "Opening soon", in_development: "Coming soon", error: "Something went wrong",
};

export function UpgradeDialog({ gate, decision, feature, href, onClose }: { gate: GateContext; decision: GateDecision; feature: FeatureInfo; href: string; need: Need; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const offer: Offer | null = decision.kind === "membership" || decision.kind === "verification" ? gate.offers[decision.packageSlug] ?? null : null;
  const benefits = (feature.benefits?.length ? feature.benefits : offer?.benefits ?? []).slice(0, 3);
  const remember = () => { try { document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(href)}; path=/; max-age=3600; samesite=lax; secure`; } catch { /* the member can still navigate back */ } };
  const price = money(offer?.monthlyCents ?? null);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[2rem] border border-[#e9dfcf] bg-[#f4eee4] px-7 pb-7 pt-9 text-center text-[#2b231c] shadow-2xl">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-[#6f5f4e] hover:bg-black/5">×</button>
        <svg width="40" height="36" viewBox="0 0 24 22" aria-hidden="true" className="mx-auto"><path d="M12 20s-8-4.9-8-11a4.6 4.6 0 0 1 8-3.1A4.6 4.6 0 0 1 20 9c0 6.1-8 11-8 11Z" fill="none" stroke="#a88b55" strokeWidth="1.8" strokeLinejoin="round" /></svg>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#9c7f4b]">{brandName("brand")}</p>
        <h2 id="upgrade-title" className="display mt-3 text-3xl leading-tight">{decision.kind === "membership" ? feature.name : TITLE[decision.kind] || feature.name}</h2>
        <p className="mt-3 text-[0.95rem] text-[#6f5f4e]">
          {decision.kind === "membership" && (feature.what ?? offer?.tagline ?? "")}
          {decision.kind === "verification" && `${feature.name} is part of ${brandName("elite-concierge")}, our highest, invitation-only membership. Members apply and complete verification first; nothing is charged until you're approved and choose to join.`}
          {decision.kind === "opening_soon" && `${feature.name} is included in your membership and opens to members soon. We'll let you know the moment it does.`}
          {decision.kind === "in_development" && `${feature.name} is still being prepared. It isn't available yet, and nothing is wrong with your account.`}
          {decision.kind === "error" && "We couldn't check your membership just now. Please try again in a moment."}
        </p>
        {decision.kind === "membership" && benefits.length > 0 && (
          <ul className="mt-5 space-y-3 border-t border-[#d9cbb3] pt-5 text-left">
            {benefits.map((b) => <li key={b} className="flex gap-3 text-[0.95rem]"><span aria-hidden="true" className="text-[#a88b55]">✓</span><span>{b}</span></li>)}
          </ul>
        )}
        {decision.kind === "membership" && offer && (
          <p className="mt-5 text-sm text-[#6f5f4e]">Included in <span className="font-semibold text-[#2b231c]">{offer.name}</span>{price ? <> · {price} per month</> : null}</p>
        )}
        <div className="mt-5 grid gap-2">
          {decision.kind === "membership" && offer && (
            <Link href={offer.href} onClick={remember} className="rounded-2xl bg-[#b89b6a] px-5 py-4 text-base font-semibold text-[#2b231c] transition hover:bg-[#a88b55]">
              {offer.trial ? `Start Your Free ${gate.trialDays}-Day Experience` : `Choose ${offer.name}`}
            </Link>
          )}
          {decision.kind === "verification" && <Link href="/elite" className="rounded-2xl bg-[#b89b6a] px-5 py-4 text-base font-semibold text-[#2b231c]">Learn about {brandName("elite-concierge")}</Link>}
          {(decision.kind === "membership" || decision.kind === "verification") && <Link href="/membership#build" onClick={remember} className="py-3 text-base font-semibold">Explore Membership Options</Link>}
          {decision.kind === "membership" && !gate.paymentsLive && <p className="text-xs text-[#8a7b6a]">Memberships open soon. Nothing is charged today.</p>}
          <button type="button" onClick={onClose} className="py-2 text-sm text-[#8a7b6a]">{decision.kind === "membership" || decision.kind === "verification" ? "Maybe later" : "Close"}</button>
        </div>
      </div>
    </div>
  );
}
