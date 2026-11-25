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
        <span>I agree to the <Link href="/terms" className="text-gold underline">Terms</Link> and <Link href="/privacy" className="text-gold underline">Privacy Policy</Link>.</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketing" className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
        <span>Send me occasional news and member events (optional).</span>
      </label>
      <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Continue"}</button>
    </form>
  );
}
