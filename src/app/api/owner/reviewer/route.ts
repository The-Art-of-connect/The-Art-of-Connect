import { NextResponse } from "next/server";
import { getViewer, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Lets the public header show the Preview button to owner accounts only. Reveals nothing else. */
export async function GET() {
  const viewer = await getViewer().catch(() => null);
  return NextResponse.json({ reviewer: hasRole(viewer, ["owner", "executive"]) }, { headers: { "Cache-Control": "private, no-store" } });
}
