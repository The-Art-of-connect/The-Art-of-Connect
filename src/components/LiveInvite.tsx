"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { brandName } from "@/lib/brand";

type Invitation = { notice_id: string; session_id: string; topic_id: string; title: string; prompt: string; host: string; ends_at: string };

/**
 * Live Q&A invitation (founder directive 43, founder's design). Shown once per session, only while it is live, only to
 * members who allow pop-ups. "Maybe later" keeps the invitation in the Message Center. Joining a new session never
 * disconnects anyone from a session they are already in.
 */
export function LiveInvite() {
  const [inv, setInv] = useState<Invitation | null>(null);
  const router = useRouter();
  const joinRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let stop = false;
    const check = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/live/invitation", { cache: "no-store" });
        const d = (await r.json()) as { invitation: Invitation | null };
        if (!stop && d.invitation) setInv(d.invitation);
      } catch { /* quietly try again later */ }
    };
    void check();
    const t = setInterval(check, 120_000);
    return () => { stop = true; clearInterval(t); };
  }, []);
  useEffect(() => {
    if (!inv) return;
    joinRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!inv) return null;
  const seen = () => fetch("/api/live/invitation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: inv.notice_id }) }).catch(() => {});
  function close() { void seen(); setInv(null); }
  const join = () => { void seen(); const id = inv!.topic_id; setInv(null); router.push(`/app/circle/${id}?live=1`); };
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="live-title" onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[2rem] border-[10px] border-[#d9cfc0] bg-[#f5f0e6] px-7 pb-6 pt-8 text-center text-[#2b231c] shadow-2xl">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-[#6f5f4e] hover:bg-black/5">×</button>
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" className="mx-auto text-[#a88b55]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="9" r="1.6" /><path d="M8.2 5.6a5 5 0 0 0 0 6.8M15.8 5.6a5 5 0 0 1 0 6.8M5.6 3.2a8.5 8.5 0 0 0 0 11.6M18.4 3.2a8.5 8.5 0 0 1 0 11.6M12 10.6 9 20M12 10.6l3 9.4M10 17h4" />
        </svg>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#9c7f4b]">{brandName("brand")}</p>
        <p className="mx-auto mt-3 inline-block rounded-full bg-[#f3d4d0] px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#b3261e]">Live now</p>
        <h2 id="live-title" className="display mt-3 text-3xl">{brandName("becoming-circle")}</h2>
        <p className="mt-2 text-xl font-semibold text-[#8a6a3d]">{inv.title}</p>
        <p className="mt-3 text-[0.95rem] text-[#6f5f4e]">Join today&rsquo;s live Q&amp;A. Ask questions, share your perspective or simply listen.</p>
        <p className="mt-1 text-xs text-[#8a7b6a]">Hosted by {inv.host}</p>
        <ul className="mt-5 space-y-3 border-t border-[#d9cbb3] pt-5 text-left text-[0.95rem]">
          <li className="flex gap-3"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#a88b55" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 5h11v8H8l-3 3v-3H3zM14 9h7v8h-2v3l-3-3h-5v-3" /></svg>Live questions and open discussion</li>
          <li className="flex gap-3"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#a88b55" strokeWidth="1.6" strokeLinecap="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z" /></svg>Participate or listen privately</li>
        </ul>
        <button ref={joinRef} type="button" onClick={join} className="mt-5 w-full rounded-2xl bg-[#b89b6a] px-5 py-4 text-base font-semibold text-[#2b231c] hover:bg-[#a88b55]">Join Live Q&amp;A</button>
        <button type="button" onClick={close} className="mt-2 py-2 text-sm text-[#8a7b6a]">Maybe later</button>
      </div>
    </div>
  );
}
