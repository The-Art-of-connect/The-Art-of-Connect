import { LuxCard, LuxHero, LuxSection, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "The Journey Library" };

const ARTS = [
  ["The Art of Self", "Knowing who you are beyond your roles, responsibilities and relationships."],
  ["The Art of Consciousness", "Noticing your thoughts, beliefs and patterns with curiosity instead of judgment."],
  ["The Art of Healing", "Making peace with your past at your own pace, with compassion and support."],
  ["The Art of Boundaries", "Protecting your energy, honoring others and communicating limits with grace."],
  ["The Art of Manifestation", "Turning intention into aligned, realistic action — without promises of guaranteed outcomes."],
  ["The Art of Emotional Awareness", "Naming what you feel, understanding why, and choosing how to respond."],
  ["The Art of Abundance", "Gratitude, generosity and a healthy relationship with growth and prosperity."],
  ["The Art of Love", "Giving and receiving love intentionally — with yourself, partners, family and friends."],
  ["The Art of Letting Go", "Releasing what no longer serves you so there is room for what will."],
  ["The Art of Becoming", "Stepping into your next chapter with courage, clarity and purpose."],
];

export default function Library() {
  return (
    <>
      <LuxHero eyebrow="Journey" title="The Journey Library" tagline="The ten Arts of a connected life.">
        <p className="max-w-2xl text-muted">Educational modules, guided exercises, reflection questions and affirmations — created and approved by The Art of Connect, reviewed with qualified professionals, and woven into every Journey conversation.</p>
      </LuxHero>
      <LuxSection title="Choose an Art to explore">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ARTS.map(([title, body], i) => (
            <LuxCard key={title} mark={["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][i]} title={title} body={body} badge="Modules coming soon" />
          ))}
        </div>
      </LuxSection>
      <SafetyFooter />
    </>
  );
}
