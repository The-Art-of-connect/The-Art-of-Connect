"use client";
import { useState } from "react";

/** A row of elegant single-choice pills (saved preferences arrive with member memory). */
export function PillChoice({ label, options, initial }: { label: string; options: string[]; initial?: string }) {
  const [v, setV] = useState(initial ?? options[0]);
  return (
    <fieldset>
      <legend className="text-xs tracking-[0.25em] text-gold uppercase">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button type="button" key={o} onClick={() => setV(o)} aria-pressed={v === o}
            className={`rounded-full px-4 py-2 text-sm transition ${v === o ? "bg-gold font-semibold text-espresso" : "border border-line-strong text-muted hover:border-gold/60 hover:text-text"}`}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const VOICES = [
  { name: "Warm & expressive", line: "I'm so glad you're here. Tell me what's been on your heart." },
  { name: "Calm & reassuring", line: "Take a breath. We can go at whatever pace feels right." },
  { name: "Confident & direct", line: "Let's get clear on what you want, and the first step toward it." },
  { name: "Soft & reflective", line: "What do you notice when you sit with that feeling?" },
  { name: "Friendly & energetic", line: "Love that goal. Let's make a plan you'll actually enjoy." },
];

export function VoiceStudio({ minutes }: { minutes: { remaining: number; total: number } | null }) {
  const [voice, setVoice] = useState(VOICES[0].name);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="theme-dark overflow-hidden rounded-[2rem] border border-gold/25 px-6 py-10 text-center sm:px-12" style={{ background: "var(--ink)" }}>
      <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-gold/40 sm:h-48 sm:w-48" style={{ boxShadow: "0 0 0 14px rgb(197 165 114 / 0.06), 0 0 0 28px rgb(197 165 114 / 0.04)" }}>
        <div className="flex h-14 items-end gap-1" aria-hidden="true">
          {[6, 10, 16, 24, 32, 40, 32, 24, 16, 10, 6].map((h, i) => <span key={i} className="w-1 rounded-full bg-gold" style={{ height: h }} />)}
        </div>
      </div>
      <p className="display mt-8 text-3xl text-gold-bright">A space to be heard. A place to grow.</p>

      <fieldset className="mx-auto mt-8 max-w-md rounded-2xl border border-gold/30 p-5 text-left">
        <legend className="px-2 text-sm text-gold">Choose your preferred voice</legend>
        {VOICES.map((v) => (
          <label key={v.name} className="flex cursor-pointer items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-3">
              <input type="radio" name="voice" checked={voice === v.name} onChange={() => setVoice(v.name)} className="accent-[var(--champagne)]" />
              <span className="text-ivory">{v.name}</span>
            </span>
            <button type="button" onClick={() => setPreview(v.line)} className="text-xs text-gold underline-offset-2 hover:underline">Preview</button>
          </label>
        ))}
        {preview && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm italic text-muted">&ldquo;{preview}&rdquo;<span className="mt-1 block text-[0.65rem] not-italic text-faint">Voice previews play here once voice opens. Journey&rsquo;s voice is AI-generated.</span></p>}
      </fieldset>

      <button type="button" disabled className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-gold text-espresso opacity-80" aria-label="Begin your conversation (opens soon)">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
      </button>
      <p className="mt-3 text-gold">Begin your conversation</p>
      <p className="mt-1 text-xs text-faint">Voice conversations open soon. Your microphone is used only while a conversation is active.</p>

      <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2 text-sm">
        <button type="button" onClick={() => setMuted(!muted)} className="rounded-full border border-line-strong px-4 py-1.5 text-muted">{muted ? "Unmute" : "Mute"}</button>
        <button type="button" disabled className="rounded-full border border-line-strong px-4 py-1.5 text-muted opacity-60">Pause</button>
        <button type="button" disabled className="rounded-full border border-line-strong px-4 py-1.5 text-muted opacity-60">End</button>
        <label className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-1.5 text-muted">
          <input type="checkbox" checked={transcript} onChange={() => setTranscript(!transcript)} className="accent-[var(--champagne)]" /> Save a transcript
        </label>
      </div>
      <p className="mt-6 text-sm text-muted">
        {minutes ? <>Voice allowance: <span className="text-gold-bright">{minutes.remaining} of {minutes.total} minutes</span> remaining</> : "Your voice minutes will appear here."}
      </p>
      <div className="mx-auto mt-8 h-px w-24 bg-gold/50" />
      <p className="mt-5 text-xs tracking-[0.3em] text-gold uppercase">In Business. In Life. In Love.</p>
    </div>
  );
}
