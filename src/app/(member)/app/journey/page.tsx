import Link from "next/link";
import { getJourneyStatus } from "@/lib/journey-server";
import { journeyClosedReason } from "@/lib/journey-guide-access";
import { getViewer, hasRole } from "@/lib/auth";
import { JourneyChat } from "@/components/JourneyChat";
import { GoldRule, LuxCard, LuxSection, SafetyFooter } from "@/components/Lux";
import { JourneyOrbHero } from "@/components/JourneyOrbHero";

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
  { href: "/app/journey/check-ins", title: "Check-ins", body: "Gentle follow-ups on the moments that matter — on your schedule, with quiet hours." },
  { href: "/app/journey/library", title: "The Journey Library", body: "The ten Arts — from The Art of Knowing Yourself to The Art of Becoming." },
  { href: "/app/journey/sessions", title: "Journey Private Sessions", body: "Focused, structured sessions around your personal goals." },
  { href: "/app/journey/memory", title: "What Journey remembers", body: "Review, change or delete anything Journey keeps for you." },
  { href: "/app/journey/plus", title: "Journey Plus", body: "Optional additional messages and voice minutes." },
];

export default async function JourneyHome({ searchParams }: { searchParams: Promise<{ ask?: string; lesson?: string }> }) {
  const sp = await searchParams;
  const ask = String(sp.ask ?? "").slice(0, 300);
  const lesson = /^[a-z0-9-]{2,60}(\/[a-z0-9-]{2,60})?$/.test(sp.lesson ?? "") ? sp.lesson! : null;
  const status = await getJourneyStatus();
  const viewer = await getViewer();
  const ownerTest = status.access === "staff" && hasRole(viewer, ["owner"]);
  const available = status.enabled && (status.access === "standard" || status.access === "enhanced" || ownerTest);
  const reason = await journeyClosedReason();
  return (
    <>
      <JourneyOrbHero />

      {status.access === "none" && !ownerTest && (
        <div className="mt-10 rounded-[2rem] border border-champagne/50 bg-champagne/10 p-6 sm:p-8">
          <p className="eyebrow">Journey with a membership</p>
          <h2 className="display mt-2 text-3xl">Personal conversations with Journey begin with any paid membership</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">Every lesson in The Art of Knowing Yourself stays open to you at no cost. A paid membership adds a monthly Journey allowance, and new members can try one free for 15 days.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/app/onboarding" className="btn btn-gold btn-sm">Start a trial or choose a membership</Link>
            <Link href="/membership#compare" className="btn btn-ghost btn-sm">Compare Journey allowances</Link>
            <Link href="/app/know-yourself" className="btn btn-ghost btn-sm">Continue self-guided</Link>
          </div>
        </div>
      )}
      <div id="chat" className="mt-10 scroll-mt-24">
        <JourneyChat allowance={status.allowance} available={available} reason={reason} ownerTest={ownerTest} initialText={ask} lesson={lesson} />
      </div>

      <LuxSection eyebrow="Four ways Journey walks with you" title="One philosophy. Every part of your life.">
        <div className="grid gap-5 sm:grid-cols-2">
          {EXPERIENCES.map((e) => <LuxCard key={e.title} {...e} />)}
        </div>
      </LuxSection>

      <GoldRule />

      <LuxSection eyebrow="Your Journey" title="More ways to grow">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MORE.map((m) => <LuxCard key={m.href} {...(m.href === "/app/journey/plus" && status.allowance?.unlimited ? { ...m, body: "Your text conversations are unlimited. Additional voice minutes are offered at our cost, only if you choose." } : m)} />)}
        </div>
      </LuxSection>

      <p className="display mt-14 text-center text-2xl italic text-gold-deep">The art of being understood.</p>
      <SafetyFooter />
    </>
  );
}
