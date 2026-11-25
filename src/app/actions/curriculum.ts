"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getMfaStatus, getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CURRICULA, getCurriculum, mergeCurriculum } from "@/lib/curricula";
import { analysisStoreKey, choiceKey, curriculumKeys, journeyAnalysisRequest, reflectionKey, type Answers, type Curriculum } from "@/lib/curricula/core";
import { sendJourneyMessage } from "@/lib/journey-server";
import type { ActionResult } from "@/app/actions/admin";

const pathFor = (section: string) => `/app/know-yourself/${section}`;

/** Saves a member's answers to one lesson (self-guided; no credits). Only choices that exist in the curriculum are accepted. */
export async function saveLessonAnswers(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in to save your reflections." };
  const supabase = (await createClient())!;
  const c = await getCurriculum(supabase, String(f.get("section") ?? ""));
  const lesson = c?.lessons.find((l) => l.slug === f.get("lesson"));
  if (!c || !lesson) return { ok: false, message: "Unknown lesson." };
  const rows = lesson.questions.flatMap((q) => {
    const v = String(f.get(q.key) ?? "");
    return q.choices.some((ch) => ch.key === v) ? [{ user_id: viewer.id, question_key: choiceKey(c, q.key), answer: null, choices: [v] }] : [];
  });
  rows.push({ user_id: viewer.id, question_key: reflectionKey(c, lesson.slug), answer: (String(f.get("reflection") ?? "").trim().slice(0, 4000) || null) as never, choices: null as never });
  const { error } = await supabase.from("discovery_answers").upsert(rows, { onConflict: "user_id,question_key" });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath(pathFor(c.section));
  return { ok: true, message: "Saved privately. Your personal analysis has been updated." };
}

/** A paid member asks Journey for an individualized analysis of the whole section (consent; 1 credit, server-enforced). */
export async function createJourneyCurriculumAnalysis(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in first." };
  if (f.get("consent") !== "yes") return { ok: false, message: "Please confirm that Journey may read your answers to this section." };
  const supabase = (await createClient())!;
  const c = await getCurriculum(supabase, String(f.get("section") ?? ""));
  if (!c) return { ok: false, message: "Unknown section." };
  const { data } = await supabase.from("discovery_answers").select("question_key, answer, choices").eq("user_id", viewer.id).in("question_key", curriculumKeys(c));
  const answers: Answers = Object.fromEntries((data ?? []).map((r) => [r.question_key, r]));
  const message = journeyAnalysisRequest(c, answers, 3900);
  if (!message) return { ok: false, message: "Answer at least one lesson first." };
  const reply = await sendJourneyMessage({ mode: "life", message, requestKey: randomUUID(), lesson: c.section, ownerTest: viewer.roles.length > 0 });
  if (!reply.ok) return { ok: false, message: reply.message };
  const { error } = await supabase.from("discovery_answers").upsert({ user_id: viewer.id, question_key: analysisStoreKey(c), answer: reply.reply.slice(0, 4000), choices: null }, { onConflict: "user_id,question_key" });
  if (error) return { ok: false, message: "Journey wrote your analysis, but it couldn't be saved. It's in your Journey conversations." };
  revalidatePath(pathFor(c.section));
  return { ok: true, message: "Your personal analysis from Journey is ready, saved privately for you." };
}

async function owner() {
  const viewer = await getViewer();
  if (!hasRole(viewer, ["owner", "executive"])) return null;
  const mfa = await getMfaStatus();
  if (!mfa.verified) return null;
  return { viewer: viewer!, supabase: (await createClient())! };
}

const paras = (v: FormDataEntryValue | null) => String(v ?? "").split(/\n\s*\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
const line = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const toExamples = (v: FormDataEntryValue | null) => paras(v).map((x) => { const i = x.indexOf(":"); return i > 0 && i < 80 ? { who: x.slice(0, i).trim(), text: x.slice(i + 1).trim() } : { who: "Example", text: x }; });

/** Owner Portal: saves the edited curriculum as a NEW draft version (earlier versions are always kept). */
export async function saveCurriculumDraft(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner();
  if (!o) return { ok: false, message: "Owner access with two-step verification is required." };
  const section = line(f.get("section"));
  const base = CURRICULA[section];
  if (!base) return { ok: false, message: "Unknown curriculum." };
  const edited: Curriculum = {
    ...base,
    title: line(f.get("title")), tagline: line(f.get("tagline")), purpose: paras(f.get("purpose")), philosophy: line(f.get("philosophy")),
    closing: line(f.get("closing")), journeyInstructions: String(f.get("journeyInstructions") ?? "").trim(),
    analysisTitle: line(f.get("analysisTitle")),
    analysis: base.analysis.map((a) => ({ key: a.key, title: line(f.get(`analysis.${a.key}.title`)), empty: line(f.get(`analysis.${a.key}.empty`)) })),
    foundations: base.foundations?.map((x, i) => ({ ...x, title: line(f.get(`foundation.${i}.title`)), text: line(f.get(`foundation.${i}.text`)) })),
    scenarios: base.scenarios ? toExamples(f.get("scenarios")) : undefined,
    exercises: base.exercises ? String(f.get("exercises") ?? "").split("\n").map((x) => x.trim()).filter(Boolean) : undefined,
    lessons: base.lessons.map((l) => {
      const p = (k: string) => f.get(`${l.slug}.${k}`);
      return {
        ...l,
        title: line(p("title")), focus: paras(p("focus")), understanding: paras(p("understanding")),
        principles: l.principles ? String(p("principles") ?? "").split("\n").map((x) => x.trim()).filter(Boolean) : undefined,
        reflection: line(p("reflection")), forward: line(p("forward")), journeyPrompt: line(p("journeyPrompt")),
        examples: toExamples(p("examples")),
        exercise: l.exercise ? line(p("exercise")) : undefined,
        questions: l.questions.map((q) => ({
          ...q, prompt: line(p(`${q.key}.prompt`)),
          choices: q.choices.map((c) => ({ ...c, label: line(p(`${q.key}.${c.key}.label`)), guidance: line(p(`${q.key}.${c.key}.guidance`)), reading: { kind: c.reading.kind, text: line(p(`${q.key}.${c.key}.reading`)) } })),
        })),
      };
    }),
  };
  const content = mergeCurriculum(base, edited);
  const { data: last } = await o.supabase.from("curriculum_versions").select("version").eq("section", section).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { error } = await o.supabase.from("curriculum_versions").insert({ section, version, content, note: line(f.get("note")).slice(0, 500) || null, created_by: o.viewer.id });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath(`/admin/curriculum/${section}`);
  return { ok: true, message: `Saved as draft version ${version}. Members still see the published version until you publish this one.` };
}

/** Owner Portal: publishes (or restores) a version. The previously published version is archived, never deleted. */
export async function publishCurriculumVersion(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner();
  if (!o) return { ok: false, message: "Owner access with two-step verification is required." };
  if (line(f.get("confirm")) !== "PUBLISH") return { ok: false, message: "Type PUBLISH to confirm." };
  const { error } = await o.supabase.rpc("publish_curriculum_version", { p_id: line(f.get("id")) });
  if (error) return { ok: false, message: "Not published. Please try again." };
  const section = line(f.get("section"));
  revalidatePath(`/admin/curriculum/${section}`);
  revalidatePath(pathFor(section));
  return { ok: true, message: "Published. Members now see this version." };
}
