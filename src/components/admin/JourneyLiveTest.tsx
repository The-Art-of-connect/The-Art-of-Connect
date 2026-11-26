"use client";
import { useState } from "react";
import { OwnerTest } from "@/components/admin/OwnerTest";
import { VoiceStudio } from "@/components/JourneyPickers";

/** "Test Journey now": a real written conversation and a real live voice conversation, on the owner's private budget. */
export function JourneyLiveTest({ ready, voiceReady, voiceReason }: { ready: boolean; voiceReady: boolean; voiceReason: string }) {
  const [tab, setTab] = useState<"chat" | "voice">("chat");
  return (
    <div>
      <div className="flex gap-2 border-b border-line px-5 pt-4" role="tablist">
        {(["chat", "voice"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px rounded-t-xl border-b-2 px-4 py-2 text-sm ${tab === t ? "border-gold font-semibold text-gold" : "border-transparent text-muted"}`}>
            {t === "chat" ? "Write to Journey" : "Talk to Journey (live voice)"}
          </button>
        ))}
      </div>
      {!ready ? (
        <p className="p-5 text-sm text-muted">Activate Journey above, then talk with her right here.</p>
      ) : tab === "chat" ? (
        <OwnerTest note="This is the real Journey, answering through OpenAI on your private testing budget." />
      ) : (
        <div className="p-5"><VoiceStudio minutes={null} available={voiceReady} reason={voiceReason} ownerTest mode="life" /></div>
      )}
    </div>
  );
}
