import { NewPasswordForm } from "@/components/RecoveryForms";

export const metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <>
      <p className="eyebrow">Account recovery</p>
      <h1 className="display mt-4 mb-6 text-4xl">Choose a new password</h1>
      <NewPasswordForm />
    </>
  );
}
