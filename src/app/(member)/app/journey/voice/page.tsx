import Link from "next/link";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJourneyStatus, membershipFor } from "@/lib/journey-server";
import { JourneyLive } from "@/components/JourneyLive";
import { LuxCard, LuxSection, SafetyFooter } from "@/components/Lux";
import { deleteVoiceTranscripts, saveVoicePrefs } from "@/app/actions/journey-member";
import { setVoiceDefaults } from "@/app/actions/journey-admin";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Journey Live" };
export const dynamic = "force-dynamic";

export default async function TalkToJourney() {
  const viewer = (await getViewer())!;
  const status = await getJourneyStatus();
  const supabase = await createClient();
  const db = createAdminClient();
  const { data: prefs } = supabase && !isInsidePreview(viewer)
    ? await supabase.from("journey_voice_preferences").select("voice_style, save_transcripts, speed, manual_mode, transcript_retention_days").eq("user_id", viewer.id).maybeSingle()
    : { data: null };
  const { data: s } = db ? await db.from("journey_settings").select("voice_enabled, voice_model, voice_cents_per_minute, voice_default, voice_speed, voice_depth").maybeSingle() : { data: null };
  const { data: convs } = supabase && !isInsidePreview(viewer)
    ? await supabase.from("journey_conversations").select("id, title, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }).limit(12)
    : { data: [] };

  let minutes: { remaining: number; total: number } | null = null;
  if (db && (status.access === "standard" || status.access === "enhanced")) {
    const m = await membershipFor(db, viewer.id);
    const { data: t } = await db.from("journey_tier_limits").select("monthly_voice_minutes").eq("package_slug", m?.membership.packageSlug ?? "").maybeSingle();
    const { data: used } = m ? await db.rpc("journey_voice_used", { p_holder: m.holderId, p_period_start: m.periodStart.toISOString() }) : { data: 0 };
    if (t?.monthly_voice_minutes != null) minutes = { total: t.monthly_voice_minutes, remaining: Math.max(0, t.monthly_voice_minutes - Math.ceil(Number(used ?? 0) / 60)) };
  }
  const voiceReady = Boolean(s?.voice_enabled && s.voice_model && s.voice_cents_per_minute != null && status.enabled);
  const owner = hasRole(viewer, ["owner"]);
  const { data: versions } = owner && supabase ? await supabase.from("journey_instruction_versions").select("version, status").order("version", { ascending: false }).limit(20) : { data: [] };
  const available = voiceReady && (status.access === "standard      <p className="eyebrow">Journey Live</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Talk with Journey</h1>
      <p className="mt-3 max-w-2xl text-muted">A real-time, one-on-one conversation that feels like a thoughtful phone call — the same warmth, personality and memory as your written conversations. Speak at your own pace; Journey listens before it responds.</p>
      <div className="mt-10">
        <JourneyLive
          minutes={minutes} available={available} reason={reason} ownerTest={owner && status.access === "staff"}
          initial={{ style: (prefs?.voice_style as "warm") ?? "journey", transcripts: prefs?.save_transcripts ?? false, speed: Number(prefs?.speed ?? s?.voice_speed ?? 1), manual: prefs?.manual_mode ?? false, retentionDays: prefs ? (prefs.transcript_retention_days ?? null) : 90 }}
          conversations={(convs ?? []).map((c) => ({ id: c.id, title: c.title ?? "Conversation", updated_at: c.updated_at }))}
          versions={(versions ?? []).map((v) => ({ version: v.version, status: v.status }))}
          defaults={{ voice: s?.voice_default ?? "marin", speed: Number(s?.voice_speed ?? 1), depth: s?.voice_depth ?? "complete" }}
          onSavePrefs={saveVoicePrefs}
          onSetDefaults={owner ? setVoiceDefaults : undefined}
        />
      </div>
      <LuxSection title="Designed around you">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <LuxCard title="Unhurried listening" body="Journey waits for you to finish your thought. Pauses, hesitation and silence are welcome — and you can interrupt Journey at any moment." />
          <LuxCard title="One Journey, voice or text" body="The same personality and memory in every conversation. Continue a previous conversation by voice, or pick up a live call in writing." />
          <LuxCard title="Always in control" body="Mute your microphone, turn the speaker off, pause, adjust the pace or end at any time. Manual mode helps in noisy places." />
          <LuxCard title="Private by design" body="Audio is never recorded. Transcripts are optional, visible only to you, and you choose how long they’re kept." />
          <LuxCard title="Clear minutes" body="Your remaining voice minutes are always visible. Nothing is ever charged automatically unless you turn on Auto-Reload." />
          <LuxCard title="AI voice, clearly disclosed" body="Journey is an AI companion with an AI-generated voice — not a person and not a therapist." />
        </div>
      </LuxSection>
      {!isInsidePreview(viewer) && (
        <ActionForm action={deleteVoiceTranscripts} className="mt-8 text-center">
          <button className="text-sm text-muted underline underline-offset-4 hover:text-gold">Erase all my saved voice transcripts</button>
        </ActionForm>
      )}
      <p className="mt-10 text-center"><Link href="/app/journey#chat" className="btn btn-ghost">Prefer to write? Chat with Journey</Link></p>
      <SafetyFooter />
    </>
  );
}
