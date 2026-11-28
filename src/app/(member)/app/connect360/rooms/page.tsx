import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { ADVISOR_TYPES, STAGES } from "@/lib/connect360";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createRoom } from "@/app/actions/connect360";

export const metadata = { title: "Business Deal Rooms · CONNECT 360" };
export const dynamic = "force-dynamic";

type Row = { room_id: string; role: string; status: string; advisor_type: string | null; deal_rooms: { title: string; stage: string; status: string; updated_at: string } | null };

/** The member's Deal Rooms: owned, joined, invited, and rooms they advise on (directive 28 §10). */
export default async function Rooms() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const { data } = live && db ? await db.schema("business").from("room_participants").select("room_id, role, status, advisor_type, deal_rooms(title, stage, status, updated_at)").eq("user_id", viewer.id).in("status", ["invited", "active"]) : { data: [] };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.deal_rooms && r.deal_rooms.status === "active");
  const roleLabel = (r: Row) => r.role === "owner" ? "You own this room" : r.role === "advisor" ? `${ADVISOR_TYPES[r.advisor_type ?? ""] ?? "Advisor"}` : "Business participant";

  return (
    <>
      <LuxHero eyebrow="CONNECT 360" title="Business Deal Rooms" tagline="Confidential workspaces for serious collaboration." />
      <LuxSection eyebrow="Your rooms" title={rows.length ? "Continue where you left off" : "No Deal Rooms yet"}>
        {rows.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <li key={r.room_id}>
                <Link href={`/app/connect360/rooms/${r.room_id}`} className="glass glass-edge block p-6 transition hover:-translate-y-0.5">
                  <p className="flex items-center justify-between gap-3"><span className="eyebrow">{STAGES[r.deal_rooms!.stage]}</span>{r.status === "invited" && <span className="chip chip-locked">Invitation</span>}</p>
                  <p className="display mt-2 text-2xl">{r.deal_rooms!.title}</p>
                  <p className="mt-1 text-xs text-muted">{roleLabel(r)} · updated {new Date(r.deal_rooms!.updated_at).toLocaleDateString()}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </LuxSection>
      {premium ? (
        <LuxSection eyebrow="Begin" title="Open a new Deal Room" intro="You can invite members you've accepted a business conversation with. Each of you may bring your own attorney, accountant and advisors.">
          <MemberForm action={createRoom} className="glass max-w-2xl space-y-3 p-6">
            <input name="title" required minLength={3} maxLength={160} className="field w-full" placeholder="Name, e.g. Southeast distribution partnership" />
            <textarea name="objective" rows={3} maxLength={4000} className="field w-full" placeholder="What are you exploring together? (optional)" />
            <button className="btn btn-gold btn-sm">Create Deal Room</button>
            <p className="text-xs text-faint">Executive Private includes two active Deal Rooms; Elite Concierge includes ten.</p>
          </MemberForm>
        </LuxSection>
      ) : (
        <p className="glass mt-10 p-6 text-sm text-muted">Creating Deal Rooms is part of Executive Private and Elite Concierge. Rooms you&apos;ve been invited to as an advisor appear above.</p>
      )}
    </>
  );
}
