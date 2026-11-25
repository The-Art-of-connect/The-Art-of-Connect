"use client";
import { useActionState, useState } from "react";
import { deleteJournalEntry, saveJournalEntry } from "@/app/actions/journal";

const PROMPTS = [
  "What am I feeling right now, and what might it be telling me?",
  "What did I do today that the person I'm becoming would be proud of?",
  "What am I ready to let go of?",
  "Where did I honor my boundaries this week — and where did I abandon them?",
  "What do I need more of, and how can I give it to myself?",
];
const MOODS = ["Grateful", "Peaceful", "Hopeful", "Reflective", "Tender", "Unsettled", "Heavy"];

export function JournalForm() {
  const [state, action, pending] = useActionState(saveJournalEntry, null);
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  return (
    <form action={action} className="theme-dark rounded-[1.75rem] p-6 sm:p-8" style={{ background: "var(--ink)" }}>
      <p className="eyebrow">Today&rsquo;s reflection</p>
      <p className="display mt-3 text-3xl text-gold-bright">{prompt}</p>
      <button type="button" onClick={() => setPrompt(PROMPTS[(PROMPTS.indexOf(prompt) + 1) % PROMPTS.length])} className="mt-2 text-sm text-gold underline-offset-2 hover:underline">Another prompt</button>
      <input name="title" maxLength={120} placeholder="Title (optional)" className="field mt-6 w-full" />
      <textarea name="body" required rows={8} maxLength={20000} placeholder="Write freely. Only you will ever read this." className="field mt-3 w-full" />
      <fieldset className="mt-4">
        <legend className="text-xs tracking-[0.25em] text-gold uppercase">How are you feeling?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <label key={m} className="cursor-pointer rounded-full border border-line-strong px-3 py-1.5 text-sm text-muted has-[:checked]:border-gold has-[:checked]:bg-gold has-[:checked]:text-espresso">
              <input type="radio" name="mood" value={m} className="sr-only" />{m}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn-gold mt-6 w-full sm:w-auto" disabled={pending}>{pending ? "Saving…" : "Save to my journal"}</button>
      {state && <p className={`mt-2 text-sm ${state.ok ? "text-success" : "text-danger"}`} role="status">{state.message}</p>}
    </form>
  );
}

export function DeleteEntry({ id }: { id: string }) {
  const [, action, pending] = useActionState(deleteJournalEntry, null);
  return <form action={action}><input type="hidden" name="id" value={id} /><button className="text-xs text-gold-deep underline" disabled={pending}>Delete</button></form>;
}
