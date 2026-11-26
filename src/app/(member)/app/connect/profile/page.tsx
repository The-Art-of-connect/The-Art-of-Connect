import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveSocialProfile, updateSocialPhoto, uploadSocialPhoto } from "@/app/actions/social";
import { INTERESTS, SEEKING } from "@/lib/social";
import { signPhotos } from "@/lib/social-server";
import { Avatar } from "@/components/social/ui";

export const metadata = { title: "My profile" };
const VIS = [["members", "All members"], ["connections", "My connections"], ["private", "Only me"]] as const;

/** My Story: profile, photographs and what I'm available for. Everything is optional and editable. */
export default async function MyProfile() {
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">Preview: sign in with your own account to edit a profile.</p>;
  const db = (await createClient())!;
  const [{ data: p }, { data: photos }, { data: limit }] = await Promise.all([
    db.from("social_profiles").select("*").eq("user_id", viewer.id).maybeSingle(),
    db.from("social_photos").select("id, path, caption, visibility").eq("user_id", viewer.id).eq("status", "active").order("created_at", { ascending: false }),
    db.rpc("social_photo_limit", { p: viewer.id }),
  ]);
  const urls = await signPhotos(db, [...(photos ?? []).map((x) => x.path), p?.avatar_path]);
  const { data: badge } = await db.from("elite_badges").select("status").eq("user_id", viewer.id).maybeSingle();
  const elite = badge?.status === "active";
  const has = (list: string[] | null | undefined, v: string) => Boolean(list?.includes(v));

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Avatar name={viewer.displayName} url={p?.avatar_path ? urls[p.avatar_path] : null} size={72} />
        <div>
          <p className="eyebrow">My Story</p>
          <h1 className="display text-4xl">{viewer.displayName ?? "My profile"}</h1>
          <Link href={`/app/connect/members/${viewer.id}`} className="text-sm text-gold underline">See my profile as members see it</Link>
        </div>
      </header>

      <ActionForm action={saveSocialProfile} className="glass space-y-5 p-6">
        <h2 className="display text-2xl">About me</h2>
        <label className="block text-sm">Headline<input name="headline" defaultValue={p?.headline ?? ""} maxLength={120} className="field mt-1 w-full" placeholder="Founder · Traveler · Lifelong learner" /></label>
        <label className="block text-sm">My story<textarea name="bio" defaultValue={p?.bio ?? ""} rows={4} maxLength={1000} className="field mt-1 w-full" placeholder="What brings you joy, what you're building, what you'd love to share" /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">City<input name="city" defaultValue={p?.city ?? ""} className="field mt-1 w-full" /></label>
          <label className="text-sm">State / region<input name="region" defaultValue={p?.region ?? ""} className="field mt-1 w-full" /></label>
          <label className="text-sm">Country<input name="country" defaultValue={p?.country ?? ""} className="field mt-1 w-full" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_location" defaultChecked={p?.show_location} /> Show my city, region and country on my profile</label>
        <fieldset>
          <legend className="text-sm font-semibold">Interests (up to 20)</legend>
          <div className="mt-2 flex flex-wrap gap-2">{INTERESTS.map(([k, v]) => (
            <label key={k} className="cursor-pointer rounded-full border border-line px-3 py-1 text-sm has-[:checked]:border-[#e8701a] has-[:checked]:bg-[#e8701a]/10"><input type="checkbox" name="interests" value={k} defaultChecked={has(p?.interests, k)} className="sr-only" />{v}</label>
          ))}</div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">I&rsquo;m available for</legend>
          <p className="text-xs text-muted">You decide. Nobody is ever required to mentor or connect. Romance stays in The Personal Society.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{SEEKING.map(([k, v]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="seeking" value={k} defaultChecked={has(p?.seeking, k)} /> {v}</label>
          ))}</div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="discoverable" defaultChecked={p?.discoverable} /> Let members find me in Find People Like Me (only for what I&rsquo;m available for)</label>
        <label className="block text-sm">Who can see my profile
          <select name="profile_visibility" defaultValue={p?.profile_visibility ?? "members"} className="field mt-1 w-full">
            <option value="members">All members</option>
            <option value="connections">Only my connections</option>
            {elite && <option value="elite">Elite members and my connections (Elite privacy)</option>}
          </select>
        </label>
        <button className="btn btn-gold btn-sm">Save my profile</button>
      </ActionForm>

      <section className="glass p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-2xl">My photographs</h2>
          <p className="text-xs text-muted">{photos?.length ?? 0} of {Number(limit ?? 5)} with your membership</p>
        </div>
        <ActionForm action={uploadSocialPhoto} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm">Photograph<input type="file" name="photo" required accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" /></label>
          <label className="text-sm">Who can see it<select name="visibility" className="field mt-1 w-full">{VIS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <button className="btn btn-gold btn-sm">Add</button>
          <label className="text-sm sm:col-span-2">Caption (optional)<input name="caption" maxLength={300} className="field mt-1 w-full" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="avatar" /> Use as profile photo</label>
        </ActionForm>
        <p className="mt-2 text-[0.7rem] text-faint">Location and camera details are removed automatically. Photos marked &ldquo;Only me&rdquo; or &ldquo;My connections&rdquo; are protected by our storage rules, not just hidden.</p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(photos ?? []).map((ph) => (
            <li key={ph.id} className="overflow-hidden rounded-2xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {urls[ph.path] && <img src={urls[ph.path]} alt={ph.caption ?? ""} className="aspect-square w-full object-cover" />}
              <ActionForm action={updateSocialPhoto} className="space-y-1 p-2 text-xs">
                <input type="hidden" name="id" value={ph.id} />
                <select name="visibility" defaultValue={ph.visibility} className="field w-full !py-1 text-xs">{VIS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <div className="flex flex-wrap gap-1">
                  <button name="op" value="visibility" className="btn btn-ghost btn-sm !px-2">Save</button>
                  <button name="op" value="avatar" className="btn btn-ghost btn-sm !px-2">{p?.avatar_path === ph.path ? "Profile ✓" : "Profile"}</button>
                  <button name="op" value="delete" className="btn btn-ghost btn-sm !px-2 text-danger">Delete</button>
                </div>
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/app/connect/preferences" className="glass block p-6 transition hover:border-gold">
        <p className="display text-2xl">My connection preferences →</p>
        <p className="mt-1 text-sm text-muted">A few private questions, answered at your own pace, so recommendations fit each kind of connection. Only you can see your answers.</p>
      </Link>
    </div>
  );
}
