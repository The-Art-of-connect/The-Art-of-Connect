import Link from "next/link";
import { VoiceStudio } from "@/components/JourneyPickers";
import { LuxCard, LuxSection, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "Talk to Journey" };

export default function TalkToJourney() {
  return (
    <>
      <p className="eyebrow">Journey</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Talk to Journey</h1>
      <p className="mt-3 max-w-2xl text-muted">Natural, two-way spoken conversation with the same warmth, memory permissions and philosophy as written Journey. Switch between voice and chat whenever you like.</p>
      <div className="mt-10"><VoiceStudio minutes={null} /></div>
      <LuxSection title="Designed around you">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <LuxCard title="Speak naturally" body="Interrupt, pause or change direction anytime — Journey follows the conversation as a thoughtful listener would." />
          <LuxCard title="Your voice, your choice" body="Choose from approved voices, preview them, and Journey remembers your preference." />
          <LuxCard title="Always in control" body="Mute, pause or end at any moment. Conversations close automatically after a period of quiet or when your minutes are used." />
          <LuxCard title="Optional transcripts" body="Keep a private written record of a conversation, or don't — it's your choice each time." />
          <LuxCard title="Clear minutes" body="Your remaining voice minutes are always visible. Nothing is ever charged automatically." />
          <LuxCard title="AI voice, clearly disclosed" body="Journey's voice is AI-generated. Journey is an AI assistant, not a person or a therapist." />
        </div>
      </LuxSection>
      <p className="mt-10 text-center"><Link href="/app/journey#chat" className="btn btn-ghost">Prefer to write? Chat with Journey</Link></p>
      <SafetyFooter />
    </>
  );
}
