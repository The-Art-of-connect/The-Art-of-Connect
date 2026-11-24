import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";

export const metadata: Metadata = { title: "Counseling", description: "Confidential access to verified counselors, and a professional home for providers." };

export default function CounselingPage() {
  return (
    <ExperiencePage
      experience="counseling"
      headline={<>Guidance, <span className="italic text-counseling">in confidence.</span></>}
      intro="Find a credential-verified counselor for yourself, your relationship or your leadership. Counseling is sealed off from every other part of the platform — your privacy is the foundation, not a feature."
      features={[
        { title: "Verified counselors", body: "Every provider’s license, credentials and standing are reviewed by our team before they can be listed." },
        { title: "A separate, private identity", body: "Your counseling profile is never linked to your dating or business profiles. Other members can’t see that you use counseling." },
        { title: "Notes only your counselor sees", body: "Session notes are visible only to the counselor who writes them — not to other members, and not to our staff." },
        { title: "Seamless scheduling", body: "Book video, phone or in-person sessions from your counselor’s real-time availability." },
        { title: "Individuals, couples & leaders", body: "Specialists in personal growth, relationships, family, career and executive wellbeing." },
        { title: "Simple, transparent rates", body: "See each counselor’s rate before you book. No surprises." },
      ]}
    >
      <section id="providers" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-8">
        <div className="glass glass-edge grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">For counselors</p>
            <h2 className="display mt-5 text-4xl sm:text-5xl">A distinguished home for your practice.</h2>
            <p className="mt-6 leading-relaxed text-muted">
              Establish a verified profile, choose a provider membership, manage appointments and reach clients who value
              thoughtful, professional care. Provider applications open ahead of our public launch.
            </p>
          </div>
          <ul className="space-y-4 self-center text-sm text-muted">
            {["Submit your license and credentials securely", "Our team verifies your standing", "Select a provider membership", "Publish your profile and set availability"].map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="display text-2xl text-counseling">{i + 1}</span>
                <span className="pt-1.5">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </ExperiencePage>
  );
}
