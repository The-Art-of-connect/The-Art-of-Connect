import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { getLaunchState } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Entry = { href: string | null; title: string; what: string; empty?: string };
type Group = { title: string; note: string; live?: boolean; pages: Entry[] };

/**
 * Member View Preview — every page a member sees after signing in, opened in
 * staff preview. Preview pages run as your own account: they show only what
 * your account may see and never another member's private data.
 */
export default async function MemberPreview() {
  await requireStaff(rolesFor("/admin/preview"));
  const launch = await getLaunchState();
  const supabase = (await createClient())!;
  const b = supabase.schema("business");
  // Real records only, for pages that show a single item. Nothing is invented.
  const [{ data: post }, { data: webinar }, { data: hosted }, { data: conv }] = await Promise.all([
    b.from("posts").select("id").eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    b.from("webinars").select("id").eq("status", "approved").order("starts_at", { ascending: false }).limit(1).maybeSingle(),
    b.from("webinars").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    b.from("conversations").select("id").order("last_message_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const groups: Group[] = [
    {
      title: "Every member",
      note: "Pages shared by all experiences.",
      pages: [
        { href: "/app", title: "Member home", what: "Welcome, experiences included, referral link." },
        { href: "/app/onboarding", title: "Complete your membership", what: "Membership builder and checkout (payments stay in test mode)." },
        { href: "/app/membership", title: "My membership", what: "Plan, billing, invoices, change or cancel." },
        { href: "/app/verify", title: "Verify your identity", what: "Identity verification (charges stay off until you authorize)." },
        { href: "/app/safety", title: "Safety & privacy", what: "Blocking, reporting, privacy controls." },
      ],
    },
    {
      title: "The Professional Society · In Business",
      note: "Business dashboard, onboarding, Connection Board, private inbox and The Knowledge Exchange.",
      live: launch.business_live,
      pages: [
        { href: "/app/business", title: "Business dashboard", what: "Pathway, goals, readiness checklist, features." },
        { href: "/app/business/onboarding", title: "Let’s Talk About Your Business", what: "How can we help · How can your business help others." },
        { href: "/app/business/board", title: "Business Connection Board", what: "Browse posts by city, state and need." },
        { href: "/app/business/board/new", title: "Create a business post", what: "Post a need or offer expertise." },
        { href: post ? `/app/business/board/${post.id}` : null, title: "A single post", what: "“I Can Help — Connect Privately.”", empty: "Opens once a member publishes a post." },
        { href: "/app/business/inbox", title: "Private inbox", what: "Connection requests and conversations." },
        { href: conv ? `/app/business/inbox/${conv.id}` : null, title: "A conversation", what: "Private messages between two owners.", empty: "Only the two owners in a conversation can open it — staff can’t." },
        { href: "/app/business/learn", title: "The Knowledge Exchange", what: "Upcoming webinars, complimentary allowance." },
        { href: webinar ? `/app/business/learn/${webinar.id}` : null, title: "A webinar", what: "Details, registration, join link at start time.", empty: "Opens once a webinar is approved." },
        { href: "/app/business/learn/host/new", title: "Host a webinar", what: "Webinar builder with templates and uploads." },
        { href: hosted ? `/app/business/learn/host/${hosted.id}` : null, title: "Manage a hosted webinar", what: "Edit, share kit, flyer, QR code, analytics.", empty: "Opens once a member creates a webinar." },
      ],
    },
    {
      title: "Relationships · In Love",
      note: "Singles (30+) and couples (21+).",
      live: launch.relationships_live,
      pages: [{ href: "/app/relationships", title: "Relationships home", what: "The singles and couples experience." }],
    },
    {
      title: "Counseling · In Life",
      note: "Private counseling and wellness.",
      live: launch.counseling_live,
      pages: [{ href: "/app/counseling", title: "Counseling home", what: "The In Life experience." }],
    },
    {
      title: "Before signing in",
      note: "What visitors see on the way in.",
      pages: [
        { href: "/sign-in", title: "Sign in", what: "Opens in a new tab so you stay signed in here." },
        { href: "/join", title: "Join", what: "Registration (closed while LAUNCH_LOCK is on)." },
        { href: "/join/business", title: "Free business account", what: "Founding member sign-up (closed until you open it)." },
        { href: "/forgot-password", title: "Forgot password", what: "Password reset." },
      ],
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Command" title="Member view preview" />
      <p className="max-w-3xl text-sm text-muted">
        Every page a member sees after signing in. Pages open in <span className="font-semibold text-text">staff preview</span>: you see the real
        member layout, even for experiences that haven’t launched, and a banner reminds you it’s a preview. Pages run as your own account,
        so they show your own (usually empty) data — never another member’s private information. Nothing here opens enrollment or payments.
      </p>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {groups.map((g) => (
          <Panel key={g.title} title={g.title} action={g.live === undefined ? undefined : <span className={`chip normal-case tracking-normal ${g.live ? "chip-live" : "chip-locked"}`}>{g.live ? "Open to members" : "Not launched · preview only"}</span>}>
            <p className="px-5 pt-4 text-xs text-muted">{g.note}</p>
            <ul className="divide-y divide-line">
              {g.pages.map((p) => (
                <li key={p.title} className="flex items-start justify-between gap-4 px-5 py-3.5 text-sm">
                  <span>
                    <span className="block font-semibold">{p.title}</span>
                    <span className="block text-xs text-muted">{p.href ? p.what : p.empty}</span>
                  </span>
                  {p.href ? (
                    <Link href={p.href} target={g.title === "Before signing in" ? "_blank" : undefined} className="btn btn-ghost btn-sm shrink-0">View</Link>
                  ) : (
                    <span className="shrink-0 text-xs text-faint">Not yet</span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
