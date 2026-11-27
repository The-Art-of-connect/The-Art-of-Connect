import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { presignDownload, readScan, vaultKey } from "@/lib/vault-aws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens a document version: the member must be allowed to see it (database), and GuardDuty's live tag must read NO_THREATS_FOUND.
 * The link lasts 60 seconds. AWS enforces the same scan rule independently.
 */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const db = (await createClient())!;
  const { data: v } = await db.schema("business").from("document_versions").select("id, storage_path, storage_provider, file_name, scan_status").eq("id", id).maybeSingle();
  if (!v || v.storage_provider !== "aws_testing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const state = await readScan(vaultKey(v.storage_path));
  if (state !== "clean") {
    const admin = createAdminClient();
    const map = { infected: "infected", error: "error", pending: "pending", missing: "pending", clean: "clean" } as const;
    if (admin && map[state] !== v.scan_status) await admin.schema("business").from("document_versions").update({ scan_status: map[state], scan_checked_at: new Date().toISOString() }).eq("id", v.id);
    return NextResponse.json({ error: state === "pending" ? "This file is still being checked for security. Please try again in a moment." : "This file can't be opened because it didn't pass the security check." }, { status: 423 });
  }
  if (v.scan_status !== "clean") {
    const admin = createAdminClient();
    if (admin) await admin.schema("business").from("document_versions").update({ scan_status: "clean", scanned_at: new Date().toISOString(), scan_checked_at: new Date().toISOString() }).eq("id", v.id);
  }
  const { data: allowed } = await db.schema("business").rpc("can_open_version", { vid: v.id });
  if (allowed !== true) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = await presignDownload(vaultKey(v.storage_path), v.file_name);
  if (!url) return NextResponse.json({ error: "This file can't be opened right now." }, { status: 423 });
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store" } });
}
