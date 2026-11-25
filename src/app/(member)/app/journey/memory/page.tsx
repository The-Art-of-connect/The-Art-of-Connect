import { LuxHero, LuxSection, Notice, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "What Journey remembers" };

const KINDS = [
  ["Goals and aspirations", "What you're working toward, so Journey can follow up thoughtfully."],
  ["Preferences", "Your approach (spiritual, secular, practical), preferred voice and communication style."],
  ["Milestones", "Moments of growth you'd like Journey to recognize."],
  ["Personal development progress", "Where you are in the Arts and exercises you've completed."],
  ["Relevant conversation highlights", "Only what you approve — never your full conversations."],
];

export default function Memory() {
  return (
    <>
      <LuxHero eyebrow="Journey" title="What Journey remembers" tagline="Continuity, with your permission.">
        <p className="max-w-2xl text-muted">Journey can remember what you choose, so each conversation builds on the last. You decide what is kept, and you can review, change or delete it at any time.</p>
      </LuxHero>
      <LuxSection title="Your memory settings">
        <div className="glass divide-y divide-line">
          <div className="flex items-center justify-between gap-4 p-5">
            <span><span className="block font-semibold">Personal memory</span><span className="block text-sm text-muted">Off until you turn it on.</span></span>
            <span className="chip">Off</span>
          </div>
          {KINDS.map(([t, b]) => (
            <div key={t} className="flex items-center justify-between gap-4 p-5">
              <span><span className="block font-semibold">{t}</span><span className="block text-sm text-muted">{b}</span></span>
              <span className="text-xs text-faint">Nothing saved</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-ghost" disabled>Review everything Journey remembers</button>
          <button className="btn btn-ghost" disabled>Delete all memory</button>
        </div>
      </LuxSection>
      <div className="mt-10"><Notice>Journey never shares what it remembers with another member — not even your partner — without your consent, and never uses anyone else&rsquo;s private information to advise you.</Notice></div>
      <SafetyFooter />
    </>
  );
}
