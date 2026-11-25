import { CurriculumPage } from "@/components/curriculum/CurriculumPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "The Art of Emotional Intelligence · Founding Curriculum" };

export default function EmotionalIntelligenceCurriculum() {
  return <CurriculumPage section="emotional-intelligence" backHref="/emotional-intelligence" backLabel="The Art of Emotional Intelligence" />;
}
