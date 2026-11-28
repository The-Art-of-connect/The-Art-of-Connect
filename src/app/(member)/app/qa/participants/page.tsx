import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { MemberMarks } from "@/components/MembershipEmblem";
import { qaParticipantAct } from "@/app/actions/qa-switcher";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "QA participants", robots: { index: false } };

type Row = { user_id: string; name: string; persona: string; age: number | null; gender: string | null; seeking: string[]; city: string | null; test_verified: boolean; distinction: string | null; connection: string | null; exclusive: string | null; couple: boolean; blocked: boolean };
const ACTIONS: { key: string; label: string; text?: string }[] = [
  { key: "express_interest", label: "Express interest in you" }, { key: "accept_interest", label: "Accept your interest" }, { key: "decline_interest", label: "Decline your interest" },
  { key: "send_message", label: "Send you a message", text: "Message" }, { key: "request_exclusive", label: "Invite you to The Exclusive Connection" },
  { key: "accept_exclusive", label: "Accept your Exclusive invitation" }, { key: "decline_exclusive", label: "Decline your Exclusive invitation" },
  { key: "become_couple", label: "Choose to become a couple" }, { key: "accept_partner_invitation", label: "Accept your partner invitation" },
  { key: "add_goal", label: "Add a shared goal", text: "Goal" }, { key: "add_event", label: "Add a calendar date", text: "Title" },
  { key: "checkin_shared", label: "Share a check-in" }, { key: "checkin_private", label: "Write a private check-in" },
  { key: "block", label: "Block you" }, { key: "unblock", label: "Unblock you" }, { key: "report", label: "Report you (fictional test)" }, { key: "reset", label: "Reset everything with you" },
];

/** QA-only console (owner-listed fictional QA account): act as a fictional participant toward the QA account. */
export default async function QaParticipants() {
  const viewer = await getViewer();
  const db = await createClient();
  if (!viewer || !db) notFound();
  const { data: qa } = await db.from("qa_switchers").select("user_id").eq("user_id", viewer.id).maybeSingle();
  if (!qa) notFound();
  const { data } = await db.rpc("qa_participant_status");
  const rows = (data ?? []) as Row[];
  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Quality assurance</p>
      <h1 className="display mt-3 text-4xl">Fictional participants</h1>
      <p className="mt-3 text-sm text-muted">Every participant is fictional and isolated: real members can never see them, and they can never see real members. Their &ldquo;Test&rdquo; label is a test verification state, never Identity Verified. Use these buttons to play the other person&rsquo;s part; everything else you do as yourself in In Love. <Link href="/app/qa" className="text-gold underline">Back to the experience switcher</Link></p>
      <p className="mt-2 text-xs text-muted">To test partner invitations, invite a participant&rsquo;s email from Our Relationship, then choose &ldquo;Accept your partner invitation&rdquo; here. Partner emails: {rows.map((r) => `${r.name?.split(" ")[0]}: qa.${r.name?.split(" ")[0]?.toLowerCase()}@example.com`).join(" · ")}</p>
      <ul className="mt-8 space-y-4">
        {rows.map((r) => (
          <li key={r.user_id} className="glass p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="flex flex-wrap items-center gap-2 text-xl font-semibold">{r.name}{r.age ? `, ${r.age}` : ""}<MemberMarks distinction={r.distinction} testVerified={r.test_verified} size={16} /></p>
              <p className="text-xs text-muted">{r.persona}</p>
            </div>
            <p className="text-sm text-muted">{[r.gender && `${r.gender}`, r.seeking?.length ? `interested in ${r.seeking.join(", ")}` : "no preference set", r.city, r.test_verified ? "test-verified" : "not verified"].filter(Boolean).join(" · ")}</p>
            <p className="mt-2 text-xs">With you: {[r.connection ? `connection ${r.connection}` : "no connection", r.exclusive && `exclusive ${r.exclusive}`, r.couple && "shared couple space", r.blocked && "blocked"].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <MemberForm key={a.key} action={qaParticipantAct} className="flex items-center gap-1">
                  <input type="hidden" name="participant" value={r.user_id} /><input type="hidden" name="action" value={a.key} />
                  {a.text && <input name="text" placeholder={a.text} maxLength={300} className="field !w-32 !py-1 text-xs" aria-label={`${a.label}: ${a.text}`} />}
                  <button className={`btn btn-sm ${a.key === "reset" ? "btn-ghost" : "btn-ghost"} !text-xs`}>{a.label}</button>
                </MemberForm>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
