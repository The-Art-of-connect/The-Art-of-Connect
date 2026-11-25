import Link from "next/link";
import { ConfirmLinkForm } from "@/components/RecoveryForms";

export const metadata = { title: "Continue", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Landing page for one-time account links. The link is only used when the
 * person presses Continue, so automated email scanners can't consume it.
 */
export default async function ConfirmLinkPage({ searchParams }: { searchParams: Promise<{ type?: string; token_hash?: string }> }) {
  const { type, token_hash } = await searchParams;
  const valid = (type === "recovery" || type === "invite") && Boolean(token_hash);
  return (
    <>
      <p className="eyebrow">{type === "invite" ? "Team invitation" : "Account recovery"}</p>
      <h1 className="display mt-4 mb-6 text-4xl">{type === "invite" ? "Welcome to the team" : "Choose a new password"}</h1>
      {valid ? (
        <>
          <p className="mb-6 text-muted">{type === "invite" ? "Continue to set your password. You’ll then secure your account with two-step verification." : "Continue to choose a new password for your account."}</p>
          <ConfirmLinkForm type={type!} tokenHash={token_hash!} />
        </>
      ) : (
        <p className="text-muted">This link is incomplete. <Link href="/forgot-password" className="text-gold underline">Request a new one</Link>.</p>
      )}
    </>
  );
}
