/** Owner Testing Mode: shown when the owner views a page that is still closed to the public. */
export function OwnerPreviewNote({ what }: { what: string }) {
  return (
    <p className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-left text-xs text-gold">
      <strong>Owner Testing Mode.</strong> {what} is closed to the public. You&rsquo;re seeing the real page for testing; submitting it creates nothing while it stays closed.
    </p>
  );
}
