/**
 * Connection Intelligence Engine v1 — purpose-specific compatibility (founder directives 10–13).
 *
 *   • Separate logic per purpose. Business fit is not friendship fit; friendship fit is not travel fit.
 *   • Shared AND complementary characteristics are considered.
 *   • No universal score: each result is "strong" or "possible" with plain-language reasons, or not shown.
 *   • Never uses Elite status, income, financial verification, membership price, counseling, health or
 *     private assessment answers to rank people. Elite verification ≠ compatibility.
 *   • Recommendations are suggestions; members accept, decline or adjust without penalty.
 *   • Romance is not handled here: it stays in The Personal Society singles experience (30+).
 *
 * Answers are private (social_preferences). Only the explanation is ever shown to another member.
 */

export type Answers = Record<string, string | string[] | undefined>;
type Opt = readonly [string, string];
export type Question = { id: string; label: string; options: readonly Opt[]; multi?: boolean };
export type Purpose = "business" | "peers" | "mentorship_seek" | "mentorship_offer" | "friendship" | "social" | "travel" | "hobbies" | "explore" | "couples_friendship";

const EXPERTISE: readonly Opt[] = [["marketing", "Marketing & brand"], ["sales", "Sales"], ["finance", "Finance & funding"], ["operations", "Operations"], ["technology", "Technology"], ["legal", "Legal & compliance"], ["real_estate", "Real estate"], ["leadership", "Leadership & people"], ["strategy", "Strategy & growth"]];
const ACTIVITIES: readonly Opt[] = [["dining", "Dining out"], ["fitness", "Fitness"], ["arts", "Arts & culture"], ["outdoors", "Outdoors"], ["faith", "Faith community"], ["games", "Games & trivia"], ["volunteering", "Volunteering"], ["music", "Live music"], ["travel", "Weekend trips"], ["learning", "Classes & learning"]];

/** Progressive assessment: a few questions per section, answered when relevant, editable any time. */
export const SECTIONS: { id: string; title: string; why: string; questions: Question[] }[] = [
  { id: "about", title: "How you connect", why: "Helps every kind of recommendation.", questions: [
    { id: "communication", label: "Your communication style", options: [["direct", "Direct and to the point"], ["thoughtful", "Thoughtful and reflective"], ["expressive", "Warm and expressive"], ["reserved", "Reserved until I know someone"]] },
    { id: "social_energy", label: "Your social energy", options: [["intimate", "Small, intimate settings"], ["balanced", "A balance of both"], ["lively", "Lively groups and big events"]] },
    { id: "values", label: "Values that matter most to you (up to 3)", multi: true, options: [["family", "Family"], ["faith", "Faith"], ["growth", "Growth"], ["adventure", "Adventure"], ["generosity", "Generosity"], ["ambition", "Ambition"], ["health", "Health"], ["creativity", "Creativity"], ["integrity", "Integrity"]] },
    { id: "life_stage", label: "Your current life stage", options: [["building", "Building my foundation"], ["established", "Established"], ["transition", "In transition"], ["empty_nest", "Empty nest"], ["retired", "Retired or semi-retired"]] },
  ] },
  { id: "business", title: "Business & professional", why: "Used only for business, peer and mentorship connections.", questions: [
    { id: "biz_stage", label: "Where you are professionally", options: [["aspiring", "Aspiring entrepreneur"], ["early", "Early-stage business"], ["established", "Established business owner"], ["scaling", "Growing or expanding"], ["executive", "Executive or senior leader"], ["professional", "Professional (employed)"], ["investor", "Investor"]] },
    { id: "expertise", label: "Areas where you have expertise", multi: true, options: EXPERTISE },
    { id: "needs", label: "Areas where you'd value help", multi: true, options: EXPERTISE },
    { id: "biz_goal", label: "What you're looking for", options: [["partners", "Strategic partners"], ["clients", "Clients and collaborators"], ["advice", "Advice and perspective"], ["peers", "Peers at my stage"]] },
  ] },
  { id: "social", title: "Friendship & social life", why: "Used only for friendships, social activities and hobbies.", questions: [
    { id: "activities", label: "Activities you enjoy", multi: true, options: ACTIVITIES },
    { id: "frequency", label: "How often you'd like to get together", options: [["weekly", "Weekly"], ["monthly", "A few times a month"], ["occasional", "Occasionally"]] },
  ] },
  { id: "travel", title: "Travel", why: "Used only for travel companionship and travel circles.", questions: [
    { id: "travel_style", label: "Your travel style", options: [["budget", "Value and adventure"], ["comfort", "Comfortable"], ["luxury", "Luxury"]] },
    { id: "pace", label: "Your travel pace", options: [["relaxed", "Relaxed"], ["balanced", "Balanced"], ["packed", "Packed itinerary"]] },
    { id: "trip_types", label: "Trips you love", multi: true, options: [["beach", "Beach & resort"], ["city", "Cities"], ["culture", "Culture & history"], ["adventure", "Adventure & outdoors"], ["cruise", "Cruises"], ["wellness", "Wellness retreats"], ["food", "Food & wine"]] },
    { id: "planning", label: "How you plan", options: [["planner", "Every detail planned"], ["flexible", "A plan with room to wander"], ["spontaneous", "Spontaneous"]] },
  ] },
];
export const QUESTION = Object.fromEntries(SECTIONS.flatMap((s) => s.questions.map((q) => [q.id, q])));
const label = (qid: string, v: string) => QUESTION[qid]?.options.find(([k]) => k === v)?.[1] ?? v;
const arr = (v: Answers[string]) => (Array.isArray(v) ? v : v ? [v] : []);
const overlap = (a: Answers, b: Answers, q: string) => arr(a[q]).filter((x) => arr(b[q]).includes(x));
const join = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export type Fit = { fit: "strong" | "possible" | "unlikely"; reasons: string[] };
const result = (points: number, reasons: string[], blockers: string[] = []): Fit =>
  blockers.length ? { fit: "unlikely", reasons: blockers } : { fit: points >= 3 ? "strong" : points >= 1 ? "possible" : "unlikely", reasons: reasons.length ? reasons : ["You're open to the same kind of connection"] };

function sharedValues(a: Answers, b: Answers, reasons: string[]) {
  const v = overlap(a, b, "values").map((x) => label("values", x).toLowerCase());
  if (v.length) reasons.push(`You both value ${join(v)}`);
  return v.length;
}
function communication(a: Answers, b: Answers, reasons: string[]) {
  if (a.communication && a.communication === b.communication) { reasons.push(`You share a ${label("communication", String(a.communication)).toLowerCase()} communication style`); return 1; }
  return 0;
}

/** Purpose-specific evaluation of B for A. Uses only the sections relevant to that purpose. */
export function evaluate(purpose: Purpose, a: Answers, b: Answers, ctx: { sharedInterests?: string[] } = {}): Fit {
  const reasons: string[] = []; let pts = 0;
  switch (purpose) {
    case "business": {
      const complements = overlap({ x: arr(a.needs) }, { x: arr(b.expertise) }, "x").map((x) => label("expertise", x).toLowerCase());
      const theirNeeds = overlap({ x: arr(b.needs) }, { x: arr(a.expertise) }, "x").map((x) => label("expertise", x).toLowerCase());
      if (complements.length) { pts += 2; reasons.push(`Their expertise in ${join(complements)} complements what you're looking for`); }
      if (theirNeeds.length) { pts += 1; reasons.push(`Your experience in ${join(theirNeeds)} matches what they'd value`); }
      if (a.biz_goal && a.biz_goal === b.biz_goal) { pts += 1; reasons.push(`You're both looking for ${label("biz_goal", String(a.biz_goal)).toLowerCase()}`); }
      pts += communication(a, b, reasons);
      return result(pts, reasons);
    }
    case "peers": {
      if (a.biz_stage && a.biz_stage === b.biz_stage) { pts += 2; reasons.push(`You're at a similar professional stage: ${label("biz_stage", String(a.biz_stage)).toLowerCase()}`); }
      if (a.life_stage && a.life_stage === b.life_stage) { pts += 1; reasons.push("You're in a similar season of life"); }
      pts += sharedValues(a, b, reasons) ? 1 : 0;
      const shared = ctx.sharedInterests ?? []; if (shared.length) { pts += 1; reasons.push(`You both enjoy ${join(shared.slice(0, 3))}`); }
      return result(pts, reasons);
    }
    case "mentorship_seek": {
      // Connect upward: someone who OFFERS mentorship in areas you want to grow.
      const areas = overlap({ x: arr(a.needs) }, { x: arr(b.expertise) }, "x").map((x) => label("expertise", x).toLowerCase());
      if (!areas.length) return { fit: "unlikely", reasons: ["Their expertise doesn't match the areas you'd like help with"] };
      pts += 2 + (communication(a, b, reasons) ? 1 : 0);
      reasons.unshift(`They offer guidance in ${join(areas)}, where you'd like to grow`);
      return result(pts, reasons);
    }
    case "mentorship_offer": {
      // Connect through contribution: someone SEEKING help where you have expertise.
      const areas = overlap({ x: arr(b.needs) }, { x: arr(a.expertise) }, "x").map((x) => label("expertise", x).toLowerCase());
      if (!areas.length) return { fit: "unlikely", reasons: ["They aren't looking for help in your areas of expertise"] };
      pts += 2 + (communication(a, b, reasons) ? 1 : 0);
      reasons.unshift(`They're seeking guidance in ${join(areas)}, where you have experience`);
      return result(pts, reasons);
    }
    case "friendship": case "social": case "hobbies": {
      const acts = overlap(a, b, "activities").map((x) => label("activities", x).toLowerCase());
      if (acts.length) { pts += acts.length >= 2 ? 2 : 1; reasons.push(`You both enjoy ${join(acts.slice(0, 3))}`); }
      if (a.social_energy && a.social_energy === b.social_energy) { pts += 1; reasons.push(`You both prefer ${label("social_energy", String(a.social_energy)).toLowerCase()}`); }
      if (a.frequency && a.frequency === b.frequency) pts += 0.5;
      pts += sharedValues(a, b, reasons) ? 1 : 0;
      const shared = ctx.sharedInterests ?? []; if (shared.length && !acts.length) { pts += 1; reasons.push(`You both chose ${join(shared.slice(0, 3))}`); }
      const blockers = a.social_energy && b.social_energy && ((a.social_energy === "intimate" && b.social_energy === "lively") || (a.social_energy === "lively" && b.social_energy === "intimate")) && !acts.length
        ? ["Your social preferences differ (small gatherings vs. big events)"] : [];
      return result(pts, reasons, blockers);
    }
    case "travel": case "couples_friendship": {
      const order = ["budget", "comfort", "luxury"];
      const gap = a.travel_style && b.travel_style ? Math.abs(order.indexOf(String(a.travel_style)) - order.indexOf(String(b.travel_style))) : 0;
      const blockers: string[] = [];
      if (purpose === "travel" && gap === 2) blockers.push("Your travel styles differ (value-focused vs. luxury)");
      if (purpose === "travel" && a.pace && b.pace && ((a.pace === "relaxed" && b.pace === "packed") || (a.pace === "packed" && b.pace === "relaxed"))) blockers.push("Your travel pace differs (relaxed vs. packed)");
      if (a.travel_style && a.travel_style === b.travel_style) { pts += 1; reasons.push(`You share a ${label("travel_style", String(a.travel_style)).toLowerCase()} travel style`); }
      const trips = overlap(a, b, "trip_types").map((x) => label("trip_types", x).toLowerCase());
      if (trips.length) { pts += trips.length >= 2 ? 2 : 1; reasons.push(`You both love ${join(trips.slice(0, 3))}`); }
      if (a.pace && a.pace === b.pace) { pts += 1; reasons.push(`You both prefer a ${label("pace", String(a.pace)).toLowerCase()} pace`); }
      if (purpose === "couples_friendship") {
        const acts = overlap(a, b, "activities").map((x) => label("activities", x).toLowerCase());
        if (acts.length) { pts += 1; reasons.push(`You enjoy similar activities: ${join(acts.slice(0, 3))}`); }
      }
      return result(pts, reasons, blockers);
    }
    case "explore":
    default:
      // Explore beyond your circle: intentionally different, never a blocker.
      return { fit: "possible", reasons: ["Someone with different experiences: a chance to explore something new"] };
  }
}

/** Couples friendships consider BOTH partners: answers are combined so each partner's preferences count. */
export function combineCouple(a: Answers, b: Answers): Answers {
  const out: Answers = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const q = QUESTION[k];
    if (q?.multi) out[k] = arr(a[k]).filter((x) => arr(b[k]).includes(x)).concat(arr(a[k]).length && !arr(b[k]).length ? arr(a[k]) : []);
    else out[k] = a[k] && b[k] && a[k] !== b[k] ? undefined : a[k] ?? b[k];
  }
  return out;
}

export const PURPOSES: { id: Purpose; label: string; direction?: string; sections: string[] }[] = [
  { id: "peers", label: "Compatible peers", direction: "Connect alongside", sections: ["about", "business"] },
  { id: "business", label: "Business networking & partnerships", direction: "Connect alongside", sections: ["business", "about"] },
  { id: "mentorship_seek", label: "Find a mentor", direction: "Connect upward", sections: ["business", "about"] },
  { id: "mentorship_offer", label: "Offer mentorship", direction: "Connect through contribution", sections: ["business", "about"] },
  { id: "friendship", label: "Friendships", sections: ["social", "about"] },
  { id: "social", label: "Social activities", sections: ["social", "about"] },
  { id: "hobbies", label: "Shared hobbies", sections: ["social"] },
  { id: "travel", label: "Travel companions", sections: ["travel"] },
  { id: "couples_friendship", label: "Couples friendships", sections: ["travel", "social"] },
  { id: "explore", label: "Explore beyond my circle", sections: [] },
];

/** Which availability a member must have chosen to appear for a purpose (members control what they're available for). */
export const AVAILABILITY_FOR: Record<Purpose, string> = {
  peers: "peers", business: "business", mentorship_seek: "mentorship_offer", mentorship_offer: "mentorship_seek",
  friendship: "friendship", social: "social", hobbies: "hobbies", travel: "travel", couples_friendship: "couples_friendship", explore: "explore",
};
