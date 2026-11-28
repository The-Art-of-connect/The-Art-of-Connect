import Link from "next/link";
import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { MemberMarks } from "@/components/MembershipEmblem";
import { InLoveTabs } from "@/components/love/InLoveTabs";
import { SINGLES_TABS } from "@/lib/in-love";
import { messageConnection, respondInterest } from "@/app/actions/in-love";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connections · In Love" };

type Conn = { connection_id: string; other_id: string; first_name: string | null; status: string; direction: string; distinction: string | null; identity_verified: boolean };

/** Interest received, interest sent and mutual connections (directive 38). Names are first names only. */
export default async function Connections() {
  const { viewer } = await requireExperience("relationships");
  const db = isInsidePreview(viewer) ? null : await createClient();
  const { data } = db ? await db.schema("relationships").rpc("my_connections") : { data: [] };
  const all = (data ?? []) as Conn[];
  const received = all.filter((c) => c.status === "pending" && c.direction === "received");
  const sent = all.filter((c) => c.status === "pending" && c.direction === "sent");
  const mutual = all.filter((c) => c.status === "accepted");
  const Name = ({ c }: { c: Conn }) => <span className="flex flex-wrap items-center gap-2 font-semibold">{c.first_name ?? "A member"}<MemberMarks distinction={c.distinction} verified={c.identity_verified} size={15} /></span>;
  return (
    <>
      <section className="rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] px-5 pt-7 shadow-sm sm:px-9">
        <p className="eyebrow">In Love</p><h1 className="display mt-3 text-4xl">Your connections</h1>
        <InLoveTabs tabs={SINGLES_TABS} />
      </section>
      <Section title="Mutual connections" empty="When you both express interest, you'll see each other here and can talk privately.">
        {mutual.map((c) => (
          <li key={c.connection_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><Name c={c} />
            <span className="flex gap-2"><MemberForm action={messageConnection}><input type="hidden" name="to" value={c.other_id} /><button className="btn btn-gold btn-sm">Message</button></MemberForm>
              <Link href="/app/relationships/exclusive" className="btn btn-ghost btn-sm">The Exclusive Connection</Link></span></li>
        ))}
      </Section>
      <Section title="Interested in you" empty="No new interest yet.">
        {received.map((c) => (
          <li key={c.connection_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><Name c={c} />
            <span className="flex gap-2">
              <MemberForm action={respondInterest}><input type="hidden" name="id" value={c.connection_id} /><input type="hidden" name="answer" value="accept" /><button className="btn btn-gold btn-sm">Connect</button></MemberForm>
              <MemberForm action={respondInterest}><input type="hidden" name="id" value={c.connection_id} /><input type="hidden" name="answer" value="decline" /><button className="btn btn-ghost btn-sm">Not for me</button></MemberForm>
            </span></li>
        ))}
      </Section>
      <Section title="Interest you've sent" empty="Express interest from Discover when someone feels right.">
        {sent.map((c) => <li key={c.connection_id} className="flex items-center justify-between gap-3 px-5 py-4"><Name c={c} /><span className="text-xs text-muted">Waiting privately</span></li>)}
      </Section>
    </>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-8">
      <h2 className="display text-2xl">{title}</h2>
      {children.length ? <ul className="glass mt-3 divide-y divide-line">{children}</ul> : <p className="glass mt-3 p-5 text-sm text-muted">{empty}</p>}
    </section>
  );
}
