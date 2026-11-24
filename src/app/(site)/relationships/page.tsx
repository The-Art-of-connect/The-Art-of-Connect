import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";

export const metadata: Metadata = { title: "Relationships", description: "Intentional dating, compatibility assessments and couples’ growth tools." };

export default function RelationshipsPage() {
  return (
    <ExperiencePage
      experience="relationships"
      headline={<>Love, <span className="italic text-rose">with intention.</span></>}
      intro="For people who are done with endless swiping. Deep compatibility, curated introductions, and tools that help a promising beginning become a lasting partnership."
      features={[
        { title: "Compatibility assessments", body: "Science-informed assessments of values, attachment, communication and life vision — so introductions begin with real alignment." },
        { title: "Curated introductions", body: "A small number of thoughtful matches, each with the reasons you may be well suited. Quality over quantity, always." },
        { title: "Intentional dating", body: "State what you’re looking for — marriage, long-term partnership, companionship — and meet people looking for the same." },
        { title: "Relationship development", body: "Guided milestones and conversation prompts that help new couples build trust and understanding." },
        { title: "Couples’ growth studio", body: "Shared exercises, check-ins and goals for established couples who want to keep growing together." },
        { title: "Safety & verification", body: "Identity verification, private photo controls and a dedicated safety team reviewing every report." },
      ]}
    />
  );
}
