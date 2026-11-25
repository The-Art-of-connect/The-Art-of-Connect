"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { joinWaitlist, validatePromo, type WaitlistState } from "@/app/actions/waitlist";
import { EXPERIENCES, type Experience } from "@/lib/experiences";
import {
  formatMoney,
  normalizeSelection,
  quote,
  selectionToQuery,
  tierFor,
  type PricingCatalogue,
  type Promotion,
  type Selection,
} from "@/lib/pricing";

type Mode = "enroll" | "preview" | "change" | "checkout";

export function MembershipBuilder({
  catalogue,
  initial,
  enrollmentOpen,
  mode = "enroll",
  onChangeSubmit,
}: {
  catalogue: PricingCatalogue;
  initial: Selection;
  enrollmentOpen: boolean;
  mode?: Mode;
  onChangeSubmit?: (sel: Selection, promo: string | null) => void;
}) {
  const [sel, setSel] = useState<Selection>(() => normalizeSelection(catalogue, initial));
  const [loveStatus, setLoveStatus] = useState<"single" | "couple" | null>(initial.couples ? "couple" : null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [copied, setCopied] = useState(false);

  const q = useMemo(() => quote(catalogue, sel, promo), [catalogue, sel, promo]);
  const money = (c: number | null | undefined) => formatMoney(c, catalogue.currency);
  const hasLove = sel.experiences.includes("relationships");
  const memberAddons = catalogue.addons.filter((a) => a.audience === "member" && (!a.requires_experience || sel.experiences.includes(a.requires_experience)));
  const annualPct = q.tier?.annual_discount_percent ?? catalogue.annual_discount_percent;
  const showPrices = catalogue.published || catalogue.preview;

  // Keep the URL shareable as the selection changes (no page reload).
  useEffect(() => {
    if (mode !== "enroll") return;
    const qs = selectionToQuery(sel);
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  }, [sel, mode]);

  const toggle = (e: Experience) =>
    setSel((s) => {
      const experiences = s.experiences.includes(e) ? s.experiences.filter((x) => x !== e) : [...s.experiences, e];
      return normalizeSelection(catalogue, { ...s, experiences, couples: experiences.includes("relationships") ? s.couples : false });
    });
  const setStatus = (st: "single" | "couple") => {
    setLoveStatus(st);
    if (st === "single") setSel((s) => ({ ...s, couples: false }));
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

  const tierCards = [1, 2, 3].map((n) => tierFor(catalogue, n)).filter(Boolean);
  const joinHref = `/join?${selectionToQuery(sel)}${loveStatus ? `&status=${loveStatus}` : ""}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      {/* ── Steps ─────────────────────────────────────── */}
      <div className="space-y-12">
        {/* Tier ladder */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-live="polite">
          {tierCards.map((t) => {
            const active = q.tier?.slug === t!.slug;
            return (
              <div
                key={t!.slug}
                className={`rounded-2xl border p-3 text-center transition-all duration-500 sm:p-4 ${active ? "border-champagne bg-champagne/15 shadow-[0_12px_40px_-20px_rgb(168_138_92/0.9)]" : "border-line"}`}
              >
                <p className={`text-[0.62rem] font-semibold tracking-[0.2em] uppercase ${active ? "text-gold" : "text-faint"}`}>
                  {t!.experience_count === 3 ? "All three" : `${t!.experience_count} experience${t!.experience_count > 1 ? "s" : ""}`}
                </p>
                <p className="display mt-1 text-xl leading-tight sm:text-2xl">{t!.name.replace(" Membership", "")}</p>
                {showPrices && t!.bundle_discount_percent ? (
                  <p className="mt-1 text-xs text-muted">Save {Number(t!.bundle_discount_percent)}%</p>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Step 1: experiences */}
        <fieldset>
          <legend className="flex items-baseline gap-3">
            <span className="display text-3xl text-gold">01</span>
            <span className="text-lg font-semibold">Choose your experiences</span>
          </legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {catalogue.experiences.map((e) => {
              const on = sel.experiences.includes(e.experience);
              const info = EXPERIENCES[e.experience];
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
                      <p className="eyebrow !text-[0.6rem]">{e.subtitle}</p>
                      <p className="display mt-1 text-3xl text-ivory">{e.name}</p>
                      <p className="mt-1 text-sm text-ivory/90">
                        {showPrices && e.monthly_price_cents != null ? `${money(e.monthly_price_cents)} / month` : info.caption}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* In Love: relationship status (only when In Love is chosen) */}
        {hasLove && (
          <fieldset className="explorer-panel">
            <legend className="flex items-baseline gap-3">
              <span className="display text-3xl text-gold">02</span>
              <span className="text-lg font-semibold">For In Love, are you…</span>
            </legend>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["single", "Single, seeking a connection", "Intentional matchmaking and introductions"],
                ["couple", "In a relationship", "Tools to grow together, with an optional couples upgrade"],
              ] as const).map(([v, label, hint]) => (
                <label key={v} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${loveStatus === v ? "border-champagne bg-champagne/10" : "border-line-strong hover:border-champagne/60"}`}>
                  <input type="radio" name="loveStatus" value={v} checked={loveStatus === v} onChange={() => setStatus(v)} className="sr-only" />
                  <span className="block font-semibold">{label}</span>
                  <span className="mt-1 block text-sm text-muted">{hint}</span>
                </label>
              ))}
            </div>
            {loveStatus === "couple" && (
              <label className="glass mt-4 flex cursor-pointer items-start gap-4 p-5">
                <input type="checkbox" checked={sel.couples} onChange={(e) => setSel((s) => ({ ...s, couples: e.target.checked }))} className="mt-1 h-5 w-5 accent-[var(--champagne)]" />
                <span>
                  <span className="block font-semibold">
                    {catalogue.couples_upgrade.name}
                    {showPrices && catalogue.couples_upgrade.monthly_price_cents != null && (
                      <span className="ml-2 text-sm font-normal text-muted">+{money(catalogue.couples_upgrade.monthly_price_cents)} / month</span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{catalogue.couples_upgrade.description}</span>
                </span>
              </label>
            )}
          </fieldset>
        )}

        {/* Billing */}
        <fieldset>
          <legend className="flex items-baseline gap-3">
            <span className="display text-3xl text-gold">{hasLove ? "03" : "02"}</span>
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
                {iv === "year" && showPrices && annualPct ? <span className="ml-1.5 text-xs font-medium">· save {Number(annualPct)}%</span> : null}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Add-ons */}
        {memberAddons.length > 0 && (
          <fieldset>
            <legend className="flex items-baseline gap-3">
              <span className="display text-3xl text-gold">{hasLove ? "04" : "03"}</span>
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
                      {showPrices && a.price_cents != null && (
                        <span className="shrink-0 text-sm text-muted">{money(a.price_cents)}{a.billing === "monthly" ? " / mo" : " once"}</span>
                      )}
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
          <p className="display mt-3 text-4xl" aria-live="polite">{q.tier ? q.tier.name : "Choose an experience"}</p>
          {q.tier && <p className="mt-2 text-sm text-muted">{q.tier.description}</p>}

          {sel.experiences.length > 0 && (
            <dl className="mt-7 space-y-3 border-t border-line pt-6 text-sm">
              {q.lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-4">
                  <dt className="text-muted">{l.label}</dt>
                  <dd>{showPrices ? money(l.monthly_cents) ?? "—" : "—"}<span className="text-faint"> /mo</span></dd>
                </div>
              ))}
              {q.priced && q.bundleDiscountMonthly! > 0 && (
                <div className="flex justify-between gap-4 text-gold">
                  <dt>Bundle savings</dt>
                  <dd>−{money(q.bundleDiscountMonthly)}<span className="opacity-80"> /mo</span></dd>
                </div>
              )}
              {sel.couples && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{catalogue.couples_upgrade.name}</dt>
                  <dd>{showPrices ? money(q.couplesMonthly) ?? "—" : "—"}<span className="text-faint"> /mo</span></dd>
                </div>
              )}
              {q.priced && q.addonsMonthly! > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Add-ons</dt>
                  <dd>{money(q.addonsMonthly)}<span className="text-faint"> /mo</span></dd>
                </div>
              )}
            </dl>
          )}

          {q.priced ? (
            <div className="mt-6 space-y-3 border-t border-line pt-6">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted">{sel.interval === "year" ? "Annual total" : "Monthly total"}</span>
                <span className="display text-4xl text-gold-bright">{money(q.recurringTotal)}</span>
              </div>
              {sel.interval === "year" && q.annualDiscount! > 0 && (
                <p className="text-right text-xs text-muted">Includes {money(q.annualDiscount)} annual discount · {money(Math.round(q.annualTotal! / 12))} / month equivalent</p>
              )}
              {sel.interval === "month" && <p className="text-right text-xs text-muted">or {money(q.annualTotal)} per year when billed annually</p>}
              {q.annualSavings! > 0 && (
                <p className="rounded-xl bg-champagne/15 px-4 py-2.5 text-center text-sm text-gold-bright">You save {money(q.annualSavings)} a year</p>
              )}
              {q.oneTimeTotal! > 0 && (
                <div className="flex justify-between text-sm"><span className="text-muted">One-time fees</span><span>{money(q.oneTimeTotal)}</span></div>
              )}
              {q.promotionDiscount! > 0 && (
                <div className="flex justify-between text-sm text-gold"><span>Promotion</span><span>−{money(q.promotionDiscount)}</span></div>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-sm font-semibold"><span>Due today</span><span>{money(q.dueToday)}</span></div>
            </div>
          ) : sel.experiences.length > 0 ? (
            <p className="mt-6 rounded-2xl border border-line px-4 py-3 text-sm text-muted">
              Membership pricing will be announced when enrollment opens. Your selection is saved in this page’s link.
            </p>
          ) : null}

          {catalogue.preview && <p className="mt-4 text-xs text-gold">Owner preview — draft prices, not visible to the public.</p>}

          {showPrices && q.priced && (mode === "enroll" || mode === "checkout") && (
            <div className="mt-5 flex gap-2">
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code" className="field !min-h-11 uppercase" aria-label="Promo code" />
              <button type="button" onClick={applyPromo} disabled={!promoInput || checking} className="btn btn-ghost btn-sm !min-h-11 shrink-0">Apply</button>
            </div>
          )}
          {promoMsg && <p className="mt-2 text-xs text-muted" role="status">{promoMsg}</p>}

          <div className="mt-7 space-y-3">
            {mode === "change" || mode === "checkout" ? (
              <button type="button" disabled={!q.tier || !enrollmentOpen} onClick={() => onChangeSubmit?.(sel, promo?.code ?? null)} className="btn btn-gold w-full">
                {mode === "change" ? "Update my membership" : "Continue to secure payment"}
              </button>
            ) : mode === "preview" ? null : enrollmentOpen ? (
              <Link href={q.tier ? joinHref : "#build"} aria-disabled={!q.tier} className={`btn btn-gold w-full ${q.tier ? "" : "pointer-events-none opacity-50"}`}>Become a Member</Link>
            ) : (
              <p className="rounded-2xl bg-champagne/15 px-4 py-3 text-center text-sm font-semibold text-gold-bright">Membership enrollment opens soon</p>
            )}
            {mode === "enroll" && (
              <button type="button" onClick={share} className="btn btn-ghost w-full">{copied ? "Link copied" : "Share this membership"}</button>
            )}
          </div>
          <p className="mt-5 text-center text-xs text-faint">One account · one subscription · every device, no extra fees · change or cancel any time</p>
          <p className="mt-2 text-center text-xs font-semibold tracking-wide text-gold">Exclusively for adults {catalogue.minimum_member_age}+</p>
        </div>

        {mode === "enroll" && !enrollmentOpen && <NotifyForm sel={sel} loveStatus={loveStatus} tierSlug={q.tier?.slug ?? null} />}
      </aside>
    </div>
  );
}

function NotifyForm({ sel, loveStatus, tierSlug }: { sel: Selection; loveStatus: "single" | "couple" | null; tierSlug: string | null }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);
  if (state?.ok) return <p className="glass mt-5 p-5 text-center text-sm" role="status">{state.message}</p>;
  return (
    <form action={action} className="glass mt-5 space-y-3 p-6">
      <p className="font-semibold">Be first to know when enrollment opens</p>
      <p className="text-sm text-muted">We’ll save the membership you built and email you at launch.</p>
      {sel.experiences.map((e) => <input key={e} type="hidden" name="interests" value={e} />)}
      {sel.addons.map((a) => <input key={a} type="hidden" name="addons" value={a} />)}
      <input type="hidden" name="loveTrack" value={sel.experiences.includes("relationships") ? loveStatus ?? "" : ""} />
      <input type="hidden" name="desiredTier" value={tierSlug ?? ""} />
      <input type="hidden" name="desiredInterval" value={sel.interval} />
      <input type="hidden" name="couples" value={sel.couples ? "1" : ""} />
      <input name="fullName" autoComplete="name" placeholder="Your name" className="field" aria-label="Your name" />
      <input name="email" type="email" required autoComplete="email" placeholder="you@domain.com" className="field" aria-label="Email" />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold w-full" disabled={pending}>{pending ? "Saving…" : "Notify me"}</button>
    </form>
  );
}
