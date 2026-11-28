import { MemberForm } from "@/components/MemberForm";
import { blockMember, reportMember } from "@/app/actions/safety";

const REASONS: [string, string][] = [
  ["harassment", "Harassment"], ["fake_profile", "Fake profile"], ["scam_or_fraud", "Scam or fraud"], ["inappropriate_content", "Inappropriate content"],
  ["underage", "May be under age"], ["safety_concern", "Safety concern"], ["other", "Something else"],
];

/** Block or report, from any In Love profile or connection (the existing safety system; nothing new is shared). */
export function LoveSafety({ userId }: { userId: string }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-muted hover:text-text">Block or report</summary>
      <div className="mt-2 space-y-3 rounded-2xl border border-line p-3">
        <MemberForm action={blockMember}><input type="hidden" name="userId" value={userId} /><button className="btn btn-ghost btn-sm">Block</button><span className="ml-2 text-muted">You won&rsquo;t see each other, and any connection closes.</span></MemberForm>
        <MemberForm action={reportMember} className="space-y-2">
          <input type="hidden" name="reportedUserId" value={userId} /><input type="hidden" name="experience" value="relationships" />
          <select name="reason" required defaultValue="" className="field w-full text-xs" aria-label="Reason"><option value="" disabled>Why are you reporting?</option>{REASONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <textarea name="details" required minLength={10} rows={2} maxLength={4000} className="field w-full text-xs" placeholder="What happened (kept confidential)" aria-label="Details" />
          <label className="flex items-center gap-2"><input type="checkbox" name="alsoBlock" /> Also block this member</label>
          <button className="btn btn-ghost btn-sm">Send report privately</button>
        </MemberForm>
      </div>
    </details>
  );
}
