import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { createEvent } from "@/app/actions/social";
import { EVENT_CATEGORIES, TIMEZONES } from "@/lib/social";

export const metadata = { title: "Share an event" };

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ circle?: string }> }) {
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">Preview: sign in with your own account to share events.</p>;
  const { circle } = await searchParams;
  const db = (await createClient())!;
  const { data: mine } = await db.from("social_circle_members").select("social_circles(id, name)").eq("user_id", viewer.id);
  const circles = ((mine ?? []) as unknown as { social_circles: { id: string; name: string } | null }[]).map((m) => m.social_circles).filter(Boolean) as { id: string; name: string }[];
  return (
    <div className="space-y-6">
      <header><p className="eyebrow">The Connect Calendar</p><h1 className="display mt-2 text-4xl">Share an event</h1>
        <p className="mt-2 text-sm text-muted">Create your own gathering, or let members know about an event you discovered. You don&rsquo;t need to be the organizer.</p></header>
      <ActionForm action={createEvent} className="glass space-y-5 p-6">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-[#e8701a]"><input type="radio" name="origin" value="shared_external" defaultChecked /> <span><span className="font-semibold">I discovered this event</span><span className="block text-xs text-muted">Organized by someone else; I&rsquo;m sharing it.</span></span></label>
          <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-[#e8701a]"><input type="radio" name="origin" value="member_organized" /> <span><span className="font-semibold">I&rsquo;m organizing it</span><span className="block text-xs text-muted">A gathering I&rsquo;m hosting.</span></span></label>
        </fieldset>
        <label className="block text-sm">Event name<input name="title" required maxLength={140} className="field mt-1 w-full" /></label>
        <label className="block text-sm">Description<textarea name="description" rows={4} maxLength={4000} className="field mt-1 w-full" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Category<select name="category" required className="field mt-1 w-full">{EVENT_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm">Photo or flyer<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" /></label>
          <label className="text-sm">Starts<input type="datetime-local" name="starts_at" required className="field mt-1 w-full" /></label>
          <label className="text-sm">Ends (optional)<input type="datetime-local" name="ends_at" className="field mt-1 w-full" /></label>
          <label className="text-sm">Time zone<select name="timezone" defaultValue="America/New_York" className="field mt-1 w-full">{TIMEZONES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></label>
          <label className="text-sm">Format<select name="mode" className="field mt-1 w-full"><option value="in_person">In person</option><option value="virtual">Virtual</option><option value="hybrid">In person and virtual</option></select></label>
          <label className="text-sm sm:col-span-2">Venue<input name="venue" maxLength={200} className="field mt-1 w-full" /></label>
          <label className="text-sm">City<input name="city" maxLength={80} className="field mt-1 w-full" /></label>
          <label className="text-sm">State / region<input name="region" maxLength={80} className="field mt-1 w-full" /></label>
          <label className="text-sm">Country<input name="country" maxLength={80} defaultValue="United States" className="field mt-1 w-full" /></label>
          <label className="text-sm">Organizer<input name="organizer_name" maxLength={120} className="field mt-1 w-full" placeholder="Who organizes it" /></label>
          <label className="text-sm sm:col-span-2">Official website or registration link<input name="url" type="url" placeholder="https://" className="field mt-1 w-full" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_free" defaultChecked /> Free admission</label>
          <label className="text-sm">Admission cost (if not free)<input name="cost_text" maxLength={80} placeholder="e.g. $45, tickets via organizer" className="field mt-1 w-full" /></label>
          <label className="text-sm">Who it&rsquo;s for<select name="eligibility" className="field mt-1 w-full"><option value="all">All members</option><option value="couples">Couples</option><option value="singles">Singles 30+</option><option value="elite">Elite members</option></select></label>
          <label className="text-sm">Who can see it<select name="audience" defaultValue={circle ? `circle:${circle}` : "members"} className="field mt-1 w-full"><option value="members">All members</option><option value="connections">My connections</option>{circles.map((c) => <option key={c.id} value={`circle:${c.id}`}>{c.name}</option>)}</select></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="to_feed" defaultChecked /> Also share it in the Connection Feed</label>
        <p className="rounded-xl border border-line p-3 text-xs text-muted">Please share accurate details. Payments for member events are never collected through The Art of Connect, and listings asking for direct payments are reviewed. Members&rsquo; attendance is private unless they choose to show it.</p>
        <button className="btn btn-gold">Share event</button>
      </ActionForm>
    </div>
  );
}
