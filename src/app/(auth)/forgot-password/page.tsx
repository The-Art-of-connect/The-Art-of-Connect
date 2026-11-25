import { ForgotPasswordForm } from "@/components/RecoveryForms";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="eyebrow">Account recovery</p>
      <h1 className="display mt-4 mb-6 text-4xl">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">Enter your account email and we’ll send a secure, time-limited reset link.</p>
      <ForgotPasswordForm />
    </>
  );
}
