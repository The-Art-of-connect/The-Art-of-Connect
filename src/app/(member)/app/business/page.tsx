import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FEATURE_STATUS, HELP_NEEDED, HELP_OFFERED, basicPathway } from "@/lib/business-options";
import { saveGoal, setFeatureInterest, toggleReadiness } from "@/app/actions/business";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "The Professional Society" };
export const dynamic = "force-dynamic";

export default async function BusinessHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { viewer, preview } = await requireExperience("business");
  const welcome = (await searchParams).welcome === "1";
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [{ data: profile }, { data: goals }, { data: items }, { data: done }, { data: features }, { data: interest }, { data: tier }, { data: convs }] = await Promise.all([
    biz.from("profiles").select("company, display_name, help_needed, help_offered, onboarding_completed_at, public_profile_consent").eq("user_id", viewer.id).maybeSingle(),
    biz.from("goals").select("*").eq("user_id", viewer.id).order("created_at"),
    biz.from("readiness_items").select("key, title, description, area").eq("is_active", true).order("sort_order"),
    biz.from("readiness_progress").select("item_key").eq("user_id", viewer.id),
    biz.from("features").select("key, name, description, free, premium, status, scheduled_status, scheduled_at").order("sort_order"),
    biz.from("feature_interest").select("feature_key").eq("user_id", viewer.id),
    biz.rpc("member_tier"),
    biz.from("conversations").select("id, status, recipient_id").order("last_message_at", { ascending: false }),
  ]);

  const doneSet = new Set((done ?? []).map((d) => d.item_key));
  const incomplete = (items ?? []).filter((i) => !doneSet.has(i.key));
  const pathway = basicPathway(profile?.help_needed ?? [], incomplete);
  const interested = new Set((interest ?? []).map((i) => i.feature_key));
  const statusOf = (f: { status: string; scheduled_status: string | null; scheduled_at: string | null }) =>
    f.scheduled_at && f.scheduled_status && new Date(f.scheduled_at) <= new Date() ? f.scheduled_status : f.status;
  const pendingRequests = (convs ?? []).filter((c) => c.status === "requested" && c.recipient_id === viewer.id).length;
  const premium = tier === "premium";

  return (
    <>
      {preview && <p className="mb-8 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Staff preview — The Professional Society is not open to members yet.</p>}
      <div className="theme-dark band rounded-[28px] p-8 sm:p-10">
        <p className="eyebrow">The Professional Society · In Business</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">{profile?.display_name || profile?.company || "Your business"}</h1>
        <p className="mt-2 text-muted">Your network. Your growth. Your next opportunity.</p>
        <p className="mt-4 inline-flex rounded-full border border-champagne/50 px-4 py-1.5 text-xs font-semibold tracking-wide text-gold">
          {premium ? "Professional Society Member" : "Founding Member · Free business account"}
        </p>
      </div>

      {welcome && <p className="mt-6 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-success">Thank you — your business profile is saved.</p>}

      {!profile?.onboarding_completed_at ? (
        <div className="glass glass-edge mt-8 p-8 text-center">
          <h2 className="display text-3xl">Let’s talk about your business.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">Tell us how we can help your business — and how your business can help others. It takes about ten minutes, and you can update it any time.</p>
          <Link href="/app/business/onboarding" className="btn btn-gold mt-6">Begin</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section className="glass p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="display text-3xl">Your business development pathway</h2>
                <Link href="/app/business/onboarding" className="text-sm text-gold underline">Update my answers</Link>
              </div>
              <p className="mt-1 text-sm text-muted">Practical next steps based on what you told us. Guidance only — not professional advice.</p>
              <ol className="mt-5 space-y-3">
                {pathway.map((s, i) => (
                  <li key={s.title} className="flex gap-4 rounded-xl border border-line p-4">
                    <span className="display text-2xl text-gold">{i + 1}</span>
                    <span><span className="block font-semibold">{s.title}</span><span className="block text-sm text-muted">{s.why}</span></span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="glass p-7">
              <h2 className="display text-3xl">Business goals</h2>
              <ul className="mt-4 space-y-3">
                {(goals ?? []).map((g) => (
                  <li key={g.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{g.title}</p>
                      <span className="text-xs text-muted">{g.horizon === "long" ? "Long-term" : "Short-term"}{g.target_date ? ` · by ${g.target_date}` : ""}{g.status === "achieved" ? " · Achieved" : ""}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-3"><div className="h-full rounded-full bg-champagne" style={{ width: `${g.progress}%` }} /></div>
                    <ActionForm action={saveGoal} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <input type="hidden" name="id" value={g.id} />
                      <input name="progress" type="number" min={0} max={100} step={5} defaultValue={g.progress} className="field !min-h-0 !w-24 !py-1.5" aria-label="Progress percent" />
                      <span className="text-muted">%</span>
                      <button className="btn btn-ghost btn-sm">Update</button>
                    </ActionForm>
                  </li>
                ))}
                {!goals?.length && <li className="text-sm text-muted">No goals yet. Add your first one below.</li>}
              </ul>
              <ActionForm action={saveGoal} className="mt-5 grid gap-3 sm:grid-cols-[1fr_9rem_10rem_auto]">
                <input name="title" placeholder="e.g. Open a second location" className="field" aria-label="Goal" />
                <select name="horizon" className="field" aria-label="Horizon"><option value="short">Short-term</option><option value="long">Long-term</option></select>
                <input name="targetDate" type="date" className="field" aria-label="Target date" />
                <button className="btn btn-gold btn-sm">Add goal</button>
              </ActionForm>
            </section>

            <section className="glass p-7">
              <h2 className="display text-3xl">Business readiness checklist</h2>
              <p className="mt-1 text-sm text-muted">{doneSet.size} of {items?.length ?? 0} complete.</p>
              <ul className="mt-4 divide-y divide-line">
                {(items ?? []).map((it) => (
                  <li key={it.key} className="flex items-start justify-between gap-4 py-3">
                    <span><span className="block font-semibold">{it.title}</span><span className="block text-xs text-muted">{it.area} · {it.description}</span></span>
                    <ActionForm action={toggleReadiness}>
                      <input type="hidden" name="key" value={it.key} />
                      <input type="hidden" name="done" value={doneSet.has(it.key) ? "0" : "1"} />
                      <button className={`btn btn-sm ${doneSet.has(it.key) ? "btn-gold" : "btn-ghost"}`}>{doneSet.has(it.key) ? "✓ Done" : "Mark done"}</button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="theme-dark band rounded-[24px] p-7">
              <h2 className="display text-3xl">The Business Connection Board</h2>
              <p className="mt-2 text-sm text-muted">Your city. Your state. Beyond your boundaries.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href="/app/business/board" className="btn btn-gold">Browse the board</Link>
                <Link href="/app/business/board/new" className="btn btn-ghost">Create a business post</Link>
                <Link href="/app/business/inbox" className="btn btn-ghost">
                  Private inbox{pendingRequests ? ` · ${pendingRequests} new request${pendingRequests > 1 ? "s" : ""}` : ""}
                </Link>
              </div>
            </section>

            <section className="glass p-7">
              <h2 className="text-lg font-semibold">What you shared</h2>
              <p className="mt-3 text-xs font-semibold tracking-wide text-gold uppercase">Looking for</p>
              <p className="mt-1 text-sm">{(profile.help_needed ?? []).map((h: string) => HELP_NEEDED[h]).join(" · ") || "—"}</p>
              <p className="mt-4 text-xs font-semibold tracking-wide text-gold uppercase">Can help with</p>
              <p className="mt-1 text-sm">{(profile.help_offered ?? []).map((h: string) => HELP_OFFERED[h]).join(" · ") || "—"}</p>
              <p className="mt-4 text-xs text-muted">{profile.public_profile_consent ? "Your profile is shown on the public Explore page." : "Your profile is not public."}</p>
            </section>

            <section className="glass p-7">
              <h2 className="text-lg font-semibold">Features</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {(features ?? []).filter((f) => f.free || f.premium).map((f) => {
                  const st = statusOf(f);
                  const live = st === "available_now" || st === "growing_community";
                  const included = premium ? f.premium : f.free;
                  return (
                    <li key={f.key} className="rounded-xl border border-line p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{f.name}</span>
                        <span className={`chip shrink-0 normal-case tracking-normal !text-[0.65rem] ${FEATURE_STATUS[st]?.tone ?? ""}`}>{FEATURE_STATUS[st]?.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{f.description}</p>
                      {!included && <p className="mt-1 text-xs text-gold">Included with Professional Society membership</p>}
                      {!live && (
                        <ActionForm action={setFeatureInterest} className="mt-2">
                          <input type="hidden" name="key" value={f.key} />
                          <input type="hidden" name="on" value={interested.has(f.key) ? "0" : "1"} />
                          <button className="text-xs text-gold underline">{interested.has(f.key) ? "✓ You’ll be notified — undo" : "Notify me when available"}</button>
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
