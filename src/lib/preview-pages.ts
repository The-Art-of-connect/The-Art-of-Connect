/** Every member page the owner can preview and review, grouped as members experience them. */
export const PREVIEW_GROUPS: { title: string; note: string; pages: [string, string, string][] }[] = [
  {
    title: "Every member",
    note: "What every member sees after signing in.",
    pages: [
      ["/app", "Member home", "Welcome, experiences included, referral link."],
      ["/app/know-yourself", "The Art of Knowing Yourself", "Who Am I? — the optional, private self-discovery program."],
      ["/app/know-yourself/who-am-i/beyond-my-titles", "Who Am I? · a module", "One of nine private discovery modules, with growth history."],
      ["/app/know-yourself/emotional-intelligence", "My Emotional Intelligence Profile", "Private, evolving reflection on strengths, triggers and growth."],
      ["/app/know-yourself/love-languages", "Love Language Profile", "Discovery, rankings, connection notes and sharing choices."],
      ["/app/relationships/love-languages", "Love languages together", "Couples and mutual matches — shared only by choice."],
      ["/app/know-yourself/boundaries", "Boundaries & non-negotiables", "What I will do, won’t do, and how to say it respectfully."],
      ["/app/know-yourself/learn", "Self-discovery lessons", "Static educational lessons — no AI."],
      ["/app/know-yourself/growth", "My growth plan", "Goals and how answers have changed over time."],
      ["/app/onboarding", "Complete your membership", "Membership builder and checkout."],
      ["/app/membership", "My membership", "Plan, billing, invoices, change or cancel."],
      ["/app/verify", "Verify your identity", "Identity verification."],
      ["/app/safety", "Safety & privacy", "Blocking, reporting and privacy controls."],
    ],
  },
  {
    title: "Journey · AI connection concierge",
    note: "Paid members only. Powered by OpenAI. Switched off until you authorize it.",
    pages: [
      ["/app/journey", "Journey home & chat", "Chat, allowance meter and the four Journey experiences."],
      ["/app/journey/voice", "Talk to Journey", "Voice conversations, voice choice and minutes."],
      ["/app/journey/check-ins", "Journey check-ins", "Manifestations, reflections, personal check-ins and notification preferences."],
      ["/app/journey/daily", "My Daily Journey", "Manifestations, affirmations, journaling and reflections."],
      ["/app/journey/library", "The Journey Library", "The ten Arts."],
      ["/app/journey/sessions", "Private Sessions", "15, 30, 45 and 60-minute guided sessions."],
      ["/app/journey/memory", "What Journey remembers", "Member-controlled personal memory."],
      ["/app/journey/plus", "Journey Plus", "Message packages, voice minutes and Auto-Reload."],
    ],
  },
  {
    title: "The Personal Society · In Love",
    note: "Singles 30+ and couples.",
    pages: [
      ["/app/relationships", "In Love home", "The singles and couples experience."],
      ["/app/relationships/onboarding", "Personal Society onboarding", "The four short stages with progress and save."],
      ["/app/relationships/onboarding/readiness", "Readiness questions", "Emotional & Relationship Readiness, question by question."],
      ["/app/readiness", "Readiness Profile", "Your private discovery report."],
      ["/app/relationships/exclusive", "The Exclusive Connection", "Mutual exclusivity, step by step."],
      ["/app/relationships/calendar", "Our Calendar", "Shared plans, private schedules, Google/Apple/Outlook."],
    ],
  },
  {
    title: "The Art of Becoming · In Life",
    note: "Personal growth, journaling and professional support.",
    pages: [
      ["/app/counseling", "In Life home", "The In Life experience."],
      ["/app/counseling/journal", "Private journal", "Prompts, moods and entries only the member can read."],
      ["/app/wellness", "Counseling & Wellness Center", "Open to every member; clinical services open after legal approval."],
    ],
  },
  {
    title: "The Professional Society · In Business",
    note: "Business dashboard, Connection Board, inbox and The Knowledge Exchange.",
    pages: [
      ["/app/business", "Business dashboard", "Pathway, goals, readiness checklist and features."],
      ["/app/business/onboarding", "Let’s Talk About Your Business", "How can we help · How can your business help others."],
      ["/app/business/board", "Business Connection Board", "Browse posts by city, state and need."],
      ["/app/business/inbox", "Private inbox", "Connection requests and private conversations."],
      ["/app/business/learn", "The Knowledge Exchange", "Upcoming webinars and complimentary allowance."],
    ],
  },
];
