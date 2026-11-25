import { LuxCard, LuxHero, LuxSection, Notice, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "Journey Private Sessions" };

const SESSIONS = [
  { mark: "15", title: "Clarity Session", body: "A focused 15 minutes to untangle one question and leave with a clear next step." },
  { mark: "30", title: "Discovery Session", body: "30 minutes to explore a pattern, a decision or a relationship more deeply." },
  { mark: "45", title: "Personal Growth Session", body: "45 minutes of guided reflection around a goal that matters to you." },
  { mark: "60", title: "Transformation & Goal-Setting", body: "A full hour to define where you're going and build a realistic plan to get there." },
];

export default function Sessions() {
  return (
    <>
      <LuxHero eyebrow="Journey" title="Private Sessions" tagline="Focused. Structured. Entirely yours." tone="burgundy">
        <p className="max-w-2xl text-muted">Purchased separately and guided by Journey in writing or by voice. Each session has a clear objective, a guided conversation, time to reflect, practical next steps and an optional private summary.</p>
      </LuxHero>
      <LuxSection title="Choose your session">
        <div className="grid gap-5 sm:grid-cols-2">
          {SESSIONS.map((s) => (
            <LuxCard key={s.title} mark={s.mark} title={s.title} body={s.body} badge="Pricing announced soon">
              <p className="text-xs text-faint">minutes · text or voice</p>
            </LuxCard>
          ))}
        </div>
      </LuxSection>
      <div className="mt-10 space-y-3">
        <Notice>You authorize each payment before a session begins. Sessions end at their time limit and are never extended or charged again without your permission.</Notice>
        <Notice>Journey Private Sessions are AI-guided personal development. They are not therapy, psychotherapy, diagnosis or treatment. If you&rsquo;d like support from a qualified professional, Journey can help you explore that option.</Notice>
      </div>
      <SafetyFooter />
    </>
  );
}
