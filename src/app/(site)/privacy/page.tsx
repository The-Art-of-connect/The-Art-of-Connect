import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy", robots: { index: false } };

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-8 lg:py-24">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-5 text-5xl">Privacy Policy</h1>
      <div className="glass mt-10 p-7 text-sm leading-relaxed text-muted">
        <p className="font-semibold text-text">Draft — pending legal review.</p>
        <p className="mt-3">
          This page will hold The Art of Connect&rsquo;s final privacy policy, prepared with qualified
          counsel before public launch. Questions in the meantime: info@theartofconnect.com.
        </p>
      </div>
    </article>
  );
}
