import Image from "next/image";
import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHECKIN_KINDS, TIME_ZONES, eveningReflection, localClock, morningManifestation, wellnessDueToday, wellnessPrompt } from "@/lib/checkins";
import { createCheckin, saveCheckinPrefs, updateCheckin } from "@/app/actions/checkins";
import { ActionForm } from "@/components/admin/ActionForm";
import { LocalDateTimeField, LocalTime } from "@/components/LocalDateTime";
import { SafetyFooter } from "@/components/Lux";

export const metadata = { title: "Journey check-ins" };
export const dynamic = "force-dynamic";

type Prefs = {
  morning_manifestation: boolean; evening_reflection: boolean; personal_reminders: boolean; wellness: boolean; wellness_frequency: string;
  morning_time: string; evening_time: string; time_zone: string; quiet_start: string; quiet_end: string;
  channel_email: boolean; show_details: boolean; paused_until: string | null;
};
const DEFAULTS: Prefs = {
  morning_manifestation: false, evening_reflection: false, personal_reminders: true, wellness: false, wellness_frequency: "weekly",
  morning_time: "08:00", evening_time: "20:00", time_zone: "America/New_York", quiet_start: "21:30", quiet_end: "07:30",
  channel_email: false, show_details: false, paused_until: null,
};

export default async function CheckIns() {
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer);
  const supabase = (await createClient())!;
  const [{ data: p }, { data: items }, { data: values }, { data: settings }] = preview
    ? [{ data: null }, { data: [] }, { data: null }, { data: null }]
    : await Promise.all([
        supabase.from("journey_checkin_prefs").select("*").eq("user_id", viewer.id).maybeSingle(),
        supabase.from("journey_checkins").select("id, kind, title, detail, due_at, status, response, responded_at").eq("user_id", viewer.id).order("due_at").limit(200),
        supabase.from("discovery_answers").select("choices").eq("user_id", viewer.id).eq("question_key", "core_values").maybeSingle(),
        supabase.from("journey_checkin_settings").select("enabled, email_enabled").maybeSingle(),
      ]);
  const prefs: Prefs = { ...DEFAULTS, ...(p ?? {}), morning_time: (p?.morning_time ?? DEFAULTS.morning_time).slice(0, 5), evening_time: (p?.evening_time ?? DEFAULTS.evening_time).slice(0, 5), quiet_start: (p?.quiet_start ?? DEFAULTS.quiet_start).slice(0, 5), quiet_end: (p?.quiet_end ?? DEFAULTS.quiet_end).slice(0, 5) };
  const paused = prefs.paused_until && prefs.paused_until >= new Date().toISOString().slice(0, 10);
  const clock = localClock(prefs.time_zone);
  const now = Date.now();
  const due = (items ?? []).filter((i) => i.status === "scheduled" && new Date(i.due_at).getTime() <= now);
  const upcoming = (items ?? []).filter((i) => i.status === "scheduled" && new Date(i.due_at).getTime() > now);
  const past = (items ?? []).filter((i) => i.status !== "scheduled").reverse().slice(0, 10);
  const myValues = (values?.choices as string[] | null) ?? [];
  const showMorning = !paused && prefs.morning_manifestation && clock >= prefs.morning_time;
  const showEvening = !paused && prefs.evening_reflection && clock >= prefs.evening_time;
  const showWellness = !paused && prefs.wellness && wellnessDueToday(viewer.id, prefs.wellness_frequency);
  const tile = "lift rounded-2xl border border-champagne/40 bg-ivory/70 p-5";

  return (
    <>
      <section className="theme-dark relative overflow-hidden rounded-[28px] bg-ink">
        <div className="absolute inset-0">
          <Image src="/images/library/life/meditation.webp" alt="" fill priority sizes="100vw" className="kenburns object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/80 to-espresso/30" />
        </div>
        <div className="relative px-6 py-12 sm:px-12 sm:py-16">
          <p className="eyebrow rise">Journey · Check-ins</p>
          <h1 className="display rise rise-2 mt-3 max-w-2xl text-4xl leading-tight sm:text-6xl">Thoughtful care, <span className="gilded italic">on your terms.</span></h1>
          <p className="rise rise-3 mt-4 max-w-xl text-muted">Morning manifestations, evening reflections and gentle follow-ups on the moments that matter to you. You choose what you receive, when, and how — and you never owe a reply.</p>
        </div>
      </section>

      {preview && <p className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Preview — nothing is saved.</p>}
      {settings && !settings.enabled && <p className="mt-6 rounded-2xl border border-champagne/50 bg-champagne/10 px-5 py-3 text-sm">Check-ins are resting for the moment. Your preferences are saved and will resume automatically.</p>}

      {(showMorning || showEvening || showWellness || due.length > 0) && (
        <section className="mt-8 space-y-4">
          <p className="eyebrow">Today</p>
          {showMorning && (
            <div className="theme-dark tile-in relative overflow-hidden rounded-[24px] bg-ink p-7">
              <div className="glow-breathe pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgb(197_165_114/0.45),transparent_70%)]" aria-hidden="true" />
              <p className="relative text-xs tracking-[0.25em] uppercase text-gold">Your morning manifestation</p>
              <p className="display relative mt-3 text-3xl italic leading-snug text-ivory">“{morningManifestation(viewer.id, myValues)}”</p>
            </div>
          )}
          {showEvening && (
            <div className="glass tile-in p-7">
              <p className="text-xs tracking-[0.25em] uppercase text-gold">Your evening reflection</p>
              <p className="display mt-3 text-2xl">{eveningReflection(viewer.id)}</p>
              <Link href="/app/counseling/journal" className="mt-3 inline-block text-sm text-gold underline">Reflect in my private journal</Link>
            </div>
          )}
          {showWellness && (
            <div className="glass tile-in p-7">
              <p className="text-xs tracking-[0.25em] uppercase text-gold">Checking in with you</p>
              <p className="display mt-3 text-2xl">{wellnessPrompt(viewer.id)}</p>
              <Link href="/app/journey#chat" className="mt-3 inline-block text-sm text-gold underline">Talk it through with Journey</Link>
            </div>
          )}
          {due.map((c) => (
            <div key={c.id} className="glass tile-in p-6">
              <p className="text-xs tracking-[0.2em] uppercase text-gold">{CHECKIN_KINDS[c.kind]?.label ?? "Check-in"} · <LocalTime iso={c.due_at} /></p>
              <p className="display mt-2 text-2xl">{c.title}</p>
              <p className="mt-1 text-muted">{CHECKIN_KINDS[c.kind]?.ask}</p>
              <ActionForm action={updateCheckin} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={c.id} />
                <textarea name="response" maxLength={2000} rows={3} className="field" placeholder="Share as much or as little as you like — only you will see this." />
                <div className="flex flex-wrap gap-2">
                  <button name="action" value="respond" className="btn btn-gold btn-sm">Save my reflection</button>
                  <button name="action" value="snooze" className="btn btn-ghost btn-sm">Tomorrow</button>
                  <button name="action" value="dismiss" className="px-2 text-sm text-muted underline">Not now</button>
                </div>
              </ActionForm>
            </div>
          ))}
        </section>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="glass p-6 sm:p-8">
          <h2 className="display text-3xl">Ask Journey to check in</h2>
          <p className="mt-1 text-sm text-muted">An interview, an appointment, a hard conversation, a milestone — Journey will follow up gently at the time you choose.</p>
          <ActionForm action={createCheckin} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">What’s it about?</span>
              <select name="kind" className="field">{Object.entries(CHECKIN_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
            <label className="block space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">A short title</span>
              <input name="title" required minLength={2} maxLength={120} className="field" placeholder="e.g. Interview with Delta, or Mom’s birthday" /></label>
            <div className="sm:col-span-2"><LocalDateTimeField name="due_at" label="When should Journey check in?" /></div>
            <label className="block space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">Anything you’d like Journey to remember? <span className="font-normal text-muted">(private, optional)</span></span>
              <textarea name="detail" maxLength={1000} rows={2} className="field" /></label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="repeat_yearly" className="accent-[var(--champagne)]" /> Every year (for birthdays and anniversaries)</label>
            <button className="btn btn-gold sm:col-span-2 sm:justify-self-start">Save check-in</button>
          </ActionForm>

          <h3 className="display mt-10 text-2xl">Coming up</h3>
          <ul className="mt-3 space-y-2">
            {upcoming.map((c) => (
              <li key={c.id} className={`${tile} flex items-start justify-between gap-3`}>
                <span><span className="block font-semibold">{c.title}</span><span className="block text-xs text-muted">{CHECKIN_KINDS[c.kind]?.label} · <LocalTime iso={c.due_at} /></span></span>
                <ActionForm action={updateCheckin}><input type="hidden" name="id" value={c.id} /><button name="action" value="delete" className="text-xs text-muted underline">Remove</button></ActionForm>
              </li>
            ))}
            {!upcoming.length && <li className="text-sm text-muted">Nothing scheduled. Journey is here whenever you’d like a check-in.</li>}
          </ul>
          {past.length > 0 && (
            <>
              <h3 className="display mt-10 text-2xl">Your reflections</h3>
              <ul className="mt-3 space-y-2">
                {past.map((c) => (
                  <li key={c.id} className={tile}>
                    <span className="block font-semibold">{c.title}</span>
                    {c.response ? <span className="mt-1 block text-sm">{c.response}</span> : <span className="mt-1 block text-xs text-muted">Set aside</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="glass p-6 sm:p-8">
          <h2 className="display text-3xl">Your preferences</h2>
          <p className="mt-1 text-sm text-muted">Everything is optional. Change it any time.</p>
          <ActionForm action={saveCheckinPrefs} className="mt-5 space-y-5 text-sm">
            <fieldset className="space-y-2">
              <legend className="font-semibold">What I’d like to receive</legend>
              {[["morning_manifestation", "Morning manifestations", prefs.morning_manifestation], ["evening_reflection", "Evening reflections", prefs.evening_reflection], ["personal_reminders", "My personal check-ins and reminders", prefs.personal_reminders], ["wellness", "Occasional wellness check-ins", prefs.wellness]].map(([k, l, v]) => (
                <label key={String(k)} className="flex items-center gap-2"><input type="checkbox" name={String(k)} defaultChecked={Boolean(v)} className="accent-[var(--champagne)]" /> {String(l)}</label>
              ))}
              <label className="flex items-center gap-2 pl-6 text-xs text-muted">Wellness check-ins
                <select name="wellness_frequency" defaultValue={prefs.wellness_frequency} className="field !min-h-0 !w-auto !py-1 text-xs"><option value="weekly">weekly</option><option value="biweekly">every two weeks</option><option value="monthly">monthly</option></select></label>
            </fieldset>
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="col-span-2 font-semibold">When</legend>
              <label className="space-y-1"><span className="text-xs text-muted">Morning</span><input type="time" name="morning_time" defaultValue={prefs.morning_time} className="field" /></label>
              <label className="space-y-1"><span className="text-xs text-muted">Evening</span><input type="time" name="evening_time" defaultValue={prefs.evening_time} className="field" /></label>
              <label className="space-y-1"><span className="text-xs text-muted">Quiet hours from</span><input type="time" name="quiet_start" defaultValue={prefs.quiet_start} className="field" /></label>
              <label className="space-y-1"><span className="text-xs text-muted">until</span><input type="time" name="quiet_end" defaultValue={prefs.quiet_end} className="field" /></label>
              <label className="col-span-2 space-y-1"><span className="text-xs text-muted">My time zone</span>
                <select name="time_zone" defaultValue={prefs.time_zone} className="field">{[...new Set([prefs.time_zone, ...TIME_ZONES])].map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}</select></label>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="font-semibold">How</legend>
              <p className="text-xs text-muted">Check-ins always appear here in your dashboard.</p>
              <label className="flex items-center gap-2"><input type="checkbox" name="channel_email" defaultChecked={prefs.channel_email} className="accent-[var(--champagne)]" /> Also send me a gentle email {settings && !settings.email_enabled && <span className="text-xs text-muted">(starting soon)</span>}</label>
              <label className="flex items-center gap-2 text-muted"><input type="checkbox" disabled className="accent-[var(--champagne)]" /> Phone notifications <span className="text-xs">(coming soon)</span></label>
              <label className="flex items-center gap-2 text-muted"><input type="checkbox" disabled className="accent-[var(--champagne)]" /> Text messages <span className="text-xs">(coming soon)</span></label>
              <label className="flex items-start gap-2"><input type="checkbox" name="show_details" defaultChecked={prefs.show_details} className="mt-1 accent-[var(--champagne)]" /> <span>Include my check-in titles in emails <span className="block text-xs text-muted">Off by default: emails simply say Journey has a check-in for you, so nothing personal appears in your inbox.</span></span></label>
            </fieldset>
            <label className="block space-y-1"><span className="font-semibold">Pause everything until</span><input type="date" name="paused_until" defaultValue={prefs.paused_until ?? ""} className="field" /><span className="block text-xs text-muted">Take all the time you need — nothing is lost.</span></label>
            <button className="btn btn-gold">Save preferences</button>
          </ActionForm>
        </section>
      </div>
      <p className="display mt-12 text-center text-2xl italic text-gold-deep">Every new chapter deserves support.</p>
      <SafetyFooter />
    </>
  );
}
