"use client";
import Link from "next/link";
import { useActionState } from "react";
import { acceptAgreements } from "@/app/actions/onboarding";

export function AgreementForm() {
  const [, action, pending] = useActionState(acceptAgreements, null);
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
        <span>I agree to the <Link href="/legal/terms-of-service" className="text-gold underline">Terms of Service</Link>, <Link href="/legal/membership-agreement" className="text-gold underline">Membership Agreement</Link>, <Link href="/legal/community-standards" className="text-gold underline">Community Standards</Link> and <Link href="/legal/refund-policy" className="text-gold underline">Refund Policy</Link>, and I have read the <Link href="/legal/privacy-policy" className="text-gold underline">Privacy Policy</Link>. I understand the <Link href="/legal/matchmaking-disclaimer" className="text-gold underline">Matchmaking</Link> and <Link href="/legal/counseling-disclaimer" className="text-gold underline">Counseling & Coaching</Link> disclaimers.</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketing" className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
        <span>Send me occasional news and member events (optional).</span>
      </label>
      <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Continue"}</button>
    </form>
  );
}
