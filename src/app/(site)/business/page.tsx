import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";

export const metadata: Metadata = { title: "In Business — Professional Connections", description: "Business compatibility, professional networking, mentorship, strategic partnerships and collaboration." };

export default function BusinessPage() {
  return (
    <ExperiencePage
      experience="business"
      headline={<>Connect <span className="gilded italic">with purpose.</span></>}
      intro="Meaningful professional relationships, built on genuine compatibility. Find partners, mentors, collaborators and clients who share your values and complement your strengths."
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
