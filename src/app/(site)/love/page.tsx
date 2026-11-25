import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";

export const metadata: Metadata = {
  title: "In Love — Romantic Connections",
  description: "Intentional matchmaking for singles and relationship development for couples. Exclusively for adults 40+.",
  alternates: { canonical: "/love" },
  openGraph: { title: "In Love — Romantic Connections · The Art of Connect", description: "Intentional matchmaking for singles and relationship development for couples.", url: "/love", images: [{ url: "/og/love.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/og/love.jpg"] },
};

const tracks = [
  {
    title: "For singles",
    line: "Seeking a meaningful connection",
    items: [
      ["Relationship readiness", "Understand what you’re looking for — and what you’re ready to give — before you begin."],
      ["Personality & compatibility assessments", "Thoughtful assessments that look beyond the surface to values, communication and life vision."],
      ["Intentional matchmaking", "Introductions chosen with care, each with the reasons you may be well suited."],
      ["Meaningful introductions", "Fewer, better connections — never an endless scroll."],
    ],
  },
  {
    title: "For couples",
    line: "Already together, growing deeper",
    items: [
      ["Individual and shared spaces", "Each partner keeps a private account and you share a relationship space together."],
      ["Secure partner invitation", "Invite your partner privately; your shared space only opens when they accept."],
      ["Connection & communication", "Guided conversations, communication exercises and emotional connection activities."],
      ["Goals & progress", "Set relationship goals together and see how you’re growing over time."],
    ],
  },
];

export default function LovePage() {
  return (
    <ExperiencePage
      experience="relationships"
      headline={<>Connect <span className="gilded italic">intentionally.</span></>}
      intro="Love begins with knowing yourself. Whether you’re seeking a partner or growing with the one you have, In Love brings intention, insight and care to every step."
      features={[
        { title: "Emotional intelligence", body: "Grow the self-awareness and empathy that make lasting love possible." },
        { title: "Compatibility that matters", body: "Values, attachment, communication and life vision — the things that truly shape a relationship." },
        { title: "Private by default", body: "Your individual reflections are never shared with a match or partner unless you choose." },
      ]}
    >
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <p className="eyebrow">Two distinct paths</p>
        <h2 className="display mt-5 text-4xl sm:text-5xl">Singles and couples, each with their own space.</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {tracks.map((t) => (
            <article key={t.title} className="glass glass-edge p-8">
              <h3 className="display text-4xl">{t.title}</h3>
              <p className="mt-2 text-sm text-relationships">{t.line}</p>
              <dl className="mt-8 space-y-6">
                {t.items.map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-semibold">{k}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">Couples never appear in matchmaking. The two paths are separated in the platform itself, not just on this page.</p>
      </section>
    </ExperiencePage>
  );
}
