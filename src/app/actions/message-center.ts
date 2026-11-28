"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type R = { ok: boolean; message: string } | null;

/** Message Center (directives 43 and 45): mark read, and the member's own notification preferences. */
export async function markAllRead(): Promise<R> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Preview only." };
  const db = await createClient();
  await db?.from("member_notices").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.id).is("read_at", null);
  revalidatePath("/app/message-center");
  return { ok: true, message: "All caught up." };
}

export async function savePrefs(_p: R, f: FormData): Promise<R> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Preview only: nothing is saved." };
  const db = await createClient();
  const on = (k: string) => f.get(k) === "on";
  const { error } = (await db?.from("notification_prefs").upsert({ user_id: viewer.id, live_qa_popup: on("live_qa_popup"), live_qa_message: on("live_qa_message"), milestones: on("milestones"), growth_reports: on("growth_reports"), updated_at: new Date().toISOString() })) ?? { error: true };
  revalidatePath("/app/message-center");
  return error ? { ok: false, message: "Your preferences couldn't be saved." } : { ok: true, message: "Saved." };
}

/** Live Q&A attendance (directive 43): join to participate or simply listen. Never disconnects any other session. */
export async function joinLive(_p: R, f: FormData): Promise<R> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Preview only." };
  const db = await createClient();
  const session = String(f.get("session") ?? ""), mode = f.get("mode") === "listen" ? "listen" : "participate";
  if (!db || !/^[0-9a-f-]{36}$/.test(session)) return { ok: false, message: "Please try again." };
  const { error } = await db.from("circle_live_attendance").upsert({ session_id: session, user_id: viewer.id, mode });
  revalidatePath("/app/circle", "layout");
  return error ? { ok: false, message: "That couldn't be saved." } : { ok: true, message: mode === "listen" ? "You're listening. Join the conversation whenever you like." : "Welcome. Ask a question or share your perspective below." };
}
