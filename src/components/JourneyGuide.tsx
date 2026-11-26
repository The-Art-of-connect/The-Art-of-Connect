"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanGuideAnswers, parseGuideDraft, type GuideAccess, type GuideAnswers, type GuideModule, type GuideQuestion } from "@/lib/journey-guide";
import { saveGuidedAnswers } from "@/app/actions/journey-guide";
import { VoiceStudio } from "@/components/JourneyPickers";

type Turn = { role: "member" | "journey"; text: string };
const key = () => crypto.randomUUID().replace(/-/g, "");

/**
 * The universal Journey integration placed before every lesson, questionnaire and reflection:
 * Talk to Journey · Chat With Journey · Continue Independently.
 * The written form (children) stays exactly as it is, and is shown when the member continues independently.
 */
export function JourneyGuide({ mod, access, hasAnswers, children }: { mod: GuideModule; access: GuideAccess; hasAnswers: boolean; children: React.ReactNode }) {
  const [view, setView] = useState<"choose" | "chat" | "independent">(hasAnswers ? "independent" : "choose");
  const journeyOk = access.kind !== "free" && access.available;
  const voiceHref = `/app/journey/voice?lesson=${encodeURIComponent(mod.ref)}`;
  return (
    <div className="space-y-6">
      <section aria-label="How would you like to complete this?" className="theme-dark relative overflow-hidden rounded-[26px] bg-ink p-6 text-ivory sm:p-8">
        <div className="orb-halo pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.35),transparent_70%)]" aria-hidden="true" />
        <p className="eyebrow relative">How would you like to complete this?</p>
        <p className="display relative mt-2 text-2xl text-gold-bright sm:text-3xl">{mod.title}</p>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {journeyOk ? (
            <Link href={voiceHref} className="flex flex-col rounded-2xl border border-gold/50 bg-white/5 p-4 transition hover:border-gold hover:bg-gold/10">
              <span className="text-lg text-gold-bright">Talk to Journey</span>
              <span className="mt-1 text-xs text-ivory/70">A live spoken conversation. Journey guides you through every question.</span>
            </Link>
          ) : <Locked title="Talk to Journey" access={access} />}
          {journeyOk ? (
            <button type="button" onClick={() => setView("chat")} aria-pressed={view === "chat"} className={`flex flex-col rounded-2xl border p-4 text-left transition hover:border-gold hover:bg-gold/10 ${view === "chat" ? "border-gold bg-gold/10" : "border-gold/50 bg-white/5"}`}>
              <span className="text-lg text-gold-bright">Chat With Journey</span>
              <span className="mt-1 text-xs text-ivory/70">Write back and forth. Journey documents your answers for you to review.</span>
            </button>
          ) : <Locked title="Chat With Journey" access={access} />}
          <button type="button" onClick={() => setView("independent")} aria-pressed={view === "independent"} className={`flex flex-col rounded-2xl border p-4 text-left transition hover:border-champagne hover:bg-white/10 ${view === "independent" ? "border-champagne bg-white/10" : "border-line bg-white/5"}`}>
            <span className="text-lg text-ivory">Continue Independently</span>
            <span className="mt-1 text-xs text-ivory/70">Answer the written questions at your own pace. Never uses Journey.</span>
          </button>
        </div>
        <p className="relative mt-4 text-xs text-ivory/60">
          {access.kind === "paid" ? `Included in your membership · ${access.credits} Journey messages left this period. Nothing is saved until you review and approve it.`
            : access.kind === "owner" ? "Owner test: uses your private testing budget. Members can't use Journey until live payments are on."
            : "Journey is included with paid memberships. Every lesson stays fully open to you self-guided."}
        </p>
      </section>

      {view === "chat" && journeyOk && <GuideChat mod={mod} ownerTest={access.kind === "owner"} onIndependent={() => setView("independent")} />}
      <div hidden={view !== "independent"}>{children}</div>
    </div>
  );
}

function Locked({ title, access }: { title: string; access: GuideAccess }) {
  const reason = access.kind === "free" ? "Included with paid memberships" : (access.reason ?? "Opens soon");
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white/[0.03] p-4 opacity-75">
      <span className="text-lg text-ivory/80">{title}</span>
      <span className="mt-1 text-xs text-ivory/60">{reason}</span>
      {access.kind === "free" && <Link href="/app/membership" className="mt-2 text-xs text-gold underline-offset-2 hover:underline">Explore memberships</Link>}
    </div>
  );
}

/** An inline written conversation that guides the whole module, then hands the member a review form. */
function GuideChat({ mod, ownerTest, onIndependent }: { mod: GuideModule; ownerTest: boolean; onIndependent: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<GuideAnswers | null>(null);
  const conversation = useRef<string | null>(null);
  const end = useRef<HTMLDivElement | null>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [turns, busy]);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/journey/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "life", requestKey: key(), ownerTest, ...body }) })
      .then((r) => r.json()).catch(() => null);
    return res as { ok: boolean; reply?: string; conversationId?: string | null; message?: string } | null;
  }
  async function send(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true); setError(null);
    setTurns((t) => [...t, { role: "member", text: message }]);
    setText("");
    const r = await call({ message, conversationId: conversation.current, guide: { ref: mod.ref } });
    setBusy(false);
    if (!r?.ok) { setError(r?.message ?? "Journey couldn't reply just now. Your conversation is safe; please try again."); return; }
    conversation.current = r.conversationId ?? conversation.current;
    setTurns((t) => [...t, { role: "journey", text: r.reply ?? "" }]);
  }
  async function review() {
    setBusy(true); setError(null);
    const r = await call({ message: "Document my answers.", conversationId: conversation.current, guide: { ref: mod.ref, draft: true } });
    setBusy(false);
    if (!r?.ok) { setError(r?.message ?? "Journey couldn't prepare your answers just now. Please try again."); return; }
    setDraft(parseGuideDraft(mod, r.reply ?? ""));
  }

  if (draft) return <GuideReview mod={mod} draft={draft} onBack={() => setDraft(null)} />;
  return (
    <section aria-label={`Chat with Journey about ${mod.title}`} className="glass p-5 sm:p-7">
      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {!turns.length && (
          <div className="rounded-2xl bg-champagne/15 p-4 text-sm">
            <p>Journey will guide you through <strong>{mod.title}</strong> one question at a time, adapting to what you share. Answer as much or as little as you like. When you&rsquo;re done, Journey documents your answers for you to review and correct before anything is saved.</p>
            <button type="button" onClick={() => send(`I'd like to work through "${mod.title}" with you.`)} className="btn btn-gold btn-sm mt-3" disabled={busy}>Begin with Journey</button>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${t.role === "member" ? "ml-auto bg-burgundy text-ivory" : "bg-ivory/80 ring-1 ring-champagne/50"}`}>{t.text}</div>
        ))}
        {busy && <p className="text-xs text-muted">Journey is reflecting…</p>}
        <div ref={end} />
      </div>
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
      {turns.length > 0 && (
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor={`guide-${mod.ref}`}>Your reply</label>
          <textarea id={`guide-${mod.ref}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000} className="field flex-1 !min-h-0"
            placeholder="Write freely — this stays private to you." onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <button className="btn btn-gold self-end" disabled={busy || !text.trim()}>Send</button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="button" onClick={review} disabled={busy || turns.length < 2} className="btn btn-ghost btn-sm">Review and save my answers</button>
        <button type="button" onClick={onIndependent} className="text-xs text-gold-deep underline-offset-2 hover:underline">Switch to the written questions</button>
        <span className="text-xs text-muted">Reviewing uses one Journey message.</span>
      </div>
    </section>
  );
}

/** The member reviews and corrects what Journey documented; nothing is saved until they confirm. */
export function GuideReview({ mod, draft, onBack }: { mod: GuideModule; draft: GuideAnswers; onBack?: () => void }) {
  const [state, action, pending] = useActionState(saveGuidedAnswers, null);
  const [values, setValues] = useState<GuideAnswers>(draft);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  const set = (k: string, v: string | string[]) => setValues((x) => ({ ...x, [k]: v }));
  const kept = cleanGuideAnswers(mod, values);
  const found = Object.keys(draft).length;

  return (
    <form action={action} className="glass space-y-6 p-6 sm:p-8">
      <input type="hidden" name="ref" value={mod.ref} />
      <input type="hidden" name="answers" value={JSON.stringify(kept)} />
      <div>
        <p className="eyebrow">Review what Journey documented</p>
        <p className="mt-2 text-sm text-muted">{found ? "Journey wrote these from your own words. Correct anything that isn't quite right, clear anything you'd rather not keep, then save." : "Journey couldn't find clear answers in the conversation yet. You can write them here, or go back and keep talking."} Questions you leave empty aren&rsquo;t changed.</p>
      </div>
      {mod.questions.map((q) => <ReviewField key={q.key} q={q} value={values[q.key]} onChange={(v) => set(q.key, v)} />)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" value="yes" required className="mt-1" /> These answers reflect what I meant. Save them privately to my discoveries.</label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-gold" disabled={pending || !Object.keys(kept).length}>{pending ? "Saving…" : "Save my answers"}</button>
        {onBack && <button type="button" onClick={onBack} className="btn btn-ghost">Keep talking</button>}
        <Link href={mod.href} className="text-sm text-gold-deep">Back to the lesson</Link>
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-gold-deep" : "text-danger"}`} role="status">{state.message}</p>}
      <p className="text-xs text-muted">Private to you. Never shared with connections, matches, partners, providers or our team. Reflection only, never a diagnosis or label.</p>
    </form>
  );
}

function ReviewField({ q, value, onChange }: { q: GuideQuestion; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <fieldset>
      <legend className="display text-xl leading-snug">{q.prompt}</legend>
      {q.kind === "text" && <textarea value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} maxLength={4000} className="field mt-2 !min-h-[90px]" placeholder="Not answered yet" />}
      {q.kind === "choice" && (
        <div className="mt-2 grid gap-2">
          {q.options!.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-champagne/50 px-3 py-2 text-sm has-[:checked]:border-burgundy has-[:checked]:bg-champagne/20">
              <input type="radio" name={`r-${q.key}`} checked={list[0] === o.id} onChange={() => onChange(o.id)} className="mt-0.5" /> {o.label}
            </label>
          ))}
          {list.length > 0 && <button type="button" onClick={() => onChange("")} className="justify-self-start text-xs text-gold-deep">Clear this answer</button>}
        </div>
      )}
      {q.kind === "multi" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {q.options!.map((o) => {
            const on = list.includes(o.id);
            return <button type="button" key={o.id} aria-pressed={on} onClick={() => onChange(on ? list.filter((x) => x !== o.id) : [...list, o.id].slice(0, q.max ?? 5))}
              className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-burgundy bg-champagne/40 font-semibold" : "border-champagne/50"}`}>{o.label}</button>;
          })}
          <p className="w-full text-xs text-muted">Choose up to {q.max ?? 5}.</p>
        </div>
      )}
      {q.kind === "rank" && (
        <ol className="mt-2 space-y-2">
          {q.options!.map((_, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-gold-deep">{i + 1}.</span>
              <select value={list[i] ?? ""} onChange={(e) => { const next = [...list]; next[i] = e.target.value; onChange(next.filter(Boolean)); }} className="field !py-2">
                <option value="">Choose…</option>
                {q.options!.map((o) => <option key={o.id} value={o.id} disabled={list.includes(o.id) && list[i] !== o.id}>{o.label}</option>)}
              </select>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  );
}

/** After a spoken guided session: Journey documents the member's answers from the transcript, for review. */
export function GuideVoiceReview({ mod, transcript, ownerTest }: { mod: GuideModule; transcript: string; ownerTest: boolean }) {
  const [draft, setDraft] = useState<GuideAnswers | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function prepare() {
    setBusy(true); setError(null);
    const r = await fetch("/api/journey/message", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "life", requestKey: key(), ownerTest, message: "Document my answers.", guide: { ref: mod.ref, draft: true, transcript } }) })
      .then((x) => x.json()).catch(() => null) as { ok: boolean; reply?: string; message?: string } | null;
    setBusy(false);
    if (!r?.ok) { setError(r?.message ?? "Journey couldn't prepare your answers just now. Please try again."); return; }
    setDraft(parseGuideDraft(mod, r.reply ?? ""));
  }
  if (draft) return <GuideReview mod={mod} draft={draft} />;
  return (
    <div className="glass mx-auto mt-6 max-w-2xl p-6 text-center">
      <p className="display text-2xl">Save what you discovered?</p>
      <p className="mt-2 text-sm text-muted">Journey can document your answers to &ldquo;{mod.title}&rdquo; from this conversation. You&rsquo;ll review and correct them before anything is saved. Uses one Journey message; the conversation itself is not stored unless you chose to save transcripts.</p>
      <button type="button" onClick={prepare} disabled={busy} className="btn btn-gold mt-4">{busy ? "Preparing…" : "Review and save my answers"}</button>
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}

/** A live spoken session for a guided module; when it ends, the member can review and save what they discovered. */
export function GuidedVoice({ mod, ownerTest, ...studio }: { mod: GuideModule; ownerTest: boolean } & Omit<React.ComponentProps<typeof VoiceStudio>, "onEnded" | "ownerTest">) {
  const [transcript, setTranscript] = useState<string | null>(null);
  return (
    <>
      <VoiceStudio {...studio} ownerTest={ownerTest} onEnded={(t) => { if (t.includes("Member:")) setTranscript(t); }} />
      {transcript && <GuideVoiceReview mod={mod} transcript={transcript} ownerTest={ownerTest} />}
    </>
  );
}
