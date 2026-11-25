"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Style = "journey" | "warm" | "calm" | "confident" | "soft" | "friendly";
type Mode = "life" | "love" | "business" | "concierge";
type Line = { role: "member" | "journey"; text: string };
type Phase = "idle" | "connecting" | "live" | "paused" | "ended";
type Activity = "listening" | "hearing" | "thinking" | "speaking";

const STYLES: { id: Style; name: string }[] = [
  { id: "journey", name: "Journey’s signature voice" },
  { id: "warm", name: "Warm & expressive" },
  { id: "calm", name: "Calm & reassuring" },
  { id: "confident", name: "Confident & direct" },
  { id: "soft", name: "Soft & reflective" },
  { id: "friendly", name: "Friendly & energetic" },
];
const MODES: { id: Mode; name: string }[] = [{ id: "life", name: "In Life" }, { id: "love", name: "In Love" }, { id: "business", name: "In Business" }, { id: "concierge", name: "Private Concierge" }];
const AUDITION_VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"];

export type LiveProps = {
  available: boolean;
  reason: string;
  ownerTest?: boolean;
  minutes: { remaining: number; total: number } | null;
  initial: { style: Style; transcripts: boolean; speed: number; manual: boolean; retentionDays: number | null };
  conversations: { id: string; title: string; updated_at: string }[];
  versions?: { version: number; status: string }[];
  defaults?: { voice: string; speed: number; depth: string };
  onSavePrefs?: (p: { style: string; transcripts: boolean; speed?: number; manual?: boolean; retentionDays?: number | null }) => Promise<void>;
  onSetDefaults?: (p: { voice: string; speed: number; depth: string }) => Promise<{ ok: boolean; message: string } | null>;
};

/** Journey Live: a real-time, one-on-one voice conversation that feels like a thoughtful phone call. */
export function JourneyLive({ available, reason, ownerTest = false, minutes, initial, conversations, versions = [], defaults, onSavePrefs, onSetDefaults }: LiveProps) {
  const [style, setStyle] = useState<Style>(initial.style);
  const [mode, setMode] = useState<Mode>("life");
  const [speed, setSpeed] = useState(initial.speed);
  const [manual, setManual] = useState(initial.manual);
  const [keep, setKeep] = useState(initial.transcripts);
  const [retention, setRetention] = useState<number | null>(initial.retentionDays);
  const [continueId, setContinueId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activity, setActivity] = useState<Activity>("listening");
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [volume, setVolume] = useState(1);
  const [talking, setTalking] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  // Owner audition
  const [auditionVoice, setAuditionVoice] = useState(defaults?.voice ?? "marin");
  const [depth, setDepth] = useState(defaults?.depth ?? "complete");
  const [version, setVersion] = useState<number | "">(versions[0]?.version ?? "");
  const [defaultsMsg, setDefaultsMsg] = useState<string | null>(null);

  const r = useRef<{ pc?: RTCPeerConnection; dc?: RTCDataChannel; stream?: MediaStream; audio?: HTMLAudioElement; id?: string; tick?: number; idle?: number; idleLimit: number; last: number; lines: Line[] }>({ idleLimit: 120, last: Date.now(), lines: [] });

  useEffect(() => () => { r.current.pc?.close(); r.current.stream?.getTracks().forEach((t) => t.stop()); }, []);

  const send = (ev: Record<string, unknown>) => { try { r.current.dc?.readyState === "open" && r.current.dc.send(JSON.stringify(ev)); } catch { /* channel closed */ } };
  const micOn = (on: boolean) => r.current.stream?.getAudioTracks().forEach((t) => (t.enabled = on));
  const pushLine = (l: Line) => { r.current.lines.push(l); setLines([...r.current.lines]); };

  async function end(why?: string) {
    const x = r.current;
    window.clearInterval(x.tick); window.clearInterval(x.idle);
    x.pc?.close(); x.stream?.getTracks().forEach((t) => t.stop());
    if (x.audio) x.audio.srcObject = null;
    setPhase("ended"); setLeft(null); setTalking(false);
    if (x.id) {
      const id = x.id; x.id = undefined;
      const res = await fetch("/api/journey/voice/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voiceSessionId: id, lines: x.lines, saveTranscript: keep }) }).then((y) => y.json()).catch(() => null);
      setNote(`${why ? why + " " : ""}Conversation ended${res?.seconds ? ` · ${Math.max(1, Math.round(res.seconds / 60))} minute${res.seconds >= 90 ? "s" : ""}` : ""}.`);
    }
  }

  async function start() {
    setNote(null); setLines([]); r.current.lines = [];
    onSavePrefs?.({ style, transcripts: keep, speed, manual, retentionDays: retention }).catch(() => null);
    setPhase("connecting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      setPhase("idle"); setNote("Journey needs permission to use your microphone. You can allow it in your browser settings — or chat with Journey in writing instead."); return;
    }
    const res = await fetch("/api/journey/voice/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, style, ownerTest, conversationId: continueId || null, speed, manual, ...(ownerTest ? { voice: auditionVoice, depth, instructionVersion: version || null } : {}) }),
    }).then((x) => x.json()).catch(() => null);
    if (!res?.ok) { stream.getTracks().forEach((t) => t.stop()); setPhase("idle"); setNote(res?.message ?? "Journey Live isn't available right now."); return; }

    const pc = new RTCPeerConnection();
    const audio = new Audio(); audio.autoplay = true; audio.volume = volume; audio.muted = speakerOff;
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    if (manual) stream.getAudioTracks().forEach((t) => (t.enabled = false));
    const dc = pc.createDataChannel("oai-events");
    dc.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data);
        r.current.last = Date.now();
        switch (ev.type) {
          case "input_audio_buffer.speech_started": setActivity("hearing"); break;
          case "input_audio_buffer.speech_stopped": case "input_audio_buffer.committed": setActivity("thinking"); break;
          case "output_audio_buffer.started": setActivity("speaking"); break;
          case "output_audio_buffer.stopped": case "output_audio_buffer.cleared": setActivity("listening"); break;
          case "conversation.item.input_audio_transcription.completed": if (ev.transcript?.trim()) pushLine({ role: "member", text: ev.transcript.trim() }); break;
          case "response.output_audio_transcript.done": if (ev.transcript?.trim()) pushLine({ role: "journey", text: ev.transcript.trim() }); break;
        }
      } catch { /* ignore */ }
    };
    Object.assign(r.current, { pc, dc, stream, audio, id: res.voiceSessionId, idleLimit: res.inactivitySeconds, last: Date.now() });
    setConvId(res.conversationId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdp = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, headers: { Authorization: `Bearer ${res.clientSecret}`, "Content-Type": "application/sdp" } }).then((x) => (x.ok ? x.text() : null)).catch(() => null);
    if (!sdp) { await end("Journey couldn’t connect."); return; }
    await pc.setRemoteDescription({ type: "answer", sdp });
    dc.onopen = () => send({ type: "response.create" }); // Journey greets the member
    setPhase("live"); setMuted(false); setActivity("listening");
    const stopAt = Date.now() + res.allowedSeconds * 1000;
    setLeft(res.allowedSeconds);
    r.current.tick = window.setInterval(() => {
      const s = Math.max(0, Math.round((stopAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) end("This conversation reached its available minutes.");
    }, 1000);
    // Silence is welcome — only a long, uninterrupted quiet period ends the call to protect your minutes.
    r.current.idle = window.setInterval(() => { if (Date.now() - r.current.last > r.current.idleLimit * 1000) end("Ended after a long quiet period."); }, 5000);
    navigator.mediaDevices.enumerateDevices().then((d) => setOutputs(d.filter((x) => x.kind === "audiooutput"))).catch(() => null);
  }

  function toggleMute() { const next = !muted; setMuted(next); if (!manual) micOn(!next && phase === "live"); }
  function togglePause() {
    const pausing = phase !== "paused";
    setPhase(pausing ? "paused" : "live");
    if (pausing) { send({ type: "response.cancel" }); send({ type: "output_audio_buffer.clear" }); }
    if (!manual) micOn(!pausing && !muted);
    if (r.current.audio) r.current.audio.muted = pausing || speakerOff;
  }
  function toggleSpeaker() { const next = !speakerOff; setSpeakerOff(next); if (r.current.audio) r.current.audio.muted = next || phase === "paused"; }
  function changeVolume(v: number) { setVolume(v); if (r.current.audio) r.current.audio.volume = v; }
  function changeSpeed(v: number) { setSpeed(v); if (phase === "live") send({ type: "session.update", session: { type: "realtime", audio: { output: { speed: v } } } }); }
  async function chooseOutput(id: string) { const a = r.current.audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }; await a?.setSinkId?.(id).catch(() => null); }
  // Manual speaking mode: hold to talk, release when finished. Pressing also lets you interrupt Journey.
  function holdStart() { if (phase !== "live") return; send({ type: "response.cancel" }); send({ type: "output_audio_buffer.clear" }); send({ type: "input_audio_buffer.clear" }); micOn(true); setTalking(true); setActivity("hearing"); }
  function holdEnd() { if (!talking) return; micOn(false); setTalking(false); send({ type: "input_audio_buffer.commit" }); send({ type: "response.create" }); setActivity("thinking"); }

  const live = phase === "live" || phase === "paused";
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const statusText = phase === "paused" ? "Paused" : !live ? "A space to be heard. A place to grow." : { listening: "Journey is listening", hearing: "Journey is hearing you", thinking: "Journey is reflecting…", speaking: "Journey is speaking" }[activity];
  const pill = "rounded-full border border-line-strong px-5 py-2 text-ivory transition hover:border-gold/60";

  return (
    <div className="theme-dark overflow-hidden rounded-[2rem] border border-gold/25 bg-ink px-6 py-10 text-center sm:px-12">
      <div className={`relative mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-gold/40 sm:h-52 sm:w-52 ${live && activity === "speaking" ? "orb-breathe" : ""}`} style={{ boxShadow: "0 0 0 14px rgb(197 165 114 / 0.06), 0 0 0 28px rgb(197 165 114 / 0.04)" }}>
        <div className={`absolute inset-6 rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.45),rgb(116_63_77/0.2)_60%,transparent_75%)] ${live ? "orb-halo" : "opacity-40"}`} aria-hidden="true" />
        <div className="relative flex h-14 items-end gap-1" aria-hidden="true">
          {[6, 10, 16, 24, 32, 40, 32, 24, 16, 10, 6].map((h, i) => <span key={i} className="w-1 rounded-full bg-gold transition-all duration-300" style={{ height: live && (activity === "speaking" || activity === "hearing") ? h : Math.max(4, h / 3) }} />)}
        </div>
      </div>
      <p className="display mt-8 text-3xl text-gold-bright" role="status" aria-live="polite">{statusText}</p>
      {left !== null && <p className="mt-2 text-sm text-gold">{mmss(left)} available in this conversation</p>}

      {!live && (
        <div className="mx-auto mt-8 max-w-lg space-y-4 text-left">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-gold">Experience
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="field mt-1 !bg-white/5 !text-ivory">{MODES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <label className="text-xs text-gold">Voice
              <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className="field mt-1 !bg-white/5 !text-ivory">{STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          </div>
          {conversations.length > 0 && (
            <label className="block text-xs text-gold">Continue a previous conversation
              <select value={continueId} onChange={(e) => setContinueId(e.target.value)} className="field mt-1 !bg-white/5 !text-ivory">
                <option value="">Start fresh</option>
                {conversations.map((c) => <option key={c.id} value={c.id}>{c.title} · {new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</option>)}
              </select></label>
          )}
          <label className="block text-xs text-gold">Speaking pace · {speed.toFixed(2)}×
            <input type="range" min={0.8} max={1.2} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-2 w-full accent-[var(--champagne)]" /></label>
          <label className="flex items-start gap-2 text-sm text-ivory"><input type="checkbox" checked={manual} onChange={() => setManual(!manual)} className="mt-1 accent-[var(--champagne)]" />
            <span>Manual speaking mode <span className="block text-xs text-muted">For noisy places: hold the button while you speak and release when you’re finished.</span></span></label>
          <label className="flex items-start gap-2 text-sm text-ivory"><input type="checkbox" checked={keep} onChange={() => setKeep(!keep)} className="mt-1 accent-[var(--champagne)]" />
            <span>Save a private transcript <span className="block text-xs text-muted">Joins your written conversation so you can continue in text. Audio is never recorded.</span></span></label>
          {keep && (
            <label className="block pl-6 text-xs text-muted">Keep transcripts for
              <select value={retention ?? "forever"} onChange={(e) => setRetention(e.target.value === "forever" ? null : Number(e.target.value))} className="field mt-1 !min-h-0 !w-auto !bg-white/5 !py-1 !text-ivory">
                <option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option><option value="forever">Until I delete them</option>
              </select></label>
          )}

          {ownerTest && (
            <fieldset className="rounded-2xl border border-gold/40 p-4">
              <legend className="px-2 text-xs tracking-[0.2em] uppercase text-gold">Owner audition — private</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-muted">Voice<select value={auditionVoice} onChange={(e) => setAuditionVoice(e.target.value)} className="field mt-1 !min-h-0 !bg-white/5 !py-1.5 !text-ivory capitalize">{AUDITION_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
                <label className="text-xs text-muted">Response depth<select value={depth} onChange={(e) => setDepth(e.target.value)} className="field mt-1 !min-h-0 !bg-white/5 !py-1.5 !text-ivory"><option value="balanced">Balanced</option><option value="complete">Complete</option><option value="in_depth">In depth</option></select></label>
                <label className="text-xs text-muted">Personality<select value={version} onChange={(e) => setVersion(e.target.value ? Number(e.target.value) : "")} className="field mt-1 !min-h-0 !bg-white/5 !py-1.5 !text-ivory"><option value="">Published</option>{versions.map((v) => <option key={v.version} value={v.version}>Version {v.version} · {v.status}</option>)}</select></label>
              </div>
              <p className="mt-2 text-xs text-muted">Auditions use the voice above with your pace setting, and draw from your owner testing budget.</p>
              {onSetDefaults && (
                <button type="button" onClick={async () => { const out = await onSetDefaults({ voice: auditionVoice, speed, depth }); setDefaultsMsg(out?.message ?? null); }} className="mt-3 text-xs text-gold underline">Make this Journey’s default voice, pace and depth</button>
              )}
              {defaultsMsg && <p className="mt-1 text-xs text-gold-bright">{defaultsMsg}</p>}
            </fieldset>
          )}

          <div className="text-center">
            <button type="button" onClick={start} disabled={!available || phase === "connecting"} className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-gold text-espresso shadow-lg disabled:opacity-60" aria-label="Start a live conversation with Journey">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
            <p className="mt-3 text-gold">{phase === "connecting" ? "Connecting…" : "Start a live conversation"}</p>
            <p className="mt-1 text-xs text-faint">{available ? "Your browser will ask to use your microphone. It’s used only while a conversation is active." : reason}</p>
          </div>
        </div>
      )}

      {live && (
        <div className="mx-auto mt-8 max-w-lg space-y-5">
          {manual && (
            <button type="button" onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd} onKeyDown={(e) => e.key === " " && holdStart()} onKeyUp={(e) => e.key === " " && holdEnd()} disabled={phase === "paused"}
              className={`mx-auto flex h-24 w-24 select-none items-center justify-center rounded-full text-sm font-semibold transition ${talking ? "scale-110 bg-gold-bright text-espresso" : "bg-gold text-espresso"}`}>
              {talking ? "Listening…" : "Hold to talk"}
            </button>
          )}
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {!manual && <button type="button" onClick={toggleMute} className={pill} aria-pressed={muted}>{muted ? "Unmute microphone" : "Mute microphone"}</button>}
            <button type="button" onClick={toggleSpeaker} className={pill} aria-pressed={speakerOff}>{speakerOff ? "Speaker on" : "Speaker off"}</button>
            <button type="button" onClick={togglePause} className={pill}>{phase === "paused" ? "Resume" : "Pause"}</button>
            <button type="button" onClick={() => end()} className="rounded-full bg-gold px-5 py-2 font-semibold text-espresso">End conversation</button>
          </div>
          <div className="grid gap-3 text-left text-xs text-gold sm:grid-cols-2">
            <label>Volume<input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => changeVolume(Number(e.target.value))} className="mt-1 w-full accent-[var(--champagne)]" /></label>
            <label>Speaking pace · {speed.toFixed(2)}×<input type="range" min={0.8} max={1.2} step={0.05} value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} className="mt-1 w-full accent-[var(--champagne)]" /></label>
            {outputs.length > 1 && (
              <label className="sm:col-span-2">Play through
                <select onChange={(e) => chooseOutput(e.target.value)} className="field mt-1 !min-h-0 !bg-white/5 !py-1.5 !text-ivory">{outputs.map((o) => <option key={o.deviceId} value={o.deviceId}>{o.label || "Speaker"}</option>)}</select></label>
            )}
          </div>
          <p className="text-xs text-muted">Take your time — pauses are welcome. You can interrupt Journey at any moment{manual ? " by pressing the button" : " simply by speaking"}.</p>
        </div>
      )}

      {note && <p className="mx-auto mt-5 max-w-md rounded-xl border border-gold/30 px-4 py-2 text-sm text-gold-bright" role="status">{note}</p>}
      {phase === "ended" && convId && keep && (
        <p className="mt-3"><Link href={`/app/journey?c=${convId}#chat`} className="btn btn-ghost btn-sm">Continue this conversation in writing</Link></p>
      )}
      {lines.length > 0 && (
        <div className="mx-auto mt-5 max-h-64 max-w-lg space-y-2 overflow-y-auto rounded-xl bg-white/5 p-4 text-left text-sm">
          {lines.map((l, i) => <p key={i} className={l.role === "journey" ? "text-ivory" : "text-muted"}><span className="text-xs text-gold">{l.role === "journey" ? "Journey" : "You"}: </span>{l.text}</p>)}
          {!keep && <p className="text-[0.7rem] text-faint">Shown during this call only — not saved.</p>}
        </div>
      )}
      <p className="mt-6 text-sm text-muted">{minutes ? <>Voice allowance: <span className="text-gold-bright">{minutes.remaining} of {minutes.total} minutes</span> remaining</> : ownerTest ? "Owner testing — drawn from your testing budget." : "Your voice minutes will appear here."}</p>
      <p className="mt-2 text-xs text-faint">Journey is an AI companion with an AI-generated voice — not a person, and not a therapist.</p>
      <div className="mx-auto mt-8 h-px w-24 bg-gold/50" />
      <p className="mt-5 text-xs tracking-[0.3em] text-gold uppercase">Clarity before speed · Understanding before responding</p>
    </div>
  );
}
