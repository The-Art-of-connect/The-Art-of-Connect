import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { JOURNEY_GUARDRAILS, JOURNEY_PHILOSOPHY } from "@/lib/journey";
import { PERSONALITY_SECTIONS, parsePersonality } from "@/lib/journey-personality";
import { publishInstructions, savePersonality } from "@/app/actions/journey-admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { OwnerTest } from "@/components/admin/OwnerTest";
import { NotConnected, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Journey’s master personality" };
export const dynamic = "force-dynamic";

export default async function JourneyPersonality() {
  const viewer = await requireStaff(rolesFor("/admin/journey"));
  const owner = viewer.roles.includes("owner");
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Journey" title="Master personality" /><NotConnected /></>;
  const { data: versions } = await supabase.from("journey_instruction_versions").select("id, version, note, status, body, created_at, published_at").order("version", { ascending: false }).limit(30);
  const latest = versions?.[0];
  const published = versions?.find((v) => v.status === "published");
  const sections = parsePersonality(latest?.body);
  const date = (d: string | null) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

  return (
    <>
      <Link href="/admin/journey" className="text-sm text-gold">← Journey Intelligence Center</Link>
      <PageHeader eyebrow="Journey" title="Master personality & instructions" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">
        Shape who Journey is — no code changes. Each save creates a new version; test it privately, then publish. You can return to any earlier version at any time.
        {published ? <> Journey is currently using <strong>version {published.version}</strong>.</> : <> No version is published yet — Journey uses only the founding philosophy below.</>}
      </p>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={latest ? `Editing from version ${latest.version}${latest.status === "published" ? " (published)" : " (draft)"}` : "Write the first version"}>
          <ActionForm action={savePersonality} className="space-y-5 p-5">
            {PERSONALITY_SECTIONS.map((s) => (
              <label key={s.key} className="block space-y-1.5">
                <span className="font-semibold">{s.title}</span>
                <span className="block text-xs text-muted">{s.hint}</span>
                <textarea name={s.key} defaultValue={sections[s.key]} maxLength={6000} rows={5} className="field" />
              </label>
            ))}
            <input name="note" maxLength={300} placeholder="What changed in this version? (optional)" className="field" />
            <div className="flex flex-wrap gap-2">
              <button name="publish" value="0" className="btn btn-ghost btn-sm">Save as draft</button>
              {owner && <button name="publish" value="1" className="btn btn-gold btn-sm">Save & publish</button>}
            </div>
          </ActionForm>
        </Panel>

        <div className="space-y-6">
          <Panel title="Test privately">
            <OwnerTest />
          </Panel>
          <Panel title="Versions">
            <ul className="divide-y divide-line text-sm">
              {(versions ?? []).map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="font-semibold">Version {v.version}</span>{" "}
                    <span className={`text-xs ${v.status === "published" ? "text-success" : "text-faint"}`}>{v.status}</span>
                    <span className="block text-xs text-muted">{v.note ?? "—"} · {date(v.published_at ?? v.created_at)}</span>
                  </span>
                  {owner && v.status !== "published" && (
                    <ActionForm action={publishInstructions}><input type="hidden" name="id" value={v.id} /><button className="text-xs text-gold underline">{published && v.version < published.version ? "Roll back to this" : "Publish"}</button></ActionForm>
                  )}
                </li>
              ))}
              {!versions?.length && <li className="px-5 py-4 text-muted">No versions yet.</li>}
            </ul>
          </Panel>
          <Panel title="Always first: the founding philosophy">
            <div className="max-h-80 space-y-3 overflow-y-auto p-5 text-xs text-muted">
              <p className="whitespace-pre-line">{JOURNEY_PHILOSOPHY}</p>
              <ul className="list-disc space-y-1 pl-4">{JOURNEY_GUARDRAILS.map((g) => <li key={g}>{g}</li>)}</ul>
              <p className="text-faint">These are fixed in Journey’s foundation and always come before the personality you write.</p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
