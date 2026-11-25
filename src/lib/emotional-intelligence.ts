/**
 * The Art of Emotional Intelligence — approved educational content written by
 * The Art of Connect. Introductory lessons are free to explore; paid members
 * can go deeper with Journey. Reflections are private and never a diagnosis.
 */
export type EIKey = "self-awareness" | "self-regulation" | "motivation" | "empathy" | "relationship-skills";
export type Scenario = { context: string; situation: string; options: { text: string; reflection: string; aligned: boolean }[] };
export type EIArea = {
  slug: EIKey; title: string; icon: "lotus" | "sliders" | "target" | "heart" | "people"; tagline: string;
  intro: string[]; topics: { title: string; body: string }[];
  examples: { context: string; text: string }[];
  scenario: Scenario; reflections: { key: string; prompt: string }[];
  practice: { title: string; steps: string[] }; journeyPrompt: string;
  connections: { label: string; href: string }[];
};

export const EI_AREAS: EIArea[] = [
  {
    slug: "self-awareness", title: "Self-Awareness", icon: "lotus", tagline: "Understand your emotions, triggers, strengths and patterns.",
    intro: [
      "Self-awareness is the ability to notice what you are feeling, name it honestly and understand where it comes from — in the moment, not only in hindsight.",
      "It is the foundation of every other emotional skill. You cannot choose a better response to a feeling you haven’t noticed yet.",
    ],
    topics: [
      { title: "Emotional triggers", body: "A trigger is a moment that brings up a feeling bigger than the moment itself — often because it echoes something older. Noticing your triggers isn’t about avoiding life; it’s about recognizing when the past is speaking louder than the present." },
      { title: "Emotional maturity", body: "Maturity isn’t the absence of strong feelings. It’s the ability to hold them without letting them make every decision — to say “I’m hurt” rather than acting out the hurt." },
      { title: "Levels of awareness", body: "Sometimes life seems to happen to us; with awareness we begin to see how our beliefs and choices shape our experiences. Growth often moves through these levels gently — and differently in different parts of life." },
    ],
    examples: [
      { context: "In love", text: "You feel irritated when your partner checks their phone at dinner. Underneath, the real feeling may be “I don’t feel important to you.”" },
      { context: "At work", text: "Feedback from your manager leaves you defensive for days. Awareness asks: is it the feedback — or an old fear of not being good enough?" },
      { context: "Childhood", text: "If your feelings were dismissed growing up, you may now minimize them automatically: “It’s fine, I’m fine.”" },
      { context: "Parenting", text: "Your child’s whining feels unbearable on some days and manageable on others. The difference is often your own tiredness, not their behavior." },
    ],
    scenario: {
      context: "Everyday life", situation: "A friend cancels your plans for the third time. You feel a heat rise in your chest. What do you do first?",
      options: [
        { text: "Send a sharp reply right away.", aligned: false, reflection: "Very human — and it lets the feeling decide for you. A pause would give you room to understand what you actually feel." },
        { text: "Pause and ask myself what I’m feeling underneath.", aligned: true, reflection: "This is self-awareness in action. Maybe it’s disappointment, or a fear that you matter less to them. Naming it helps you respond rather than react." },
        { text: "Say nothing and quietly pull away.", aligned: false, reflection: "Pulling away protects you for now, but the feeling stays unspoken. Awareness first, then an honest conversation, often serves you better." },
      ],
    },
    reflections: [
      { key: "ei_sa_feeling", prompt: "Which emotion do you find hardest to admit to yourself — and why might that be?" },
      { key: "ei_sa_trigger", prompt: "Describe a recent moment when your reaction felt bigger than the situation. What might it have been echoing?" },
      { key: "ei_sa_strength", prompt: "What emotional strength do people rely on you for?" },
    ],
    practice: { title: "The daily emotional check-in", steps: ["Twice a day, pause for thirty seconds.", "Ask: “What am I feeling right now?” Name it with one precise word — not just “fine” or “bad”.", "Ask: “Where do I feel it in my body?”", "Ask: “What might it be telling me?”"] },
    journeyPrompt: "I’d like to explore self-awareness. Help me understand a feeling I keep having.",
    connections: [{ label: "Levels of awareness in The Art of Self", href: "/app/know-yourself" }, { label: "My recurring patterns", href: "/app/know-yourself/who-am-i/my-patterns" }],
  },
  {
    slug: "self-regulation", title: "Self-Regulation", icon: "sliders", tagline: "Manage your emotions, stay calm and respond with intention.",
    intro: [
      "Self-regulation is the space between what you feel and what you do. It doesn’t mean suppressing emotion — it means acknowledging a feeling without letting it take control of your decisions.",
      "Feel everything. Choose carefully.",
    ],
    topics: [
      { title: "Acknowledging vs. obeying an emotion", body: "“I’m furious” is information. Sending the furious text is a decision. Regulation lives in that difference." },
      { title: "Accountability and responsibility", body: "When we react in a way we regret, regulation includes repair: naming what happened, owning our part without excuses, and choosing differently next time." },
      { title: "Emotional resilience", body: "Resilience is the ability to bend without breaking — to feel disappointment fully and still find your footing again. It grows through practice, rest and support, not toughness alone." },
    ],
    examples: [
      { context: "In love", text: "In the middle of an argument you say, “I need twenty minutes to calm down — I want to finish this conversation, not win it.”" },
      { context: "Parenting", text: "Your teenager slams a door. You take a breath before you follow, so your response teaches calm instead of matching their storm." },
      { context: "At work", text: "A client’s email feels insulting. You draft your reply, then wait until morning to send it." },
      { context: "Everyday", text: "Stuck in traffic and late, you notice your grip on the steering wheel — and loosen it." },
    ],
    scenario: {
      context: "Romantic relationship", situation: "Your partner says something during an argument that stings. You feel the urge to say something that will hurt back. What feels closest to regulation?",
      options: [
        { text: "Say the hurtful thing — they started it.", aligned: false, reflection: "Understandable in the moment, and it usually escalates the conflict. The hurt you return rarely heals the hurt you received." },
        { text: "Say, “That hurt. I need a moment before I respond.”", aligned: true, reflection: "You honored the feeling and kept the choice. Naming the hurt calmly is often more powerful than any comeback." },
        { text: "Pretend it didn’t bother you.", aligned: false, reflection: "Swallowing the feeling avoids conflict now, but it tends to resurface later. Regulation includes honest expression, at the right time." },
      ],
    },
    reflections: [
      { key: "ei_sr_reaction", prompt: "When strong emotions rise, what do you tend to do first?" },
      { key: "ei_sr_calm", prompt: "What genuinely helps you return to calm?" },
      { key: "ei_sr_repair", prompt: "Is there a moment you’d like to repair? What would an honest, accountable repair sound like?" },
    ],
    practice: { title: "Pause, name, choose", steps: ["Pause: take three slow breaths before responding to anything that stings.", "Name: say silently, “I’m feeling ___.”", "Choose: ask, “What response would I be proud of tomorrow?”"] },
    journeyPrompt: "Help me practice responding instead of reacting when my emotions run high.",
    connections: [{ label: "Boundaries & non-negotiables", href: "/app/know-yourself/boundaries" }, { label: "Journey check-ins", href: "/app/journey/check-ins" }],
  },
  {
    slug: "motivation", title: "Motivation", icon: "target", tagline: "Discover what truly drives you and keeps you aligned with your goals.",
    intro: [
      "Internal motivation is the energy that comes from within — from your values, purpose and the person you are becoming — rather than from approval, fear or comparison.",
      "When your goals reflect what you truly value, discipline feels less like force and more like alignment.",
    ],
    topics: [
      { title: "Internal vs. external motivation", body: "External motivation — praise, pressure, rewards — can start us. Internal motivation is what keeps us going when no one is watching." },
      { title: "Purpose and alignment", body: "Ask not only “What do I want?” but “Why does it matter to me?” Your why is what you’ll return to on hard days." },
      { title: "Resilience after setbacks", body: "Motivated people still fall short. The difference is how they speak to themselves afterward — with honesty and encouragement rather than shame." },
    ],
    examples: [
      { context: "At work", text: "You stay late not because anyone is watching, but because the project reflects your standard of excellence." },
      { context: "Personal growth", text: "You start exercising to look good for others and keep going once it becomes about how you want to feel." },
      { context: "In love", text: "You invest in your relationship not out of fear of losing it, but because who you are together matters to you." },
      { context: "Childhood", text: "If love once felt earned through achievement, you may still chase approval. Motivation can be rebuilt around your own values." },
    ],
    scenario: {
      context: "Professional life", situation: "You’ve been working toward a goal for months and progress feels slow. A colleague is advancing faster. What thought helps most?",
      options: [
        { text: "“I’m clearly not good enough.”", aligned: false, reflection: "Comparison can drain motivation quickly. Your path and pace are your own." },
        { text: "“Why did I want this, and does it still matter to me?”", aligned: true, reflection: "Returning to your why reconnects you to internal motivation — and sometimes reveals a goal worth adjusting." },
        { text: "“I’ll push harder and ignore how I feel.”", aligned: false, reflection: "Effort matters, but ignoring exhaustion often leads to burnout. Sustainable motivation includes rest." },
      ],
    },
    reflections: [
      { key: "ei_mo_why", prompt: "What goal matters most to you right now — and why, in your own words?" },
      { key: "ei_mo_source", prompt: "Which of your goals are truly yours, and which are you pursuing for someone else’s approval?" },
      { key: "ei_mo_restart", prompt: "How do you speak to yourself after a setback? How would you like to?" },
    ],
    practice: { title: "Your purpose statement", steps: ["Write one goal you care about.", "Beneath it, write three “because” sentences.", "Circle the one that would still matter if no one ever knew.", "Keep it where you’ll see it on hard days."] },
    journeyPrompt: "Help me reconnect with what truly motivates me.",
    connections: [{ label: "My growth plan", href: "/app/know-yourself/growth" }, { label: "The Professional Society", href: "/app/business" }],
  },
  {
    slug: "empathy", title: "Empathy", icon: "heart", tagline: "Understand and respect others’ perspectives while honoring your own.",
    intro: [
      "Empathy is the ability to sense and understand what someone else is feeling — and to let them feel understood. It doesn’t require agreeing, fixing or abandoning your own perspective.",
      "Healthy empathy holds two truths at once: their experience is real, and so is yours.",
    ],
    topics: [
      { title: "Emotional availability", body: "Being emotionally available means being present and open enough for someone to reach you — and allowing yourself to be reached in return." },
      { title: "Empathy with boundaries", body: "You can care deeply about someone’s pain without taking responsibility for fixing it, or accepting harmful behavior because you understand its source." },
      { title: "Listening to understand", body: "Most of us listen to reply. Empathy listens to understand — reflecting back what we heard before offering our view." },
    ],
    examples: [
      { context: "Friendship", text: "Instead of “At least you have a job,” you say, “That sounds exhausting. Do you want advice, or just someone to listen?”" },
      { context: "Parenting", text: "Your child is devastated over something small. You remember that to them, it isn’t small." },
      { context: "In love", text: "Your partner is quiet after a hard day. You ask, “Do you want space or company?” rather than assuming." },
      { context: "At work", text: "A team member misses a deadline. Before correcting, you ask what got in the way." },
    ],
    scenario: {
      context: "Friendship", situation: "A close friend shares that they’re struggling, and it reminds you of something you went through. What response shows the most empathy?",
      options: [
        { text: "Tell them your story so they know they’re not alone.", aligned: false, reflection: "Sharing can help later — but leading with your story can shift attention away from them. First, let them feel heard." },
        { text: "Reflect back what you hear and ask what they need.", aligned: true, reflection: "“That sounds really painful — what would help most right now?” lets them feel understood and in control of the support they receive." },
        { text: "Offer a solution right away.", aligned: false, reflection: "Solutions come from care, but they can feel dismissive when someone simply needs to be heard." },
      ],
    },
    reflections: [
      { key: "ei_em_listen", prompt: "When someone shares something painful, what is your first instinct — fix, relate, reassure or listen?" },
      { key: "ei_em_available", prompt: "When are you most emotionally available — and when do you tend to close off?" },
      { key: "ei_em_both", prompt: "Think of someone you disagree with. What might they be feeling that you haven’t considered?" },
    ],
    practice: { title: "Listen, reflect, ask", steps: ["In your next meaningful conversation, listen without planning your reply.", "Reflect back: “It sounds like you’re feeling…”", "Ask: “Do you want advice, or to be heard?”"] },
    journeyPrompt: "Help me become a more empathetic listener while still honoring my own feelings.",
    connections: [{ label: "Love languages together", href: "/app/relationships/love-languages" }, { label: "My emotional needs", href: "/app/know-yourself/who-am-i/emotional-needs" }],
  },
  {
    slug: "relationship-skills", title: "Relationship Skills", icon: "people", tagline: "Build healthy communication, resolve conflict and create stronger, more meaningful connections.",
    intro: [
      "Relationship skills bring emotional intelligence into the space between people: how we communicate, disagree, set boundaries, apologize and rebuild trust.",
      "Healthy relationships aren’t free of conflict. They’re relationships where conflict is handled with respect.",
    ],
    topics: [
      { title: "Communication and conflict resolution", body: "Speak about the specific behavior and your feeling — “When plans change last minute, I feel unimportant” — rather than character attacks like “You never care.”" },
      { title: "Healthy boundaries", body: "A boundary is a clear statement of what you will and won’t do. It protects the relationship by making expectations honest." },
      { title: "Accountability and repair", body: "A meaningful apology names the impact, takes ownership without excuses and offers a change. Repair is what makes trust stronger after conflict." },
    ],
    examples: [
      { context: "In love", text: "“I want us to solve this together. Can we each share what we need, then find something that works for both of us?”" },
      { context: "Family", text: "You tell a relative, “I love seeing you, and I need you to call before visiting.”" },
      { context: "At work", text: "In a disagreement with a business partner, you separate the problem from the person." },
      { context: "Friendship", text: "After snapping at a friend, you say, “I was short with you yesterday. That wasn’t fair, and I’m sorry.”" },
    ],
    scenario: {
      context: "Couples", situation: "You and your partner keep having the same argument about household responsibilities. What approach is most likely to create change?",
      options: [
        { text: "Bring it up again in the heat of the moment.", aligned: false, reflection: "In the heat of frustration, both people defend rather than listen. Timing matters." },
        { text: "Choose a calm time and say, “I’d like us to find a plan that feels fair to both of us.”", aligned: true, reflection: "A calm moment, a shared goal and “us” language invite collaboration instead of defense." },
        { text: "Do everything yourself and stop mentioning it.", aligned: false, reflection: "This avoids conflict but often grows into resentment. Your needs deserve a voice." },
      ],
    },
    reflections: [
      { key: "ei_rs_conflict", prompt: "How do you usually respond to conflict — pursue, withdraw, defend or freeze?" },
      { key: "ei_rs_communication", prompt: "How do you prefer people communicate with you when something is wrong?" },
      { key: "ei_rs_apology", prompt: "What does a sincere apology look like to you — and how easy is it for you to give one?" },
    ],
    practice: { title: "The repair conversation", steps: ["Name what happened, without blame.", "Share the impact: “I felt ___ when ___.”", "Own your part: “What I could have done differently is ___.”", "Ask: “What would help us move forward?”"] },
    journeyPrompt: "Help me prepare for a difficult conversation with someone I care about.",
    connections: [{ label: "Boundaries & non-negotiables", href: "/app/know-yourself/boundaries" }, { label: "Our love languages", href: "/app/relationships/love-languages" }, { label: "Business Connection Board", href: "/app/business/board" }],
  },
];

export const eiArea = (slug: string) => EI_AREAS.find((a) => a.slug === slug);

/** The optional, private Emotional Intelligence Profile (stored with the member's other discoveries, with history). */
export const EI_PROFILE = [
  { key: "ei_p_strengths", label: "My emotional strengths" },
  { key: "ei_p_develop", label: "Areas I’d like to develop" },
  { key: "ei_p_triggers", label: "Triggers I’ve recognized" },
  { key: "ei_p_communication", label: "How I prefer to communicate" },
  { key: "ei_p_boundaries", label: "My personal boundaries" },
  { key: "ei_p_conflict", label: "How I tend to respond to conflict" },
  { key: "ei_p_milestones", label: "Growth milestones I’m proud of" },
] as const;

export const EI_KEYS = [...EI_PROFILE.map((p) => p.key), ...EI_AREAS.flatMap((a) => a.reflections.map((r) => r.key))];

/** Guidance appended to Journey's instructions in every experience. */
export const JOURNEY_EI_GUIDANCE = `# Emotional intelligence (Journey as personal educator)
- Help members practice emotional intelligence in everyday life — self-awareness, self-regulation, internal motivation, empathy and relationship skills (including triggers, emotional maturity and availability, communication and conflict, accountability, boundaries and resilience).
- Recognize natural opportunities to introduce these ideas during ordinary conversations, briefly and only when helpful — never as a lecture.
- Help members distinguish ACKNOWLEDGING an emotion from LETTING it make their decisions: "Your anger makes sense; what response would you be proud of tomorrow?"
- Notice recurring emotional patterns over time and reflect them back gently as questions. Never prematurely label, diagnose or judge.
- Use relatable examples from romance, parenting, friendship, childhood, work and everyday life. Encourage practice, not perfection.`;
