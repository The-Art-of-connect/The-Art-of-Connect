import { LuxCard, LuxHero, LuxSection, Notice } from "@/components/Lux";

export const metadata = { title: "Professional Therapy & Counseling Center" };

export default function Professionals() {
  return (
    <>
      <LuxHero eyebrow="The Art of Becoming · In Life" title="Professional Therapy & Counseling Center" tagline="Qualified human support, when you choose it.">
        <p className="max-w-2xl text-muted">Individual and couples sessions with licensed professionals, verified for the state where you live — scheduled, held and paid for securely in one private place.</p>
      </LuxHero>
      <LuxSection title="What to expect">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <LuxCard title="Verified professionals" body="Credentials and state licensing checked before any professional is listed." />
          <LuxCard title="Individual and couples" body="Book with the professional who fits you, at times that fit your life." />
          <LuxCard title="Secure telehealth" body="Private video sessions with clear consent and privacy controls." />
          <LuxCard title="Transparent pricing" body="Each professional sets their session price. Cancellation and refund terms are clear before you book." />
          <LuxCard title="Kept completely separate" body="Clinical records never touch dating profiles, matchmaking or company analytics." />
          <LuxCard title="Your consent first" body="Nothing from Journey is ever shared with a professional unless you authorize it." />
        </div>
      </LuxSection>
      <div className="mt-10"><Notice>This center opens only after its legal, licensing and privacy requirements are complete.</Notice></div>
    </>
  );
}
