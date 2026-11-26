import Link from "next/link";
import { requireStaff, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, CATEGORY_LABEL, slotStart, topicOpen, type Topic } from "@/lib/circle";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { LocalTime } from "@/components/LocalTime";
import { approveAllTopics, authorizeModerator, decideSuggestion, resolveCircleReport, saveCircleTopic, scheduleTopic, setAiScreening, setModerator, setTopicStatus } from "@/app/actions/circle-admin";
import { moderateCircle } from "@/app/actions/circle";

export const metadata = { title: "Global Conversation Control Center" };
export const dynamic = "force-dynamic";

/**
 * Global Conversation Control Center (founder directive 19, section 22). Real counts only. Confidential content is not
 * shown here beyond what moderators need to act on reports.
 */
export default async function ConversationControlCenter() {
  const viewer = await requireStaff(["owner", "admin", "moderator"]);
  const owner = hasRole(viewer, ["owner"]);
  const db = (await createClient())!;
  const admin = createAdminClient();
  const now = new Date();
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const [{ data: topics }, { data: suggestions }, { data: mods }, { data: reports }, { data: log }, { data: ai }, posts24] = await Promise.all([
    db.from("circle_topics").select("id, title, prompt, category, slot_start, open_hours, paused, closed_at, room, status, source").order("slot_start", { ascending: true, nullsFirst: false }).limit(400),
    db.from("circle_suggestions").select("id, title, category, note, status, created_at").eq("status", "new").order("created_at").limit(50),
    db.from("circle_moderators").select("user_id, status, training_completed_at, created_at"),
    db.from("circle_reports").select("id, topic_id, post_id, reason, details, status, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(50),
    db.from("circle_mod_log").select("id, action, reason, created_at, topic_id").order("created_at", { ascending: false }).limit(40),
    db.from("platform_settings").select("value").eq("key", "circle_ai_screening").maybeSingle(),
    admin ? admin.from("circle_posts").select("author_id").gte("created_at", since) : Promise.resolve({ data: [] }),
  ]);
  const all = (topics ?? []) as (Topic & { source: string })[];
  const scheduled = all.filter((t) => t.status === "scheduled");
  const openNow = scheduled.filter((t) => topicOpen(t, now));
  const upcoming = scheduled.filter((t) => Date.parse(t.slot_start!) > now.getTime());
  const pool = all.filter((t) => t.status === "approved");
  const drafts = all.filter((t) => t.status === "draft");
  const participants = new Set(((posts24.data ?? []) as { author_id: string }[]).map((p) => p.author_id)).size;
  const modIds = ((mods ?? []) as { user_id: string }[]).map((m) => m.user_id);
  const { data: modNames } = admin && modIds.length ? await admin.from("profiles").select("id, display_name, email").in("id", modIds) : { data: [] };
  const name = Object.fromEntries(((modNames ?? []) as { id: string; display_name: string | null; email: string }[]).map((m) => [m.id, m.display_name ?? m.email]));
  const slots = Array.from({ length: 12 }, (_, i) => new Date(slotStart(now).getTime() + i * 4 * 3600_000));

  return (
    <>
      <PageHeader eyebrow="Owner Portal" title="Global Conversation Control Center" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">The Becoming Circle and live discussions. Approved topics fill the four-hour slots automatically for the next 48 hours, so you never have to schedule each one. Phase one is written discussion; live audio, speaking turns, lounges and private meetings follow in later phases. <Link href="/app/circle" className="text-gold underline">Open the member view →</Link></p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Open discussions" value={openNow.length} />
        <Stat label="Participants (24h)" value={participants} />
        <Stat label="Upcoming scheduled" value={upcoming.length} />
        <Stat label="Approved pool" value={pool.length} hint="Ready for rotation" />
        <Stat label="Member moderators" value={(mods ?? []).filter((m) => m.status === "authorized" && m.training_completed_at).length} hint="Plus staff moderators" />
        <Stat label="Open reports" value={(reports ?? []).length} />
      </div>

      <Panel title="Next 48 hours (four-hour slots)">
        <ul className="divide-y divide-line">
          {slots.map((s) => {
            const t = scheduled.find((x) => Date.parse(x.slot_start!) === s.getTime());
            return (
              <li key={s.toISOString()} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="w-56 text-muted"><LocalTime iso={s.toISOString()} /></span>
                <span className="flex-1">{t ? <><span className="font-semibold">{t.title}</span> <span className="text-xs text-muted">· {CATEGORY_LABEL[t.category]}</span></> : <span className="text-danger">Empty: approve more topics to fill it automatically</span>}</span>
                {t && (
                  <span className="flex gap-3">
                    <Link href={`/app/circle/${t.id}`} className="text-xs text-gold underline">Open</Link>
                    {topicOpen(t, now) && <ActionForm action={moderateCircle}><input type="hidden" name="action" value="pause" /><input type="hidden" name="topic_id" value={t.id} /><button className="text-xs text-danger underline">Emergency pause</button></ActionForm>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      {openNow.length > 0 && (
        <Panel title="Open discussions · emergency controls">
          <ul className="divide-y divide-line">{openNow.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <Link href={`/app/circle/${t.id}`} className="font-semibold underline">{t.title}</Link>
              <span className="flex gap-3">
                <ActionForm action={moderateCircle}><input type="hidden" name="action" value="pause" /><input type="hidden" name="topic_id" value={t.id} /><button className="btn btn-ghost btn-sm">Pause</button></ActionForm>
                <ActionForm action={moderateCircle}><input type="hidden" name="action" value="close" /><input type="hidden" name="topic_id" value={t.id} /><button className="btn btn-ghost btn-sm">Close</button></ActionForm>
              </span>
            </li>
          ))}</ul>
        </Panel>
      )}

      <Panel title={`Topics awaiting approval (${drafts.length})`}>
        {owner && drafts.length > 0 && (
          <ActionForm action={approveAllTopics} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="h-4 w-4" />I have reviewed these topics</label>
            <button className="btn btn-gold btn-sm">Approve all for the rotation</button>
            <span className="text-xs text-muted">Topics prepared by Peace are drafts until you approve them.</span>
          </ActionForm>
        )}
        <ul className="divide-y divide-line">{drafts.map((t) => (
          <li key={t.id} className="px-5 py-4">
            <p className="text-xs text-muted">{CATEGORY_LABEL[t.category]} · {t.source === "peace" ? "prepared by Peace" : t.source === "member" ? "from a member suggestion" : "owner"}</p>
            <p className="font-semibold">{t.title}</p><p className="text-sm text-muted">{t.prompt}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {owner && <ActionForm action={setTopicStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="approved" /><button className="btn btn-gold btn-sm">Approve</button></ActionForm>}
              {owner && <ActionForm action={scheduleTopic} className="flex items-center gap-2"><input type="hidden" name="id" value={t.id} /><input type="datetime-local" name="slot" className="field !min-h-9 text-xs" /><button className="btn btn-ghost btn-sm">Schedule for a specific slot</button></ActionForm>}
              <ActionForm action={setTopicStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="declined" /><button className="text-xs text-muted underline">Decline</button></ActionForm>
            </div>
          </li>
        ))}{!drafts.length && <li className="px-5 py-5 text-sm text-muted">Nothing waiting.</li>}</ul>
      </Panel>

      <Panel title="New topic">
        <ActionForm action={saveCircleTopic} className="grid gap-3 p-5 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">Title<input name="title" required maxLength={160} className="field mt-1 w-full" placeholder="Can two people grow in different directions and remain together?" /></label>
          <label className="text-sm sm:col-span-2">Prompt<textarea name="prompt" required rows={3} maxLength={1500} className="field mt-1 w-full" /></label>
          <label className="text-sm">Category<select name="category" className="field mt-1 w-full">{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="text-sm">Stays open for (hours)<input type="number" name="open_hours" min={4} max={168} defaultValue={24} className="field mt-1 w-full" /></label>
          <div><button className="btn btn-gold">Save as draft</button></div>
        </ActionForm>
        <p className="px-5 pb-5 text-xs text-muted">Use current events as inspiration only: no gossip, humiliation, misinformation or copying other creators&rsquo; content.</p>
      </Panel>

      <Panel title={`Member suggestions (${(suggestions ?? []).length})`}>
        <ul className="divide-y divide-line">{(suggestions ?? []).map((s) => (
          <li key={s.id} className="px-5 py-4 text-sm">
            <p className="font-semibold">{s.title}</p><p className="text-xs text-muted">{CATEGORY_LABEL[s.category] ?? s.category}{s.note ? ` · ${s.note}` : ""}</p>
            <div className="mt-2 flex gap-3">
              <ActionForm action={decideSuggestion}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="decision" value="accepted" /><button className="btn btn-ghost btn-sm">Accept as draft</button></ActionForm>
              <ActionForm action={decideSuggestion}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="decision" value="declined" /><button className="text-xs text-muted underline">Decline</button></ActionForm>
            </div>
          </li>
        ))}{!(suggestions ?? []).length && <li className="px-5 py-5 text-sm text-muted">No new suggestions.</li>}</ul>
      </Panel>

      <Panel title={`Reports (${(reports ?? []).length} open)`}>
        <ul className="divide-y divide-line">{(reports ?? []).map((r) => (
          <li key={r.id} className="px-5 py-4 text-sm">
            <p><span className="font-semibold">{r.reason}</span> · <LocalTime iso={r.created_at} />{r.topic_id && <> · <Link href={`/app/circle/${r.topic_id}`} className="text-gold underline">open discussion</Link></>}</p>
            {r.details && <p className="mt-1 text-muted">{r.details}</p>}
            <div className="mt-2 flex gap-3">
              <ActionForm action={resolveCircleReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="resolved" /><button className="btn btn-ghost btn-sm">Resolved</button></ActionForm>
              <ActionForm action={resolveCircleReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="dismissed" /><button className="text-xs text-muted underline">Dismiss</button></ActionForm>
            </div>
          </li>
        ))}{!(reports ?? []).length && <li className="px-5 py-5 text-sm text-muted">No open reports.</li>}</ul>
      </Panel>

      <Panel title="Moderators">
        <p className="px-5 pt-4 text-sm text-muted">Staff with the owner, admin or moderator role can moderate. Members may moderate once you authorize them and their training (The Art of Leading a Conversation, phase three) is recorded.</p>
        <ul className="divide-y divide-line">{(mods ?? []).map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <span>{name[m.user_id] ?? m.user_id.slice(0, 8)} · {m.status}{m.training_completed_at ? " · trained" : " · training pending"}</span>
            {owner && <span className="flex gap-3">
              {!m.training_completed_at && <ActionForm action={setModerator}><input type="hidden" name="user_id" value={m.user_id} /><input type="hidden" name="action" value="trained" /><button className="text-xs text-gold underline">Record training</button></ActionForm>}
              <ActionForm action={setModerator}><input type="hidden" name="user_id" value={m.user_id} /><input type="hidden" name="action" value={m.status === "authorized" ? "suspended" : "authorized"} /><button className="text-xs text-muted underline">{m.status === "authorized" ? "Suspend" : "Reinstate"}</button></ActionForm>
            </span>}
          </li>
        ))}</ul>
        {owner && (
          <ActionForm action={authorizeModerator} className="flex flex-wrap items-end gap-3 px-5 py-4">
            <label className="text-sm">Member email<input name="email" type="email" className="field mt-1" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="trained" />Training completed</label>
            <button className="btn btn-ghost btn-sm">Authorize moderator</button>
          </ActionForm>
        )}
      </Panel>

      <Panel title="Moderation history">
        <ul className="divide-y divide-line text-sm">{(log ?? []).map((l) => <li key={l.id} className="px-5 py-2"><LocalTime iso={l.created_at} /> · {l.action.replace("_", " ")}{l.reason ? ` · ${l.reason}` : ""}</li>)}
          {!(log ?? []).length && <li className="px-5 py-4 text-muted">No moderator actions yet.</li>}</ul>
      </Panel>

      <Panel title="Safety Shield settings">
        <div className="space-y-2 p-5 text-sm">
          <p>Personal information is always blocked by the database. Disrespectful wording asks members to revise; threats and money requests are blocked and reported here.</p>
          <p>Optional contextual AI screening (OpenAI moderation, no usage charge) is <strong>{ai?.value === true ? "on" : "off"}</strong>.</p>
          {owner && <ActionForm action={setAiScreening}><input type="hidden" name="on" value={ai?.value === true ? "false" : "true"} /><button className="btn btn-ghost btn-sm">{ai?.value === true ? "Turn off" : "Turn on"} AI screening</button></ActionForm>}
        </div>
      </Panel>

      <Panel title="Coming in later phases">
        <ul className="space-y-1 p-5 text-sm text-muted">
          <li>Phase 2: moderated live audio, two-minute speaking turns, I&rsquo;m Finished Speaking, speaking queue, speaking purchases in Sandbox ($2.99 turn and $7.99 day pass proposed, not approved). Needs real-time audio infrastructure: Peace will present options and costs first.</li>
          <li>Phase 3: paid discussion lounges, Create the Conversation, automated topic approval, membership scheduling priority, moderator training, invitations and QR codes.</li>
          <li>Phase 4: the Private Meeting Suite for Executive Private and Elite.</li>
          <li>Phase 5: the Global Boardroom, captions, translation and expanded analytics.</li>
        </ul>
      </Panel>
    </>
  );
}
