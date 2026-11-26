import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasRole } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { KIND_LABEL, type Content } from "@/lib/sanctuary";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { SanctuaryContentForm } from "@/components/admin/SanctuaryContentForm";
import { deleteSanctuaryContent, setSanctuaryStatus } from "@/app/actions/sanctuary-admin";

export const dynamic = "force-dynamic";

export default async function EditSanctuaryItem({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff(rolesFor("/admin/curriculum"));
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = (await createClient())!;
  const { data } = await db.from("sanctuary_content").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const item = data as Content & { status: string; prepared_by: string; approved_at: string | null };
  const owner = hasRole(viewer, ["owner"]);
  return (
    <>
      <PageHeader eyebrow="My Daily Sanctuary" title={KIND_LABEL[item.kind] ?? "Content"} />
      <p className="-mt-4 mb-6 text-sm text-muted">Status: <strong>{item.status}</strong>{item.prepared_by === "peace" ? " · prepared by Peace for your review" : ""}{item.approved_at ? ` · approved ${new Date(item.approved_at).toLocaleDateString("en-US")}` : ""}</p>
      <Panel title="Edit"><div className="p-5"><SanctuaryContentForm item={item} /></div></Panel>
      <div className="mt-6 flex flex-wrap gap-3">
        {owner && item.status !== "published" && <ActionForm action={setSanctuaryStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="published" /><button className="btn btn-gold">Approve and publish</button></ActionForm>}
        {item.status === "published" && <ActionForm action={setSanctuaryStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="archived" /><button className="btn btn-ghost">Archive</button></ActionForm>}
        {item.status !== "published" && <ActionForm action={deleteSanctuaryContent}><input type="hidden" name="id" value={item.id} /><button className="btn btn-ghost">Delete draft</button></ActionForm>}
        <Link href="/admin/curriculum/sanctuary" className="btn btn-ghost">Back</Link>
      </div>
    </>
  );
}
