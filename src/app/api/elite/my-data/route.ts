import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** A member's own Elite verification information, as a downloadable file. Never anyone else's. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const db = await createClient();
  const { data, error } = db ? await db.rpc("elite_my_verification") : { data: null, error: true };
  if (error) return NextResponse.json({ error: "Please try again." }, { status: 500 });
  return new NextResponse(JSON.stringify({ note: "Your Elite verification information held by The Art of Connect. Amounts are in cents. Deposits are not income and balances are not net worth.", ...(data as object) }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="my-elite-verification.json"', "cache-control": "no-store" },
  });
}
