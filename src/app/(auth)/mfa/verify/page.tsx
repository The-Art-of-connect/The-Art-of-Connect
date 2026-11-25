import { redirect } from "next/navigation";
import { MfaVerify } from "@/components/MfaForms";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Two-step verification", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MfaVerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const viewer = await getViewer();
  const { next } = await searchParams;
  if (!viewer) redirect("/sign-in?next=/admin");
  return (
    <>
      <p className="eyebrow">Two-step verification</p>
      <h1 className="display mt-4 mb-6 text-4xl">Enter your code</h1>
      <p className="mb-6 text-sm text-muted">Open your authenticator app and enter the 6-digit code for The Art of Connect.</p>
      <MfaVerify next={next ?? "/admin"} />
    </>
  );
}
