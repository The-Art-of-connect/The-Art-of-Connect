/**
 * Daily business insights, written by The Art of Connect (original — not
 * attributed quotations). One appears each day, in rotation.
 */
export const BUSINESS_INSIGHTS = [
  "The right connection can save you years of trial and error. Ask one more person for perspective this week.",
  "Clarity attracts collaborators. If you can say what you need in one sentence, people can help you faster.",
  "Your experience is someone else’s shortcut. Share one lesson you learned the hard way.",
  "Growth rarely comes from doing more. It comes from doing the right few things consistently.",
  "Every strong partnership starts with shared values, not just shared goals.",
  "Before you scale, document. Systems are how a business keeps its promises without you in the room.",
  "Cash flow is a story your business tells every week. Read it before you write the next chapter.",
  "Mentorship works both ways. The questions you ask can sharpen the person answering them.",
  "Protect your reputation like inventory — it’s the one asset that compounds in every market.",
  "A no today is information, not a verdict. Ask what would make it a yes later.",
  "Generosity is a strategy. Introduce two people who should know each other.",
  "Rest is part of the work. Leaders who recover make better decisions.",
  "Your next customer may come through a relationship you started without asking for anything.",
  "Write down one decision you’ve been postponing. Then set a date to make it.",
];

export function insightForToday(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return BUSINESS_INSIGHTS[day % BUSINESS_INSIGHTS.length];
}
