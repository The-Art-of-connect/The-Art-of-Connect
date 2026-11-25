import { NewPasswordForm } from "@/components/RecoveryForms";

export const metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const welcome = (await searchParams).welcome === "1";
  return (
    <>
      <p className="eyebrow">{welcome ? "Team invitation" : "Account recovery"}</p>
      <h1 className="display mt-4 mb-6 text-4xl">{welcome ? "Choose your password" : "Choose a new password"}</h1>
      <NewPasswordForm />
    </>
  );
}
