"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { guideRefForPath, type GuideAccess } from "@/lib/journey-guide";

type Turn = { role: "member" | "journey"; text: string };

/**
 * The persistent Journey button on every signed-in page. Opens a private panel over the current
 * page (nothing on the page is lost) where Journey already knows where the member is.
 * Free members see the standardized explanation; no AI is ever called for them.
 */
export function JourneyCompanion({ access, avatar }: { access: GuideAccess; avatar?: string | null }) {
  const path = usePathname() ?? "/app";
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversation = useRef<string | null>(null);
  const lastPath = useRef(path);
  const end = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);

  // A new page is a new context: start a fresh conversation there.
  useEffect(() => { if (lastPath.current !== path) { lastPath.current = path; conversation.current = null; setTurns([]); setError(null); } }, [path]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [turns, busy]);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Journey's own pages already have the full conversation.
  if (path.startsWith("/app/journey")) return null;
  const ready = access.kind !== "free" && access.available;
  const ref = guideRefForPath(path);

  async function send() {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true); setError(null); setText("");
    setTurns((t) => [...t, { role: "member", text: message }]);
    const r = await fetch("/api/journey/message", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "life", message, requestKey: crypto.randomUUID().replace(/-/g, ""), conversationId: conversation.current,
        ownerTest: access.kind === "owner", ...(ref ? { guide: { ref, assist: true } } : { page: path }) }),
    }).then((x) => x.json()).catch(() => null) as { ok: boolean; reply?: string; conversationId?: string | null; message?: string } | null;
    setBusy(false);
    if (!r?.ok) { setError(r?.message ?? "Journey couldn't reply just now. Please try again."); return; }
    conversation.current = r.conversationId ?? conversation.current;
    setTurns((t) => [...t, { role: "journey", text: r.reply ?? "" }]);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full border border-gold/50 bg-espresso/95 py-1.5 pl-1.5 pr-4 text-sm text-gold-bright shadow-2xl backdrop-blur-xl transition hover:border-gold lg:bottom-6 lg:right-6">
        {avatar
          ? <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          : <span className="orb-halo block h-9 w-9 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3dfb6,#b08a4e)]" aria-hidden="true" />}
        <span>Ask Journey</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Journey" onClick={(e) => e.stopPropagation()}
            className="theme-dark flex h-full w-full max-w-md flex-col bg-ink text-ivory shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="display text-2xl text-gold-bright">Journey</p>
                <p className="text-xs text-ivory/60">{ref ? "Knows the lesson you're on" : "Here with you on this page"} · your page stays just as you left it</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-3 py-1 text-sm" aria-label="Close Journey">✕</button>
            </header>

            {!ready ? (
              <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
                {access.kind === "free" ? (
                  <>
                    <p>Journey, your AI companion, is included with every paid membership: written and live voice conversations across every lesson and feature you can access.</p>
                    <p className="text-ivory/70">Every lesson in The Art of Knowing Yourself stays open to you self-guided, at no cost.</p>
                    <Link href="/app/membership" className="btn btn-gold btn-sm">Explore memberships</Link>
                  </>
                ) : <p>{access.reason ?? "Journey opens soon."}</p>}
                <p className="text-xs text-ivory/60">If you need help right now: call 911, or call or text 988 (Suicide &amp; Crisis Lifeline).</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
                  {!turns.length && <p className="rounded-2xl bg-white/5 p-4 text-sm text-ivory/80">What can I help you with here? Ask about this page, talk something through, or ask me to guide you through a lesson.</p>}
                  {turns.map((t, i) => <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${t.role === "member" ? "ml-auto bg-burgundy" : "bg-white/10"}`}>{t.text}</div>)}
                  {busy && <p className="text-xs text-ivory/60">Journey is reflecting…</p>}
                  {error && <p className="text-sm text-danger" role="alert">{error}</p>}
                  <div ref={end} />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line p-4">
                  <label htmlFor="journey-companion" className="sr-only">Message Journey</label>
                  <textarea id="journey-companion" ref={input} value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    className="field w-full !min-h-0 !bg-white/5 !text-ivory" placeholder="Write to Journey…" />
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ivory/60">
                    <span>{access.kind === "paid" ? `Included · ${access.balance ?? `${access.credits} messages left`}` : "Owner test budget"}</span>
                    <span className="flex gap-3"><Link href={ref ? `/app/journey/voice?lesson=${encodeURIComponent(ref)}` : "/app/journey/voice"} className="text-gold">Talk instead</Link><button className="btn btn-gold btn-sm" disabled={busy || !text.trim()}>Send</button></span>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
