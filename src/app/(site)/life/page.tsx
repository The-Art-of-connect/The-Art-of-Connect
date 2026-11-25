import type { Metadata } from "next";
import Link from "next/link";
import { ExperiencePage } from "@/components/ExperiencePage";

export const metadata: Metadata = {
  title: "In Life — Personal Growth & Guidance",
  description: "Self-discovery, personal development, emotional intelligence, private journaling and access to qualified counselors and coaches. For adults 21+.",
  alternates: { canonical: "/life" },
  openGraph: { title: "In Life — Personal Growth & Guidance · The Art of Connect", description: "Self-discovery, personal development, emotional intelligence, private journaling and access to qualified counselors and coaches.", url: "/life", images: [{ url: "/og/life.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/og/life.jpg"] },
};

export default function LifePage() {
  return (
    <ExperiencePage
      experience="counseling"
      headline={<>Discover <span className="gilded italic">yourself.</span></>}
      intro="The foundation of every meaningful connection is understanding who you are. In Life is your private space for reflection, growth and trusted guidance."
      features={[
        { title: "Self-discovery", body: "Guided reflections that help you explore your identity, your values and what you truly want." },
        { title: "Personal development", body: "Personal goals and growth pathways that evolve with you, with progress you can see." },
        { title: "Emotional intelligence", body: "Assessments and exercises that deepen self-awareness, empathy and how you relate to others." },
        { title: "Private journaling", body: "A journal that is visible only to you — never to matches, partners or our team." },
        { title: "Counselors & coaches", body: "Access qualified professionals, each reviewed before joining. Licensed counselors and coaches are clearly distinguished." },
        { title: "Your pace, your privacy", body: "Your personal growth never appears on your In Love or In Business profiles unless you choose to share it." },
      ]}
    >
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          The Art of Connect helps members find and connect with independent professionals. It is not a crisis service
          and does not provide emergency or medical care. If you are in crisis in the U.S., call or text 988, or call
          911 in an emergency.
        </p>
        <Link href="/professionals" className="mt-4 inline-block text-sm text-gold hover:text-gold-bright">Are you a counselor or coach? Visit the professional pathway →</Link>
      </section>
    </ExperiencePage>
  );
}
