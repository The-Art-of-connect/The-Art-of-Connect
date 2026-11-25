"use server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";
import { logSecurityEvent } from "@/lib/security";
import { BOT_CHECK_MESSAGE, verifyTurnstile } from "@/lib/turnstile";
import { consentVersions } from "@/lib/legal";

export type ProState = { ok: boolean; message: string } | null;

const TYPES = ["licensed_clinical", "coach", "mentor", "other_nonclinical"] as const;
const EXPS = ["business", "counseling", "relationships"] as const;
const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

/** Pre-launch: anyone can express interest (no account needed). */
export async function submitProfessionalInterest(_prev: ProState, form: FormData): Promise<ProState> {
  const parsed = z
    .object({
      fullName: z.string().trim().min(2).max(120),
      email: z.email().max(254),
      professionalType: z.enum(TYPES),
      credentials: text(300),
      licenseState: text(60),
      specialties: text(500),
      experiences: z.array(z.enum(EXPS)).max(3),
      website: text(300),
      message: text(2000),
      company: z.string().max(0).optional(), // honeypot
    })
    .safeParse({
      fullName: form.get("fullName"),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      professionalType: form.get("professionalType"),
      credentials: String(form.get("credentials") ?? ""),
      licenseState: String(form.get("licenseState") ?? ""),
      specialties: String(form.get("specialties") ?? ""),
      experiences: form.getAll("experiences").map(String),
      website: String(form.get("website") ?? ""),
      message: String(form.get("message") ?? ""),
      company: String(form.get("company") ?? ""),
    });
  if (!parsed.success) return { ok: false, message: "Please complete your name, email and professional type." };
  if (parsed.data.company) return { ok: true, message: "Thank you." };
  const d = parsed.data;
  if (d.professionalType === "licensed_clinical" && (!d.credentials || !d.licenseState)) {
    return { ok: false, message: "Licensed professionals, please include your license type and the state where you are licensed." };
  }

  if (!(await allow("pro-interest", 5, 3600))) {
    await logSecurityEvent("rate_limited", { email: d.email, details: { form: "pro-interest" } });
    return { ok: false, message: "Too many attempts. Please try again later." };
  }
  if (!(await verifyTurnstile(form, "pro_interest", d.email)).ok) return { ok: false, message: BOT_CHECK_MESSAGE };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Applications open soon. Please write to info@theartofconnect.com." };
  const { error } = await supabase.from("professional_interest").insert({
    full_name: d.fullName,
    email: d.email,
    professional_type: d.professionalType,
    credentials: d.credentials,
    license_state: d.licenseState,
    specialties: d.specialties,
    experiences: d.experiences,
    website: d.website,
    message: d.message,
  });
  if (error) return { ok: false, message: "Something went wrong. Please try again shortly." };
  return { ok: true, message: "Thank you. Our team reviews every professional personally and will contact you before applications open." };
}

/** After launch of applications: a signed-in professional submits a full application for review. */
export async function submitProfessionalApplication(_prev: ProState, form: FormData): Promise<ProState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in to apply." };
  if (!(await getLaunchState()).counselor_applications_open) return { ok: false, message: "Applications are not open yet." };

  const parsed = z
    .object({
      legalName: z.string().trim().min(2).max(120),
      professionalType: z.enum(TYPES),
      licenseType: text(100),
      licenseNumber: text(60),
      licenseState: text(60),
      licenseExpires: text(10),
      certifications: text(500),
      specialties: z.string().max(500),
      experiences: z.array(z.enum(EXPS)).min(1).max(3),
      years: z.coerce.number().int().min(0).max(80),
      website: text(300),
    })
    .safeParse({
      legalName: form.get("legalName"),
      professionalType: form.get("professionalType"),
      licenseType: String(form.get("licenseType") ?? ""),
      licenseNumber: String(form.get("licenseNumber") ?? ""),
      licenseState: String(form.get("licenseState") ?? ""),
      licenseExpires: String(form.get("licenseExpires") ?? ""),
      certifications: String(form.get("certifications") ?? ""),
      specialties: String(form.get("specialties") ?? ""),
      experiences: form.getAll("experiences").map(String),
      years: form.get("years"),
      website: String(form.get("website") ?? ""),
    });
  if (!parsed.success) return { ok: false, message: "Please complete all required fields." };
  if (form.get("agree") !== "on") return { ok: false, message: "Please agree to the Professional Agreement." };
  const d = parsed.data;
  if (d.professionalType === "licensed_clinical" && !(d.licenseType && d.licenseNumber && d.licenseState)) {
    return { ok: false, message: "Licensed professionals must provide license type, number and state." };
  }
  if (!(await allow("pro-application", 3, 3600))) {
    await logSecurityEvent("rate_limited", { userId: viewer.id, details: { form: "pro-application" } });
    return { ok: false, message: "Too many attempts. Please try again later." };
  }
  if (!(await verifyTurnstile(form, "pro_application", viewer.email)).ok) return { ok: false, message: BOT_CHECK_MESSAGE };
  const supabase = (await createClient())!;
  const { error } = await supabase.schema("counseling").from("applications").insert({
    user_id: viewer.id,
    legal_name: d.legalName,
    professional_type: d.professionalType,
    license_type: d.licenseType,
    license_number: d.licenseNumber,
    license_state: d.licenseState,
    license_expires_on: d.licenseExpires,
    certifications: d.certifications,
    specialties: d.specialties.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
    experiences: d.experiences,
    years_experience: d.years,
    website: d.website,
  });
  if (error) return { ok: false, message: "Your application could not be submitted. Please try again." };
  await supabase.from("consents").insert(consentVersions(["professional_agreement", "community_standards", "terms", "privacy"]).map((c) => ({ user_id: viewer.id, ...c })));
  // Confirmation to the applicant and an alert to the owner — no credentials or license details in either.
  const { sendEmail, ownerAlertAddress } = await import("@/lib/email");
  const { templates } = await import("@/lib/email-templates");
  await sendEmail(viewer.email, templates.professionalApplicationReceived({ name: viewer.displayName }), { category: "professional" }).catch(() => null);
  await sendEmail(ownerAlertAddress(), templates.ownerAlert({ title: "New professional application", summary: "A professional submitted an application for credential review.", portalPath: "/admin/counselors" }), { category: "owner_alert" }).catch(() => null);
  return { ok: true, message: "Application received. We’ll review your credentials and contact you." };
}
