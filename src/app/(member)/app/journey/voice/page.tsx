import Link from "next/link";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJourneyStatus, membershipFor } from "@/lib/journey-server";
import { VoiceStudio } from "@/components/JourneyPickers";
import { GuidedVoice } from "@/components/JourneyGuide";
import { resolveGuide } from "@/lib/journey-guide-server";
import { LuxCard, LuxSection, SafetyFooter } from "@/components/Lux";
import { saveVoicePrefs } from "@/app/actions/journey-member";
import { CURRICULA } from "@/lib/curricula";
import { avatarById, voiceById } from "@/lib/journey-customize";
import { discoveryCategory, discoveryMode } from "@/lib/journey-discovery";

export const metadata = { title: "Talk to Journey" };

export default async function TalkToJourney({ searchParams }: { searchParams: Promise<{ lesson?: string; discover?: string }> }) {
  const sp = await searchParams;
  const lesson = /^[a-z0-9-]{2,60}(\/[a-z0-9-]{2,60})?$/.test(sp.lesson ?? "") ? sp.lesson! : null;
  const [sectionKey, lessonSlug] = (lesson ?? "").split("/");
  const curriculum = lesson ? CURRICULA[sectionKey] : null;
  const lessonTitle = curriculum ? (curriculum.lessons.find((l) => l.slug === lessonSlug)?.title ?? curriculum.title) : null;
  const disc = sp.discover ? discoveryCategory(sp.discover) : null;
  const guide = lesson ? await resolveGuide(createAdminClient(), lesson) : null;
  const topicTitle = guide?.title ?? lessonTitle ?? (disc ? `${disc.title} discovery` : null);
  const backHref = guide ? guide.href : curriculum ? `/app/know-yourself/${sectionKey === "emotional-intelligence" ? "emotional-intelligence/lessons" : sectionKey}${lessonSlug ? `#${lessonSlug}` : ""}` : disc ? `/app/journey/discover/${disc.key}` : null;
  const viewer = (await getViewer())!;
  const status = await getJourneyStatus();
  const supabase = await createClient();
  const db = createAdminClient();
  const { data: prefs } = supabase && !isInsidePreview(viewer)
    ? await supabase.from("journey_voice_preferences").select("voice_style, save_transcripts, voice, presentation, avatar").eq("user_id", viewer.id).maybeSingle()
    : { data: null };
  const { data: s } = db ? await db.from("journey_settings").select("voice_enabled, voice_model, voice_cents_per_minute").maybeSingle() : { data: null };
  let minutes: { remaining: number; total: number } | null = null;
  if (db && (status.access === "standard" || status.access === "enhanced")) {
    const m = await membershipFor(db, viewer.id);
    const { data: t } = await db.from("journey_tier_limits").select("monthly_voice_minutes").eq("package_slug", m?.membership.packageSlug ?? "").maybeSingle();
    const { data: used } = m ? await db.rpc("journey_voice_used", { p_holder: m.holderId, p_period_start: m.periodStart.toISOString() }) : { data: 0 };
    if (t?.monthly_voice_minutes != null) minutes = { total: t.monthly_voice_minutes, remaining: Math.max(0, t.monthly_voice_minutes - Math.ceil(Number(used ?? 0) / 60)) };
  }
  const voiceReady = Boolean(s?.voice_enabled && s.voice_model && s.voice_cents_per_minute != null && status.enabled);
  const owner = hasRole(viewer, ["owner"]);
  const available = voiceReady && (status.access === "standard" || status.access === "enhanced" || owner);
  const reason = status.access === "none" ? "Talk to Journey is a benefit of paid memberships." : "Talk to Journey opens soon.";
  return (
    <>
      <p className="eyebrow">Journey</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">{topicTitle ? "Live session with Journey" : "Talk to Journey"}</h1>
      {topicTitle && (
        <p className="mt-4 inline-flex flex-wrap items-center gap-3 rounded-full border border-champagne/70 bg-champagne/15 px-5 py-2 text-sm">
          <span className="font-semibold text-burgundy">{topicTitle}</span>
          {backHref && <Link href={backHref} className="text-gold-deep underline-offset-2 hover:underline">Back to the lesson</Link>}
        </p>
      )}
      <p className="mt-3 max-w-2xl text-muted">Natural, two-way spoken conversation with the same warmth, memory permissions and philosophy as written Journey. Switch between voice and chat whenever you like.</p>
      <div className="mt-10">
        {guide ? (
          <GuidedVoice mod={guide} minutes={minutes} available={available} reason={reason} ownerTest={owner && status.access === "staff"}
            initialStyle={(prefs?.voice_style as "warm") ?? "warm"} initialTranscripts={prefs?.save_transcripts ?? false} onSavePrefs={saveVoicePrefs}
            voiceSummary={prefs?.voice ? `${voiceById(prefs.voice)?.name ?? "Journey"} (${prefs.presentation} voice)` : null}
            avatarImage={prefs?.avatar ? avatarById(prefs.avatar).image ?? null : null} lesson={lesson} mode="life" />
        ) : (
        <VoiceStudio minutes={minutes} available={available} reason={reason} ownerTest={owner && status.access === "staff"}
          initialStyle={(prefs?.voice_style as "warm") ?? "warm"} initialTranscripts={prefs?.save_transcripts ?? false} onSavePrefs={saveVoicePrefs}
          voiceSummary={prefs?.voice ? `${voiceById(prefs.voice)?.name ?? "Journey"} (${prefs.presentation} voice)` : null}
          avatarImage={prefs?.avatar ? avatarById(prefs.avatar).image ?? null : null}
          lesson={lesson} discovery={disc?.key ?? null} mode={disc ? discoveryMode(disc.key) : "life"} />
        )}
      </div>
      <LuxSection title="Designed around you">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <LuxCard title="Speak naturally" body="Interrupt, pause or change direction anytime — Journey follows the conversation as a thoughtful listener would." />
          <LuxCard title="Your voice, your choice" body="Customize Your Journey: voice, language, accent, pace and personality. Journey uses your choices in every live session across The Art of Connect." />
          <LuxCard title="Always in control" body="Mute, pause or end at any moment. Conversations close automatically after a quiet period or when your minutes are used." />
          <LuxCard title="Optional transcripts" body="Keep a private written record of what Journey said, or don't — your choice each time." />
          <LuxCard title="Clear minutes" body="Your remaining voice minutes are always visible. Nothing is ever charged automatically unless you turn on Auto-Reload." />
          <LuxCard title="AI voice, clearly disclosed" body="Journey's voice is AI-generated. Journey is an AI assistant, not a person or a therapist." />
        </div>
      </LuxSection>
      <p className="mt-10 flex flex-wrap justify-center gap-3"><Link href="/app/journey/customize" className="btn btn-gold">Customize Your Journey</Link><Link href="/app/journey#chat" className="btn btn-ghost">Prefer to write? Chat with Journey</Link></p>
      <SafetyFooter />
    </>
  );
}
