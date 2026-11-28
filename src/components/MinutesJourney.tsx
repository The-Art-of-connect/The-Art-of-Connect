"use client";
import { useActionState } from "react";
import { journeyDraft } from "@/app/actions/meetings";

/** "Ask Journey to organize my notes" (directive 48). Journey only organizes what the host wrote; the host reviews everything. */
export function MinutesJourney({ meeting, room, title }: { meeting: string; room: string; title: string }) {
  const [state, action, pending] = useActionState(journeyDraft, null);
  return (
    <div className="rounded-2xl border border-line p-4">
      <form action={action} className="space-y-2">
        <input type="hidden" name="meeting" value={meeting} /><input type="hidden" name="room" value={room} /><input type="hidden" name="title" value={title} />
        <label className="block text-sm font-semibold" htmlFor="journey-notes">Your notes</label>
        <textarea id="journey-notes" name="notes" rows={6} maxLength={12000} className="field" placeholder="Type or paste your own meeting notes. Journey organizes them; it never invents decisions, amounts or deadlines." />
        <button className="btn btn-ghost btn-sm" disabled={pending}>{pending ? "Journey is organizing…" : "Ask Journey to organize my notes"}</button>
      </form>
      {state && <p className={`mt-2 text-sm ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>}
      {state?.draft && (
        <div className="mt-3">
          <p className="text-xs text-muted">Draft only, not saved. Copy what is accurate into the sections below, then save.</p>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-gold/5 p-3 font-serif text-sm">{state.draft}</pre>
        </div>
      )}
    </div>
  );
}
