import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Membership", description: "Membership packages for members and counseling providers." };

const member = [
  { name: "Connect", line: "One experience of your choice.", points: ["Relationships or Business", "Assessments & curated introductions", "Member events"] },
  { name: "Signature", line: "Relationships and Business, together.", points: ["Both experiences, one identity per space", "Priority introductions", "Collaboration rooms"], featured: true },
  { name: "Atelier", line: "Every experience, with concierge care.", points: ["All three experiences", "Personal membership concierge", "Couples’ growth studio"] },
];
const provider = [
  { name: "Provider", line: "Verified listing and scheduling.", points: ["Verified counselor profile", "Appointment management", "Secure client messaging"] },
  { name: "Provider Premier", line: "Featured placement and practice tools.", points: ["Featured in counselor discovery", "Advanced scheduling & analytics", "Priority support"] },
];

function Tier({ t }: { t: { name: string; line: string; points: string[]; featured?: boolean } }) {
  return (
    <article className={`glass ${t.featured ? "glass-edge" : ""} flex flex-col p-8`}>
      {t.featured && <span className="chip chip-locked mb-5 self-start">Most chosen</span>}
      <h3 className="display text-4xl">{t.name}</h3>
      <p className="mt-2 text-sm text-muted">{t.line}</p>
      <p className="display mt-8 text-2xl text-gold">Founding pricing at launch</p>
      <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">
        {t.points.map((p) => (
          <li key={p} className="flex gap-3"><span className="text-gold">—</span>{p}</li>
        ))}
      </ul>
      <Link href="/#waitlist" className={`btn mt-8 ${t.featured ? "btn-gold" : "btn-ghost"}`}>Request invitation</Link>
    </article>
  );
}

export default function MembershipPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
      <p className="eyebrow">Membership</p>
      <h1 className="display mt-5 max-w-3xl text-5xl sm:text-7xl">Choose the connections that matter.</h1>
      <p className="mt-6 max-w-2xl text-muted">Packages and founding rates are announced to invited members first.</p>
      <h2 className="mt-16 text-xs tracking-[0.3em] uppercase text-faint">For members</h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">{member.map((t) => <Tier key={t.name} t={t} />)}</div>
      <h2 className="mt-20 text-xs tracking-[0.3em] uppercase text-faint">For counseling providers</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">{provider.map((t) => <Tier key={t.name} t={t} />)}</div>
    </div>
  );
}
