import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { createJourneyDiscovery } from "@/app/actions/personal-discovery";
import { DISCOVERY_CLOSING, type PersonalDiscovery } from "@/lib/personal-discovery";

type JourneyOption =
  | { kind: "member"; credits: number; enabled: boolean }
  | { kind: "staff"; enabled: boolean }
  | { kind: "none" };

const SECTIONS: { key: keyof PersonalDiscovery; title: string }[] = [
  { key: "discovered", title: "What You’ve Discovered About Yourself" },
  { key: "qualities", title: "Your Beautiful Qualities" },
  { key: "growth", title: "Opportunities for Personal Growth" },
  { key: "forward", title: "Moving Forward" },
];

/** "Your Personal Discovery": the end-of-chapter reflection, self-guided or written with Journey. Private to the member. */
export function PersonalDiscoveryCard({ slug, reflection, journey, journeyWritten, option }: {
  slug: string;
  reflection: PersonalDiscovery;
  journey: PersonalDiscovery | null;
  journeyWritten: string | null;
  option: JourneyOption;
}) {
  const shown = journey ?? reflection;
  return (
    <section id="personal-discovery" aria-labelledby="pd-title" className="tile-in mt-10 scroll-mt-24">
      <div className="theme-ivory mx-auto max-w-3xl rounded-[28px] border border-champagne bg-ivory px-6 py-10 shadow-xl sm:px-12">
        <p className="text-center text-xs tracking-[0.25em] uppercase text-gold-deep">The Art of Connect</p>
        <h2 id="pd-title" className="display mt-3 text-center text-4xl text-burgundy sm:text-5xl">Your Personal Discovery</h2>
        <p className="mt-2 text-center italic text-gold-deep">Understanding the person within.</p>
        <p className="mt-3 text-center text-xs text-muted">
          {journey ? <>Written with Journey{journeyWritten && ` on ${journeyWritten}`} · </> : <>A reflection drawn from your own words · </>}
          Private to you
        </p>
        <div className="mx-auto mt-6 h-px w-full bg-champagne" />
        {SECTIONS.map((s) => (
          <div key={s.key} className="mt-7">
            <h3 className="display text-2xl text-burgundy">{s.title}</h3>
            {shown[s.key].map((p, i) => <p key={i} className="mt-3 leading-relaxed text-text">{p}</p>)}
          </div>
        ))}
        <div className="mx-auto mt-8 h-px w-full bg-champagne" />
        <p className="display mt-6 text-center text-xl italic text-burgundy">{DISCOVERY_CLOSING}</p>
        <p className="mt-6 text-center text-xs text-muted">A reflection for your growth, not a diagnosis or a label. Take what resonates and leave the rest.</p>
      </div>

      <div className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="glass p-6">
          <p className="eyebrow">Self-guided</p>
          <p className="display mt-2 text-2xl">{journey ? "Your reflection" : "Included for everyone"}</p>
          <p className="mt-2 text-sm text-muted">Composed from your own answers, with no AI and no credits. Update your answers anytime and your reflection grows with you.</p>
        </div>
        <div className="theme-dark relative overflow-hidden rounded-[24px] bg-ink p-6 text-ivory">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgb(240_200_140/0.35),transparent_70%)]" aria-hidden="true" />
          <p className="eyebrow relative">With Journey</p>
          <p className="display relative mt-2 text-2xl text-gold-bright">{journey ? "Ask Journey again" : "A deeper personal analysis"}</p>
          {option.kind === "none" ? (
            <>
              <p className="relative mt-2 text-sm text-muted">Journey can read this chapter with you and write a personal analysis. Journey is included with paid memberships.</p>
              <Link href="/membership" className="btn btn-gold btn-sm relative mt-4">Explore memberships</Link>
            </>
          ) : !option.enabled ? (
            <p className="relative mt-2 text-sm text-muted">Journey is resting right now. Your self-guided reflection is always here for you.</p>
          ) : option.kind === "member" && option.credits < 1 ? (
            <>
              <p className="relative mt-2 text-sm text-muted">You&rsquo;ve used this month&rsquo;s Journey credits. Continue self-guided at no cost, or add more credits.</p>
              <Link href="/app/journey/plus" className="btn btn-gold btn-sm relative mt-4">Add Journey credits</Link>
            </>
          ) : (
            <ActionForm action={createJourneyDiscovery} className="relative mt-3 space-y-3">
              <input type="hidden" name="module" value={slug} />
              <p className="text-sm text-muted">
                {option.kind === "member" ? <>You have <span className="font-semibold text-gold-bright">{option.credits}</span> credits. This uses 1 credit, only when Journey writes your analysis.</> : "Owner test: uses your private test budget."}
              </p>
              <label className="flex items-start gap-2 text-xs text-ivory/85">
                <input type="checkbox" name="consent" value="yes" required className="mt-0.5" />
                I&rsquo;m happy for Journey to read my answers to this chapter. They stay private to me.
              </label>
              <button className="btn btn-gold btn-sm">Create my analysis with Journey</button>
            </ActionForm>
          )}
        </div>
      </div>
    </section>
  );
}
