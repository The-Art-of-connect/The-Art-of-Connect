"use client";
import { useActionState, useState } from "react";
import { submitProfessionalApplication, submitProfessionalInterest, type ProState } from "@/app/actions/professionals";

const TYPES = [
  ["licensed_clinical", "Licensed mental health professional", "e.g. LPC, LMFT, LCSW, psychologist"],
  ["coach", "Coach", "Life, relationship, executive or wellness coach"],
  ["mentor", "Business mentor", "Founders, executives and industry advisors"],
  ["other_nonclinical", "Other professional", "Other nonclinical expertise"],
] as const;
const EXPS = [["business", "In Business"], ["counseling", "In Life"], ["relationships", "In Love"]] as const;

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-sm text-muted">{children}</span>;
}

function TypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm text-muted">I am a… <span className="text-gold">*</span></legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {TYPES.map(([v, label, hint]) => (
          <label key={v} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${value === v ? "border-gold bg-gold/10" : "border-line-strong hover:border-gold/50"}`}>
            <input type="radio" name="professionalType" value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            <span className="block font-semibold">{label}</span>
            <span className="mt-1 block text-sm text-muted">{hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ExperiencePicker() {
  return (
    <fieldset>
      <legend className="mb-3 text-sm text-muted">Where I’d like to serve</legend>
      <div className="flex flex-wrap gap-2">
        {EXPS.map(([v, label]) => (
          <label key={v} className="chip min-h-11 cursor-pointer !px-4 has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-text">
            <input type="checkbox" name="experiences" value={v} className="sr-only" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Done({ state }: { state: ProState }) {
  return (
    <div className="py-10 text-center" role="status">
      <p className="display text-3xl text-gold-bright">Thank you.</p>
      <p className="mt-3 text-muted">{state?.message}</p>
    </div>
  );
}

export function ProfessionalInterestForm() {
  const [state, action, pending] = useActionState<ProState, FormData>(submitProfessionalInterest, null);
  const [type, setType] = useState("licensed_clinical");
  if (state?.ok) return <Done state={state} />;
  const licensed = type === "licensed_clinical";
  return (
    <form action={action} className="space-y-6">
      <TypePicker value={type} onChange={setType} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label><Label>Full name *</Label><input name="fullName" required autoComplete="name" className="field" /></label>
        <label><Label>Email *</Label><input name="email" type="email" required autoComplete="email" className="field" /></label>
        <label><Label>{licensed ? "License type *" : "Certifications (optional)"}</Label><input name="credentials" required={licensed} className="field" placeholder={licensed ? "e.g. LMFT" : "e.g. ICF PCC"} /></label>
        <label><Label>{licensed ? "State of licensure *" : "Location (optional)"}</Label><input name="licenseState" required={licensed} className="field" /></label>
      </div>
      <label className="block"><Label>Areas of specialization</Label><input name="specialties" className="field" placeholder="e.g. premarital, communication, leadership" /></label>
      <ExperiencePicker />
      <label className="block"><Label>Website or professional profile</Label><input name="website" type="url" className="field" placeholder="https://" /></label>
      <label className="block"><Label>Anything you’d like us to know</Label><textarea name="message" className="field" /></label>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold w-full sm:w-auto" disabled={pending}>{pending ? "Sending…" : "Express interest"}</button>
      <p className="text-xs text-faint">Please don’t include client information. Credential documents are requested securely during the full application.</p>
    </form>
  );
}

export function ProfessionalApplicationForm() {
  const [state, action, pending] = useActionState<ProState, FormData>(submitProfessionalApplication, null);
  const [type, setType] = useState("licensed_clinical");
  if (state?.ok) return <Done state={state} />;
  const licensed = type === "licensed_clinical";
  return (
    <form action={action} className="space-y-6">
      <TypePicker value={type} onChange={setType} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><Label>Legal name *</Label><input name="legalName" required className="field" /></label>
        {licensed ? (
          <>
            <label><Label>License type *</Label><input name="licenseType" required className="field" /></label>
            <label><Label>License number *</Label><input name="licenseNumber" required className="field" /></label>
            <label><Label>State of licensure *</Label><input name="licenseState" required className="field" /></label>
            <label><Label>License expiration</Label><input name="licenseExpires" type="date" className="field" /></label>
          </>
        ) : (
          <label className="sm:col-span-2"><Label>Certifications & training</Label><input name="certifications" className="field" /></label>
        )}
        <label><Label>Years of experience *</Label><input name="years" type="number" min={0} max={80} required className="field" /></label>
        <label><Label>Website</Label><input name="website" type="url" className="field" placeholder="https://" /></label>
      </div>
      <label className="block"><Label>Specializations (comma separated)</Label><input name="specialties" className="field" /></label>
      <ExperiencePicker />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
        <span>I agree to the <a href="/legal/professional-agreement" target="_blank" className="text-gold underline">Professional Agreement</a> and <a href="/legal/community-standards" target="_blank" className="text-gold underline">Community Standards</a>, and consent to verification of my credentials and identity.</span>
      </label>
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button className="btn btn-gold w-full sm:w-auto" disabled={pending}>{pending ? "Submitting…" : "Submit application"}</button>
    </form>
  );
}
