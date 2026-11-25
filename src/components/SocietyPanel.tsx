import { ActionForm } from "@/components/admin/ActionForm";
import { changeSociety } from "@/app/actions/society";

const SOCIETIES = [
  { id: "business", title: "The Professional Society", line: "Business connections · 21+" },
  { id: "singles", title: "The Personal Society · Singles", line: "Intentional dating · 30+" },
  { id: "couples", title: "The Personal Society · Couples", line: "Growing together · both partners 21+" },
];

/** A member's primary society, with a secure way to move (e.g., from Singles to Couples) in the same account. */
export function SocietyPanel({ current }: { current: string | null }) {
  const name = SOCIETIES.find((s) => s.id === current)?.title ?? "Not chosen yet";
  return (
    <section className="glass mt-10 p-7">
      <p className="eyebrow">Your society</p>
      <h2 className="display mt-2 text-3xl">{name}</h2>
      <p className="mt-2 text-sm text-muted">Life changes. If you&rsquo;ve entered a committed relationship, or your goals have shifted, you can move to another society in this same account. Your Art of Self history, Personal Discovery Portfolio and private reflections always stay with you.</p>
      <ActionForm action={changeSociety} className="mt-5 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {SOCIETIES.filter((s) => s.id !== current).map((s) => (
            <label key={s.id} className="cursor-pointer">
              <input type="radio" name="society" value={s.id} required className="peer sr-only" />
              <span className="block rounded-2xl border border-champagne/60 px-4 py-3 text-sm transition peer-checked:border-burgundy peer-checked:bg-champagne/25">
                <span className="block font-semibold">{s.title}</span><span className="block text-xs text-muted">{s.line}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" name="confirm" value="yes" required className="mt-0.5" />
          I understand my free society access will move to my new choice. Moving to Couples removes me from singles matchmaking. Paid memberships aren&rsquo;t changed here.
        </label>
        <button className="btn btn-ghost btn-sm">Change my society</button>
      </ActionForm>
    </section>
  );
}
