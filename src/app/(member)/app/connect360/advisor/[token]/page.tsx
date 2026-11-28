import { LuxHero } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { acceptAdvisorInvite } from "@/app/actions/connect360";

export const metadata = { title: "Professional advisor invitation" };
export const dynamic = "force-dynamic";

/** A professional advisor accepts their client's invitation. A membership isn't required to review a client's project. */
export default async function AdvisorInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <LuxHero eyebrow="CONNECT 360 · Business Deal Room" title="You've been invited as a professional advisor" />
      <div className="glass mx-auto mt-8 max-w-2xl space-y-4 p-8 text-sm">
        <p>Your client has invited you to review their project in a private Business Deal Room on The Art of Connect.</p>
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>You&apos;ll see the shared workspace and your client&apos;s private advisor space, but never another party&apos;s private space.</li>
          <li>You represent only the client who invited you. Other participants bring their own advisors.</li>
          <li>You can comment, request information, propose revisions and upload documents. Attorneys and accountants can record review decisions.</li>
          <li>No membership purchase is needed. Your professional fees are agreed directly with your client.</li>
        </ul>
        <MemberForm action={acceptAdvisorInvite}>
          <input type="hidden" name="token" value={token} />
          <button className="btn btn-gold">Accept and open the Business Deal Room</button>
        </MemberForm>
        <p className="text-xs text-faint">This link works once and expires after 14 days. If it no longer works, ask your client to send a new invitation.</p>
      </div>
    </>
  );
}
