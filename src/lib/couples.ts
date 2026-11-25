/** The Personal Society — couples: labels and meaningful ideas (static, no AI). */
export const DATE_KINDS: Record<string, string> = {
  dinner: "Dinner", date_night: "Date night", weekend: "Weekend away", trip: "Trip", activity: "Activity", celebration: "Celebration", other: "Something special",
};
export const SURPRISE_KINDS: Record<string, string> = {
  flowers: "Flowers", gift: "A gift", love_note: "A love note", experience: "An experience", breakfast: "Breakfast in bed", other: "Something special",
};
export const PLAN_CHECKLIST = ["Reserve the table or tickets", "Arrange transportation", "Flowers or a small gift", "Choose what to wear", "A note or a few heartfelt words", "Silence the phones"];

export const IDEAS: { title: string; body: string; kind: "date" | "surprise" }[] = [
  { kind: "date", title: "Return to where it began", body: "Revisit the place of your first date — or recreate it at home." },
  { kind: "date", title: "A sunset dinner", body: "An unhurried dinner with a view, and no talk of work or errands." },
  { kind: "date", title: "Cook something new together", body: "Choose a recipe neither of you has made and learn it side by side." },
  { kind: "date", title: "A weekend of rest", body: "A short getaway planned around what restores you both." },
  { kind: "surprise", title: "Flowers, just because", body: "Not for an occasion — simply because you thought of them." },
  { kind: "surprise", title: "A handwritten letter", body: "Tell them something you admire about them that you’ve never said aloud." },
  { kind: "surprise", title: "Breakfast in bed", body: "Their favorite morning, prepared with care." },
  { kind: "surprise", title: "Their favorite things", body: "A small collection of things they love — a song, a treat, a memory." },
];

/** Searches for local businesses in the member's own maps app — no partnerships implied. */
export const FIND_NEARBY = [
  { label: "Florists near me", href: "https://www.google.com/maps/search/florist+near+me" },
  { label: "Restaurants near me", href: "https://www.google.com/maps/search/romantic+restaurants+near+me" },
  { label: "Things to do near me", href: "https://www.google.com/maps/search/things+to+do+near+me" },
];
