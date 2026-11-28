import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { loadAnswers } from "@/lib/onboarding-server";
import { DEFAULT_REGISTRY, stageProgress } from "@/lib/onboarding";
import { LuxCard, LuxSection, Notice, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "Your Relationship Readiness Profile" };

/**
 * Directive 51 clarification 2 (assessment integrity): no fabricated, simulated or placeholder results. Until the readiness
 * methodology is professionally reviewed and approved by the founder, the profile is clearly unavailable. The member's own
 * answers are kept, so their results can be prepared from what they actually said once the methodology is approved.
 */
export default async function Readiness() {
  const { viewer } = await requireExperience("relationships");
  const answers = await loadAnswers(viewer.id);
  const done = stageProgress(DEFAULT_REGISTRY, "readiness", { track: "single", answers }).complete;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-[2rem] border border-gold/30 p-7 sm:p-10" style={{ background: "var(--cream)" }}>
        <p className="text-xs tracking-[0.25em] text-gold-deep uppercase">Your private discovery report</p>
        <h1 className="display mt-3 text-5xl" style={{ color: "var(--burgundy)" }}>Understanding You</h1>
        <p role="status" className="mt-6 rounded-2xl border border-gold/40 bg-white/60 p-5 text-base">
          <span className="block font-semibold">Readiness results aren&rsquo;t available yet.</span>
          <span className="mt-1 block text-muted">We only share results that come from your own answers and a professionally reviewed way of interpreting them. That review isn&rsquo;t finished, so we show nothing rather than something misleading.</span>
        </p>
        <p className="mt-5 text-sm text-muted">
          {done
            ? "Your reflection is complete and saved privately. Your profile will be prepared from your own answers once the approach is approved, and we'll let you know in your Message Center."
            : "You can still complete your Emotional & Relationship Readiness reflection now. Your answers are saved privately for when results become available."}
        </p>
      </div>
      <LuxSection title="What this profile will be, and won't">
        <div className="grid gap-5 sm:grid-cols-2">
          <LuxCard title="Educational, not clinical" body="A reflection tool. It never diagnoses you or labels you with a condition." />
          <LuxCard title="Never held against you" body="Your reflection, seeking counseling or sharing a health condition never affect your matchmaking." />
          <LuxCard title="Yours alone" body="Your answers are private. Matches, partners and our team can't read them." />
          <LuxCard title="Only real findings" body="Nothing is estimated or invented, by us or by Journey." />
        </div>
      </LuxSection>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app/relationships/onboarding/readiness" className="btn btn-gold">{done ? "Review my reflection" : "Complete my reflection"}</Link>
        <Link href="/app/know-yourself" className="btn btn-ghost">Continue The Art of Knowing Yourself</Link>
      </div>
      <div className="mt-8"><Notice>Safety decisions are always made by trained people and are kept separate from any reflection.</Notice></div>
      <SafetyFooter />
    </div>
  );
}
