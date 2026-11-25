"use client";
import { useActionState, useState } from "react";
import { DISCOVERY_PAIRS, LANGUAGE_KEYS, LOVE_LANGUAGES, completeRank, rankFromChoices, type LoveLanguage } from "@/lib/love-languages";
import { saveLoveLanguages } from "@/app/actions/love-languages";

type Initial = { receive: string[]; express: string[]; connected: string; unappreciated: string; notes: string; sharePartner: boolean; shareMatches: boolean; useInJourney: boolean };

function RankPicker({ name, title, value, onChange }: { name: string; title: string; value: LoveLanguage[]; onChange: (v: LoveLanguage[]) => void }) {
  const move = (i: number, d: -1 | 1) => { const next = [...value]; const j = i + d; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; onChange(next); };
  return (
    <fieldset>
      <legend className="font-semibold">{title}</legend>
      <ol className="mt-3 space-y-2">
        {value.map((k, i) => (
          <li key={k} className="flex items-center gap-3 rounded-xl border border-line bg-ivory/70 px-3 py-2">
            <span className="display w-6 text-xl text-gold">{i + 1}</span>
            <span className="flex-1"><span className="block font-semibold">{LOVE_LANGUAGES[k].name}</span><span className="block text-xs text-muted">{LOVE_LANGUAGES[k].essence}</span></span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full border border-line px-2 text-sm disabled:opacity-30" aria-label={`Move ${LOVE_LANGUAGES[k].name} up`}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="rounded-full border border-line px-2 text-sm disabled:opacity-30" aria-label={`Move ${LOVE_LANGUAGES[k].name} down`}>↓</button>
            <input type="hidden" name={`${name}_${i + 1}`} value={k} />
          </li>
        ))}
      </ol>
    </fieldset>
  );
}

/** Optional Love Language Profile with a gentle ten-moment discovery. */
export function LoveLanguageForm({ initial, coupled }: { initial: Initial; coupled: boolean }) {
  const [receive, setReceive] = useState<LoveLanguage[]>(completeRank(initial.receive));
  const [express, setExpress] = useState<LoveLanguage[]>(completeRank(initial.express));
  const [picks, setPicks] = useState<(LoveLanguage | null)[]>(DISCOVERY_PAIRS.map(() => null));
  const [state, action, pending] = useActionState(saveLoveLanguages, null);
  const answered = picks.filter(Boolean).length;
  const pick = (i: number, l: LoveLanguage) => { const next = [...picks]; next[i] = l; setPicks(next); if (next.every(Boolean)) setReceive(rankFromChoices(next as LoveLanguage[])); };

  return (
    <div className="space-y-8">
      <section className="glass p-6 sm:p-8">
        <p className="eyebrow">Optional · about 2 minutes</p>
        <h2 className="display mt-2 text-3xl">Discover your preferences</h2>
        <p className="mt-2 text-sm text-muted">For each pair, choose the moment that would mean a little more to you. There are no right answers — and you can adjust everything afterward.</p>
        <ol className="mt-5 space-y-3">
          {DISCOVERY_PAIRS.map((p, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-stretch">
              <span className="display text-xl text-gold sm:pt-2">{i + 1}</span>
              {[p.a, p.b].map((o) => (
                <button key={o.lang} type="button" onClick={() => pick(i, o.lang)} aria-pressed={picks[i] === o.lang}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${picks[i] === o.lang ? "border-gold-deep bg-champagne/35 font-semibold" : "border-line bg-ivory/60 hover:border-champagne"}`}>{o.text}</button>
              ))}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">{answered < 10 ? `${answered} of 10 chosen` : "Your suggested order is filled in below — adjust it until it feels true."}</p>
      </section>

      <form action={action} className="glass space-y-8 p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <RankPicker name="receive" title="How I prefer to receive love" value={receive} onChange={setReceive} />
          <RankPicker name="express" title="How I naturally express love" value={express} onChange={setExpress} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-1.5"><span className="font-semibold">I feel most emotionally connected when…</span>
            <textarea name="feel_connected" defaultValue={initial.connected} maxLength={2000} rows={3} className="field" /></label>
          <label className="block space-y-1.5"><span className="font-semibold">I feel unappreciated when…</span>
            <textarea name="feel_unappreciated" defaultValue={initial.unappreciated} maxLength={2000} rows={3} className="field" /></label>
        </div>
        <label className="block space-y-1.5"><span className="font-semibold">Private notes <span className="font-normal text-muted">(only you)</span></span>
          <textarea name="notes" defaultValue={initial.notes} maxLength={2000} rows={2} className="field" /></label>
        <fieldset className="space-y-2 rounded-2xl border border-champagne/50 bg-champagne/10 p-5 text-sm">
          <legend className="px-1 font-semibold">Who can see this</legend>
          <p className="text-xs text-muted">Private by default. Your private notes are never shared.</p>
          <label className="flex items-start gap-2"><input type="checkbox" name="share_with_partner" defaultChecked={initial.sharePartner} className="mt-1 accent-[var(--champagne)]" /><span>Share with my partner {!coupled && <span className="text-xs text-muted">(once you’re connected in The Personal Society)</span>}</span></label>
          <label className="flex items-start gap-2"><input type="checkbox" name="share_with_matches" defaultChecked={initial.shareMatches} className="mt-1 accent-[var(--champagne)]" /><span>Share my rankings with matches I’ve mutually connected with</span></label>
          <label className="flex items-start gap-2"><input type="checkbox" name="use_in_journey" defaultChecked={initial.useInJourney} className="mt-1 accent-[var(--champagne)]" /><span>Let Journey use this to understand me better</span></label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Save my Love Language Profile"}</button>
          {state && <span className={`text-sm ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</span>}
        </div>
      </form>
      <p className="text-center text-xs text-muted">{LANGUAGE_KEYS.length} love languages · preferences that can change over time — never a label, and never the whole story of a relationship.</p>
    </div>
  );
}
