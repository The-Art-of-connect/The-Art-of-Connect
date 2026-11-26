import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/AuthForms";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import { getViewer, hasRole } from "@/lib/auth";
import { OwnerPreviewNote } from "@/components/OwnerPreviewNote";
import { EXPERIENCES } from "@/lib/experiences";
import { normalizeSelection, quote, selectionFromQuery, selectionToQuery, formatMoney } from "@/lib/pricing";

export const metadata: Metadata = { title: "Become a Member", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [launch, catalogue, params] = await Promise.all([getLaunchState(), getCatalogue(), searchParams]);
  const selection = normalizeSelection(catalogue, selectionFromQuery(params));
  const status = params.status === "single" || params.status === "couple" ? params.status : null;
  const q = quote(catalogue, selection);
  const editHref = `/membership?${selectionToQuery(selection)}#build`;

  const Summary = q.pkg ? (
    <div className="mb-8 rounded-2xl border border-line bg-ink-3 p-4 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{q.pkg.name}</p>
        <Link href={editHref} className="text-xs text-gold underline">Change</Link>
      </div>
      <p className="mt-1 text-muted">{selection.experiences.map((e) => EXPERIENCES[e].name).join(" · ")}{q.couplesMonthly ? ` · ${catalogue.couples_upgrade.name}` : ""}</p>
      {q.priced && <p className="mt-2 text-gold">{formatMoney(q.recurringTotal, catalogue.currency)} {selection.interval === "year" ? "per year" : "per month"}</p>}
    </div>
  ) : null;

  const owner = hasRole(await getViewer(), ["owner"]);
  if (!launch.registrations_open && !owner) {
    return (
      <div className="text-center">
        <p className="eyebrow">Adults {catalogue.minimum_member_age}+ · Personal Society singles 30+</p>
        <h1 className="display mt-4 text-4xl">Membership enrollment opens soon.</h1>
        <p className="mt-5 text-muted">Build your membership now and we’ll let you know the moment you can join.</p>
        <Link href={q.pkg ? editHref : "/membership#build"} className="btn btn-gold mt-8 w-full">Build Your Membership</Link>
      </div>
    );
  }

  if (!q.pkg) {
    return (
      <div className="text-center">
        <p className="eyebrow">Become a member</p>
        <h1 className="display mt-4 text-4xl">Begin your way.</h1>
        <p className="mt-5 text-muted">There’s no required order. We encourage everyone to discover themselves, and you can do that before or after you join.</p>
        <Link href="/join/free" className="btn btn-ghost mt-8 w-full">Begin free self-discovery</Link>
        <Link href="/membership#build" className="btn btn-gold mt-3 w-full">Start a 15-day trial</Link>
        <Link href="/membership#build" className="btn btn-ghost mt-3 w-full">Choose a membership now</Link>
        <p className="mt-5 text-xs text-faint">The Art of Becoming is always free. Trials need a valid card; cancel before day 16 and you won’t be charged. One trial per member; Elite Concierge is by qualification.</p>
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow">Become a member · Adults {catalogue.minimum_member_age}+</p>
      <h1 className="display mt-4 mb-6 text-4xl">Create your account.</h1>
      {Summary}
      <JoinForm selection={selection} loveStatus={status} minimumAge={catalogue.minimum_member_age} />
      <p className="mt-6 text-center text-sm text-muted">Already a member? <Link href="/sign-in" className="text-gold underline">Sign in</Link></p>
    </>
  );
}
