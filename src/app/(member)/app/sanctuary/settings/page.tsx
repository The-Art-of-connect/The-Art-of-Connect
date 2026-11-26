import { getViewer } from "@/lib/auth";
import { sanctuarySettings } from "@/lib/sanctuary-server";
import { TIMEZONES } from "@/lib/social";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { SanctuaryTabs } from "@/components/SanctuaryTabs";
import { saveSanctuarySettings } from "@/app/actions/sanctuary";

export const metadata = { title: "Reminders & privacy · My Daily Sanctuary" };
export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Optional reminders (off by default, member-chosen time and type, no streaks or urgency) and the consent setting. */
export default async function SanctuarySettings() {
  const viewer = (await getViewer())!;
  const s = await sanctuarySettings(viewer.id);
  return (
    <>
      <LuxHero eyebrow="My Daily Sanctuary" title="Reminders & privacy" tagline="Your Sanctuary, on your terms." />
      <SanctuaryTabs current="/app/sanctuary/settings" />
      <LuxSection eyebrow="Optional" title="Gentle reminders" intro="Reminders are entirely optional. There are no streaks to keep and nothing is lost if you take a break.">
        <MemberForm action={saveSanctuarySettings} className="glass max-w-2xl space-y-4 p-6">
          <input type="hidden" name="section" value="reminders" />
          <label className="block text-sm">How often
            <select name="reminder_frequency" defaultValue={s.reminder_frequency} className="field mt-1 w-full">
              <option value="off">Off</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly (on the 1st)</option>
            </select></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">Time<input type="time" name="reminder_time" defaultValue={s.reminder_time} className="field mt-1 w-full" /></label>
            <label className="block text-sm">Day (weekly)<select name="reminder_weekday" defaultValue={s.reminder_weekday} className="field mt-1 w-full">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
            <label className="block text-sm">Time zone<select name="time_zone" defaultValue={s.time_zone} className="field mt-1 w-full">{TIMEZONES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></label>
          </div>
          <fieldset><legend className="text-sm">What to remind me about</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[["morning", "Morning practices"], ["checkin", "Emotional check-in"], ["evening", "Evening reflection"], ["weekly", "Weekly reflection"], ["monthly", "Monthly reflection"]].map(([k, l]) => (
                <label key={k} className="cursor-pointer"><input type="checkbox" name="reminder_types" value={k} defaultChecked={s.reminder_types.includes(k)} className="peer sr-only" />
                  <span className="block rounded-full border border-line-strong px-3 py-1.5 text-sm text-muted peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:text-text peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{l}</span></label>
              ))}
            </div></fieldset>
          <button className="btn btn-gold">Save reminders</button>
          <p className="text-xs text-faint">Reminders arrive by email and never include what you&rsquo;ve written.</p>
        </MemberForm>
      </LuxSection>
      <LuxSection eyebrow="Privacy" title="How your answers are used">
        <MemberForm action={saveSanctuarySettings} className="glass max-w-2xl p-6">
          <input type="hidden" name="section" value="consent" />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="share_with_portfolio" defaultChecked={s.share_with_portfolio} className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
            <span>Use my Sanctuary answers and Who Am I? progress in my private Discovery Portfolio and to personalize my suggestions. My answers are never shown to other members, and I can turn this off at any time.</span>
          </label>
          <button className="btn btn-ghost btn-sm mt-3">Save</button>
        </MemberForm>
      </LuxSection>
      <Notice>Everything in your Sanctuary is private to you. The Art of Connect&rsquo;s team does not read your entries.</Notice>
    </>
  );
}
