import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { INSIDE_PREVIEW_ENABLED } from "@/lib/inside-preview";
import { PREVIEW_GROUPS as GROUPS } from "@/lib/preview-pages";

export const metadata: Metadata = {
  title: "Inside preview",
  robots: { index: false, follow: false },
};

/** TEMPORARY owner review page for the signed-in member area. */
export default async function InsidePreview() {
  if (!INSIDE_PREVIEW_ENABLED) notFound();
  // Owner and executives only, signed in with two-step verification.
  await requireStaff(["owner", "executive"]);
  return (
    <>
      <div className="band theme-dark">
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8 lg:py-20">
          <p className="eyebrow">Owner review · private</p>
          <h1 className="display mt-4 text-5xl sm:text-6xl">Inside The Art of Connect</h1>
          <p className="mt-5 max-w-2xl text-muted">
            Every page members see, without a membership. Each page has a <strong>Review this page</strong> button: approve it,
            ask for changes, ask for more, or switch it to Coming soon. This preview is visible only to owner accounts. It never
            shows members&rsquo; private information, and nothing here starts a payment or a billable AI request.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/app" className="btn btn-gold">Start the preview</a>
            <a href="/admin/reviews" className="btn btn-ghost">My review notes</a>
          </div>
        </section>
      </div>
      <div className="band theme-cream">
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-8 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <article key={g.title} className="glass overflow-hidden">
              <div className="border-b border-line px-6 py-5">
                <h2 className="display text-2xl">{g.title}</h2>
                <p className="mt-1 text-xs text-muted">{g.note}</p>
              </div>
              <ul className="divide-y divide-line">
                {g.pages.map(([href, title, what]) => (
                  <li key={href} className="flex items-center justify-between gap-4 px-6 py-3.5 text-sm">
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-xs text-muted">{what}</span>
                    </span>
                    <a href={href} className="btn btn-ghost btn-sm shrink-0">View</a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
