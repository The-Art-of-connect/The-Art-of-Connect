import Link from "next/link";
import { getViewer, isStaff } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";

export default async function MemberHome() {
  const viewer = (await getViewer())!;
  const launch = await getLaunchState();
  const staff = isStaff(viewer);

  return (
    <>
      <p className="eyebrow">Your membership</p>
      <h1 className="display mt-4 text-5xl">Welcome, {viewer.displayName ?? "member"}.</h1>
      <p className="mt-4 max-w-xl text-muted">Each experience is a separate space with its own profile. What you share in one never appears in another.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {EXPERIENCE_ORDER.map((key) => {
          const e = EXPERIENCES[key];
          const live = launch[`${key}_live` as const];
          const granted = viewer.experiences.includes(key);
          const open = live && granted;
          const status = open ? "Active" : !live ? "Opening soon" : "Not in your membership";
          return (
            <div key={key} className="glass flex min-h-64 flex-col justify-between p-7">
              <div>
                <span className={`chip ${open ? "chip-live" : "chip-locked"}`}>{status}</span>
                <h2 className="display mt-5 text-3xl" style={{ color: e.accent }}>{e.name}</h2>
                <p className="mt-1 text-xs tracking-wide text-faint uppercase">{e.subtitle}</p>
                <p className="mt-3 text-sm text-muted">{e.caption}</p>
              </div>
              {open || staff ? (
                <Link href={`/app/${key}`} className="btn btn-ghost btn-sm mt-6 self-start">
                  {open ? "Enter" : "Preview as staff"}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
