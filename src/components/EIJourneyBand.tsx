import Link from "next/link";
import { EIIcon } from "@/components/EIIcon";

/** “Learn with Journey” — the personal-educator band (paid members; visitors are invited to join). */
export function EIJourneyBand({ ask, title = "Learn with Journey", body = "Personalized guidance, real-life examples, and meaningful conversations." }: { ask: string; title?: string; body?: string }) {
  return (
    <section className="rounded-[22px] border border-champagne/70 bg-ivory/80 px-6 py-7 sm:px-10">
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div className="lg:border-r lg:border-champagne/70 lg:pr-10">
          <h2 className="display text-3xl text-burgundy sm:text-4xl">{title}</h2>
          <p className="mt-2 text-lg text-text/80">{body}</p>
        </div>
        <div className="space-y-3 lg:pl-4">
          <span className="inline-block rounded-full bg-champagne/30 px-4 py-1 text-[0.65rem] tracking-[0.28em] uppercase text-text/70">Included with paid membership</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/app/journey?ask=${encodeURIComponent(ask)}#chat`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-burgundy px-6 py-3.5 font-medium text-ivory transition hover:opacity-90">
              <EIIcon name="chat" className="h-5 w-5" /> Talk with Journey
            </Link>
            <Link href="/app/journey/voice" className="inline-flex items-center justify-center gap-2 rounded-xl border border-burgundy px-6 py-3.5 font-medium text-burgundy transition hover:bg-burgundy/5">
              <EIIcon name="mic" className="h-5 w-5" /> Start a Voice Conversation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
