"use client";
import { useActionState } from "react";
import { reportMember, unblockMember, type SafetyState } from "@/app/actions/safety";

export function ReportForm({ reportedUserId }: { reportedUserId?: string }) {
  const [state, action, pending] = useActionState<SafetyState, FormData>(reportMember, null);
  if (state?.ok) return <p className="text-sm" role="status">{state.message}</p>;
  return (
    <form action={action} className="space-y-4">
      {reportedUserId && <input type="hidden" name="reportedUserId" value={reportedUserId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5"><span className="text-sm text-muted">Where did this happen?</span>
          <select name="experience" className="field" defaultValue="relationships"><option value="relationships">In Love</option><option value="business">In Business</option></select>
        </label>
        <label className="space-y-1.5"><span className="text-sm text-muted">What’s the concern?</span>
          <select name="reason" className="field" defaultValue="safety_concern">
            <option value="harassment">Harassment or abuse</option>
            <option value="fake_profile">Fake or misleading profile</option>
            <option value="scam_or_fraud">Scam, money request or fraud</option>
            <option value="inappropriate_content">Inappropriate content</option>
            <option value="underage">May not meet the age requirement</option>
            <option value="safety_concern">Safety concern</option>
            <option value="other">Something else</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1.5"><span className="text-sm text-muted">What happened? Include the member’s name or profile details.</span>
        <textarea name="details" required minLength={10} className="field" />
      </label>
      {reportedUserId && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="alsoBlock" defaultChecked className="accent-[var(--champagne)]" /> Also block this member</label>
      )}
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold" disabled={pending}>{pending ? "Sending…" : "Send report"}</button>
    </form>
  );
}

export function UnblockButton({ userId }: { userId: string }) {
  const [, action, pending] = useActionState<SafetyState, FormData>(unblockMember, null);
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <button className="btn btn-ghost btn-sm" disabled={pending}>Unblock</button>
    </form>
  );
}
