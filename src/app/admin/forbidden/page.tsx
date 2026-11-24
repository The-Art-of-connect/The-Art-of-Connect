import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="glass mx-auto max-w-lg p-10 text-center">
      <p className="eyebrow">Restricted</p>
      <h1 className="display mt-4 text-4xl">This area isn’t part of your role.</h1>
      <p className="mt-4 text-muted">Ask the owner if you need access.</p>
      <Link href="/admin" className="btn btn-ghost mt-8">Back to overview</Link>
    </div>
  );
}
