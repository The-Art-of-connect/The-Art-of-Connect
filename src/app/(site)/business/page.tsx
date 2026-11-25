import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";

export const metadata: Metadata = {
  title: "In Business — Professional Connections",
  description: "Business compatibility, professional networking, mentorship, strategic partnerships and collaboration. Exclusively for adults 40+.",
  alternates: { canonical: "/business" },
  openGraph: { title: "In Business — Professional Connections · The Art of Connect", description: "Business compatibility, professional networking, mentorship, strategic partnerships and collaboration.", url: "/business", images: [{ url: "/og/business.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/og/business.jpg"] },
};

export default function BusinessPage() {
  return (
    <ExperiencePage
      experience="business"
      headline={<>Connect <span className="gilded italic">with purpose.</span></>}
      intro="Meaningful professional relationships, built on genuine compatibility. Business owners helping business owners — find partners, mentors and collaborators across cities and states who complement your strengths."
      features={[
        { title: "Business compatibility", body: "Introductions shaped by your goals, stage, values and working style — so every conversation starts with real alignment." },
        { title: "Professional networking", body: "A curated community of founders, leaders and professionals, without the noise of an open directory." },
        { title: "Mentorship", body: "Connect with experienced mentors — or share your own experience with those building what comes next." },
        { title: "Strategic partnerships", body: "Discover partners whose strengths complement yours, from joint ventures to long-term alliances." },
        { title: "Collaboration", body: "Shape projects together with the people you meet, from first idea to shared success." },
        { title: "Meaningful relationships", body: "Professional connections grounded in trust and mutual respect — relationships that last beyond a single deal." },
      ]}
    />
  );
}
