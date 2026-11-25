import { VerifyButton } from "@/components/VerifyButton";
import { getViewer } from "@/lib/auth";
import { date } from "@/lib/admin";
import { getLaunchState } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Verify your identity" };

const STATUS: Record<string, string> = {
  pending: "Started — finish on the secure verification page.",
  processing: "Being reviewed. This usually takes a few minutes.",
  requires_input: "We couldn’t complete verification. Please try again with a clear photo of your ID.",
  canceled: "Canceled. You can start again any time.",
  failed: "Verification couldn’t be completed. Please contact info@theartofconnect.com.",
};

export default async function VerifyPage() {
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const [{ data: profile }, { data: latest }, { data: required }, launch] = await Promise.all([
    supabase.from("profiles").select("identity_verified_at").eq("id", viewer.id).maybeSingle(),
    supabase.from("identity_verifications").select("status, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("platform_settings").select("value").eq("key", "require_identity_for_matchmaking").maybeSingle(),
    getLaunchState(),
  ]);
  const verified = Boolean(profile?.identity_verified_at);

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Trust & safety</p>
      <h1 className="display mt-4 text-5xl">Verify your identity</h1>
      <p className="mt-5 leading-relaxed text-muted">
        Verified members help keep The Art of Connect safe and genuine.
        {required?.value === true ? " Verification is required before you can take part in In Love matchmaking." : ""}
      </p>

      <div className="glass mt-10 p-7 sm:p-9">
        {verified ? (
          <p className="text-lg"><span className="text-success">✓ Verified</span> <span className="text-sm text-muted">on {date(profile!.identity_verified_at)}</span></p>
        ) : (
          <>
            {latest && <p className="mb-6 text-sm text-muted">{STATUS[latest.status] ?? ""}</p>}
            <VerifyButton enabled={launch.identity_verification_live} label={latest ? "Continue verification" : "Verify my identity"} />
          </>
        )}
      </div>

      <section className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          ["Handled by Stripe", "You’ll photograph your ID and take a quick selfie on Stripe’s secure page. Stripe Identity performs the check."],
          ["We never store your ID", "Your ID document and selfie are not stored by The Art of Connect — we only receive whether you’re verified and meet our age requirement."],
          ["Private on your profile", "Other members see a “Verified” badge — never your ID details or date of birth."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-line p-5">
            <p className="font-semibold">{t}</p>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
