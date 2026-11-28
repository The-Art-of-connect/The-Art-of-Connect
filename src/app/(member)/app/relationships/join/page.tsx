import { requireExperience } from "@/lib/auth";
import { acceptPartner } from "@/app/actions/in-love";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join your partner · In Love", robots: { index: false } };

/** Accept a partner invitation (directive 38). Works only when signed in with the invited email address. */
export default async function Join({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  await requireExperience("relationships");
  const { token, error } = await searchParams;
  return (
    <section className="glass mx-auto max-w-lg p-8 text-center">
      <p className="eyebrow">The Personal Society</p>
      <h1 className="display mt-3 text-4xl">A private space for the two of you.</h1>
      <p className="mt-3 text-sm text-muted">Accepting opens your shared check-ins, goals and calendar. Your own journal, reflections and personal discoveries always remain private to you.</p>
      {error && <p className="mt-4 text-sm text-danger" role="alert">{error === "email" ? "This invitation was sent to a different email address. Please sign in with that address." : "This invitation is no longer valid. Please ask your partner to send a new one."}</p>}
      {token ? <form action={acceptPartner} className="mt-6"><input type="hidden" name="token" value={token} /><button className="btn btn-gold w-full">Accept the invitation</button></form> : <p className="mt-6 text-sm">Please open the link from your invitation email.</p>}
    </section>
  );
}
