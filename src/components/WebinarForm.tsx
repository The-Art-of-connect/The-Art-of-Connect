import { PROVIDERS, TEMPLATES } from "@/lib/business-options";
import { saveWebinar } from "@/app/actions/webinars";
import { ActionForm } from "@/components/admin/ActionForm";
import { WebinarTimeFields } from "@/components/WebinarTimeFields";

type Topic = { slug: string; name: string };
type W = Record<string, any> | null;

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Create or edit a webinar, upload media and choose a promotional template. */
export function WebinarForm({ w, topics, industries, joinUrl }: { w: W; topics: Topic[]; industries: Topic[]; joinUrl?: string | null }) {
  return (
    <ActionForm action={saveWebinar} className="space-y-6">
      {w && <input type="hidden" name="id" value={w.id} />}
      <fieldset className="glass grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <legend className="sr-only">About the webinar</legend>
        <Field label="Webinar title *" wide><input name="title" required minLength={5} maxLength={140} defaultValue={w?.title ?? ""} className="field" /></Field>
        <Field label="Description *" wide><textarea name="description" required minLength={20} maxLength={5000} defaultValue={w?.description ?? ""} className="field !min-h-[140px]" /></Field>
        <Field label="Topic">
          <select name="topic" defaultValue={w?.topic ?? ""} className="field"><option value="">Choose a topic</option>{topics.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>
        </Field>
        <Field label="Industry (optional)">
          <select name="industry" defaultValue={w?.industry ?? ""} className="field"><option value="">All industries</option>{industries.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>
        </Field>
        <Field label="Learning objectives" hint="One per line" wide><textarea name="objectives" defaultValue={(w?.learning_objectives ?? []).join("\n")} className="field !min-h-[90px]" /></Field>
        <Field label="Intended audience" wide><input name="audience" defaultValue={w?.audience ?? ""} placeholder="e.g. Owners preparing to expand into a second state" className="field" /></Field>
      </fieldset>

      <fieldset className="glass grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <legend className="sr-only">Schedule</legend>
        <WebinarTimeFields startsAt={w?.starts_at} timeZone={w?.time_zone} />
        <Field label="Duration (minutes)"><input name="duration" type="number" min={15} max={480} step={15} defaultValue={w?.duration_minutes ?? 60} className="field" /></Field>
        <Field label="Capacity" hint="Leave blank for no limit"><input name="capacity" type="number" min={1} max={10000} defaultValue={w?.capacity ?? ""} className="field" /></Field>
        <Field label="Where it’s hosted">
          <select name="provider" defaultValue={w?.provider ?? "zoom"} className="field">{Object.entries(PROVIDERS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Private meeting link" hint="Shared only with eligible registered attendees when the room opens.">
          <input name="joinUrl" type="url" defaultValue={joinUrl ?? ""} placeholder="https://" className="field" />
        </Field>
        <Field label="Meeting passcode (optional)"><input name="passcode" className="field" /></Field>
        <label className="flex items-start gap-2 self-end text-sm"><input type="checkbox" name="recording" defaultChecked={w?.recording_planned} className="mt-1 accent-[var(--champagne)]" /> I plan to record (attendees will be asked for consent)</label>
      </fieldset>

      <fieldset className="glass grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <legend className="sr-only">Host and promotion</legend>
        <Field label="Host name shown"><input name="hostName" required defaultValue={w?.host_display_name ?? ""} className="field" /></Field>
        <Field label="Co-hosts or guest speakers"><input name="coHosts" defaultValue={w?.co_hosts ?? ""} className="field" /></Field>
        <Field label="Speaker biography" wide><textarea name="hostBio" maxLength={1500} defaultValue={w?.host_bio ?? ""} className="field !min-h-[90px]" /></Field>
        <Field label="Promotional flyer or image" hint="PNG, JPEG or WebP, up to 5 MB."><input name="promoImage" type="file" accept="image/png,image/jpeg,image/webp" className="field !py-2" /></Field>
        <Field label="Business logo"><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="field !py-2" /></Field>
        <Field label="Speaker headshot"><input name="headshot" type="file" accept="image/png,image/jpeg,image/webp" className="field !py-2" /></Field>
        <Field label="Promotional design" hint="Luxury templates for your share graphics — or use your own flyer.">
          <select name="template" defaultValue={w?.use_template ?? "espresso"} className="field">{Object.entries(TEMPLATES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Resources for attendees" hint="Links or notes shared with registrants" wide><textarea name="resources" defaultValue={w?.resources ?? ""} className="field !min-h-[70px]" /></Field>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input type="checkbox" name="rights" required className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
          <span>I own or have permission to use these images, logos and materials, and this webinar is educational — not a sales pitch, investment offer or promise of financial results.</span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button name="intent" value="draft" className="btn btn-ghost">Save draft</button>
        <button name="intent" value="submit" className="btn btn-gold">Submit for review</button>
      </div>
      <p className="text-right text-xs text-faint">Every webinar is reviewed before it’s published. Edits to an approved webinar are reviewed again.</p>
    </ActionForm>
  );
}
