import { isInsidePreview, requireExperience } from "@/lib/auth";
import { becomeCouple } from "@/app/actions/in-love";
import { createClient } from "@/lib/supabase/server";
import { LuxCard, LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { exclusiveAction } from "@/app/actions/journey-member";

export const metadata = { title: "The Exclusive Connection" };

const AFTER = [
  "Both of your profiles are paused from new matchmaking and introductions.",
  "Other dating conversations close respectfully. History and safety reporting stay available.",
  "Other connections receive a discreet note that you're no longer available — your partner is never named.",
  "Where available, they're offered other compatible introductions.",
  "You open a shared relationship space, first-date planning and activities together.",
  "The Couples Experience is included with Elite Concierge; with other memberships it is an optional upgrade, never charged automatically.",
];

export default async function Exclusive() {
  const { viewer } = await requireExperience("relationships");
  const supabase = await createClient();
  const live = Boolean(supabase && !isInsidePreview(viewer));
  let connections: { id: string; name: string }[] = [];
  let requests: { id: string; requester_id: string; recipient_id: string; status: string }[] = [];
  let notices: { id: string; message: string; created_at: string }[] = [];
  let visible = true;
  let consents: { user_id: string; partner_id: string }[] = [];
  if (live) {
    const rel = supabase!.schema("relationships");
    const [{ data: c }, { data: r }, { data: n }, { data: p }] = await Promise.all([
      rel.from("connections").select("requester_id, recipient_id").eq("status", "accepted"),
      rel.from("exclusive_requests").select("id, requester_id, recipient_id, status").in("status", ["pending", "accepted"]),
      rel.from("availability_notices").select("id, message, created_at").order("created_at", { ascending: false }).limit(5),
      rel.from("profiles").select("is_visible").eq("user_id", viewer.id).maybeSingle(),
    ]);
    const ids = (c ?? []).map((x) => (x.requester_id === viewer.id ? x.recipient_id : x.requester_id));
    const { data: names } = ids.length ? await supabase!.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
    connections = ids.map((id) => ({ id, name: names?.find((x) => x.id === id)?.display_name ?? "Your connection" }));
    requests = r ?? []; notices = n ?? []; visible = p?.is_visible ?? true;
    const { data: cs } = await rel.from("couple_consents").select("user_id, partner_id");
    consents = cs ?? [];
  }
  const active = requests.find((r) => r.status === "accepted");
  const incoming = requests.filter((r) => r.status === "pending" && r.recipient_id === viewer.id);
  const outgoing = requests.filter((r) => r.status === "pending" && r.requester_id === viewer.id);
  const nameOf = (id: string) => connections.find((c) => c.id === id)?.name ?? "Your connection";

  return (
    <>
      <LuxHero eyebrow="The Personal Society" title="The Exclusive Connection" tagline="Is this your person?" tone="burgundy">
        <p className="max-w-2xl text-muted">You&rsquo;ve developed a meaningful connection. When you&rsquo;re ready to explore it exclusively, invite them to focus on each other.</p>
      </LuxHero>

      {active ? (
        <section className="glass mt-10 p-7">
          <p className="eyebrow">Your Exclusive Connection</p>
          <p className="display mt-3 text-3xl">You and {nameOf(active.requester_id === viewer.id ? active.recipient_id : active.requester_id)}</p>
          <p className="mt-2 text-sm text-muted">Your profiles are paused from new introductions. Plan your next chapter together in your shared calendar.</p>
          {(() => {
            const partner = active.requester_id === viewer.id ? active.recipient_id : active.requester_id;
            const mine = consents.some((c) => c.user_id === viewer.id && c.partner_id === partner);
            const theirs = consents.some((c) => c.user_id === partner && c.partner_id === viewer.id);
            return (
              <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
                <p className="font-semibold">Ready for your next chapter?</p>
                <p className="mt-1 text-sm text-muted">Becoming a couple opens a shared space for check-ins, goals and your calendar. Each of you keeps your own account, history and personal development. It opens only when you both choose it.</p>
                {theirs && !mine && <p className="mt-2 text-sm text-gold-deep">{nameOf(partner)} has chosen to become a couple.</p>}
                <MemberForm action={becomeCouple} className="mt-4"><input type="hidden" name="partner" value={partner} />{mine ? <><input type="hidden" name="withdraw" value="1" /><p className="mb-2 text-sm">You&rsquo;ve chosen to become a couple. Waiting for {nameOf(partner)}.</p><button className="btn btn-ghost btn-sm">Withdraw my choice</button></> : <button className="btn btn-gold">Become a couple</button>}</MemberForm>
              </div>
            );
          })()}
          <MemberForm action={exclusiveAction} className="mt-5"><input type="hidden" name="action" value="end" /><input type="hidden" name="id" value={active.id} /><button className="btn btn-ghost">Step back from exclusivity</button></MemberForm>
        </section>
      ) : (
        <>
          {incoming.map((r) => (
            <section key={r.id} className="theme-burgundy mt-10 rounded-[1.75rem] p-7 text-center" style={{ background: "var(--ink)" }}>
              <p className="eyebrow">An invitation for you</p>
              <p className="display mt-3 text-4xl text-gold-bright">{nameOf(r.requester_id)} would like to focus on your connection.</p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <MemberForm action={exclusiveAction}><input type="hidden" name="action" value="accept" /><input type="hidden" name="id" value={r.id} /><button className="btn btn-gold">I&rsquo;m ready to focus on this connection</button></MemberForm>
                <MemberForm action={exclusiveAction}><input type="hidden" name="action" value="decline" /><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost">I&rsquo;m still exploring</button></MemberForm>
              </div>
            </section>
          ))}
          <LuxSection title="Invite a connection">
            {connections.length ? (
              <ul className="glass divide-y divide-line">
                {connections.map((c) => {
                  const sent = outgoing.find((o) => o.recipient_id === c.id);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <span className="font-semibold">{c.name}</span>
                      {sent ? (
                        <MemberForm action={exclusiveAction}><input type="hidden" name="action" value="end" /><input type="hidden" name="id" value={sent.id} /><button className="text-sm text-gold-deep underline">Invitation sent · Withdraw</button></MemberForm>
                      ) : (
                        <MemberForm action={exclusiveAction}><input type="hidden" name="action" value="request" /><input type="hidden" name="id" value={c.id} /><button className="btn btn-gold btn-sm">Invite to focus exclusively</button></MemberForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="glass p-6 text-sm text-muted">When you and someone both accept a connection, you can invite them here.</p>}
          </LuxSection>
        </>
      )}

      {!visible && !active && (
        <MemberForm action={exclusiveAction} className="glass mt-8 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <span><span className="block font-semibold">Your profile is paused</span><span className="block text-sm text-muted">It won&rsquo;t reappear in introductions until you choose.</span></span>
          <input type="hidden" name="action" value="reactivate" /><button className="btn btn-gold">I&rsquo;m ready to meet new people</button>
        </MemberForm>
      )}

      {notices.length > 0 && (
        <LuxSection title="Updates">
          <ul className="glass divide-y divide-line text-sm">{notices.map((n) => <li key={n.id} className="px-6 py-4">{n.message}</li>)}</ul>
        </LuxSection>
      )}

      <LuxSection title="How it works">
        <div className="grid gap-5 sm:grid-cols-3">
          <LuxCard mark="1" title="You invite" body="Nothing changes for either of you when one person asks. Your conversations and introductions continue." />
          <LuxCard mark="2" title="They choose freely" body="Your connection accepts or declines privately, on their own time. Both of you must say yes." />
          <LuxCard mark="3" title="A new chapter" body="Once you both accept, your private space together opens." />
        </div>
      </LuxSection>
      <LuxSection title="Once you both accept">
        <ul className="glass divide-y divide-line">{AFTER.map((a) => <li key={a} className="px-6 py-4 text-sm">{a}</li>)}</ul>
      </LuxSection>
      <div className="mt-10"><Notice>Either of you can step back from exclusivity, unlink or report a concern at any time, without the other&rsquo;s permission. Your profile doesn&rsquo;t reappear in matchmaking until you choose to reactivate it.</Notice></div>
    </>
  );
}
