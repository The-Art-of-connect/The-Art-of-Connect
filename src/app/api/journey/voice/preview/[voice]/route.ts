import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { voiceById } from "@/lib/journey-customize";

export const dynamic = "force-dynamic";

/** Plays a stored voice preview to a signed-in member. No AI is called. */
export async function GET(_req: Request, { params }: { params: Promise<{ voice: string }> }) {
  const v = voiceById((await params).voice);
  const viewer = await getViewer();
  if (!v || !viewer) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const { data } = supabase ? await supabase.from("journey_voice_previews").select("audio_base64, mime").eq("voice", v.id).maybeSingle() : { data: null };
  if (!data?.audio_base64) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(data.audio_base64, "base64"), { headers: { "Content-Type": data.mime ?? "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
}
