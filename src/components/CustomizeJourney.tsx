"use client";
import { useActionState, useMemo, useRef, useState } from "react";
import { AGES, AVATAR_AGES, AVATARS, LANGUAGES, PACES, PERSONALITIES, voicesFor, type AvatarAge, type JourneyPrefs, type Presentation } from "@/lib/journey-customize";
import type { ActionResult } from "@/app/actions/admin";

const label = "text-sm font-semibold text-gold";
const radio = "peer sr-only";
const pill = "inline-flex cursor-pointer items-center rounded-full border border-line-strong px-4 py-2 text-sm text-ivory/85 transition peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:text-gold-bright peer-focus-visible:ring-2 peer-focus-visible:ring-gold";
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs transition ${on ? "border-gold bg-gold/15 text-gold-bright" : "border-line text-ivory/70 hover:border-gold/60"}`;

/**
 * "Make Journey Yours": appearance, voice, language, regional style, age, personality and pace.
 * Every choice is independent: nothing links an avatar to a voice, accent or language.
 * `live` shows GPT-Live's additional regional and multilingual voices when that is the production voice model.
 */
export function CustomizeJourney({ initial, action, live = false, previews = [] }: {
  initial: JourneyPrefs; action: (p: ActionResult, f: FormData) => Promise<ActionResult>;
  live?: boolean; previews?: string[];
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [p, setP] = useState<JourneyPrefs>(initial);
  const [region, setRegion] = useState<string>("all");
  const [voiceLang, setVoiceLang] = useState<string>("all");
  const [avatarAge, setAvatarAge] = useState<AvatarAge | "all">("all");
  const [avatarLook, setAvatarLook] = useState<Presentation | "all" | "orb">("all");
  const [missing, setMissing] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const set = <K extends keyof JourneyPrefs>(k: K, v: JourneyPrefs[K]) => setP((x) => ({ ...x, [k]: v }));

  const forPresentation = useMemo(() => voicesFor({ live, presentation: p.presentation }), [live, p.presentation]);
  const voiceLanguages = [...new Set(forPresentation.map((v) => v.language))];
  const regions = [...new Set(forPresentation.filter((v) => voiceLang === "all" || v.language === voiceLang).map((v) => v.region))];
  const voices = forPresentation.filter((v) => (voiceLang === "all" || v.language === voiceLang) && (region === "all" || v.region === region));
  const chosenVoice = forPresentation.find((v) => v.id === p.voice) ?? forPresentation[0];
  const langName = (id: string) => LANGUAGES.find((l) => l.id === id)?.label ?? id;

  function choosePresentation(pr: Presentation) {
    const first = voicesFor({ live, presentation: pr })[0];
    setRegion("all"); setVoiceLang("all");
    setP((x) => ({ ...x, presentation: pr, voice: x.presentation === pr ? x.voice : first.id }));
  }
  function preview(id: string) {
    setMissing(null);
    audio.current?.pause();
    const a = new Audio(`/api/journey/voice/preview/${id}`);
    audio.current = a;
    a.play().catch(() => setMissing(id));
  }
  const avatars = AVATARS.filter((a) => {
    if (avatarLook === "orb") return !a.image;
    if (avatarLook === "all" && avatarAge === "all") return true;
    return Boolean(a.image) && (avatarLook === "all" || a.presentation === avatarLook) && (avatarAge === "all" || a.age === avatarAge);
  });
  const av = AVATARS.find((a) => a.id === p.avatar) ?? AVATARS[0];
  const summary = [
    `${chosenVoice?.name} (${p.presentation} voice${chosenVoice && chosenVoice.region !== "Standard" ? `, ${chosenVoice.region} style` : ""})`,
    LANGUAGES.find((l) => l.id === p.language)?.label,
    PERSONALITIES.find((x) => x.id === p.personality)?.label,
    p.age !== "none" ? `${AGES.find((a) => a.id === p.age)?.label} speaking style` : null,
  ].filter(Boolean).join(" · ");

  return (
    <form action={formAction} className="theme-dark mx-auto max-w-3xl space-y-8 rounded-[28px] bg-ink px-6 py-10 text-ivory shadow-2xl sm:px-12" aria-busy={pending}>
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-gold">The Art of Connect</p>
        <h2 className="display mt-3 text-4xl text-gold-bright sm:text-5xl">Make Journey Yours.</h2>
        <p className="mx-auto mt-3 max-w-xl text-ivory/80">Personalize your experience around what makes you feel comfortable and understood. Every choice is yours, and each one is independent of the others.</p>
        <div className="mx-auto mt-6 h-px w-full bg-gold/40" />
      </div>

      <fieldset>
        <legend className={label}>Choose Journey&rsquo;s appearance</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {([["all", "All"], ["feminine", "Feminine"], ["masculine", "Masculine"], ["orb", "Signature orbs"]] as const).map(([id, l]) => <button key={id} type="button" onClick={() => setAvatarLook(id)} className={chip(avatarLook === id)}>{l}</button>)}
        </div>
        {avatarLook !== "orb" && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="self-center text-xs text-ivory/55">Age appearance:</span>
            <button type="button" onClick={() => setAvatarAge("all")} className={chip(avatarAge === "all")}>Any</button>
            {AVATAR_AGES.map((a) => <button key={a.id} type="button" onClick={() => setAvatarAge(a.id)} className={chip(avatarAge === a.id)}>{a.label}</button>)}
          </div>
        )}
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {avatars.map((a) => (
            <label key={a.id} className="cursor-pointer text-center" title={a.label}>
              <input type="radio" name="avatar" value={a.id} checked={p.avatar === a.id} onChange={() => set("avatar", a.id)} className={radio} />
              {a.image
                ? <img src={a.image} alt={a.label} loading="lazy" className="mx-auto aspect-square w-full rounded-2xl object-cover ring-2 ring-transparent transition peer-checked:ring-gold" />
                : <span className="mx-auto block aspect-square w-full rounded-full ring-2 ring-transparent transition peer-checked:ring-gold" style={{ background: `radial-gradient(circle at 35% 30%, ${a.from}, ${a.to})` }} />}
              <span className="mt-1 block text-[0.62rem] text-ivory/60">{a.image ? `${a.label.replace("Journey portrait ", "No. ")} · ${a.age}` : a.label.replace(" orb", "")}</span>
            </label>
          ))}
          {!avatars.length && <p className="col-span-full text-xs text-ivory/60">No portraits match both filters yet.</p>}
          {!avatars.some((a) => a.id === p.avatar) && <input type="hidden" name="avatar" value={p.avatar} />}
        </div>
        <p className="mt-2 text-xs text-ivory/55">Every portrait is fictional, created for The Art of Connect. Your choice of appearance never changes Journey&rsquo;s voice, language or accent, and Journey stays the same Journey whichever face you choose.</p>
      </fieldset>

      <fieldset>
        <legend className={label}>Voice</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["feminine", "masculine"] as const).map((pr) => (
            <label key={pr}><input type="radio" name="presentation" value={pr} checked={p.presentation === pr} onChange={() => choosePresentation(pr)} className={radio} /><span className={pill}>{pr === "feminine" ? "Feminine voice" : "Masculine voice"}</span></label>
          ))}
        </div>
        {voiceLanguages.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="self-center text-xs text-ivory/55">Voices made for:</span>
            <button type="button" onClick={() => { setVoiceLang("all"); setRegion("all"); }} className={chip(voiceLang === "all")}>All languages</button>
            {voiceLanguages.map((l) => <button key={l} type="button" onClick={() => { setVoiceLang(l); setRegion("all"); }} className={chip(voiceLang === l)}>{langName(l)}</button>)}
          </div>
        )}
        {regions.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="self-center text-xs text-ivory/55">Regional style:</span>
            <button type="button" onClick={() => setRegion("all")} className={chip(region === "all")}>Any</button>
            {regions.map((r) => <button key={r} type="button" onClick={() => setRegion(r)} className={chip(region === r)}>{r}</button>)}
          </div>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {voices.map((v) => (
            <div key={v.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${p.voice === v.id ? "border-gold bg-gold/10" : "border-line"}`}>
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input type="radio" name="voice" value={v.id} checked={p.voice === v.id} onChange={() => set("voice", v.id)} className="accent-[var(--champagne)]" />
                <span><span className="block text-sm text-ivory">{v.name}</span><span className="block text-xs text-ivory/60">{langName(v.language)}{v.region !== "Standard" ? ` · ${v.region}` : ""} · {v.character}</span></span>
              </label>
              <button type="button" onClick={() => preview(v.id)} disabled={!previews.includes(v.id)} className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold hover:bg-gold/10 disabled:opacity-40" title={previews.includes(v.id) ? "Hear this voice" : "Preview coming soon"}>▶ Preview</button>
            </div>
          ))}
        </div>
        {!voices.some((v) => v.id === p.voice) && <input type="hidden" name="voice" value={p.voice} />}
        {missing && <p className="mt-2 text-xs text-ivory/60">This preview is being prepared. You&rsquo;ll hear the voice in your next live session.</p>}
        <p className="mt-2 text-xs text-ivory/55">Regional styles describe how a voice speaks, never who someone is. Every voice is AI-generated, and every voice can speak your chosen language.</p>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Language</span>
          <select name="language" value={p.language} onChange={(e) => set("language", e.target.value)} className="field mt-2 !bg-white/5 !text-ivory">
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <span className="mt-1 block text-xs text-ivory/55">Journey follows you if you switch languages mid-conversation, or just ask her to.</span>
        </label>
        <fieldset>
          <legend className={label}>Voice age style</legend>
          <select name="age" value={p.age} onChange={(e) => set("age", e.target.value)} className="field mt-2 !bg-white/5 !text-ivory">
            {AGES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <span className="mt-1 block text-xs text-ivory/55">Shaped through speaking style. Every Journey voice is an adult voice.</span>
        </fieldset>
      </div>

      <fieldset>
        <legend className={label}>Communication style</legend>
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
        <p className="mx-auto mt-4 max-w-lg text-xs text-ivory/55">Whichever voice, language and style you choose, Journey keeps the same founder-approved philosophy, knowledge, accountability, emotional awareness and safety standards. Included with your membership, with no customization fee. Change it anytime.</p>
      </div>
    </form>
  );
}
