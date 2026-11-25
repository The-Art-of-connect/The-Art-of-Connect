import { PillChoice } from "@/components/JourneyPickers";
import { LuxCard, LuxHero, LuxSection, Notice, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "My Daily Journey" };

const DAY = [
  { mark: "☼", title: "Morning manifestation", body: "Begin your day with clarity, purpose and intention.", sample: "Today I move toward the life I'm building — one intentional choice at a time." },
  { mark: "✦", title: "Daily affirmation", body: "A grounding statement, shaped by the approach you choose.", sample: "I am worthy of the love and respect I give to others." },
  { mark: "◎", title: "Daily intention", body: "One clear, realistic action that connects today to your goals.", sample: "I will have one honest conversation instead of avoiding it." },
  { mark: "❖", title: "Mindset & consciousness", body: "Explore your beliefs, thought patterns and personal awareness." },
  { mark: "♡", title: "Emotional growth", body: "Understand your emotions and develop healthier responses." },
  { mark: "✧", title: "Personal awareness exercise", body: "A short guided practice to notice what you feel, need and want." },
  { mark: "✎", title: "Guided journaling", body: "Thoughtful prompts in your private journal — visible only to you." },
  { mark: "☾", title: "Evening reflection", body: "Release the day and reconnect with your intentions." },
];

const GROWTH = [
  { title: "Personal goal tracking", body: "Set meaningful goals, break them into steps, and see your progress." },
  { title: "Weekly growth reflection", body: "Each week, look back at what moved you forward and what you learned." },
  { title: "Milestone recognition", body: "Journey celebrates your growth — never by encouraging dependency." },
];

export default function DailyJourney() {
  return (
    <>
      <LuxHero eyebrow="My Journey" title="Your daily journey" tagline="Become. Believe. Connect. Thrive.">
        <div className="max-w-2xl">
          <PillChoice label="Your approach" options={["Spiritual", "Secular", "Practical", "A blend of each"]} />
          <p className="mt-4 text-sm text-muted">Journey honors your beliefs and never imposes one. Manifestations and affirmations are always tied to realistic goals and intentional actions — no outcome is ever promised.</p>
        </div>
      </LuxHero>
      <LuxSection eyebrow="Every day" title="From morning to evening">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DAY.map((d) => (
            <LuxCard key={d.title} mark={d.mark} title={d.title} body={d.body}>
              {d.sample && <p className="display border-l-2 border-gold/50 pl-3 text-lg italic text-gold-deep">{d.sample}</p>}
            </LuxCard>
          ))}
        </div>
      </LuxSection>
      <LuxSection eyebrow="Over time" title="See how far you've come">
        <div className="grid gap-5 sm:grid-cols-3">{GROWTH.map((g) => <LuxCard key={g.title} {...g} dark />)}</div>
      </LuxSection>
      <div className="mt-10"><Notice>Your daily experiences are personalized from what you&rsquo;ve chosen to share, and they always stay within your membership&rsquo;s Journey allowance.</Notice></div>
      <SafetyFooter />
    </>
  );
}
