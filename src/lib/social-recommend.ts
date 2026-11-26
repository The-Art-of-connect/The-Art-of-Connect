import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVAILABILITY_FOR, combineCouple, evaluate, type Answers, type Fit, type Purpose } from "@/lib/connection-intelligence";

/**
 * Find People Like Me. Runs on the server with private preferences; returns only member ids, a fit label and
 * plain-language reasons. Raw answers never leave the server. Elite status is used ONLY to honor members'
 * Elite-only choices, never to rank or match.
 */
export async function recommendPeople(viewerId: string, purpose: Purpose, limit = 30): Promise<{ id: string; fit: Fit["fit"]; reasons: string[] }[]> {
  const db = createAdminClient();
  if (!db) return [];
  const availability = AVAILABILITY_FOR[purpose];
  const [{ data: cands }, { data: blocks }, { data: elites }, { data: couples }, { data: mine }] = await Promise.all([
    db.from("social_profiles").select("user_id, interests, seeking, profiles!inner(status)").eq("discoverable", true).contains("seeking", [availability]).neq("user_id", viewerId).limit(500),
    db.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`),
    db.from("elite_badges").select("user_id").eq("status", "active"),
    db.schema("relationships").from("couple_members").select("couple_id, user_id"),
    db.from("social_profiles").select("interests").eq("user_id", viewerId).maybeSingle(),
  ]);
  const blocked = new Set((blocks ?? []).flatMap((b) => [b.blocker_id, b.blocked_id]));
  const elite = new Set((elites ?? []).map((e) => e.user_id));
  const coupleOf = new Map((couples ?? []).map((c) => [c.user_id, c.couple_id]));
  const partnersOf = (uid: string) => (couples ?? []).filter((c) => c.couple_id === coupleOf.get(uid) && c.user_id !== uid).map((c) => c.user_id);
  let list = ((cands ?? []) as unknown as { user_id: string; interests: string[]; seeking: string[]; profiles: { status: string } }[])
    .filter((c) => c.profiles?.status === "active" && !blocked.has(c.user_id));

  if (purpose === "couples_friendship") {
    if (!coupleOf.has(viewerId)) return [];
    // Both partners must have opted in to couples friendships; never the viewer's own partner.
    const optedIn = new Set(list.map((c) => c.user_id));
    list = list.filter((c) => coupleOf.has(c.user_id) && coupleOf.get(c.user_id) !== coupleOf.get(viewerId) && partnersOf(c.user_id).every((p) => optedIn.has(p)));
  }
  const ids = [viewerId, ...list.map((c) => c.user_id), ...(purpose === "couples_friendship" ? [...partnersOf(viewerId), ...list.flatMap((c) => partnersOf(c.user_id))] : [])];
  const { data: prefs } = await db.from("social_preferences").select("user_id, answers, elite_only").in("user_id", [...new Set(ids)]);
  const pref = new Map((prefs ?? []).map((p) => [p.user_id, p as { user_id: string; answers: Answers; elite_only: string[] }]));
  const answersFor = (uid: string): Answers => {
    const own = pref.get(uid)?.answers ?? {};
    if (purpose !== "couples_friendship") return own;
    return partnersOf(uid).reduce((acc, p) => combineCouple(acc, pref.get(p)?.answers ?? {}), own);
  };
  const me = answersFor(viewerId);
  const myInterests = mine?.interests ?? [];
  const viewerElite = elite.has(viewerId);
  const viewerEliteOnly = viewerElite && (pref.get(viewerId)?.elite_only ?? []).includes(purpose);

  const out: { id: string; fit: Fit["fit"]; reasons: string[] }[] = [];
  for (const c of list) {
    // Elite-only choices: an Elite member may keep an activity among verified Elite peers.
    if ((pref.get(c.user_id)?.elite_only ?? []).includes(purpose) && elite.has(c.user_id) && !viewerElite) continue;
    if (viewerEliteOnly && !elite.has(c.user_id)) continue;
    const sharedInterests = (c.interests ?? []).filter((i) => myInterests.includes(i));
    const r = evaluate(purpose, me, answersFor(c.user_id), { sharedInterests });
    if (r.fit !== "unlikely") out.push({ id: c.user_id, fit: r.fit, reasons: r.reasons });
  }
  return out.sort((a, b) => (a.fit === b.fit ? b.reasons.length - a.reasons.length : a.fit === "strong" ? -1 : 1)).slice(0, limit);
}
