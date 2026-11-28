import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const recentLimit = 10;
const transcriptLimit = 100;

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) {
    return NextResponse.json({ message: "Sign in to open your saved conversations." }, { status: 401, headers });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (id !== null && !z.uuid().safeParse(id).success) {
    return NextResponse.json({ message: "That conversation wasn't found." }, { status: 404, headers });
  }

  const db = await createClient();
  const unavailable = () => NextResponse.json({ message: "Saved conversations couldn't load. Please try again." }, { status: 503, headers });
  if (!db) return unavailable();
  const owned = db.from("journey_conversations").select("id, mode, title, updated_at").eq("user_id", viewer.id).eq("home_chat", true);

  if (id === null) {
    const { data, error } = await owned.order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(recentLimit);
    return error ? unavailable() : NextResponse.json({ conversations: data }, { headers });
  }

  const { data: conversation, error } = await owned.eq("id", id).maybeSingle();
  if (error) return unavailable();
  if (!conversation) {
    return NextResponse.json({ message: "That conversation wasn't found." }, { status: 404, headers });
  }

  const { data: messages, error: messagesError } = await db.from("journey_messages").select("role, content")
    .eq("conversation_id", id).eq("user_id", viewer.id).order("id", { ascending: false }).limit(transcriptLimit + 1);
  if (messagesError) return unavailable();
  return NextResponse.json({
    conversation,
    turns: messages.slice(0, transcriptLimit).reverse().map((message) => ({ role: message.role, text: message.content })),
    truncated: messages.length > transcriptLimit,
  }, { headers });
}
