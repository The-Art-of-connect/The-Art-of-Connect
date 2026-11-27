import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readScan, vaultKey } from "@/lib/vault-aws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_STATE = { clean: "clean", infected: "infected", error: "error", pending: "pending", missing: "pending" } as const;

/** The malware-scan state of a version the member may see, refreshed from GuardDuty's tag. */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const db = (await createClient())!;
  const { data: v } = await db.schema("business").from("document_versions").select("id, storage_path, storage_provider, scan_status").eq("id", id).maybeSingle();
  if (!v || v.storage_provider !== "aws_testing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const state = await readScan(vaultKey(v.storage_path));
  const admin = createAdminClient();
  if (admin && DB_STATE[state] !== v.scan_status) {
    await admin.schema("business").from("document_versions").update({ scan_status: DB_STATE[state], scanned_at: state === "pending" || state === "missing" ? null : new Date().toISOString(), scan_checked_at: new Date().toISOString() }).eq("id", v.id);
  }
  return NextResponse.json({ state: DB_STATE[state] }, { headers: { "Cache-Control": "no-store" } });
}
