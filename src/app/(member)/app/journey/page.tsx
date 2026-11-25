import Link from "next/link";
import { getJourneyStatus } from "@/lib/journey-server";
import { JourneyChat } from "@/components/JourneyChat";
import { GoldRule, LuxCard, LuxHero, LuxSection, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "Journey" };

const EXPERIENCES = [
  { mark: "I", title: "Journey — In Business", body: "Helping business owners identify challenges, recognize opportunities, develop leadership skills and build meaningful professional relationships." },
  { mark: "II", title: "Journey — In Life", body: "Helping you explore your identity, emotional patterns, boundaries, confidence, personal purpose and next chapter." },
  { mark: "III", title: "Journey — In Love", body: "Helping singles and couples understand compatibility, communicate intentionally, navigate emotions and nurture meaningful relationships." },
  { mark: "IV", title: "Journey — Private Concierge", body: "Elevated, personalized assistance, thoughtful experiences and lifestyle planning for Executive Private and Elite Concierge members." },
];

const MORE = [
  { href: "/app/journey/voice", title: "Talk to Journey", body: "Natural spoken conversations in the voice you choose." },
  { href: "/app/journey/daily", title: "My Daily Journey", body: "Morning manifestations, affirmations, journaling and evening reflections." },
  { href: "/app/journey/library", title: "The Journey Library", body: "The ten Arts — from The Art of Self to The Art of Becoming." },
  { href: "/app/journey/sessions", title: "Journey Private Sessions", body: "Focused, structured sessions around your personal goals." },
  { href: "/app/journey/memory", title: "What Journey remembers", body: "Review, change or delete anything Journey keeps for you." },
  { href: "/app/journey/plus", title: "Journey Plus", body: "Optional additional messages and voice minutes." },
];

export default async function JourneyHome() {
  const status = await getJourneyStatus();
  const available = status.enabled && (status.access === "standard" || status.access === "enhanced" || status.access === "staff");
  const reason = status.access === "none"
    ? "Journey is a benefit of paid memberships."
    : "Journey opens soon. We'll let you know the moment your conversations can begin.";
  return (
    <>
      <LuxHero eyebrow="The Art of Connect" title="Journey" tagline="Understanding. Clarity. Connection.">
        <p className="max-w-2xl text-muted">Your personal connection concierge — a private space to be heard and a place to grow. Journey listens before advising, asks meaningful questions and helps you discover your own answers.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/app/journey/voice" className="btn btn-gold">Talk to Journey</Link>
          <a href="#chat" className="btn btn-ghost">Chat with Journey</a>
        </div>
      </LuxHero>

      <div id="chat" className="mt-10 scroll-mt-24">
        <JourneyChat allowance={status.allowance} available={available} reason={reason} />
      </div>

      <LuxSection eyebrow="Four ways Journey walks with you" title="One philosophy. Every part of your life.">
        <div className="grid gap-5 sm:grid-cols-2">
          {EXPERIENCES.map((e) => <LuxCard key={e.title} {...e} />)}
        </div>
      </LuxSection>

      <GoldRule />

      <LuxSection eyebrow="Your Journey" title="More ways to grow">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MORE.map((m) => <LuxCard key={m.href} {...m} />)}
        </div>
      </LuxSection>

      <p className="display mt-14 text-center text-2xl italic text-gold-deep">The art of being understood.</p>
      <SafetyFooter />
    </>
  );
}
