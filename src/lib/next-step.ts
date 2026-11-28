/**
 * One clear first action on Home (page-by-page audit, priority 3). Pure: specific to the member, never a generic search.
 * Facts only: what they have and what they have started; nothing is inferred about their life.
 */
export type NextStepFacts = {
  discoveryStarted: boolean; discoveryHref: string; level: "free" | "professional" | "personal" | "dual" | "executive" | "elite" | string;
  experiences: string[]; society: string | null; coupleJoined: boolean | null; paidJourney: boolean;
};
export type NextStep = { label: string; href: string; line: string };

export function nextStep(f: NextStepFacts): NextStep {
  if (!f.discoveryStarted) return { label: "Begin The Art of Knowing Yourself", href: f.discoveryHref, line: "Your first reflection takes a few quiet minutes, and everything stays private." };
  if (f.experiences.includes("relationships") && f.society === "couples" && f.coupleJoined === false)
    return { label: "Invite your partner", href: "/app/relationships", line: "Your shared Couples space opens when your partner accepts." };
  if (f.level === "executive" || f.level === "elite") return { label: "Open CONNECT 360", href: "/app/connect360", line: "Your Business Deal Rooms, collaborators and My Intelligence Office." };
  if (f.experiences.includes("relationships") && f.society === "couples") return { label: "Open your Couples space", href: "/app/relationships", line: "Today's idea for the two of you is waiting." };
  if (f.experiences.includes("relationships")) return { label: "Find people", href: "/app/relationships", line: "Thoughtful introductions, private by default." };
  if (f.experiences.includes("business")) return { label: "Open your business dashboard", href: "/app/business", line: "The Business Connection Board, your inbox and The Knowledge Exchange." };
  if (f.paidJourney) return { label: "Talk with Journey", href: "/app/journey", line: "Pick up any conversation where you left off." };
  return { label: "Continue your discovery", href: f.discoveryHref, line: "Every lesson in The Art of Knowing Yourself is open to you." };
}
