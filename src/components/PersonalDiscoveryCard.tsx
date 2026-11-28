import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { createJourneyDiscovery } from "@/app/actions/personal-discovery";
import { DISCOVERY_CLOSING, type PersonalDiscovery } from "@/lib/personal-discovery";

type JourneyOption =
  | { kind: "member"; credits: number; balance?: string | null; enabled: boolean }
  | { kind: "staff"; enabled: boolean }
  | { kind: "none" };

type Block = { title: string; paras: string[] };
const TITLES: { key: keyof PersonalDiscovery; title: string }[] = [
  { key: "discovered", title: "What You Discovered About Yourself" },
  { key: "qualities", title: "Your Personal Strengths" },
  { key: "growth", title: "Areas for Personal Development" },
  { key: "forward", title: "Moving Forward" },
];
/** Converts a Who Am I? reflection into display blocks. */
export const discoveryBlocks = (pd: PersonalDiscovery): Block[] => TITLES.map((t) => ({ title: t.title, paras: pd[t.key] }));

/** The end-of-section written analysis, self-guided or written with Journey. Private to the member. */
export function PersonalDiscoveryCard({ slug, sections, fromJourney, journeyWritten, option, action = createJourneyDiscovery, field = "module", consent = "this chapter\u2019s answers", title = "Your Personal Discovery", closing = DISCOVERY_CLOSING, selfLine = "Composed from your own answers, with no AI and no credits. Update your answers anytime and your reflection grows with you." }: {
  slug: string;
  sections: Block[];
  fromJourney: boolean;
  action?: (p: import("@/app/actions/admin").ActionResult, f: FormData) => Promise<import("@/app/actions/admin").ActionResult>;
  field?: string;
  consent?: string;
  title?: string;
  closing?: string;
  selfLine?: string;
  journeyWritten: string | null;
  option: JourneyOption;
}) {
  const journey = fromJourney;
  return (
    <section id="personal-discovery" aria-labelledby="pd-title" className="tile-in mt-10 scroll-mt-24">
      <div className="theme-ivory mx-auto max-w-3xl rounded-[28px] border border-champagne bg-ivory px-6 py-10 shadow-xl sm:px-12">
        <p className="text-center text-xs tracking-[0.25em] uppercase text-gold-deep">The Art of Connect</p>
        <h2 id="pd-title" className="display mt-3 text-center text-4xl text-burgundy sm:text-5xl">{title}</h2>
        <p className="mt-2 text-center italic text-gold-deep">Understanding the person within.</p>
        <p className="mt-3 text-center text-xs text-muted">
          {journey ? <>Written with Journey{journeyWritten && ` on ${journeyWritten}`} · </> : <>A reflection drawn from your own words · </>}
          Private to you
        </p>
        <div className="mx-auto mt-6 h-px w-full bg-champagne" />
        {sections.map((s) => (
          <div key={s.title} className="mt-7">
            <h3 className="display text-2xl text-burgundy">{s.title}</h3>
            {s.paras.map((p, i) => <p key={i} className="mt-3 leading-relaxed text-text">{p}</p>)}
          </div>
        ))}
        <div className="mx-auto mt-8 h-px w-full bg-champagne" />
        <p className="display mt-6 text-center text-xl italic text-burgundy">{closing}</p>
        <p className="mt-6 text-center text-xs text-muted">A reflection for your growth, not a diagnosis or a label. Take what resonates and leave the rest.</p>
      </div>

      <div className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="glass p-6">
          <p className="eyebrow">Self-guided</p>
          <p className="display mt-2 text-2xl">{journey ? "Your reflection" : "Included for everyone"}</p>
          <p className="mt-2 text-sm text-muted">{selfLine}</p>
        </div>
        <div className="theme-dark relative overflow-hidden rounded-[24px] bg-ink p-6 text-ivory">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.35),transparent_70%)]" aria-hidden="true" />
          <p className="eyebrow relative">With Journey</p>
          <p className="display relative mt-2 text-2xl text-gold-bright">{journey ? "Ask Journey again" : "A deeper personal analysis"}</p>
          {option.kind === "none" ? (
            <>
              <p className="relative mt-2 text-sm text-muted">Journey can read your answers with you and write a deeper, individualized analysis. Journey is included with paid memberships.</p>
              <Link href="/membership" className="btn btn-gold btn-sm relative mt-4">Explore memberships</Link>
            </>
          ) : !option.enabled ? (
            <p className="relative mt-2 text-sm text-muted">Journey is resting right now. Your self-guided reflection is always here for you.</p>
          ) : option.kind === "member" && option.credits < 1 ? (
            <>
              <p className="relative mt-2 text-sm text-muted">You&rsquo;ve used this month&rsquo;s included Journey allowance. Your self-guided analysis is always here, and your allowance renews with your membership. If you&rsquo;d like to continue with Journey sooner, you may add more.</p>
              <Link href="/app/journey/plus" className="btn btn-gold btn-sm relative mt-4">Journey Plus (optional)</Link>
            </>
          ) : (
            <ActionForm action={action} className="relative mt-3 space-y-3">
              <input type="hidden" name={field} value={slug} />
              <p className="text-sm text-muted">
                {option.kind === "member" ? (option.balance ? <>Included in your membership ({option.balance}). It is used only when Journey writes your analysis.</> : <>Included in your membership. This uses 1 of your <span className="font-semibold text-gold-bright">{option.credits}</span> remaining monthly messages, only when Journey writes your analysis.</>) : "Owner test: uses your private test budget."}
              </p>
              <label className="flex items-start gap-2 text-xs text-ivory/85">
                <input type="checkbox" name="consent" value="yes" required className="mt-0.5" />
                I&rsquo;m happy for Journey to read {consent}. They stay private to me.
              </label>
              <button className="btn btn-gold btn-sm">Create my analysis with Journey</button>
            </ActionForm>
          )}
        </div>
      </div>
    </section>
  );
}
