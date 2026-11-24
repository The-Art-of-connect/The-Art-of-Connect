import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";

export const metadata: Metadata = { title: "Business", description: "Professional networking, partnerships, referrals and collaboration." };

export default function BusinessPage() {
  return (
    <ExperiencePage
      experience="business"
      headline={<>Where ambition <span className="italic text-sapphire">finds its match.</span></>}
      intro="A private network for founders, executives, professionals and creators. Find partners, clients, collaborators and mentors through compatibility — not cold outreach."
      features={[
        { title: "Business compatibility", body: "Match on goals, stage, working style and what you’re seeking or offering — partnerships begin with fit." },
        { title: "Partnerships", body: "Discover co-founders, joint-venture partners and strategic allies who complement your strengths." },
        { title: "Curated referrals", body: "A trusted referral exchange among members, with clear terms and a record of every introduction." },
        { title: "Collaboration rooms", body: "Private spaces to shape projects with the people you meet, from first idea to signed agreement." },
        { title: "Entrepreneurial circles", body: "Small, facilitated peer groups organised by industry and stage for candid counsel and accountability." },
        { title: "Verified professionals", body: "Professional identity checks so you always know exactly who you’re speaking with." },
      ]}
    />
  );
}
