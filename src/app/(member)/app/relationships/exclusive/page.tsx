import { requireExperience } from "@/lib/auth";
import { LuxCard, LuxHero, LuxSection, Notice } from "@/components/Lux";

export const metadata = { title: "The Exclusive Connection" };

const AFTER = [
  "Both of your profiles are paused from new matchmaking and introductions.",
  "Other dating conversations close respectfully. History and safety reporting stay available.",
  "Other connections receive a discreet note that you're no longer available — your partner is never named.",
  "Where available, they're offered other compatible introductions.",
  "You open a shared relationship space, first-date planning and activities together.",
  "The Couples Experience is offered as an optional upgrade — never charged automatically.",
];

export default async function Exclusive() {
  await requireExperience("relationships");
  return (
    <>
      <LuxHero eyebrow="The Personal Society" title="The Exclusive Connection" tagline="Is this your person?" tone="burgundy">
        <p className="max-w-2xl text-muted">You&rsquo;ve developed a meaningful connection. When you&rsquo;re ready to explore it exclusively, invite them to focus on each other.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-gold" disabled>I&rsquo;m ready to focus on this connection</button>
          <button className="btn btn-ghost" disabled>I&rsquo;m still exploring</button>
        </div>
      </LuxHero>
      <LuxSection title="How it works">
        <div className="grid gap-5 sm:grid-cols-3">
          <LuxCard mark="1" title="You invite" body="Nothing changes for either of you when one person asks. Your conversations and introductions continue." />
          <LuxCard mark="2" title="They choose freely" body="Your connection accepts or declines privately, on their own time. Both of you must say yes." />
          <LuxCard mark="3" title="A new chapter" body="Once you both accept, your private space together opens." />
        </div>
      </LuxSection>
      <LuxSection title="Once you both accept">
        <ul className="glass divide-y divide-line">{AFTER.map((a) => <li key={a} className="px-6 py-4 text-sm">{a}</li>)}</ul>
      </LuxSection>
      <div className="mt-10"><Notice>Either of you can step back from exclusivity, unlink or report a concern at any time, without the other&rsquo;s permission. Your profile doesn&rsquo;t reappear in matchmaking until you choose to reactivate it.</Notice></div>
    </>
  );
}
