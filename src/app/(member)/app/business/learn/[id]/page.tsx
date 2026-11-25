import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatWhen, getPublicWebinar, isLiveWindow, mediaUrl, publicWebinarUrl } from "@/lib/webinars";
import { askQuestion, cancelRegistration, joinWebinar, leaveFeedback, registerForWebinar } from "@/app/actions/webinars";
import { ActionForm } from "@/components/admin/ActionForm";

export const dynamic = "force-dynamic";

export default async function WebinarDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { viewer } = await requireExperience("business");
  const { id } = await params;
  const ref = (await searchParams).ref ?? "";
  const w = await getPublicWebinar(id);
  if (!w) notFound();
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [{ data: reg }, { data: mayAttend }, { data: tier }] = await Promise.all([
    biz.from("webinar_registrations").select("canceled_at, attended_at, feedback_rating").eq("webinar_id", id).eq("user_id", viewer.id).maybeSingle(),
    biz.rpc("may_attend", { webinar: id }),
    biz.rpc("member_tier"),
  ]);
  const registered = reg && !reg.canceled_at;
  const img = mediaUrl(w.promo_image_path);
  const headshot = mediaUrl(w.headshot_path);
  const { date, time } = formatWhen(w.starts_at, w.time_zone);
  const ended = new Date(w.starts_at).getTime() + w.duration_minutes * 60_000 < Date.now();
  const canceled = w.status === "canceled";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app/business/learn" className="text-sm text-gold">← The Knowledge Exchange</Link>
      <article className="theme-dark band mt-4 overflow-hidden rounded-[28px]">
        {img && <div className="relative aspect-[16/9] w-full"><Image src={img} alt="" fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" /></div>}
        <div className="p-7 text-center sm:p-10">
          <p className="eyebrow">The Professional Society presents</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">{w.title}</h1>
          <p className="mt-3 text-gold">{date} · {time} · {w.duration_minutes} minutes</p>
          {canceled && <p className="mt-3 font-semibold text-danger">This webinar was canceled.</p>}
        </div>
      </article>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="glass p-7">
          <p className="whitespace-pre-line leading-relaxed">{w.description}</p>
          {w.learning_objectives.length > 0 && (
            <>
              <h2 className="mt-6 font-semibold">You’ll learn</h2>
              <ul className="mt-2 space-y-1.5 text-sm">{w.learning_objectives.map((o) => <li key={o} className="flex gap-2"><span className="text-gold">✓</span>{o}</li>)}</ul>
            </>
          )}
          {w.audience && <p className="mt-5 text-sm text-muted">For: {w.audience}</p>}
          <div className="mt-6 flex items-start gap-4 border-t border-line pt-5">
            {headshot && <Image src={headshot} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />}
            <div>
              <p className="font-semibold">{w.host_display_name}</p>
              {w.host_bio && <p className="mt-1 text-sm text-muted">{w.host_bio}</p>}
              {w.co_hosts && <p className="mt-1 text-xs text-muted">With {w.co_hosts}</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="glass p-6">
            {canceled ? (
              <p className="text-sm text-muted">This webinar will not take place.</p>
            ) : ended ? (
              <p className="text-sm text-muted">This webinar has ended.</p>
            ) : registered ? (
              <>
                <p className="font-semibold text-success">✓ You’re registered</p>
                {isLiveWindow(w) ? (
                  mayAttend ? (
                    <ActionForm action={joinWebinar} className="mt-4"><input type="hidden" name="id" value={id} /><button className="btn btn-gold w-full">Join now</button></ActionForm>
                  ) : null
                ) : (
                  <p className="mt-2 text-sm text-muted">The Join button appears here 15 minutes before the start time.</p>
                )}
                <ActionForm action={cancelRegistration} className="mt-3"><input type="hidden" name="id" value={id} /><button className="text-xs text-muted underline">Cancel my registration</button></ActionForm>
              </>
            ) : mayAttend ? (
              <ActionForm action={registerForWebinar} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="ref" value={ref} />
                {w.provider && <p className="text-xs text-muted">Hosted live by the speaker. Your private join link is shown here when the room opens.</p>}
                <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="recordingConsent" className="mt-0.5 accent-[var(--champagne)]" /> I agree to appear in a recording if the host records this session (optional).</label>
                <button className="btn btn-gold w-full">Register to attend</button>
              </ActionForm>
            ) : null}
            {!mayAttend && !canceled && !ended && (
              <div className="mt-2 rounded-2xl border border-champagne/50 bg-champagne/10 p-5 text-sm">
                <p className="display text-2xl">Keep learning with The Professional Society.</p>
                <p className="mt-2 text-muted">
                  {tier === "premium" ? "This is a special event with separate registration." : "You’ve enjoyed your complimentary webinars. Professional Society membership includes unlimited eligible webinars, hosting your own, advanced matching and personalized introductions."}
                </p>
                {tier !== "premium" && <Link href="/membership?experiences=business#build" className="btn btn-gold mt-4 w-full">Explore membership</Link>}
                <p className="mt-2 text-xs text-faint">You’re never charged automatically.</p>
              </div>
            )}
          </section>

          {registered && !ended && (
            <section className="glass p-6">
              <p className="font-semibold">Ask the host a question</p>
              <ActionForm action={askQuestion} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={id} />
                <textarea name="body" maxLength={1000} className="field !min-h-[80px]" aria-label="Your question" />
                <button className="btn btn-ghost btn-sm">Send question</button>
              </ActionForm>
            </section>
          )}
          {reg?.attended_at && (
            <section className="glass p-6">
              <p className="font-semibold">{reg.feedback_rating ? "Thank you for your feedback" : "How was this webinar?"}</p>
              {!reg.feedback_rating && (
                <ActionForm action={leaveFeedback} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={id} />
                  <select name="rating" className="field" aria-label="Rating"><option value="5">Excellent</option><option value="4">Very good</option><option value="3">Good</option><option value="2">Fair</option><option value="1">Poor</option></select>
                  <textarea name="text" maxLength={2000} placeholder="What was most valuable? (optional)" className="field !min-h-[70px]" />
                  <button className="btn btn-ghost btn-sm">Send feedback</button>
                </ActionForm>
              )}
            </section>
          )}
          <p className="text-center text-xs text-muted">Share: <span className="select-all text-gold">{publicWebinarUrl(id)}</span></p>
        </aside>
      </div>
    </div>
  );
}
