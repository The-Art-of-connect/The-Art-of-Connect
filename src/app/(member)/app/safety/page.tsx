import Link from "next/link";
import { ReportForm, UnblockButton } from "@/components/SafetyForms";
import { getViewer } from "@/lib/auth";
import { date } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { AppealForm } from "@/components/AppealForm";

export const metadata = { title: "Safety & privacy" };

export default async function SafetyPage() {
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const [{ data: blocks }, { data: reports }, { data: profile }, { data: appeals }] = await Promise.all([
    supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("moderation_reports").select("reason, status, created_at").eq("reporter_id", viewer.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("identity_verified_at").eq("id", viewer.id).maybeSingle(),
    supabase.from("account_appeals").select("regarding, status, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="max-w-4xl">
      <p className="eyebrow">Trust & safety</p>
      <h1 className="display mt-4 text-5xl">Safety & privacy</h1>
      <div className="mt-6 rounded-2xl border border-danger/40 bg-danger/5 p-5 text-sm">
        <strong>If you are in immediate danger, call 911.</strong> For emotional crisis support in the U.S., call or text 988.
      </div>

      <section className="glass mt-8 p-7">
        <h2 className="text-lg font-semibold">Identity verification</h2>
        <p className="mt-2 text-sm text-muted">{profile?.identity_verified_at ? `Verified on ${date(profile.identity_verified_at)}.` : "Verify your identity to show members you are who you say you are."}</p>
        {!profile?.identity_verified_at && <Link href="/app/verify" className="btn btn-ghost btn-sm mt-4">Verify my identity</Link>}
      </section>

      <section className="glass mt-6 p-7">
        <h2 className="text-lg font-semibold">Report a concern</h2>
        <p className="mt-2 mb-6 text-sm text-muted">Reports are confidential. The member you report is not told who reported them.</p>
        <ReportForm />
      </section>

      <section className="glass mt-6 p-7">
        <h2 className="text-lg font-semibold">Blocked members</h2>
        <p className="mt-2 text-sm text-muted">Blocked members can’t see you or contact you, and you won’t see them.</p>
        <ul className="mt-4 divide-y divide-line">
          {(blocks ?? []).map((b) => (
            <li key={b.blocked_id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted">Member blocked on {date(b.created_at)}</span>
              <UnblockButton userId={b.blocked_id} />
            </li>
          ))}
          {!blocks?.length && <li className="py-3 text-sm text-faint">You haven’t blocked anyone.</li>}
        </ul>
      </section>

      {!!reports?.length && (
        <section className="glass mt-6 p-7">
          <h2 className="text-lg font-semibold">Your reports</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {reports.map((r, i) => (
              <li key={i} className="flex justify-between py-3"><span className="text-muted">{r.reason.replaceAll("_", " ")} · {date(r.created_at)}</span><span className="chip">{r.status}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-line p-7 text-sm leading-relaxed text-muted">
        <h2 className="text-lg font-semibold text-text">Meeting safely</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Never send money or financial details to someone you’ve met online.</li>
          <li>Meet in a public place and tell a friend where you’ll be.</li>
          <li>Arrange your own transportation.</li>
          <li>Keep conversations on The Art of Connect until you’re comfortable.</li>
        </ul>
        <Link href="/legal/safety-policy" className="mt-4 inline-block text-gold underline">Read our Safety Policy</Link>
      </section>

      <section className="glass mt-8 p-6 sm:p-7">
        <h2 className="text-lg font-semibold text-text">Ask us to review a decision</h2>
        <p className="mt-2 text-sm text-muted">If your account was restricted or a report was decided in a way you believe is wrong, tell us. Someone not involved in the original decision will review it.</p>
        <AppealForm />
        {appeals && appeals.length > 0 && (
          <ul className="mt-5 divide-y divide-line text-sm">
            {appeals.map((a, i) => <li key={i} className="flex justify-between py-2"><span>{a.regarding}</span><span className="text-faint">{a.status} · {date(a.created_at)}</span></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
