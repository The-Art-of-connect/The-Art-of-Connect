"use client";
import { useRef, useState } from "react";

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

const VOICES: { id: "warm" | "calm" | "confident" | "soft" | "friendly"; name: string; line: string }[] = [
  { id: "warm", name: "Warm & expressive", line: "I'm so glad you're here. Tell me what's been on your heart." },
  { id: "calm", name: "Calm & reassuring", line: "Take a breath. We can go at whatever pace feels right." },
  { id: "confident", name: "Confident & direct", line: "Let's get clear on what you want, and the first step toward it." },
  { id: "soft", name: "Soft & reflective", line: "What do you notice when you sit with that feeling?" },
  { id: "friendly", name: "Friendly & energetic", line: "Love that goal. Let's make a plan you'll actually enjoy." },
];

type Status = "idle" | "connecting" | "live" | "paused" | "ended";

export function VoiceStudio({ minutes, initialStyle = "warm", initialTranscripts = false, available, reason, ownerTest = false, onSavePrefs, lesson = null, discovery = null, mode = "life", voiceSummary = null }: {
  /** When set, the member's saved Customize Your Journey choice is shown instead of the legacy style picker. */
  voiceSummary?: string | null;
  minutes: { remaining: number; total: number } | null;
  /** A curriculum lesson ("section/lesson") or discovery category this live session is about. */
  lesson?: string | null;
  discovery?: string | null;
  mode?: "business" | "life" | "love" | "concierge";
  initialStyle?: (typeof VOICES)[number]["id"];
  initialTranscripts?: boolean;
  available: boolean;
  reason: string;
  ownerTest?: boolean;
  onSavePrefs?: (style: string, transcripts: boolean) => Promise<void>;
}) {
  const [voice, setVoice] = useState(initialStyle);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscripts);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const ref = useRef<{ pc?: RTCPeerConnection; stream?: MediaStream; audio?: HTMLAudioElement; id?: string; tick?: number; idle?: number; idleLimit: number; idleLast?: number; lines: string[] }>({ idleLimit: 120, lines: [] });

  function previewVoice(line: string) {
    setPreview(line);
    try {
      const u = new SpeechSynthesisUtterance(line);
      u.rate = 0.95;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* preview text still shows */ }
  }

  async function end(reasonText?: string) {
    const r = ref.current;
    window.clearInterval(r.tick); window.clearInterval(r.idle);
    r.pc?.close(); r.stream?.getTracks().forEach((t) => t.stop());
    if (r.audio) r.audio.srcObject = null;
    setStatus("ended"); setLeft(null);
    if (r.id) {
      const id = r.id; r.id = undefined;
      const res = await fetch("/api/journey/voice/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voiceSessionId: id, transcript: r.lines.join("\n"), saveTranscript: transcript }) }).then((x) => x.json()).catch(() => null);
      setNote(`${reasonText ? reasonText + " " : ""}Conversation ended${res?.seconds ? ` · ${Math.max(1, Math.round(res.seconds / 60))} minute${res.seconds >= 90 ? "s" : ""} used` : ""}.`);
    }
  }

  async function start() {
    setNote(null); setLines([]); ref.current.lines = [];
    if (onSavePrefs) onSavePrefs(voice, transcript).catch(() => null);
    setStatus("connecting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("idle"); setNote("Journey needs permission to use your microphone. You can allow it in your browser settings, or chat in writing instead."); return;
    }
    const r = await fetch("/api/journey/voice/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, style: voice, ownerTest, lesson, discovery }) }).then((x) => x.json()).catch(() => null);
    if (!r?.ok) { stream.getTracks().forEach((t) => t.stop()); setStatus("idle"); setNote(r?.message ?? "Talk to Journey isn't available right now."); return; }
    const pc = new RTCPeerConnection();
    const audio = new Audio(); audio.autoplay = true;
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const dc = pc.createDataChannel("oai-events");
    const bump = () => { ref.current.idleLast = Date.now(); };
    dc.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data);
        if (typeof ev.type === "string" && (ev.type.startsWith("input_audio_buffer.speech") || ev.type.startsWith("response."))) bump();
        if (ev.type === "response.output_audio_transcript.done" && ev.transcript) {
          ref.current.lines.push(`Journey: ${ev.transcript}`); setLines([...ref.current.lines]);
        }
      } catch { /* ignore */ }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdp = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, headers: { Authorization: `Bearer ${r.clientSecret}`, "Content-Type": "application/sdp" } }).then((x) => (x.ok ? x.text() : null)).catch(() => null);
    Object.assign(ref.current, { pc, stream, audio, id: r.voiceSessionId, idleLimit: r.inactivitySeconds, idleLast: Date.now() });
    if (!sdp) { await end("Journey couldn't connect."); return; }
    await pc.setRemoteDescription({ type: "answer", sdp });
    setStatus("live"); setMuted(false);
    const stopAt = Date.now() + r.allowedSeconds * 1000;
    setLeft(r.allowedSeconds);
    ref.current.tick = window.setInterval(() => {
      const s = Math.max(0, Math.round((stopAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) end("Your available voice minutes for this conversation were reached.");
    }, 1000);
    ref.current.idle = window.setInterval(() => {
      if (Date.now() - (ref.current.idleLast ?? Date.now()) > ref.current.idleLimit * 1000) end("Ended after a quiet period to save your minutes.");
    }, 5000);
  }

  function toggleMute() {
    const next = !muted; setMuted(next);
    ref.current.stream?.getAudioTracks().forEach((t) => (t.enabled = !next));
  }
  function togglePause() {
    const paused = status !== "paused";
    setStatus(paused ? "paused" : "live");
    ref.current.stream?.getAudioTracks().forEach((t) => (t.enabled = !paused && !muted));
    if (ref.current.audio) ref.current.audio.muted = paused;
  }
  const live = status === "live" || status === "paused";
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="theme-dark overflow-hidden rounded-[2rem] border border-gold/25 px-6 py-10 text-center sm:px-12" style={{ background: "var(--ink)" }}>
      <div className={`mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-gold/40 sm:h-48 sm:w-48 ${status === "live" ? "animate-pulse" : ""}`} style={{ boxShadow: "0 0 0 14px rgb(197 165 114 / 0.06), 0 0 0 28px rgb(197 165 114 / 0.04)" }}>
        <div className="flex h-14 items-end gap-1" aria-hidden="true">
          {[6, 10, 16, 24, 32, 40, 32, 24, 16, 10, 6].map((h, i) => <span key={i} className="w-1 rounded-full bg-gold" style={{ height: h }} />)}
        </div>
      </div>
      <p className="display mt-8 text-3xl text-gold-bright">{live ? (status === "paused" ? "Paused" : "Journey is listening") : "A space to be heard. A place to grow."}</p>
      {left !== null && <p className="mt-2 text-sm text-gold">{mmss(left)} remaining in this conversation</p>}

      {!live && (voiceSummary ? (
          <p className="mt-8 text-sm text-ivory/80">Speaking as <span className="font-semibold text-gold-bright">{voiceSummary}</span> · <a href="/app/journey/customize" className="text-gold underline-offset-2 hover:underline">Customize your Journey</a></p>
        ) : (<fieldset className="mx-auto mt-8 max-w-md rounded-2xl border border-gold/30 p-5 text-left">
          <legend className="px-2 text-sm text-gold">Choose your preferred voice</legend>
          {VOICES.map((v) => (
            <label key={v.id} className="flex cursor-pointer items-center justify-between gap-3 py-2">
              <span className="flex items-center gap-3">
                <input type="radio" name="voice" checked={voice === v.id} onChange={() => setVoice(v.id)} className="accent-[var(--champagne)]" />
                <span className="text-ivory">{v.name}</span>
              </span>
              <button type="button" onClick={() => previewVoice(v.line)} className="text-xs text-gold underline-offset-2 hover:underline">Preview</button>
            </label>
          ))}
          {preview && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm italic text-muted">&ldquo;{preview}&rdquo;<span className="mt-1 block text-[0.65rem] not-italic text-faint">This preview uses your device&rsquo;s voice. In conversation, Journey speaks in the AI-generated voice you choose.</span></p>}
        </fieldset>))}

      {!live ? (
        <>
          <button type="button" onClick={start} disabled={!available || status === "connecting"} className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-gold text-espresso disabled:opacity-60" aria-label="Begin your conversation">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
          <p className="mt-3 text-gold">{status === "connecting" ? "Connecting…" : "Begin your conversation"}</p>
          <p className="mt-1 text-xs text-faint">{available ? "Your microphone is used only while a conversation is active." : reason}</p>
        </>
      ) : (
        <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2 text-sm">
          <button type="button" onClick={toggleMute} className="rounded-full border border-line-strong px-5 py-2 text-ivory">{muted ? "Unmute" : "Mute"}</button>
          <button type="button" onClick={togglePause} className="rounded-full border border-line-strong px-5 py-2 text-ivory">{status === "paused" ? "Resume" : "Pause"}</button>
          <button type="button" onClick={() => end()} className="rounded-full bg-gold px-5 py-2 font-semibold text-espresso">End conversation</button>
        </div>
      )}
      <label className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-line-strong px-4 py-1.5 text-sm text-muted">
        <input type="checkbox" checked={transcript} onChange={() => setTranscript(!transcript)} disabled={live} className="accent-[var(--champagne)]" /> Save a private transcript
      </label>
      {note && <p className="mx-auto mt-4 max-w-md rounded-xl border border-gold/30 px-4 py-2 text-sm text-gold-bright" role="status">{note}</p>}
      {transcript && lines.length > 0 && <div className="mx-auto mt-4 max-h-48 max-w-md overflow-y-auto rounded-xl bg-white/5 p-3 text-left text-xs text-muted">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>}
      <p className="mt-6 text-sm text-muted">
        {minutes ? <>Voice allowance: <span className="text-gold-bright">{minutes.remaining} of {minutes.total} minutes</span> remaining</> : "Your voice minutes will appear here."}
      </p>
      <p className="mt-2 text-xs text-faint">Journey&rsquo;s voice is AI-generated. Journey is an AI assistant, not a person or a therapist.</p>
      <div className="mx-auto mt-8 h-px w-24 bg-gold/50" />
      <p className="mt-5 text-xs tracking-[0.3em] text-gold uppercase">In Business. In Life. In Love.</p>
    </div>
  );
}
