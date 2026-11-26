import { ActionForm } from "@/components/admin/ActionForm";
import { saveSanctuaryContent } from "@/app/actions/sanctuary-admin";
import { KINDS, TOPICS, type Content } from "@/lib/sanctuary";

/** Create or edit one Sanctuary item. Status changes (approve, publish) are separate, owner-only buttons. */
export function SanctuaryContentForm({ item }: { item?: Content }) {
  return (
    <ActionForm action={saveSanctuaryContent} className="grid gap-3 sm:grid-cols-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="text-sm">Type<select name="kind" defaultValue={item?.kind ?? "affirmation"} className="field mt-1 w-full">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="text-sm">Topic<select name="topic" defaultValue={item?.topic ?? ""} className="field mt-1 w-full"><option value="">None</option>{TOPICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="text-sm sm:col-span-2">Title (lessons and scenarios)<input name="title" defaultValue={item?.title ?? ""} maxLength={160} className="field mt-1 w-full" /></label>
      <label className="text-sm sm:col-span-2">Main text<textarea name="body" required rows={5} maxLength={6000} defaultValue={item?.body ?? ""} className="field mt-1 w-full" /></label>
      <label className="text-sm sm:col-span-2">Practical example (lessons)<textarea name="example" rows={3} maxLength={3000} defaultValue={item?.example ?? ""} className="field mt-1 w-full" /></label>
      <label className="text-sm">Reflection question (lessons)<textarea name="reflection" rows={2} maxLength={1000} defaultValue={item?.reflection ?? ""} className="field mt-1 w-full" /></label>
      <label className="text-sm">Activity (lessons)<textarea name="activity" rows={2} maxLength={1500} defaultValue={item?.activity ?? ""} className="field mt-1 w-full" /></label>
      <label className="text-sm sm:col-span-2">Answer options (scenarios only, JSON)
        <textarea name="options" rows={5} defaultValue={item?.options ? JSON.stringify(item.options, null, 1) : ""} className="field mt-1 w-full font-mono text-xs"
          placeholder='[{"key":"a","label":"Talk it through","insight":"You prefer to address things openly.","signals":["communication:direct","explore:friendship"]}]' />
        <span className="text-xs text-faint">Signals starting with explore: (business, friendship, social, travel, singles, couples, growth, wellness, webinars) guide a member&rsquo;s suggestions when they consent.</span></label>
      <label className="text-sm">Mini-course (optional, e.g. foundations-of-becoming)<input name="course" defaultValue={item?.course ?? ""} maxLength={60} className="field mt-1 w-full" /></label>
      <label className="text-sm">Order in course<input type="number" name="course_order" min={1} defaultValue={item?.course_order ?? ""} className="field mt-1 w-full" /></label>
      <label className="text-sm">Schedule for a specific day (optional)<input type="date" name="publish_on" defaultValue={item?.publish_on ?? ""} className="field mt-1 w-full" />
        <span className="text-xs text-faint">Blank = part of the daily rotation once published.</span></label>
      <div className="flex items-end"><button className="btn btn-gold">{item ? "Save changes" : "Add as draft"}</button></div>
    </ActionForm>
  );
}
