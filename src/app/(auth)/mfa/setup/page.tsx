import { redirect } from "next/navigation";
import { MfaSetup } from "@/components/MfaForms";
import { getMfaStatus, getViewer } from "@/lib/auth";

export const metadata = { title: "Set up two-step verification", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MfaSetupPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/mfa/setup");
  const mfa = await getMfaStatus();
  if (mfa.enrolled) redirect(mfa.verified ? "/admin" : "/mfa/verify?next=/admin");
  return (
    <>
      <p className="eyebrow">Account security</p>
      <h1 className="display mt-4 mb-6 text-4xl">Set up two-step verification</h1>
      <p className="mb-6 text-sm text-muted">Required for the Owner Portal. You’ll enter a code from your phone each time you sign in.</p>
      <MfaSetup />
    </>
  );
}
