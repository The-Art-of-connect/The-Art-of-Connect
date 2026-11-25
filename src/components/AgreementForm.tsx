"use client";
import Link from "next/link";
import { useActionState } from "react";
import { acceptUpdatedAgreements } from "@/app/actions/legal";

/**
 * Affirmative acceptance of agreements that are new or updated since the
 * member last accepted. Nothing is pre-selected; the exact wording is stored.
 */
export function AgreementForm({ docs, next = "/app" }: { docs: { slug: string; title: string; version: string; reason: string }[]; next?: string }) {
  const [state, action, pending] = useActionState(acceptUpdatedAgreements, null);
  const titles = docs.map((d) => d.title);
  const statement = `I have read and agree to the ${titles.length > 1 ? `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}` : titles[0]}.`;
  return (
    <form action={action} className="space-y-4">
      {docs.map((d) => <input key={d.slug} type="hidden" name="doc" value={d.slug} />)}
      <input type="hidden" name="statement" value={statement} />
      <input type="hidden" name="next" value={next} />
      <ul className="space-y-2 text-sm">
        {docs.map((d) => (
          <li key={d.slug} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line px-4 py-3">
            <Link href={`/legal/${d.slug}`} target="_blank" className="font-semibold text-gold underline">{d.title}</Link>
            <span className="text-xs text-muted">{d.reason === "updated" ? "Updated" : "New"} · version {d.version}</span>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--champagne)]" />
        <span>{statement}</span>
      </label>
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Agree and continue"}</button>
    </form>
  );
}
