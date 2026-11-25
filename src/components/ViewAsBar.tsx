import { PERSONAS } from "@/lib/view-as";
import { setViewAs } from "@/app/actions/view-as";

/** Owner-only bar: choose which membership to experience the site as. */
export function ViewAsBar({ current, next = "/app" }: { current: string | null | undefined; next?: string }) {
  return (
    <form action={setViewAs} className="no-print border-b border-gold/30 bg-burgundy/95 px-4 py-2 text-ivory">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
        <span className="font-semibold tracking-wide">{current ? "Viewing as:" : "Owner view ·"}</span>
        <input type="hidden" name="next" value={next} />
        <select name="persona" defaultValue={current ?? ""} aria-label="View the site as" className="rounded-full border border-champagne/50 bg-espresso px-3 py-1 text-ivory">
          <option value="">My owner view (everything)</option>
          {Object.entries(PERSONAS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
        </select>
        <button className="rounded-full bg-champagne px-3 py-1 font-semibold text-espresso">{current ? "Switch" : "View as"}</button>
        {current && <span className="hidden text-ivory/80 md:inline">You see exactly what this membership sees. Journey uses your private test budget.</span>}
      </div>
    </form>
  );
}
