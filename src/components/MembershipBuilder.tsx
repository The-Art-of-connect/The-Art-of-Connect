"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Turnstile, useTurnstileReady } from "@/components/Turnstile";
import { joinWaitlist, validatePromo, type WaitlistState } from "@/app/actions/waitlist";
import { EXPERIENCES, type Experience } from "@/lib/experiences";
import {
  annualIncentiveLabel,
  formatMoney,
  normalizeSelection,
  quote,
  selectionToQuery,
  type PricingCatalogue,
  type Promotion,
  type Selection,
} from "@/lib/pricing";
import { LEGAL_TITLES, autoRenewalStatement, checkoutDocs } from "@/lib/legal-requirements";
import { EliteBadge } from "@/components/EliteBadge";
import { ELITE_BENEFITS } from "@/lib/elite";

type Mode = "enroll" | "preview" | "change" | "checkout";

/**
 * Membership builder. Visitors choose experiences (and, for In Love, single or
 * couple) or an exclusive membership; the matching package, its benefits, the
 * bundle saving and monthly/annual totals update live. Amounts shown here are
 * recalculated on the server at checkout — nothing here is trusted for billing.
 */
export function MembershipBuilder({
  catalogue,
  initial,
  enrollmentOpen,
  mode = "enroll",
  onChangeSubmit,
  eliteInvited = false,
}: {
  catalogue: PricingCatalogue;
  initial: Selection;
  enrollmentOpen: boolean;
  mode?: Mode;
  onChangeSubmit?: (sel: Selection, promo: string | null, accepted?: boolean) => void;
  /** Elite Concierge is by invitation only: selectable only by members who accepted an invitation. */
  eliteInvited?: boolean;
}) {
  const [sel, setSel] = useState<Selection>(() => normalizeSelection(catalogue, initial));
  const [loveChosen, setLoveChosen] = useState<boolean>(Boolean(initial.couples) || initial.experiences?.includes("relationships"));
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [copied, setCopied] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const q = useMemo(() => quote(catalogue, sel, promo), [catalogue, sel, promo]);
  const money = (c: number | null | undefined) => formatMoney(c, catalogue.currency);
  const showPrices = catalogue.published || catalogue.preview;
  const exclusives = catalogue.packages.filter((p) => p.category === "exclusive");
  const hasLove = sel.experiences.includes("relationships") && !sel.package;
  const memberAddons = catalogue.addons.filter((a) => a.audience === "member" && (!a.requires_experience || sel.experiences.includes(a.requires_experience)));
  const incentive = annualIncentiveLabel(q.pkg?.annual_months_charged ?? catalogue.annual_months_charged);
  const loveStatus: "single" | "couple" | null = sel.experiences.includes("relationships") ? (sel.couples ? "couple" : loveChosen ? "single" : null) : null;
  const ready = Boolean(q.pkg) && (!hasLove || loveStatus !== null);

  // Keep the URL shareable as the selection changes (no page reload).
  useEffect(() => {
    if (mode !== "enroll") return;
    const qs = selectionToQuery(sel);
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  }, [sel, mode]);

  const toggle = (e: Experience) =>
    setSel((s) => {
      const base = s.package ? [] : s.experiences;
      const experiences = base.includes(e) ? base.filter((x) => x !== e) : [...base, e];
      return normalizeSelection(catalogue, { ...s, package: null, experiences, couples: experiences.includes("relationships") ? s.couples : false });
    });
  const chooseExclusive = (slug: string) =>
    setSel((s) => normalizeSelection(catalogue, { ...s, package: s.package === slug ? null : slug, experiences: s.package === slug ? [] : s.experiences, couples: false }));
  const setStatus = (st: "single" | "couple") => {
    setLoveChosen(true);
    setSel((s) => ({ ...s, couples: st === "couple" }));
  };

  const share = async () => {
    const url = `${window.location.origin}/membership?${selectionToQuery(sel)}#build`;
    try {
      if (navigator.share) await navigator.share({ title: "The Art of Connect membership", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* dismissed */
    }
  };

  const applyPromo = () =>
    startCheck(async () => {
      const p = await validatePromo(promoInput);
      setPromo(p);
      setPromoMsg(p ? `${p.code} applied${p.description ? ` — ${p.description}` : ""}` : "That code isn’t valid right now.");
    });

  const joinHref = `/join?${selectionToQuery(sel)}${loveStatus ? `&status=${loveStatus}` : ""}`;
  let step = 0;
  const next = () => String(++step).padStart(2, "0");

  return (
    <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      {/* ── Steps ─────────────────────────────────────── */}
      <div className="space-y-12">
        {/* Step: experiences */}
        <fieldset>
          <legend className="flex items-baseline gap-3">
            <span className="display text-3xl text-gold">{next()}</span>
            <span className="text-lg font-semibold">Choose your experiences</span>
          </legend>
          <p className="mt-2 text-sm text-muted">Choose one, two or all three — combinations are bundled at a lower rate.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {catalogue.experiences.map((e) => {
              const on = !sel.package && sel.experiences.includes(e.experience);
              const info = EXPERIENCES[e.experience];
              const single = catalogue.packages.find((p) => p.category === "single" && p.experiences.length === 1 && p.experiences[0] === e.experience && p.love_track !== "couple");
              return (
                <button
                  key={e.experience}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(e.experience)}
                  className={`group relative overflow-hidden rounded-[22px] border-2 text-left transition-all duration-300 ${on ? "border-champagne shadow-[0_18px_50px_-24px_rgb(168_138_92/0.9)]" : "border-transparent hover:border-champagne/50"}`}
                >
                  <div className="theme-dark relative aspect-[4/3] sm:aspect-[3/4]">
                    <Image src={info.image} alt="" fill sizes="(min-width: 640px) 25vw, 100vw" className={`object-cover transition-transform duration-700 ${on ? "scale-105" : "group-hover:scale-105"}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-onyx from-10% via-onyx/70 via-45% to-transparent" />
                    <span className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${on ? "border-champagne bg-champagne text-espresso" : "border-ivory/70 bg-onyx/40 text-transparent"}`} aria-hidden="true">
                      ✓
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="eyebrow !text-[0.6rem]">{single?.name ?? e.subtitle}</p>
                      <p className="display mt-1 text-3xl text-ivory">{e.name}</p>
                      <p className="mt-1 text-sm text-ivory/90">
                        {showPrices && single?.monthly_price_cents != null ? `From ${money(single.monthly_price_cents)} / month` : info.caption}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Step: In Love track */}
        {hasLove && (
          <fieldset className="explorer-panel">
            <legend className="flex items-baseline gap-3">
              <span className="display text-3xl text-gold">{next()}</span>
              <span className="text-lg font-semibold">For In Love, are you…</span>
            </legend>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["single", "Single, seeking a connection", "Intentional matchmaking and meaningful introductions"],
                ["couple", "In a relationship", "Two secure logins, a shared space and tools to grow together"],
              ] as const).map(([v, label, hint]) => (
                <label key={v} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${loveStatus === v ? "border-champagne bg-champagne/10" : "border-line-strong hover:border-champagne/60"}`}>
                  <input type="radio" name="loveStatus" value={v} checked={loveStatus === v} onChange={() => setStatus(v)} className="sr-only" />
                  <span className="block font-semibold">{label}</span>
                  <span className="mt-1 block text-sm text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Exclusive memberships */}
        {exclusives.length > 0 && (
          <fieldset>
            <legend className="flex items-baseline gap-3">
              <span className="display text-3xl text-gold">{next()}</span>
              <span className="text-lg font-semibold">Or choose an exclusive membership</span>
            </legend>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {exclusives.map((p) => {
                const on = sel.package === p.slug;
                if (p.slug === "elite-concierge" && !eliteInvited) {
                  return (
                    <a key={p.slug} href="/elite" className="theme-dark band relative block rounded-[22px] border-2 border-[#c9a96e]/70 p-6 text-left transition hover:border-[#e8892b]">
                      <div className="flex flex-wrap items-center gap-2">
                        <EliteBadge size={20} interactive={false} />
                        <span className="rounded-full border border-[#e8892b]/70 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-[#f0a35a]">By Invitation Only</span>
                      </div>
                      <p className="eyebrow mt-4 leading-relaxed">Distinction. Intention. Influence.</p>
                      <p className="display mt-2 text-3xl text-ivory">{p.name}</p>
                      {showPrices && p.monthly_price_cents != null && <p className="mt-1 text-gold-bright">{money(p.monthly_price_cents)} / month, for invited members</p>}
                      <p className="mt-4 text-sm text-ivory/80">Our highest distinction, for verified, accomplished individuals. Admission is by invitation: earned through your membership, through expedited verification for those who qualify, or extended personally by our founder.</p>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c98a]">What Elite members receive</p>
                      <ul className="mt-2 space-y-2 text-sm text-ivory/80">
                        {ELITE_BENEFITS.map((x) => (
                          <li key={x.id} className="flex gap-2">
                            {x.id === "badge" ? <EliteBadge size={16} interactive={false} /> : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8892b]" aria-hidden="true" />}
                            <span><span className="font-semibold text-ivory">{x.title}</span>{x.ready ? "" : <span className="ml-1 text-[0.65rem] uppercase tracking-wider text-ivory/50">· In preparation</span>}<span className="block text-xs text-ivory/65">{x.body}</span></span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-5 text-sm font-semibold text-[#f0a35a]">Explore Elite eligibility →</p>
                    </a>
                  );
                }
                return (
                  <button
                    key={p.slug}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => chooseExclusive(p.slug)}
                    className={`theme-dark band relative rounded-[22px] border-2 p-6 text-left transition-all duration-300 ${on ? "border-champagne shadow-[0_18px_50px_-24px_rgb(168_138_92/0.9)]" : "border-line-strong hover:border-champagne/60"}`}
                  >
                    {p.highlight && <span className="chip chip-locked absolute right-4 top-4">{p.highlight}</span>}
                    <p className="eyebrow">{p.tagline}</p>
                    <p className="display mt-2 text-3xl text-ivory">{p.name}</p>
                    {showPrices && p.monthly_price_cents != null && <p className="mt-1 text-gold-bright">{money(p.monthly_price_cents)} / month</p>}
                    <ul className="mt-4 space-y-1.5 text-sm text-ivory/85">
                      {p.benefits.map((b) => (
                        <li key={b} className="flex gap-2"><span className="text-gold" aria-hidden="true">✦</span>{b}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Billing */}
        <fieldset>
          <legend className="flex items-baseline gap-3">
            <span className="display text-3xl text-gold">{next()}</span>
            <span className="text-lg font-semibold">Billing</span>
          </legend>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-full border border-line-strong p-1.5 sm:max-w-md">
            {(["month", "year"] as const).map((iv) => (
              <button
                key={iv}
                type="button"
                aria-pressed={sel.interval === iv}
                onClick={() => setSel((s) => ({ ...s, interval: iv }))}
                className={`min-h-11 rounded-full px-3 text-sm font-semibold transition-all ${sel.interval === iv ? "bg-champagne text-espresso" : "text-muted hover:text-text"}`}
              >
                {iv === "month" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
          {showPrices && incentive && <p className="mt-3 text-sm text-gold">Annual membership: {incentive}.</p>}
        </fieldset>

        {/* Add-ons */}
        {memberAddons.length > 0 && (
          <fieldset>
            <legend className="flex items-baseline gap-3">
              <span className="display text-3xl text-gold">{next()}</span>
              <span className="text-lg font-semibold">Premium add-ons <span className="text-sm font-normal text-muted">(optional)</span></span>
            </legend>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {memberAddons.map((a) => {
                const on = sel.addons.includes(a.slug);
                return (
                  <label key={a.slug} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${on ? "border-champagne bg-champagne/10" : "border-line-strong hover:border-champagne/60"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setSel((s) => normalizeSelection(catalogue, { ...s, addons: on ? s.addons.filter((x) => x !== a.slug) : [...s.addons, a.slug] }))}
                      className="sr-only"
                    />
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{a.name}</span>
                      {showPrices && a.price_cents != null && <span className="shrink-0 text-sm text-muted">{money(a.price_cents)}{a.billing === "monthly" ? " / mo" : " once"}</span>}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{a.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      {/* ── Summary ───────────────────────────────────── */}
      <aside className="lg:sticky lg:top-28" aria-label="Your membership summary">
        <div className="theme-dark band glass-edge relative overflow-hidden rounded-[28px] p-7 sm:p-8">
          <p className="eyebrow">Your membership</p>
          <p className="display mt-3 text-4xl" aria-live="polite">
            {q.pkg ? q.pkg.name : sel.experiences.length ? "Not yet offered" : "Choose an experience"}
          </p>
          {q.pkg ? (
            <p className="mt-2 text-sm text-muted">{q.pkg.tagline}{q.pkg.tagline && q.pkg.description ? " — " : ""}{q.pkg.description}</p>
          ) : sel.experiences.length ? (
            <p className="mt-2 text-sm text-muted">This combination isn’t available yet. Try another combination or an exclusive membership.</p>
          ) : null}

          {q.pkg && q.pkg.benefits.length > 0 && (
            <ul className="mt-6 space-y-2 border-t border-line pt-6 text-sm">
              {q.pkg.benefits.map((b) => (
                <li key={b} className="flex gap-2.5"><span className="text-gold" aria-hidden="true">✓</span><span>{b}</span></li>
              ))}
              {q.couplesMonthly! > 0 && <li className="flex gap-2.5"><span className="text-gold" aria-hidden="true">✓</span><span>{catalogue.couples_upgrade.name}: {catalogue.couples_upgrade.description}</span></li>}
            </ul>
          )}

          {hasLove && loveStatus === null && <p className="mt-6 rounded-2xl border border-line px-4 py-3 text-sm text-muted">Tell us whether you’re single or in a relationship to see your In Love membership.</p>}

          {q.priced && ready ? (
            <div className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted">{q.pkg!.name}</span><span>{money(q.packageMonthly)}<span className="text-faint"> /mo</span></span></div>
              {q.couplesMonthly! > 0 && <div className="flex justify-between gap-4"><span className="text-muted">{catalogue.couples_upgrade.name}</span><span>{money(q.couplesMonthly)}<span className="text-faint"> /mo</span></span></div>}
              {q.addonsMonthly! > 0 && <div className="flex justify-between gap-4"><span className="text-muted">Add-ons</span><span>{money(q.addonsMonthly)}<span className="text-faint"> /mo</span></span></div>}
              {q.bundleSavingsMonthly! > 0 && (
                <p className="rounded-xl bg-champagne/15 px-4 py-2.5 text-center text-gold-bright">
                  Bundled: you save {money(q.bundleSavingsMonthly)} a month versus {money(q.separateMonthly)} separately
                </p>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <span className="text-muted">{sel.interval === "year" ? "Annual total" : "Monthly total"}</span>
                <span className="display text-4xl text-gold-bright">{money(q.recurringTotal)}</span>
              </div>
              {sel.interval === "year" ? (
                <p className="text-right text-xs text-muted">{money(Math.round(q.annualTotal! / 12))} / month equivalent{q.annualSavings! > 0 ? ` · you save ${money(q.annualSavings)} a year` : ""}</p>
              ) : (
                <p className="text-right text-xs text-muted">or {money(q.annualTotal)} per year billed annually{q.annualSavings! > 0 ? ` (save ${money(q.annualSavings)})` : ""}</p>
              )}
              {q.onboardingFee! > 0 && <div className="flex justify-between"><span className="text-muted">One-time onboarding</span><span>{money(q.onboardingFee)}</span></div>}
              {q.oneTimeTotal! - q.onboardingFee! > 0 && <div className="flex justify-between"><span className="text-muted">One-time add-ons</span><span>{money(q.oneTimeTotal! - q.onboardingFee!)}</span></div>}
              {q.promotionDiscount! > 0 && <div className="flex justify-between text-gold"><span>Promotion</span><span>−{money(q.promotionDiscount)}</span></div>}
              <div className="flex justify-between border-t border-line pt-3 font-semibold"><span>Due today</span><span>{money(q.dueToday)}</span></div>
            </div>
          ) : q.pkg && ready ? (
            <p className="mt-6 rounded-2xl border border-line px-4 py-3 text-sm text-muted">Membership pricing will be announced when enrollment opens. Your selection is saved in this page’s link.</p>
          ) : null}

          {catalogue.preview && <p className="mt-4 text-xs text-gold">Owner preview — draft prices, not visible to the public.</p>}

          {showPrices && q.priced && ready && (mode === "enroll" || mode === "checkout") && (
            <div className="mt-5 flex gap-2">
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code" className="field !min-h-11 uppercase" aria-label="Promo code" />
              <button type="button" onClick={applyPromo} disabled={!promoInput || checking} className="btn btn-ghost btn-sm !min-h-11 shrink-0">Apply</button>
            </div>
          )}
          {promoMsg && <p className="mt-2 text-xs text-muted" role="status">{promoMsg}</p>}

          <div className="mt-7 space-y-3">
            {mode === "checkout" && ready && q.priced && q.pkg && (
              <label className="flex items-start gap-3 rounded-2xl border border-line p-4 text-left text-xs text-muted">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--champagne)]" />
                <span>
                  {autoRenewalStatement({ packageName: q.pkg.name, amount: money(q.recurringTotal) ?? "", interval: sel.interval })}{" "}
                  I have read and agree to the{" "}
                  {checkoutDocs(sel.experiences, q.pkg.love_track === "couple" || (q.couplesMonthly ?? 0) > 0).map((slug, i, all) => (
                    <span key={slug}>
                      <a href={`/legal/${slug}`} target="_blank" rel="noreferrer" className="text-gold underline">{LEGAL_TITLES[slug]}</a>
                      {i < all.length - 2 ? ", " : i === all.length - 2 ? " and " : "."}
                    </span>
                  ))}
                </span>
              </label>
            )}
            {mode === "change" || mode === "checkout" ? (
              <button type="button" disabled={!ready || !q.priced || !enrollmentOpen || (mode === "checkout" && !accepted)} onClick={() => onChangeSubmit?.(sel, promo?.code ?? null, accepted)} className="btn btn-gold w-full">
                {mode === "change" ? "Update my membership" : "Continue to secure payment"}
              </button>
            ) : mode === "preview" ? null : enrollmentOpen ? (
              <Link href={ready ? joinHref : "#build"} aria-disabled={!ready} className={`btn btn-gold w-full ${ready ? "" : "pointer-events-none opacity-50"}`}>Become a Member</Link>
            ) : (
              <p className="rounded-2xl bg-champagne/15 px-4 py-3 text-center text-sm font-semibold text-gold-bright">Membership enrollment opens soon</p>
            )}
            {mode === "enroll" && (
              <button type="button" onClick={share} className="btn btn-ghost w-full">{copied ? "Link copied" : "Share this membership"}</button>
            )}
          </div>
          <p className="mt-5 text-center text-xs text-faint">One private account on every device — no extra device fees · change or cancel any time</p>
          <p className="mt-2 text-center text-xs font-semibold tracking-wide text-gold">Adults {catalogue.minimum_member_age}+ · Personal Society singles 30+</p>
        </div>
        {mode === "enroll" && !enrollmentOpen && <NotifyForm sel={sel} loveStatus={loveStatus} packageSlug={q.pkg?.slug ?? null} />}
      </aside>
    </div>
  );
}

function NotifyForm({ sel, loveStatus, packageSlug }: { sel: Selection; loveStatus: "single" | "couple" | null; packageSlug: string | null }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);
  const [verified, setVerified] = useTurnstileReady();
  if (state?.ok) return <p className="glass mt-5 p-5 text-center text-sm" role="status">{state.message}</p>;
  return (
    <form action={action} className="glass mt-5 space-y-3 p-6">
      <p className="font-semibold">Be first to know when enrollment opens</p>
      <p className="text-sm text-muted">We’ll save the membership you built and email you at launch.</p>
      {sel.experiences.map((e) => <input key={e} type="hidden" name="interests" value={e} />)}
      {sel.addons.map((a) => <input key={a} type="hidden" name="addons" value={a} />)}
      <input type="hidden" name="loveTrack" value={sel.experiences.includes("relationships") ? loveStatus ?? "" : ""} />
      <input type="hidden" name="desiredTier" value={packageSlug ?? ""} />
      <input type="hidden" name="desiredInterval" value={sel.interval} />
      <input type="hidden" name="couples" value={sel.couples ? "1" : ""} />
      <input name="fullName" autoComplete="name" placeholder="Your name" className="field" aria-label="Your name" />
      <input name="email" type="email" required autoComplete="email" placeholder="you@domain.com" className="field" aria-label="Email" />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Turnstile action="waitlist" resetSignal={state} onReady={setVerified} />
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold w-full" disabled={pending || !verified}>{pending ? "Saving…" : verified ? "Notify me" : "Verifying…"}</button>
    </form>
  );
}
