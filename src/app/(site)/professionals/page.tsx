import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = { title: "For Professionals", description: "Counselors, coaches and mentors: apply to join The Art of Connect." };

export default function ProfessionalsPage() {
  return (
    <>
    <div className="band theme-burgundy">
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
      <p className="eyebrow">For counselors, coaches & mentors</p>
      <hr className="gold-rule mt-5 w-24" />
      <h1 className="display mt-5 max-w-4xl text-5xl sm:text-7xl">
        A distinguished home for <span className="gilded italic">your practice.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        Serve members who are investing in themselves, their relationships and their work. Every professional is
        reviewed personally before joining.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/professionals/apply" className="btn btn-gold">Begin your application</Link>
      </div>
    </div>
    </div>
    <div className="band theme-ivory">
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          {
            title: "Licensed mental health professionals",
            body: "Counselors, therapists, psychologists and social workers. Your license is verified with the issuing state before approval, and your profile is clearly marked as licensed.",
            points: ["License type, number and state verified", "Clearly identified as licensed", "Serve In Life and In Love members"],
          },
          {
            title: "Coaches, mentors & other professionals",
            body: "Life, relationship and executive coaches, and business mentors. Your profile is clearly identified as nonclinical, so members always know the kind of support they’re choosing.",
            points: ["Training and experience reviewed", "Clearly identified as nonclinical", "Serve In Business, In Life or In Love"],
          },
        ].map((c, i) => (
          <Reveal key={c.title} delay={i * 120}>
            <article className="glass glass-edge h-full p-8">
              <h2 className="display text-3xl sm:text-4xl">{c.title}</h2>
              <p className="mt-4 leading-relaxed text-muted">{c.body}</p>
              <ul className="mt-6 space-y-3">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-sm"><span className="h-px w-5 bg-gold" aria-hidden="true" />{p}</li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

    </div>
    </div>
    <div className="band theme-cream">
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
      <h2 className="display text-4xl sm:text-5xl">The pathway</h2>
      <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Apply", "Share your background, specialties and where you’d like to serve."],
          ["Verification", "We review your credentials, licensure and experience."],
          ["Approval", "Approved personally by The Art of Connect."],
          ["Membership", "Choose a professional membership."],
          ["Practice", "Publish your profile, set availability and receive consent-based referrals."],
        ].map(([t, d], i) => (
          <Reveal key={t} delay={i * 80}>
            <li className="h-full border-t border-gold/40 pt-5">
              <p className="display text-3xl text-gold">{i + 1}</p>
              <p className="mt-3 font-semibold">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          </Reveal>
        ))}
      </ol>
      <p className="mt-12 max-w-3xl text-sm text-muted">
        Professionals on The Art of Connect are independent practitioners. Professional membership pricing will be shared
        with approved applicants.
      </p>
    </div>
    </div>
    </>
  );
}
