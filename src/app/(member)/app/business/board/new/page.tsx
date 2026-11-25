import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { INTENTS, SCOPES, STAGES, US_STATES } from "@/lib/business-options";
import { savePost } from "@/app/actions/business";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Create a business post" };
export const dynamic = "force-dynamic";

export default async function NewPost({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { viewer } = await requireExperience("business");
  const editId = (await searchParams).edit;
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [{ data: categories }, { data: industries }, { data: me }, { data: existing }] = await Promise.all([
    biz.from("categories").select("slug, name, description").eq("is_active", true).order("sort_order"),
    biz.from("industries").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("profiles").select("industry, city, state, stage").eq("user_id", viewer.id).maybeSingle(),
    editId ? biz.from("posts").select("*").eq("id", editId).eq("author_id", viewer.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const p = existing as Record<string, any> | null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/business/board" className="text-sm text-gold">← Connection Board</Link>
      <h1 className="display mt-4 text-4xl">{p ? "Edit your post" : "Create a business post"}</h1>
      <p className="mt-2 text-muted">Describe what your business needs, or the expertise you can offer. Your email and phone number are never shown — members reach you privately, and you choose whom to accept.</p>
      <ActionForm action={savePost} className="glass mt-8 grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        {p && <input type="hidden" name="id" value={p.id} />}
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">I am</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(INTENTS).map(([k, l], i) => (
              <label key={k} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm has-[:checked]:border-champagne has-[:checked]:bg-champagne/10">
                <input type="radio" name="intent" value={k} defaultChecked={p ? p.intent === k : i === 0} className="accent-[var(--champagne)]" />{l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">Title</span><input name="title" required maxLength={120} defaultValue={p?.title ?? ""} placeholder="e.g. Seeking an operating partner" className="field" /></label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold">Category</span>
          <select name="category" required defaultValue={p?.category ?? ""} className="field">
            <option value="" disabled>Choose a category</option>
            {(categories ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold">Industry</span>
          <select name="industry" defaultValue={p?.industry ?? me?.industry ?? ""} className="field">
            <option value="">Any industry</option>
            {(industries ?? []).map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">Description</span><textarea name="description" required maxLength={3000} defaultValue={p?.description ?? ""} className="field !min-h-[160px]" placeholder="What do you need, or what can you offer? Please don’t include phone numbers, emails or sales pitches." /></label>
        <label className="space-y-1.5"><span className="text-sm font-semibold">City</span><input name="city" defaultValue={p?.city ?? me?.city ?? ""} className="field" /></label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold">State</span>
          <select name="state" defaultValue={p?.state ?? me?.state ?? ""} className="field">
            <option value="">Not specified</option>
            {Object.entries(US_STATES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold">Connect with owners</span>
          <select name="scope" defaultValue={p?.scope ?? "national"} className="field">{Object.entries(SCOPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold">Business stage</span>
          <select name="stage" defaultValue={p?.stage ?? me?.stage ?? ""} className="field"><option value="">Any</option>{Object.entries(STAGES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">Expertise involved</span><input name="expertise" defaultValue={(p?.expertise ?? []).join(", ")} placeholder="Separate with commas" className="field" /></label>
        <div className="sm:col-span-2"><button className="btn btn-gold w-full sm:w-auto">{p ? "Save changes" : "Publish to the board"}</button></div>
      </ActionForm>
    </div>
  );
}
