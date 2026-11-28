import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BASIS, NONBINDING, SECTIONS, normalizeSections } from "@/lib/proposals";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Proposal · print" };
export const dynamic = "force-dynamic";

/** A refined, print-ready layout of the latest authorized version (print or save as PDF from the browser). */
export default async function PrintProposal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = (await createClient())!.schema("business");
  const { data: p } = await b.from("proposals").select("title").eq("id", id).maybeSingle();
  const { data: v } = await b.from("proposal_versions").select("version, sections, authorized_at").eq("proposal_id", id).eq("status", "authorized").order("version", { ascending: false }).limit(1).maybeSingle();
  if (!p || !v) notFound();
  const s = normalizeSections(v.sections);
  return (
    <article className="mx-auto max-w-3xl bg-[#fdfbf7] p-10 text-[#211f1c] shadow-xl print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton /></div>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#A88A5C]">The Art of Connect · Strategic Business Proposal</p>
      <h1 className="mt-3 font-serif text-4xl font-bold leading-tight">{p.title}</h1>
      <p className="mt-2 text-xs text-[#5e5a54]">Version {v.version} · authorized {new Date(v.authorized_at!).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
      <p className="mt-4 border-y border-[#A88A5C]/60 py-3 text-[0.72rem] italic text-[#5e5a54]">{NONBINDING}</p>
      {SECTIONS.filter((x) => s[x.key]).map((x) => (
        <section key={x.key} className="mt-6 break-inside-avoid">
          <h2 className="flex items-baseline justify-between gap-3 border-b border-[#A88A5C]/60 pb-1"><span className="font-serif text-lg font-bold">{x.title}</span><span className="text-[0.62rem] uppercase tracking-[0.16em] text-[#A88A5C]">{BASIS[s[x.key].basis]}</span></h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{s[x.key].text}</p>
        </section>
      ))}
      <p className="mt-10 text-center text-[0.65rem] text-[#5e5a54]">Prepared with The Art of Connect. Not legal, tax or financial advice.</p>
    </article>
  );
}
