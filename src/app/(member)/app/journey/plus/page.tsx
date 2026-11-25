import { LuxCard, LuxHero, LuxSection, Notice } from "@/components/Lux";

export const metadata = { title: "Journey Plus" };

export default function Plus() {
  return (
    <>
      <LuxHero eyebrow="Journey" title="Journey Plus" tagline="More conversation, only when you choose.">
        <p className="max-w-2xl text-muted">Your membership includes a generous monthly Journey allowance. If you&rsquo;d like more, add a message or voice package — on your terms.</p>
      </LuxHero>
      <LuxSection title="Message packages">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[25, 50, 100, 250].map((n) => <LuxCard key={n} mark={String(n)} title={`${n} messages`} body="Used after your monthly allowance." badge="Pricing announced soon" />)}
        </div>
      </LuxSection>
      <LuxSection title="Voice minutes">
        <div className="grid gap-5 sm:grid-cols-2"><LuxCard title="Voice minute packages" body="Additional minutes for Talk to Journey." badge="Coming soon" /></div>
      </LuxSection>
      <LuxSection title="Auto-Reload" intro="Off unless you turn it on.">
        <div className="glass p-6 text-sm text-muted">
          <ul className="space-y-2">
            <li>You choose the package and a monthly spending limit before anything is charged.</li>
            <li>Every reload is confirmed by email with the exact amount.</li>
            <li>Turn it off anytime in one tap.</li>
          </ul>
        </div>
      </LuxSection>
      <div className="mt-10"><Notice>Nothing is ever purchased automatically unless you turn on Auto-Reload. Allowance limits are always shown before you buy, and included monthly messages don&rsquo;t roll over.</Notice></div>
    </>
  );
}
