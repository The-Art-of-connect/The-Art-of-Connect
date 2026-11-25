"use client";
import { useActionState, useRef, useState } from "react";
import { ACCENTS, AGES, AVATARS, LANGUAGES, OPENAI_VOICES, PACES, PERSONALITIES, type JourneyPrefs, type Presentation } from "@/lib/journey-customize";
import type { ActionResult } from "@/app/actions/admin";

const label = "text-sm font-semibold text-gold";
const radio = "peer sr-only";
const pill = "inline-flex cursor-pointer items-center rounded-full border border-line-strong px-4 py-2 text-sm text-ivory/85 transition peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:text-gold-bright peer-focus-visible:ring-2 peer-focus-visible:ring-gold";

/** "Make Journey Yours": voice, perceived age, language, accent, avatar, personality and pace. */
export function CustomizeJourney({ initial, action }: { initial: JourneyPrefs; action: (p: ActionResult, f: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [p, setP] = useState<JourneyPrefs>(initial);
  const [missing, setMissing] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const set = <K extends keyof JourneyPrefs>(k: K, v: JourneyPrefs[K]) => setP((x) => ({ ...x, [k]: v }));
  const voices = OPENAI_VOICES.filter((v) => v.presentation === p.presentation);

  function choosePresentation(pr: Presentation) {
    const first = OPENAI_VOICES.find((v) => v.presentation === pr)!;
    setP((x) => ({ ...x, presentation: pr, voice: x.presentation === pr ? x.voice : first.id }));
  }
  function preview(id: string) {
    setMissing(null);
    audio.current?.pause();
    const a = new Audio(`/api/journey/voice/preview/${id}`);
    audio.current = a;
    a.play().catch(() => setMissing(id));
  }
  const summary = [
    `${OPENAI_VOICES.find((v) => v.id === p.voice)?.name} (${p.presentation} voice)`,
    p.age !== "none" ? AGES.find((a) => a.id === p.age)?.label : null,
    PERSONALITIES.find((x) => x.id === p.personality)?.label,
    LANGUAGES.find((l) => l.id === p.language)?.label,
  ].filter(Boolean).join(" · ");
  const av = AVATARS.find((a) => a.id === p.avatar) ?? AVATARS[0];

  return (
    <form action={formAction} className="theme-dark mx-auto max-w-3xl space-y-8 rounded-[28px] bg-ink px-6 py-10 text-ivory shadow-2xl sm:px-12" aria-busy={pending}>
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-gold">The Art of Connect</p>
        <h2 className="display mt-3 text-4xl text-gold-bright sm:text-5xl">Make Journey Yours.</h2>
        <p className="mx-auto mt-3 max-w-xl text-ivory/80">Personalize your experience around what makes you feel comfortable and understood.</p>
        <div className="mx-auto mt-6 h-px w-full bg-gold/40" />
      </div>

      <fieldset>
        <legend className={label}>Voice presentation</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["masculine", "feminine", "neutral"] as const).map((pr) => (
            <label key={pr}><input type="radio" name="presentation" value={pr} checked={p.presentation === pr} onChange={() => choosePresentation(pr)} className={radio} /><span className={pill}>{pr[0].toUpperCase() + pr.slice(1)}</span></label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Choose your voice</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {voices.map((v) => (
            <div key={v.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${p.voice === v.id ? "border-gold bg-gold/10" : "border-line"}`}>
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input type="radio" name="voice" value={v.id} checked={p.voice === v.id} onChange={() => set("voice", v.id)} className="accent-[var(--champagne)]" />
                <span><span className="block text-sm text-ivory">{v.name}</span><span className="block text-xs text-ivory/60">{v.character}</span></span>
              </label>
              <button type="button" onClick={() => preview(v.id)} className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold hover:bg-gold/10">▶ Preview</button>
            </div>
          ))}
        </div>
        {missing && <p className="mt-2 text-xs text-ivory/60">This preview is being prepared. You&rsquo;ll hear the voice in your next live session.</p>}
      </fieldset>

      <fieldset>
        <legend className={label}>Preferred perceived age</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {AGES.map((a) => <label key={a.id}><input type="radio" name="age" value={a.id} checked={p.age === a.id} onChange={() => set("age", a.id)} className={radio} /><span className={pill}>{a.label}</span></label>)}
        </div>
        <p className="mt-2 text-xs text-ivory/55">Shaped through speaking style. Every Journey voice is an adult voice.</p>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Language</span>
          <select name="language" value={p.language} onChange={(e) => set("language", e.target.value)} className="field mt-2 !bg-white/5 !text-ivory">
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={label}>Preferred accent</span>
          <select name="accent" value={p.accent} onChange={(e) => set("accent", e.target.value)} disabled={p.language !== "en"} className="field mt-2 !bg-white/5 !text-ivory disabled:opacity-50">
            {ACCENTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <span className="mt-1 block text-xs text-ivory/55">Regional English accents, where supported.</span>
        </label>
      </div>

      <fieldset>
        <legend className={label}>Choose Journey&rsquo;s appearance (optional)</legend>
        <p className="mt-1 text-xs text-ivory/60">Select the avatar that feels most aligned with you.</p>
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {AVATARS.map((a) => (
            <label key={a.id} className="cursor-pointer text-center" title={a.label}>
              <input type="radio" name="avatar" value={a.id} checked={p.avatar === a.id} onChange={() => set("avatar", a.id)} className={radio} />
              {a.image
                ? <img src={a.image} alt={a.label} loading="lazy" className="mx-auto aspect-square w-full rounded-2xl object-cover ring-2 ring-transparent transition peer-checked:ring-gold" />
                : <span className="mx-auto block aspect-square w-full rounded-full ring-2 ring-transparent transition peer-checked:ring-gold" style={{ background: `radial-gradient(circle at 35% 30%, ${a.from}, ${a.to})` }} />}
              <span className="mt-1 block text-[0.62rem] text-ivory/60">{a.image ? a.label.replace("Journey portrait ", "") : a.label.replace(" orb", "")}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ivory/55">Every portrait is fictional, created for The Art of Connect. Journey never represents a real person or any racial or demographic group, and stays the same Journey whichever face you choose.</p>
      </fieldset>

      <fieldset>
        <legend className={label}>Communication personality</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PERSONALITIES.map((x) => <label key={x.id}><input type="radio" name="personality" value={x.id} checked={p.personality === x.id} onChange={() => set("personality", x.id)} className={radio} /><span className={`${pill} w-full`}>{x.label}</span></label>)}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Speaking pace</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {PACES.map((x) => <label key={x.id}><input type="radio" name="pace" value={x.id} checked={p.pace === x.id} onChange={() => set("pace", x.id)} className={radio} /><span className={pill}>{x.label}</span></label>)}
        </div>
      </fieldset>

      <div className="border-t border-gold/40 pt-6 text-center">
        {av.image
          ? <img src={av.image} alt="" className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-gold" />
          : <span className="mx-auto block h-12 w-12 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${av.from}, ${av.to})` }} aria-hidden="true" />}
        <p className="mt-3 text-xs tracking-[0.25em] uppercase text-gold">Your personalized Journey</p>
        <p className="mt-2 text-lg text-ivory">{summary}</p>
        <p className="mt-2 text-sm text-ivory/60">Your comfort. Your connection. Your Journey.</p>
        <button className="btn btn-gold mt-6" disabled={pending}>{pending ? "Saving…" : "Save my preferences"}</button>
        {state && <p className={`mt-3 text-sm ${state.ok ? "text-gold-bright" : "text-danger"}`} role="status">{state.message}</p>}
        <p className="mx-auto mt-4 max-w-lg text-xs text-ivory/55">Whichever voice and style you choose, Journey keeps the same founder-approved philosophy, knowledge, accountability, emotional awareness and safety standards. Included with your membership. Change it anytime.</p>
      </div>
    </form>
  );
}
