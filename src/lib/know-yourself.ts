/**
 * Know Yourself First — guided self-discovery before dating, marriage or work.
 * Written by The Art of Connect. Educational reflection only, not counseling.
 */
export type Area = "self" | "work" | "life" | "love";

export const AREAS: {
  key: Area; title: string; eyebrow: string; image: string; intro: string;
  values: string; will: string; wont: string; say: string; example: string;
}[] = [
  {
    key: "self", title: "Who I am", eyebrow: "Begin with you", image: "/images/library/life/journaling.webp",
    intro: "Before anyone else can know you, you deserve to know yourself — your values, your energy and what you need to feel at peace.",
    values: "What matters most to me, no matter where I am?",
    will: "What I will always make room for in my life",
    wont: "What I will no longer accept, from others or from myself",
    say: "How I’ll remind myself — kindly — when I drift",
    example: "“I value peace. I’ll protect quiet mornings. I won’t say yes when I mean no. When I’m stretched, I’ll say: ‘Let me think about it and get back to you.’”",
  },
  {
    key: "work", title: "At work", eyebrow: "Before you partner or hire", image: "/images/library/business/mentoring-tablet.webp",
    intro: "Clear standards make you a better partner, leader and colleague. Know your terms before you’re in the room.",
    values: "The values my work must reflect",
    will: "What I will contribute and commit to",
    wont: "What I won’t do — for any client, partner or price",
    say: "How I’ll communicate it professionally",
    example: "“I value integrity. I’ll deliver what I promise. I won’t cut corners on quality. When asked, I’ll say: ‘That isn’t how I work, but here’s what I can do.’”",
  },
  {
    key: "life", title: "In life", eyebrow: "Family, friends and community", image: "/images/library/life/garden-walk.webp",
    intro: "The way you spend your time, energy and kindness is a reflection of what you value. Choose it on purpose.",
    values: "What a well-lived life means to me",
    will: "Where I’ll invest my time and energy",
    wont: "Where I’ll stop giving energy I don’t have",
    say: "How I’ll set the boundary with care",
    example: "“I value family. I’ll keep Sunday dinners sacred. I won’t carry other people’s emergencies as my own. I’ll say: ‘I care about you, and I can help on Saturday.’”",
  },
  {
    key: "love", title: "In love", eyebrow: "Before dating or marriage", image: "/images/library/love/sunlit-anniversary.webp",
    intro: "The healthiest relationships begin with two people who already know what they need, what they offer and how to say both with respect.",
    values: "What I need to feel loved, safe and respected",
    will: "What I will bring to a relationship",
    wont: "What I won’t accept in a relationship",
    say: "How I’ll express it — honestly and respectfully",
    example: "“I value honesty. I’ll communicate openly, even when it’s hard. I won’t accept being spoken down to. I’ll say: ‘I want to hear you, and I need us to speak kindly to each other.’”",
  },
];

export const RESPECT_GUIDE = [
  { title: "Lead with the value", body: "“Honesty matters to me…” helps the other person understand the why, not just the rule." },
  { title: "Speak for yourself", body: "Use “I need” and “I will” rather than “You always” or “You never.”" },
  { title: "Offer what you can", body: "A boundary is clearer and kinder when it includes what you are able to do." },
  { title: "Keep it calm and brief", body: "You don’t owe a long defense. A respectful, steady sentence is enough." },
];
