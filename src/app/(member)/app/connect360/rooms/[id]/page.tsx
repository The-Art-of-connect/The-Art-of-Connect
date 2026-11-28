import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ADVISOR_TYPES, DOC_CATEGORIES, ITEM_KINDS, REVIEW_STATUS, SCAN_STATUS, STAGES } from "@/lib/connect360";
import { MemberForm } from "@/components/MemberForm";
import { VaultUpload } from "@/components/VaultUpload";
import {
  addItem, createDocument, invitePrincipal, inviteAdvisor, postRoomMessage, recordReview, removeParticipant, revokeAdvisorInvite,
  setItemStatus, setMyParticipation, updateRoom,
} from "@/app/actions/connect360";

export const metadata = { title: "Deal Room · CONNECT 360" };
export const dynamic = "force-dynamic";

type Person = { participant_id: string; user_id: string; display: string; role: string; advisor_type: string | null; client_id: string | null; status: string; credential: string | null };
type Item = { id: string; kind: string; title: string; detail: string | null; status: string; due_at: string | null; created_at: string };
type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Doc = { id: string; title: string; category: string; privileged: boolean; review_status: string; current_version: number; uploaded_by: string; document_versions: { id: string; version: number; file_name: string; scan_status: string; created_at: string }[] };

const fmt = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

/** One Business Deal Room (directives 27 §6, 28 §6–11). Everything shown here is limited by the database to this room's participants. */
export default async function DealRoom({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ space?: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  const db = (await createClient())!;
  const b = db.schema("business");
  const { data: room } = await b.from("deal_rooms").select("id, owner_id, title, objective, stage, status").eq("id", id).maybeSingle();
  if (!room) notFound();
  const { data: me } = await b.from("room_participants").select("role, status, advisor_type, client_id").eq("room_id", id).eq("user_id", viewer.id).maybeSingle();
  if (!me) notFound();
  const invited = me.status === "invited";
  const side = me.role === "advisor" ? me.client_id : viewer.id;
  const space = (await searchParams).space === "private" ? "private" : "shared";
  const isOwner = me.role === "owner";
  const isPrincipal = me.role === "owner" || me.role === "principal";
  const reviewer = me.role === "advisor" && ["attorney", "accountant"].includes(me.advisor_type ?? "");

  if (invited) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="glass mt-6 p-8">
          <p className="eyebrow">Deal Room invitation</p>
          <h1 className="display mt-2 text-4xl">{room.title}</h1>
          {room.objective && <p className="mt-3 text-muted">{room.objective}</p>}
          <p className="mt-4 text-sm text-muted">Joining lets you see the shared workspace and bring your own advisors. Joining a Deal Room is not an agreement or commitment of any kind, and you can withdraw at any time.</p>
          <div className="mt-6 flex gap-3">
            <MemberForm action={setMyParticipation}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="active" /><button className="btn btn-gold btn-sm">Join the Deal Room</button></MemberForm>
            <MemberForm action={setMyParticipation}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="declined" /><button className="btn btn-ghost btn-sm">Decline</button></MemberForm>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: people }, { data: collaborators }, { data: invites }, { data: items }, { data: msgs }, { data: docs }] = await Promise.all([
    b.rpc("room_people", { room: id }),
    isOwner ? b.rpc("my_collaborators") : Promise.resolve({ data: [] }),
    isPrincipal ? b.from("advisor_invites").select("id, advisor_name, advisor_type, status, expires_at").eq("room_id", id).eq("client_id", viewer.id).eq("status", "pending") : Promise.resolve({ data: [] }),
    (space === "shared" ? b.from("room_items").select("id, kind, title, detail, status, due_at, created_at").eq("room_id", id).eq("space", "shared") : b.from("room_items").select("id, kind, title, detail, status, due_at, created_at").eq("room_id", id).eq("space", "private").eq("space_owner", side!)).order("created_at"),
    (space === "shared" ? b.from("room_messages").select("id, sender_id, body, created_at").eq("room_id", id).eq("space", "shared") : b.from("room_messages").select("id, sender_id, body, created_at").eq("room_id", id).eq("space", "private").eq("space_owner", side!)).order("created_at").limit(200),
    (space === "shared" ? b.from("room_documents").select("id, title, category, privileged, review_status, current_version, uploaded_by, document_versions(id, version, file_name, scan_status, created_at)").eq("room_id", id).eq("space", "shared") : b.from("room_documents").select("id, title, category, privileged, review_status, current_version, uploaded_by, document_versions(id, version, file_name, scan_status, created_at)").eq("room_id", id).eq("space", "private").eq("space_owner", side!)).order("created_at"),
  ]);
  const ppl = (people ?? []) as Person[];
  const nameOf = (uid: string) => ppl.find((p) => p.user_id === uid)?.display ?? "Participant";
  const sideName = nameOf(side!);
  const members = new Set(ppl.map((p) => p.user_id));
  const eligible = ((collaborators ?? []) as { user_id: string; display: string }[]).filter((c) => !members.has(c.user_id));
  const open = ((items ?? []) as Item[]).filter((i) => !["done", "resolved", "not_applicable"].includes(i.status));
  const closed = ((items ?? []) as Item[]).filter((i) => ["done", "resolved", "not_applicable"].includes(i.status));
  const tab = (s: string, label: string) => <Link href={`/app/connect360/rooms/${id}?space=${s}`} className={`nav-pill text-sm ${space === s ? "!border-champagne !bg-champagne/15" : ""}`}>{label}</Link>;
  const spaceFields = <><input type="hidden" name="id" value={id} /><input type="hidden" name="space" value={space} /><input type="hidden" name="space_owner" value={side ?? ""} /></>;

  return (
    <>
      <Link href="/app/connect360/rooms" className="text-sm text-gold">← Deal Rooms</Link>
      <section className="theme-dark relative mt-4 overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10" style={{ background: "var(--ink)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--glow)" }} aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow">Business Deal Room · {STAGES[room.stage]}</p>
          <h1 className="display mt-3 text-4xl text-gold-bright sm:text-5xl">{room.title}</h1>
          {room.objective && <p className="mt-3 max-w-3xl text-muted">{room.objective}</p>}
          <p className="mt-4 text-xs text-faint">Confidential to the participants below. Nothing here is a binding agreement; binding documents are prepared and executed through your own professionals.</p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {tab("shared", "Shared workspace")}
        {tab("private", `Private advisor space · ${me.role === "advisor" ? sideName : "you and your advisors"}`)}
      </div>
      {space === "private" && <p className="mt-2 text-xs text-muted">Only {me.role === "advisor" ? `${sideName} and their` : "you and your"} invited advisors can see this space. Legal advice placed here is never shared with other parties.</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="glass p-6">
            <h2 className="display text-2xl">Plan & progress</h2>
            <ul className="mt-4 divide-y divide-line">
              {open.map((i) => (
                <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <span><span className="text-xs uppercase tracking-[0.14em] text-gold-deep">{ITEM_KINDS[i.kind]}</span><span className="block font-semibold">{i.title}</span>{i.detail && <span className="block text-muted">{i.detail}</span>}{i.due_at && <span className="block text-xs text-faint">Due {new Date(i.due_at).toLocaleDateString()}</span>}</span>
                  <MemberForm action={setItemStatus} className="flex gap-2"><input type="hidden" name="id" value={id} /><input type="hidden" name="item" value={i.id} />
                    <select name="status" defaultValue={i.status} className="field !py-1 text-xs"><option value="open">Open</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="resolved">Resolved</option><option value="not_applicable">Not applicable</option></select>
                    <button className="btn btn-ghost btn-sm">Update</button></MemberForm>
                </li>
              ))}
              {!open.length && <li className="py-3 text-sm text-muted">Nothing outstanding in this space.</li>}
            </ul>
            {closed.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-gold">{closed.length} completed</summary><ul className="mt-2 space-y-1 text-muted">{closed.map((i) => <li key={i.id}>✓ {ITEM_KINDS[i.kind]}: {i.title}</li>)}</ul></details>}
            <MemberForm action={addItem} className="mt-4 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-[11rem_1fr_9rem_auto]">
              {spaceFields}
              <select name="kind" className="field" defaultValue="action">{Object.entries(ITEM_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input name="title" className="field" placeholder="Title" required />
              <input name="due" type="date" className="field" aria-label="Due date" />
              <button className="btn btn-gold btn-sm">Add</button>
              <textarea name="detail" rows={2} className="field sm:col-span-4" placeholder="Details (optional)" />
            </MemberForm>
          </section>

          <section className="glass p-6">
            <h2 className="display text-2xl">Documents</h2>
            <p className="mt-1 text-xs text-muted">Every file is checked for malware before anyone can open it, and every version is kept as an original.</p>
            <ul className="mt-4 space-y-4">
              {((docs ?? []) as Doc[]).map((d) => {
                const versions = [...d.document_versions].sort((x, y) => y.version - x.version);
                const latest = versions[0];
                return (
                  <li key={d.id} className="rounded-2xl border border-line p-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span><span className="text-xs uppercase tracking-[0.14em] text-gold-deep">{DOC_CATEGORIES[d.category]}{d.privileged ? " · Privileged" : ""}</span><span className="block font-semibold">{d.title}</span><span className="block text-xs text-muted">Added by {nameOf(d.uploaded_by)} · {REVIEW_STATUS[d.review_status]}</span></span>
                      {latest && <span className={`chip ${latest.scan_status === "clean" ? "chip-live" : latest.scan_status === "pending" ? "chip-locked" : "chip-danger"}`}>{SCAN_STATUS[latest.scan_status]}</span>}
                    </div>
                    {versions.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {versions.map((v) => <li key={v.id} className="flex flex-wrap justify-between gap-2"><span>v{v.version} · {v.file_name} · {fmt(v.created_at)}</span>{v.scan_status === "clean" ? <a href={`/api/vault/download?id=${v.id}`} className="text-gold underline">Open</a> : <span className="text-faint">{SCAN_STATUS[v.scan_status]}</span>}</li>)}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap items-start gap-4">
                      <VaultUpload documentId={d.id} />
                      {latest && (
                        <MemberForm action={recordReview} className="flex flex-1 flex-wrap gap-2 text-xs">
                          <input type="hidden" name="id" value={id} /><input type="hidden" name="document" value={d.id} /><input type="hidden" name="version" value={latest.version} />
                          <select name="kind" className="field !py-1 text-xs" defaultValue="comment">
                            <option value="comment">Comment</option><option value="information_requested">Request information</option><option value="revision_proposed">Propose a revision</option>
                            {isPrincipal && <option value="review_requested">Request professional review</option>}
                            {reviewer && <><option value="reviewed">Mark reviewed</option><option value="revision_required">Revision required</option><option value="addressed">Addressed</option></>}
                            {me.advisor_type === "attorney" && <option value="final_authorized">Authorized final document</option>}
                          </select>
                          <input name="note" className="field min-w-0 flex-1 !py-1 text-xs" placeholder="Note" />
                          <button className="btn btn-ghost btn-sm">Record</button>
                        </MemberForm>
                      )}
                    </div>
                  </li>
                );
              })}
              {!(docs ?? []).length && <li className="text-sm text-muted">No documents in this space yet.</li>}
            </ul>
            <MemberForm action={createDocument} className="mt-4 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-[14rem_1fr_auto]">
              {spaceFields}
              <select name="category" className="field" defaultValue="due_diligence">{Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input name="title" className="field" placeholder="Document title" required />
              <button className="btn btn-gold btn-sm">Add document</button>
              {space === "private" && <label className="flex items-center gap-2 text-xs sm:col-span-3"><input type="checkbox" name="privileged" />Privileged legal material (stays in this private space)</label>}
            </MemberForm>
          </section>

          <section className="glass p-6">
            <h2 className="display text-2xl">Discussion</h2>
            <ol className="mt-4 space-y-3">
              {((msgs ?? []) as Msg[]).map((m) => (
                <li key={m.id} className={`max-w-[85%] rounded-2xl p-4 text-sm ${m.sender_id === viewer.id ? "ml-auto bg-champagne/15" : "border border-line"}`}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-2 text-[0.7rem] text-faint">{m.sender_id === viewer.id ? "You" : nameOf(m.sender_id)} · {fmt(m.created_at)}</p>
                </li>
              ))}
              {!(msgs ?? []).length && <li className="text-sm text-muted">No messages in this space yet.</li>}
            </ol>
            <MemberForm action={postRoomMessage} className="mt-4 space-y-2">
              {spaceFields}
              <textarea name="body" required maxLength={4000} rows={3} className="field w-full" placeholder={space === "private" ? "Write privately to your advisors…" : "Write to everyone in this Deal Room…"} />
              <button className="btn btn-gold btn-sm">Send</button>
              <p className="text-xs text-faint">Account numbers, login details, investment solicitations and fee arrangements can&apos;t be shared here.</p>
            </MemberForm>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass p-6">
            <h2 className="display text-xl">Participants</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {ppl.map((p) => (
                <li key={p.participant_id} className="flex items-start justify-between gap-2">
                  <span><span className="font-semibold">{p.display}{p.user_id === viewer.id ? " (you)" : ""}</span>
                    <span className="block text-xs text-muted">{p.role === "owner" ? "Room owner" : p.role === "principal" ? "Business participant" : `${ADVISOR_TYPES[p.advisor_type ?? ""]} for ${nameOf(p.client_id ?? "")}`}{p.status === "invited" ? " · invited" : ""}{p.role === "advisor" ? ` · credentials ${p.credential === "verified" ? "verified" : "not yet verified"}` : ""}</span></span>
                  {p.user_id !== viewer.id && p.role !== "owner" && (isOwner || (p.role === "advisor" && p.client_id === viewer.id)) && (
                    <MemberForm action={removeParticipant}><input type="hidden" name="room" value={id} /><input type="hidden" name="participant" value={p.participant_id} /><button className="text-xs text-muted underline">Remove</button></MemberForm>
                  )}
                </li>
              ))}
            </ul>
            {isOwner && eligible.length > 0 && (
              <MemberForm action={invitePrincipal} className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                <input type="hidden" name="id" value={id} />
                <select name="user" className="field w-full" defaultValue="">{[<option key="" value="" disabled>Invite a collaborator</option>, ...eligible.map((c) => <option key={c.user_id} value={c.user_id}>{c.display}</option>)]}</select>
                <button className="btn btn-ghost btn-sm">Invite</button>
              </MemberForm>
            )}
            {isOwner && !eligible.length && <p className="mt-4 border-t border-line pt-4 text-xs text-muted">You can invite members once you&apos;ve both accepted a business conversation.</p>}
          </section>

          {isPrincipal && (
            <section className="glass p-6">
              <h2 className="display text-xl">Your advisors</h2>
              <p className="mt-1 text-xs text-muted">Invite your own attorney, accountant or advisor. They represent only you, need no membership, and see the shared space plus your private space.</p>
              {((invites ?? []) as { id: string; advisor_name: string; advisor_type: string; expires_at: string }[]).map((i) => (
                <div key={i.id} className="mt-3 flex items-center justify-between gap-2 text-xs"><span>{i.advisor_name} · {ADVISOR_TYPES[i.advisor_type]} · invited, expires {new Date(i.expires_at).toLocaleDateString()}</span>
                  <MemberForm action={revokeAdvisorInvite}><input type="hidden" name="room" value={id} /><input type="hidden" name="invite" value={i.id} /><button className="text-muted underline">Revoke</button></MemberForm></div>
              ))}
              <MemberForm action={inviteAdvisor} className="mt-4 space-y-2 text-sm">
                <input type="hidden" name="id" value={id} />
                <select name="type" className="field w-full" defaultValue="attorney">{Object.entries(ADVISOR_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input name="name" className="field w-full" placeholder="Advisor's name" required />
                <input name="email" type="email" className="field w-full" placeholder="Professional email" required />
                <input name="firm" className="field w-full" placeholder="Firm (optional)" />
                <button className="btn btn-gold btn-sm">Create private invitation</button>
              </MemberForm>
              <p className="mt-2 text-xs text-faint">Independent professional fees are agreed directly between you and your advisor.</p>
            </section>
          )}

          {isOwner && (
            <section className="glass p-6">
              <h2 className="display text-xl">Room settings</h2>
              <MemberForm action={updateRoom} className="mt-3 space-y-2 text-sm">
                <input type="hidden" name="id" value={id} />
                <select name="stage" defaultValue={room.stage} className="field w-full">{Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <textarea name="objective" rows={3} defaultValue={room.objective ?? ""} className="field w-full" placeholder="Objective" />
                <button className="btn btn-ghost btn-sm">Save</button>
              </MemberForm>
            </section>
          )}
          {!isOwner && (
            <MemberForm action={setMyParticipation} className="glass p-6 text-sm">
              <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="withdrawn" />
              <p className="text-muted">You can leave this Deal Room at any time.{me.role === "principal" ? " Your advisors leave with you and anything you shared is withdrawn." : ""}</p>
              <button className="btn btn-ghost btn-sm mt-3">Withdraw from this Deal Room</button>
            </MemberForm>
          )}
        </aside>
      </div>
    </>
  );
}
