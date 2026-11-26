/* eslint-disable @next/next/no-img-element */
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VISION_CATEGORIES } from "@/lib/sanctuary";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { SanctuaryTabs } from "@/components/SanctuaryTabs";
import { addVisionItem, updateVisionItem } from "@/app/actions/sanctuary";

export const metadata = { title: "My Vision Board" };
export const dynamic = "force-dynamic";

type Item = { id: string; category: string; kind: string; title: string; body: string | null; photo_path: string | null; target_date: string | null; achieved_at: string | null };

/** A private vision board: photographs (own folder only, short-lived links), goals, intentions and accomplishments. */
export default async function VisionBoard() {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const { data } = live && db ? await db.from("vision_items").select("id, category, kind, title, body, photo_path, target_date, achieved_at").eq("user_id", viewer.id).order("created_at", { ascending: false }) : { data: [] };
  const items = (data ?? []) as Item[];
  const paths = items.map((i) => i.photo_path).filter(Boolean) as string[];
  const { data: signed } = paths.length && db ? await db.storage.from("vision-board").createSignedUrls(paths, 3600) : { data: [] };
  const url = Object.fromEntries((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
  return (
    <>
      <LuxHero eyebrow="My Daily Sanctuary" title="My Vision Board" tagline="See the life you're building." />
      <SanctuaryTabs current="/app/sanctuary/vision" />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          {VISION_CATEGORIES.map(([k, label]) => {
            const list = items.filter((i) => i.category === k);
            if (!list.length) return null;
            return (
              <LuxSection key={k} eyebrow="Vision" title={label}>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {list.map((i) => (
                    <li key={i.id} className="glass overflow-hidden">
                      {i.photo_path && url[i.photo_path] && <img src={url[i.photo_path]} alt="" className="aspect-[4/3] w-full object-cover" />}
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2"><span className="text-xs uppercase tracking-[0.2em] text-gold-deep">{i.kind}</span>{i.achieved_at && <span className="chip chip-live">Achieved</span>}</div>
                        <p className="display mt-1 text-xl">{i.title}</p>
                        {i.body && <p className="mt-1 text-sm text-muted">{i.body}</p>}
                        {i.target_date && <p className="mt-1 text-xs text-faint">Target {i.target_date}</p>}
                        <div className="mt-3 flex gap-3 text-xs">
                          {i.kind !== "photo" && (
                            <MemberForm action={updateVisionItem}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="action" value={i.achieved_at ? "reopen" : "achieve"} /><button className="text-gold underline">{i.achieved_at ? "Reopen" : "Mark achieved"}</button></MemberForm>
                          )}
                          <MemberForm action={updateVisionItem}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="action" value="delete" /><button className="text-muted underline">Remove</button></MemberForm>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </LuxSection>
            );
          })}
          {!items.length && <p className="glass mt-10 p-6 text-sm text-muted">Your vision board is empty. Add a goal, an intention or a photograph that represents the life you&rsquo;re building.</p>}
        </div>
        <MemberForm action={addVisionItem} className="glass h-fit space-y-3 p-6 lg:mt-10">
          <p className="display text-2xl">Add to my board</p>
          <select name="category" required className="field w-full" aria-label="Category">{VISION_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select name="kind" required className="field w-full" aria-label="Type">
            <option value="goal">Goal</option><option value="intention">Intention</option><option value="photo">Photograph</option><option value="accomplishment">Accomplishment</option>
          </select>
          <input name="title" required maxLength={160} className="field w-full" placeholder="Title" />
          <textarea name="body" rows={3} maxLength={2000} className="field w-full" placeholder="Why it matters (optional)" />
          <label className="block text-xs text-muted">Target date (optional)<input type="date" name="target_date" className="field mt-1 w-full" /></label>
          <label className="block text-xs text-muted">Photograph (optional · JPEG, PNG or WebP under 5 MB)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" /></label>
          <button className="btn btn-gold w-full">Add</button>
          <p className="text-xs text-faint">Up to 60 items and 30 photographs. Photos are private to you; location details are removed.</p>
        </MemberForm>
      </div>
      <Notice>Your vision board is private. No one else, including other members, can see it.</Notice>
    </>
  );
}
