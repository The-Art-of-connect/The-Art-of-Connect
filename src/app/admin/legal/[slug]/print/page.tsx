import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type LegalStatus } from "@/lib/legal";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/** Print-ready copy of any version (drafts are clearly marked). */
export default async function PrintLegalVersion({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string }> }) {
  await requireStaff(rolesFor("/admin/legal"));
  const { slug } = await params;
  const { v } = await searchParams;
  const supabase = (await createClient())!;
  const q = supabase.from("legal_document_versions").select("*").eq("document_slug", slug);
  const { data } = v ? await q.eq("id", v).maybeSingle() : await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) notFound();
  const final = data.status === "published" || data.status === "scheduled";
  return (
    <article className="print-doc mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <a href={`/admin/legal/${slug}?v=${data.id}`} className="text-sm text-gold">← Back</a>
        <PrintButton />
      </div>
      <p className="text-xs tracking-[0.2em] uppercase">The Art of Connect, LLC</p>
      <h1 className="display mt-3 text-4xl">{data.title}</h1>
      <p className="mt-2 text-sm">
        Version {data.version_label} · {STATUS_LABEL[data.status as LegalStatus]}
        {data.effective_date ? ` · Effective ${data.effective_date}` : ""} · Fingerprint {data.body_sha256.slice(0, 16)}…
      </p>
      {!final && <p className="mt-4 border border-current p-3 text-sm font-semibold">DRAFT — not in effect. Pending owner approval and attorney review.</p>}
      <div className="mt-8"><Markdown source={data.body} /></div>
      <p className="mt-10 text-xs">Questions: info@theartofconnect.com</p>
    </article>
  );
}
