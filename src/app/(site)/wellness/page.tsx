import Image from "next/image";
import Link from "next/link";
import { CRISIS, IN_HOUSE_SERVICES } from "@/lib/wellness";

export const metadata = { title: "Counseling & Wellness Center", description: "Professional support for every chapter of your life. Crisis resources are always available." };

/** Public: anyone can read this and reach crisis resources, with no account, membership or payment. */
export default function WellnessPublic() {
  return (
    <div className="band theme-cream">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-14 sm:px-8">
        <section aria-labelledby="crisis" className="rounded-[24px] border border-danger/30 bg-danger/5 p-6">
          <h2 id="crisis" className="display text-2xl">If you need help right now</h2>
          <ul className="mt-3 space-y-2 text-sm">{CRISIS.map((c) => <li key={c.label}><span className="font-semibold">{c.label}:</span> {c.detail}</li>)}</ul>
          <p className="mt-3 text-xs text-muted">Always available. No account, membership or payment is ever required.</p>
        </section>
        <div className="relative aspect-[3/2] overflow-hidden rounded-[28px] shadow-xl sm:aspect-[21/9]"><Image src="/images/wellness/center.webp" alt="A couple speaking warmly with a counselor in a calm, elegant room" fill priority sizes="(min-width: 1024px) 1000px, 100vw" className="object-cover" /></div>
        <header className="text-center">
          <p className="eyebrow">The Art of Connect</p>
          <h1 className="display mt-3 text-5xl text-burgundy sm:text-6xl">Counseling &amp; Wellness Center</h1>
          <p className="display mx-auto mt-3 max-w-2xl text-2xl italic text-text/80">Professional support for every chapter of your life.</p>
          <p className="mx-auto mt-4 max-w-2xl text-text/75">Open to every member, whatever society you choose: guided personal growth with Journey, a network of verified independent counselors, and The Art of Wellness, our own counseling and professional support division.</p>
        </header>
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-[22px] border border-champagne/70 bg-ivory/70 p-7"><p className="display text-2xl text-burgundy">Journey Guided Support</p><p className="mt-2 text-sm text-text/75">Nonclinical, AI-guided personal development and reflection, included with paid memberships. Journey is not a therapist.</p></div>
          <div className="rounded-[22px] border border-champagne/70 bg-ivory/70 p-7"><p className="display text-2xl text-burgundy">Independent Professionals</p><p className="mt-2 text-sm text-text/75">Verified licensed counselors you choose by specialty, location, availability, language and price. Each sets their own fees. <span className="font-semibold">Coming soon.</span></p></div>
          <div className="rounded-[22px] border border-champagne/70 bg-ivory/70 p-7"><p className="display text-2xl text-burgundy">The Art of Wellness</p><p className="mt-2 text-sm text-text/75">{IN_HOUSE_SERVICES.slice(0, 4).join(" · ")} and more. <span className="font-semibold">Coming soon.</span></p></div>
        </section>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/sign-in?next=/app/wellness" className="btn btn-gold">Members: open the center</Link>
          <Link href="/join/free" className="btn btn-ghost">Begin free</Link>
        </div>
        <p className="text-center text-xs text-muted">Clinical services open only after all legal, licensing and privacy requirements are complete. Journey provides nonclinical guided support only.</p>
      </div>
    </div>
  );
}
