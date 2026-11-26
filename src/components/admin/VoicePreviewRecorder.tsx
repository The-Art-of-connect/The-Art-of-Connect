"use client";
import { useState } from "react";
import { JOURNEY_VOICES } from "@/lib/journey-customize";

type Row = { voice: string; status: "waiting" | "recording" | "saved" | "failed"; note?: string };

/** Encodes mono samples as a 16 kHz, 16-bit WAV file (plays in every browser, including iPhone Safari). */
function toWav(chunks: Float32Array[], inputRate: number): string {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const all = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  const ratio = inputRate / 16000;
  const n = Math.floor(total / ratio);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (p: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    // Average the input samples that fall into this output sample (simple low-pass while downsampling).
    const a = Math.floor(i * ratio), b = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0; for (let j = a; j < b; j++) sum += all[j];
    const x = Math.max(-1, Math.min(1, sum / Math.max(1, b - a)));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  let bin = ""; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Records one GPT-Live voice reading its sample line, through a real (owner-test) GPT-Live session. */
async function recordVoice(voice: string): Promise<string> {
  const ctx = new AudioContext();
  // A silent input track: GPT-Live expects continuous input audio, and the owner's microphone isn't needed.
  const silent = ctx.createMediaStreamDestination();
  const osc = ctx.createOscillator(); const mute = ctx.createGain(); mute.gain.value = 0;
  osc.connect(mute).connect(silent); osc.start();
  const pc = new RTCPeerConnection();
  silent.stream.getAudioTracks().forEach((t) => pc.addTrack(t, silent.stream));
  const dc = pc.createDataChannel("oai-events");
  const chunks: Float32Array[] = [];
  let lastSpeech = 0, spoke = false, started = false, voiceSessionId = "", liveSeconds: number | null = null;
  const sink = document.createElement("audio"); sink.muted = true; sink.autoplay = true; sink.setAttribute("playsinline", ""); sink.hidden = true; document.body.appendChild(sink);
  pc.ontrack = (e) => {
    sink.srcObject = e.streams[0];
    const src = ctx.createMediaStreamSource(e.streams[0]);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (ev) => { if (started) chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0))); };
    src.connect(proc); proc.connect(ctx.destination);
  };
  let sample = "";
  const closed = new Promise<void>((resolve) => {
    dc.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data);
        if (ev.type === "session.started") {
          started = true;
          dc.send(JSON.stringify({ type: "session.instructions.append", delegation_id: null, content: `Immediately read the following exactly and in full, without an introduction or explanation, then stop: ${sample}` }));
        } else if (ev.type === "session.output_transcript.delta") { spoke = true; lastSpeech = Date.now(); }
        else if ((ev.type === "session.usage.updated" || ev.type === "session.closed") && ev.usage?.seconds != null) liveSeconds = Number(ev.usage.seconds);
        if (ev.type === "session.closed") resolve();
      } catch { /* ignore */ }
    };
  });
  const cleanup = () => { pc.close(); osc.stop(); ctx.close().catch(() => null); sink.remove(); };
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise<void>((r) => { if (pc.iceGatheringState === "complete") return r(); const t = window.setTimeout(r, 4000); pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { window.clearTimeout(t); r(); } }); });
    const res = await fetch("/api/journey/voice/start", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "life", style: "warm", ownerTest: true, previewVoice: voice, sdp: pc.localDescription?.sdp }) }).then((x) => x.json()).catch(() => null);
    if (!res?.ok) throw new Error(res?.message ?? "Couldn't start");
    voiceSessionId = res.voiceSessionId; sample = res.sample ?? "";
    await pc.setRemoteDescription({ type: "answer", sdp: res.answerSdp });
    // Wait for the sample to be spoken: stop 1.5 seconds after speech ends, or after 25 seconds.
    const t0 = Date.now();
    await new Promise<void>((r) => { const i = window.setInterval(() => { if ((spoke && Date.now() - lastSpeech > 1500) || Date.now() - t0 > 25_000) { window.clearInterval(i); r(); } }, 250); });
    if (dc.readyState === "open") { dc.send(JSON.stringify({ type: "session.close" })); await Promise.race([closed, new Promise((r) => window.setTimeout(r, 6000))]); }
    if (!spoke || !chunks.length) throw new Error("No speech was received");
    const audio = toWav(chunks, ctx.sampleRate);
    const saved = await fetch("/api/journey/voice/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voice, mime: "audio/wav", audio }) }).then((x) => x.json()).catch(() => null);
    if (!saved?.ok) throw new Error(saved?.message ?? "Couldn't save");
    return liveSeconds != null ? `${liveSeconds}s` : "saved";
  } finally {
    cleanup();
    if (voiceSessionId) await fetch("/api/journey/voice/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voiceSessionId, transcript: "", saveTranscript: false, providerUsage: liveSeconds != null ? { seconds: liveSeconds } : null }) }).catch(() => null);
  }
}

/** Owner tool: record GPT-Live's voices once, so every member can preview them free. About a cent per voice, on the testing budget. */
export function VoicePreviewRecorder({ existing }: { existing: string[] }) {
  const liveVoices = JOURNEY_VOICES.filter((v) => v.liveOnly);
  const [rows, setRows] = useState<Row[]>(liveVoices.map((v) => ({ voice: v.id, status: existing.includes(v.id) ? "saved" : "waiting" })));
  const [busy, setBusy] = useState(false);
  const set = (voice: string, r: Partial<Row>) => setRows((x) => x.map((y) => (y.voice === voice ? { ...y, ...r } : y)));
  async function run(all: boolean) {
    setBusy(true);
    for (const r of rows) {
      if (!all && r.status === "saved") continue;
      set(r.voice, { status: "recording", note: undefined });
      try { const note = await recordVoice(r.voice); set(r.voice, { status: "saved", note }); }
      catch (e) { set(r.voice, { status: "failed", note: e instanceof Error ? e.message : "failed" }); }
    }
    setBusy(false);
  }
  const missing = rows.filter((r) => r.status !== "saved").length;
  return (
    <div className="space-y-3 p-5 text-sm">
      <p>GPT-Live&rsquo;s {liveVoices.length} regional and multilingual voices can&rsquo;t be sampled by OpenAI&rsquo;s preview service, so this records each one reading a short line in its own language through a real GPT-Live session. Members then hear the exact voice, with no AI cost to them. Roughly $0.01 per voice from your testing budget (about $0.30 for all).</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => run(false)} disabled={busy || missing === 0} className="btn btn-gold btn-sm">{busy ? "Recording…" : `Record ${missing} missing preview${missing === 1 ? "" : "s"}`}</button>
        <button type="button" onClick={() => run(true)} disabled={busy} className="btn btn-ghost btn-sm">Re-record all</button>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {rows.map((r) => {
          const v = JOURNEY_VOICES.find((x) => x.id === r.voice)!;
          return (
            <li key={r.voice} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-xs">
              <span>{v.name} <span className="text-muted">· {v.language.toUpperCase()}{v.region !== "Standard" ? ` · ${v.region}` : ""}</span></span>
              <span className={r.status === "saved" ? "text-success" : r.status === "failed" ? "text-danger" : "text-muted"}>
                {r.status === "saved" ? <button type="button" onClick={() => new Audio(`/api/journey/voice/preview/${r.voice}`).play().catch(() => null)} className="underline">▶ {r.note ?? "saved"}</button> : r.status === "recording" ? "Recording…" : r.status === "failed" ? `Failed: ${r.note}` : "Not recorded"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
