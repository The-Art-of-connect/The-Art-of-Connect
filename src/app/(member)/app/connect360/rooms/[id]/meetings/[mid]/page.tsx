import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { MinutesJourney } from "@/components/MinutesJourney";
import { approveMinutes, emailMinutes, endMeeting, grantAccess, joinMeeting, saveMinutes, setRecording } from "@/app/actions/meetings";
import { MINUTES_SECTIONS, NOT_BINDING, RECORDING_LABEL, itemEditLine, itemLine, type Minutes } from "@/lib/meetings";

export const metadata = { title: "Meeting · Business Deal Room" };
export const dynamic = "force-dynamic";

type Person = { user_id: string; display: string; role: string };
const fmt = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

/** A Business Deal Room meeting (directive 48): host-controlled minutes, consent-first recording, approval before sharing. */
export default async function Meeting({ params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params;
  const viewer = (await getViewer())!;
  const db = (await createClient())!;
  const b = db.schema("business");
  const { data: m } = await b.from("room_meetings").select("id, room_id, host_id, title, purpose, minutes_mode, recording_state, status, started_at, ended_at").eq("id", mid).eq("room_id", id).maybeSingle();
  if (!m) notFound();
  const host = m.host_id === viewer.id;
  const [{ data: people }, { data: attendees }, { data: versions }, { data: access }, { data: items }, { data: rec }] = await Promise.all([
    b.rpc("room_people", { room: id }),
    b.from("meeting_attendees").select("user_id, joined_at, recording_consent").eq("meeting_id", mid),
    b.from("meeting_minutes").select("id, version, sections, drafted_by, status, approved_at, created_at").eq("meeting_id", mid).order("version", { ascending: false }),
    host ? b.from("meeting_access").select("user_id").eq("meeting_id", mid) : Promise.resolve({ data: [] }),
    b.from("room_items").select("id, kind, title, status, due_at").eq("room_id", id).eq("space", "shared").like("detail", `From approved meeting minutes: %`),
    db.from("platform_settings").select("value").eq("key", "meeting_recording_provider_approved").maybeSingle(),
  ]);
  const ppl = (people ?? []) as Person[];
  const nameOf = (uid: string) => ppl.find((p) => p.user_id === uid)?.display ?? "Participant";
  const joined = (attendees ?? []).some((a) => a.user_id === viewer.id);
  const all = versions ?? [];
  const approved = all.find((v) => v.status === "approved");
  const latest = all[0];
  const editing = (latest?.sections ?? approved?.sections ?? {}) as Minutes;
  const recordingAvailable = rec?.value === true;
  const allConsented = (attendees ?? []).length > 0 && (attendees ?? []).every((a) => a.recording_consent);
  const sharedWith = new Set([...(attendees ?? []).map((a) => a.user_id), ...((access ?? []) as { user_id: string }[]).map((a) => a.user_id)]);
  const laterJoiners = ppl.filter((p) => !sharedWith.has(p.user_id) && p.user_id !== m.host_id);
  const hidden = <><input type="hidden" name="room" value={id} /><input type="hidden" name="meeting" value={mid} /></>;
  const outstanding = (items ?? []).filter((i) => !["done", "resolved", "not_applicable"].includes(i.status));
  const completed = (items ?? []).filter((i) => ["done", "resolved", "not_applicable"].includes(i.status));

  return (
    <>
      <Link href={`/app/connect360/rooms/${id}#meetings`} className="text-sm text-gold">← Business Deal Room</Link>
      <header className="glass mt-4 p-6">
        <p className="eyebrow">Business Deal Room meeting · {m.status === "open" ? "In progress" : "Ended"}</p>
        <h1 className="display mt-2 text-4xl">{m.title}</h1>
        {m.purpose && <p className="mt-2 text-muted">{m.purpose}</p>}
        <p className="mt-2 text-sm text-muted">Started {fmt(m.started_at)}{m.ended_at ? ` · ended ${fmt(m.ended_at)}` : ""} · hosted by {host ? "you" : nameOf(m.host_id)}</p>
        <p role="status" aria-live="polite" className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${m.recording_state === "recording" ? "border-danger/50 text-danger" : "border-line text-muted"}`}>
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${m.recording_state === "recording" ? "bg-danger" : "bg-faint"}`} />{RECORDING_LABEL[m.recording_state]}
        </p>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {!joined && m.status === "open" && (
            <section className="glass p-6">
              <h2 className="display text-2xl">Join this meeting</h2>
              <MemberForm action={joinMeeting} className="mt-3 space-y-3">{hidden}
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" className="mt-1" /> I consent to this meeting being recorded if the host starts a recording. {m.recording_state === "recording" ? "This meeting is being recorded now, so consent is required to join." : "You can join without consenting; recording then cannot begin."}</label>
                <button className="btn btn-gold btn-sm">Join</button>
              </MemberForm>
            </section>
          )}

          {m.minutes_mode === "none" && !all.length ? (
            <section className="glass p-6"><h2 className="display text-2xl">Minutes</h2><p className="mt-2 text-sm text-muted">The host chose not to keep minutes for this meeting.</p></section>
          ) : host ? (
            <section className="glass p-6">
              <h2 className="display text-2xl">Minutes</h2>
              <p className="mt-1 text-sm text-muted">Only you, the host, write and approve the minutes. Participants see them after you approve. Proposals stay separate from decisions.</p>
              {m.minutes_mode === "journey_assisted" && <div className="mt-4"><MinutesJourney meeting={mid} room={id} title={m.title} /></div>}
              <MemberForm action={saveMinutes} className="mt-4 space-y-3">{hidden}
                {MINUTES_SECTIONS.map((s) => (
                  <label key={s.key} className="block text-sm"><span className="font-semibold">{s.label}</span>{"hint" in s && <span className="block text-xs text-muted">{s.hint}</span>}
                    <textarea name={s.key} rows={3} maxLength={6000} className="field mt-1" defaultValue={(editing[s.key] ?? []).map((i) => itemEditLine(s.key, i)).join("\n")} placeholder="One item per line" /></label>
                ))}
                <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="from_journey" value="1" /> These sections include Journey&apos;s organized draft (I reviewed it)</label>
                <button className="btn btn-gold btn-sm">Save draft</button>
              </MemberForm>
              {latest && latest.status === "draft" && (
                <MemberForm action={approveMinutes} className="mt-4 flex flex-wrap items-center gap-3">{hidden}<input type="hidden" name="version" value={latest.version} />
                  <button className="btn btn-ghost btn-sm">Approve version {latest.version}</button>
                  <span className="text-xs text-muted">Approval shares the minutes with participants and adds decisions and responsibilities to the room&apos;s plan.</span>
                </MemberForm>
              )}
            </section>
          ) : null}

          {approved && (
            <section className="glass p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="display text-2xl">Approved minutes <span className="text-base text-muted">· version {approved.version}</span></h2>
                <Link href={`/app/connect360/rooms/${id}/meetings/${mid}/print`} className="btn btn-ghost btn-sm">Typed copy (print or PDF)</Link>
              </div>
              <p className="mt-1 text-xs text-muted">Approved {approved.approved_at ? fmt(approved.approved_at) : ""}{approved.drafted_by === "journey" ? " · organized with Journey and reviewed by the host" : ""}</p>
              {MINUTES_SECTIONS.filter((s) => ((approved.sections as Minutes)[s.key] ?? []).length).map((s) => (
                <div key={s.key} className="mt-4"><h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-gold-deep">{s.label}</h3>
                  <ul className="mt-1 list-disc pl-5 text-sm">{((approved.sections as Minutes)[s.key] ?? []).map((i, n) => <li key={n}>{itemLine(i)}</li>)}</ul></div>
              ))}
              <p className="mt-5 text-xs italic text-muted">{NOT_BINDING}</p>
              {host && (
                <div className="mt-4 space-y-2 border-t border-line pt-4">
                  <MemberForm action={emailMinutes}>{hidden}<button className="btn btn-ghost btn-sm">Email to participants</button></MemberForm>
                  <p className="text-xs text-muted">Text message delivery needs an approved SMS provider, which hasn&apos;t been activated yet. Participants can always read the typed copy here.</p>
                </div>
              )}
            </section>
          )}

          {(outstanding.length > 0 || completed.length > 0) && (
            <section className="glass p-6">
              <h2 className="display text-2xl">From meeting minutes</h2>
              <h3 className="mt-3 text-sm font-semibold">Outstanding</h3>
              <ul className="mt-1 text-sm">{outstanding.map((i) => <li key={i.id}>{i.title}{i.due_at ? ` · due ${new Date(i.due_at).toLocaleDateString()}` : ""}</li>)}{!outstanding.length && <li className="text-muted">Nothing outstanding.</li>}</ul>
              <h3 className="mt-3 text-sm font-semibold">Completed</h3>
              <ul className="mt-1 text-sm text-muted">{completed.map((i) => <li key={i.id}>{i.title}</li>)}{!completed.length && <li>None yet.</li>}</ul>
            </section>
          )}

          {host && all.length > 0 && (
            <section className="glass p-6">
              <h2 className="display text-2xl">Version history</h2>
              <ul className="mt-2 divide-y divide-line text-sm">{all.map((v) => <li key={v.id} className="py-2">Version {v.version} · {v.status === "approved" ? "approved" : "draft"} · {v.drafted_by === "journey" ? "with Journey" : "by you"} · {fmt(v.created_at)}</li>)}</ul>
              <p className="mt-2 text-xs text-muted">Every version is kept. Approved minutes are never overwritten.</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="glass p-6">
            <h2 className="display text-xl">Attendees</h2>
            <ul className="mt-2 text-sm">{(attendees ?? []).map((a) => <li key={a.user_id} className="py-1">{nameOf(a.user_id)}{a.user_id === m.host_id ? " (host)" : ""} <span className="text-xs text-muted">· {a.recording_consent ? "consented to recording" : "no recording consent"}</span></li>)}</ul>
          </section>
          {host && m.status === "open" && (
            <section className="glass p-6">
              <h2 className="display text-xl">Host controls</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["recording", "paused", "stopped"] as const).map((st) => (
                  <MemberForm key={st} action={setRecording}>{hidden}<input type="hidden" name="state" value={st} />
                    <button className="btn btn-ghost btn-sm" disabled={!recordingAvailable || (st === "recording" && !allConsented)}>{st === "recording" ? "Start recording" : st === "paused" ? "Pause" : "Stop"}</button></MemberForm>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{recordingAvailable ? (allConsented ? "Everyone has consented." : "Recording can start only when every participant consents.") : "Recording not available yet. Meetings and minutes work without it."}</p>
              <MemberForm action={endMeeting} className="mt-4">{hidden}<button className="btn btn-gold btn-sm">End meeting</button></MemberForm>
            </section>
          )}
          {host && approved && laterJoiners.length > 0 && (
            <section className="glass p-6">
              <h2 className="display text-xl">Share with later participants</h2>
              <p className="mt-1 text-xs text-muted">People who joined the room after this meeting can&apos;t see it unless you share it.</p>
              <MemberForm action={grantAccess} className="mt-3 space-y-2">{hidden}
                <select name="user" required className="field" defaultValue="" aria-label="Participant"><option value="" disabled>Choose a participant</option>{laterJoiners.map((p) => <option key={p.user_id} value={p.user_id}>{p.display}</option>)}</select>
                <button className="btn btn-ghost btn-sm">Share these minutes</button>
              </MemberForm>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
