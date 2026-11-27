import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, presignUpload, vaultConfig, vaultKey } from "@/lib/vault-aws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  documentId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "image/jpeg", "image/png"]),
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

/**
 * Issues a 5-minute upload link for a new document version (testing storage only: owner, staff and test accounts).
 * The database checks the member may add to this document; S3 accepts only the approved size and type; nothing can be opened
 * until GuardDuty finds no threats.
 */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That file type or size isn't accepted." }, { status: 400 });
  if (!vaultConfig().ready) return NextResponse.json({ error: "Document storage isn't available." }, { status: 503 });
  const db = (await createClient())!;
  const { data: allowed } = await db.schema("business").rpc("vault_upload_allowed");
  if (allowed !== true) return NextResponse.json({ error: "Document storage is in testing and isn't open to members yet." }, { status: 403 });
  const b = parsed.data;
  const { data: v, error } = await db.schema("business").from("document_versions").insert({
    document_id: b.documentId, version: 0, storage_path: `pending-${crypto.randomUUID()}`, file_name: b.fileName, mime_type: b.mimeType,
    size_bytes: b.size, sha256: b.sha256, uploaded_by: viewer.id, storage_provider: "aws_testing",
  }).select("id, storage_path").single();
  if (error || !v) return NextResponse.json({ error: "You can't add a file to this document." }, { status: 403 });
  const url = await presignUpload(vaultKey(v.storage_path), b.mimeType, b.size);
  return NextResponse.json({ versionId: v.id, uploadUrl: url, expiresInSeconds: 300 }, { headers: { "Cache-Control": "no-store" } });
}
