/**
 * THE ART OF SELF — Identity & Self-Love — Founding Curriculum V1.0.
 * Founder-approved educational content. The Owner Portal can publish newer
 * versions (stored in curriculum_versions); this file is the founding default.
 * Understanding, not testing. Clarity, not judgment. Self-love, not selfishness.
 */

export type Reading = { kind: "strength" | "develop"; text: string };
export type Choice = { key: string; label: string; guidance: string; reading: Reading };
export type CurriculumQuestion = { key: string; prompt: string; choices: Choice[] };
export type Example = { who: string; text: string };
export type Lesson = {
  slug: string; title: string; focus: string[]; principles?: string[];
  questions: CurriculumQuestion[]; understanding: string[]; examples: Example[];
  reflection: string; forward: string; journeyPrompt: string;
};
export type Curriculum = {
  section: string; title: string; tagline: string; purpose: string[]; philosophy: string;
  lessons: Lesson[]; closing: string; journeyInstructions: string;
};

const s = (text: string): Reading => ({ kind: "strength", text });
const d = (text: string): Reading => ({ kind: "develop", text });

export const IDENTITY_SELF_LOVE: Curriculum = {
  section: "identity-self-love",
  title: "Identity & Self-Love",
  tagline: "Discover who you are beyond roles, responsibilities and expectations.",
  purpose: [
    "Identity & Self-Love helps you discover, understand, appreciate and embrace who you are outside of your relationships, your responsibilities and other people’s expectations.",
    "Some of us are discovering ourselves for the very first time. Others are rediscovering a part of ourselves that has always been there, waiting to be understood and expressed.",
    "Self-discovery is a personal experience. No two people arrive here in the same way, and there is no right place to begin.",
  ],
  philosophy: "Loving yourself starts with you and ends with you. That is why it is called self-love.",
  closing: "The objective is understanding, not testing. Clarity, not judgment. Self-love, not selfishness.",
  journeyInstructions: [
    "You are guiding a member through Identity & Self-Love, a section of The Art of Self.",
    "Listen first. Ask gentle clarifying questions to understand the member's circumstances before teaching or suggesting anything.",
    "Never assume why someone feels uncomfortable alone, gives generously or struggles with boundaries. Causes can include past experiences, grief, trauma, culture, faith, unfamiliarity or simple preference. Ask, don't assume.",
    "Do not treat generosity as unhealthy, or solitude as a goal. Encourage gradual, comfortable steps, never isolation.",
    "Teach that boundaries govern one's own participation and responses, not another person's behavior. Self-love and independence do not remove accountability for shared responsibilities, commitments or finances.",
    "Never diagnose, label permanently, score or judge character. If a member describes trauma, abuse or crisis, respond with care and encourage professional support.",
    "Invite rather than instruct. The aim is understanding, clarity and self-love.",
  ].join("\n"),
  lessons: [
    {
      slug: "when-nobody-is-around",
      title: "Who Are You When Nobody Is Around?",
      focus: [
        "Discover who you are apart from other people’s presence, expectations and approval.",
        "Explore the difference between solitude, loneliness and simply enjoying your own company.",
      ],
      questions: [
        { key: "l1_alone_self", prompt: "Who are you when nobody else is around?", choices: [
          { key: "same", label: "Much the same person I am with others", guidance: "That consistency is a sign of a settled sense of self. You are not performing for an audience, and the people in your life meet the real you.", reading: s("You carry a consistent sense of self, whether you are with others or on your own.") },
          { key: "freer", label: "More relaxed and more myself", guidance: "Many people feel freer alone. Notice what you let go of when no one is watching, because that may show you what you are holding up for others.", reading: s("You know what it feels like to be fully yourself, and you can recognize the difference.") },
          { key: "unsure", label: "Honestly, I’m not sure", guidance: "That is a beautiful and honest place to begin. If your days are full of other people’s needs, you may simply not have had the space to find out yet.", reading: d("You are at the beginning of discovering who you are when no one else needs anything from you, a discovery worth making time for.") },
        ] },
        { key: "l1_go_alone", prompt: "Can you go somewhere alone and genuinely enjoy yourself?", choices: [
          { key: "yes", label: "Yes, I enjoy my own company", guidance: "Enjoying your own company is a quiet strength. It means time with others is a choice, not an escape from yourself.", reading: s("You genuinely enjoy your own company.") },
          { key: "sometimes", label: "Sometimes, depending on where", guidance: "Comfort often depends on the setting. A walk alone can feel easy while dinner alone feels exposed. Both are normal, and comfort can grow gradually.", reading: d("You are comfortable alone in some settings and still growing more at ease in others.") },
          { key: "not_yet", label: "Not yet. It feels uncomfortable", guidance: "There is nothing wrong with you. Discomfort usually has a reason, and understanding that reason matters more than pushing yourself into situations that feel unkind.", reading: d("Being out on your own still feels uncomfortable. Understanding why, gently and at your own pace, may open new freedom.") },
        ] },
        { key: "l1_quiet_book", prompt: "Can you sit quietly, read a book and be happy?", choices: [
          { key: "yes", label: "Yes, quiet restores me", guidance: "Quiet is where many people hear themselves most clearly. Protect it. It is part of how you care for yourself.", reading: s("Quiet time restores you, and you know how to rest in it.") },
          { key: "restless", label: "I get restless or distracted", guidance: "Restlessness is common in a busy world. Start with ten minutes and no expectations. Stillness is a skill that grows with practice.", reading: d("Stillness can feel restless for you. Small, regular moments of quiet may help it feel more natural.") },
          { key: "other_ways", label: "I find peace in other ways", guidance: "Peace looks different for everyone: music, movement, cooking, prayer or nature. What matters is that you have a way to return to yourself.", reading: s("You know your own pathways to peace.") },
        ] },
        { key: "l1_solo_joy", prompt: "What activities bring you happiness independently of others?", choices: [
          { key: "many", label: "I can name several right away", guidance: "Wonderful. These are anchors of your identity. Keep making room for them, especially in seasons when life is full.", reading: s("You know what brings you joy on your own and can name it easily.") },
          { key: "few", label: "One or two come to mind", guidance: "One or two is a strong beginning. Consider what you loved as a child or what you have always been curious about. Those are often clues.", reading: d("You have a few personal joys and room to discover more of what delights you.") },
          { key: "none", label: "Most of my happiness involves other people", guidance: "Loving time with others is a gift. It can also be freeing to discover something that is yours alone, so your happiness has more than one source.", reading: d("Most of your happiness is shared with others. Discovering joys that belong only to you could add richness and resilience.") },
        ] },
        { key: "l1_alone_feel", prompt: "How do you feel when you are alone?", choices: [
          { key: "peaceful", label: "Peaceful and content", guidance: "Contentment in solitude shows a gentle relationship with yourself. You can still deeply desire companionship. The two live together beautifully.", reading: s("You feel peaceful and content in your own company.") },
          { key: "mixed", label: "It depends on the day", guidance: "Solitude can feel restful one day and heavy the next. Notice what is different on the harder days: tiredness, worry, or missing someone in particular.", reading: d("Your experience of being alone changes from day to day. Noticing what shapes it may help you care for yourself on the harder days.") },
          { key: "lonely", label: "Lonely or uneasy", guidance: "Loneliness is not a flaw. It is a signal that a need deserves attention. It is different from solitude, and you deserve support with it, at your own pace.", reading: d("Time alone can feel lonely for you. That is a real need worth honoring, not something to push through on your own.") },
        ] },
        { key: "l1_always", prompt: "Has being alone always made you feel this way, or did something happen that changed your experience?", choices: [
          { key: "always", label: "I’ve always felt this way", guidance: "Some feelings are simply part of how we are made. Others were shaped very early. Either way, understanding them helps you choose what you want for yourself now.", reading: s("You have a long-standing understanding of how you experience being alone.") },
          { key: "changed", label: "Something changed it", guidance: "Life events such as a loss, a move, the end of a relationship or a difficult experience can change how solitude feels. Be gentle with yourself. If it still weighs on you, a counselor or someone you trust can help.", reading: d("A change in your life shaped how being alone feels. It deserves gentleness, and support if you would like it.") },
          { key: "unsure", label: "I’m not sure", guidance: "You do not need the answer today. Simply noticing the question is part of self-discovery.", reading: d("You are still discovering where your feelings about being alone come from, and there is no rush.") },
        ] },
      ],
      understanding: [
        "Being comfortable with yourself does not mean you no longer desire companionship. You can treasure your own company and still long for connection.",
        "If solitude feels uncomfortable, it helps to explore the reasons first. The cause could be past experiences, grief, trauma, unfamiliarity or simply personal preference. There is never one explanation for everyone.",
        "Self-discovery grows best through gradual, comfortable steps, never through forcing isolation.",
      ],
      examples: [
        { who: "A devoted mother", text: "After years of raising children, she realized she did not know what she enjoyed on a free Saturday. She began with a solo coffee once a month, and discovered she loved watercolor painting." },
        { who: "A recent widower", text: "His quiet home felt unbearable at first. Rather than forcing solitude, he began with short walks in the park he and his wife loved, and slowly found peace there again." },
      ],
      reflection: "Describe a moment when you felt completely at ease in your own company. Where were you, and what were you doing?",
      forward: "This month, plan one small experience just for you: a walk, a café, a museum or an hour with a book. Notice how it feels without judging it.",
      journeyPrompt: "I'd like to explore Lesson 1 of Identity & Self-Love, \"Who Are You When Nobody Is Around?\", with you.",
    },
    {
      slug: "giving-without-losing-yourself",
      title: "Giving to Others Without Losing Yourself",
      focus: ["Understand the difference between genuinely enjoying giving to others and sacrificing your own identity or emotional needs to satisfy others."],
      questions: [
        { key: "l2_why_happy", prompt: "What is it about other people’s happiness that makes you happy, and why?", choices: [
          { key: "joy", label: "Seeing others happy genuinely fills me", guidance: "That is a beautiful quality. Generosity rooted in genuine joy is one of the most meaningful gifts you can offer.", reading: s("You find genuine joy in other people’s happiness.") },
          { key: "relief", label: "When they’re happy, I can finally relax", guidance: "Sometimes our peace depends on everyone else being okay. That often begins in families where keeping the peace was our job. Notice whether you can feel calm even when someone else is not.", reading: d("Your sense of calm may depend on others being happy. Your peace can belong to you too.") },
          { key: "valued", label: "It makes me feel needed and valued", guidance: "Wanting to feel valued is deeply human. It is worth knowing you are valuable even when you are not giving anything at all.", reading: d("Giving helps you feel valued. Your worth exists even in moments when you have nothing to give.") },
        ] },
        { key: "l2_wrong_self", prompt: "What feels wrong about giving to yourself?", choices: [
          { key: "nothing", label: "Nothing. I give to myself freely", guidance: "Wonderful. Giving to yourself refills what you share with others.", reading: s("You give to yourself freely and without apology.") },
          { key: "selfish", label: "It feels selfish", guidance: "Self-love and selfishness are different. Selfishness takes from others; self-love cares for you so you can show up fully.", reading: d("Caring for yourself can feel selfish to you. Learning that self-love is not selfishness may bring real freedom.") },
          { key: "undeserved", label: "I’m not sure I deserve it", guidance: "You do not have to earn care. You are worthy of the same kindness you so easily offer others.", reading: d("You sometimes question whether you deserve care. You are worthy of the kindness you give so freely.") },
        ] },
        { key: "l2_taught", prompt: "Were you taught that self-love is selfish?", choices: [
          { key: "no", label: "No, I was encouraged to care for myself", guidance: "That is a gift many people were not given. It likely helps you balance caring for yourself and others.", reading: s("You were raised to understand that caring for yourself matters.") },
          { key: "yes", label: "Yes, directly or by example", guidance: "Beliefs we learned young can feel like truth. You are allowed to examine them now and keep only what still serves you.", reading: d("You learned that self-love was selfish. You are free to examine that belief and choose what you keep.") },
          { key: "unsure", label: "I’ve never thought about it", guidance: "Many of our beliefs about ourselves were never spoken out loud. Simply wondering is a meaningful step.", reading: d("You are beginning to notice the beliefs about self-love you grew up with.") },
        ] },
        { key: "l2_guilt", prompt: "Do you feel guilty when you prioritize yourself?", choices: [
          { key: "rarely", label: "Rarely", guidance: "You have found a healthy balance. Keep honoring it.", reading: s("You can prioritize yourself without carrying guilt.") },
          { key: "often", label: "Often", guidance: "Guilt is a feeling, not a verdict. Try noticing it, naming it and choosing kindly anyway. It softens with practice.", reading: d("Guilt often follows when you put yourself first. Gently practicing small acts of self-priority may ease it over time.") },
          { key: "dont", label: "I rarely prioritize myself at all", guidance: "If you seldom come first, your needs may have been waiting a long time. Start very small: one choice each day that is just for you.", reading: d("You seldom put yourself first. Your needs have waited patiently, and they deserve a place in your day.") },
        ] },
        { key: "l2_cannot", prompt: "How do you feel when you cannot make someone else happy?", choices: [
          { key: "accept", label: "Disappointed, but I accept it", guidance: "Accepting that others’ happiness is not entirely in your hands is wise and healthy.", reading: s("You accept that you cannot be responsible for everyone’s happiness.") },
          { key: "failure", label: "Like I’ve failed", guidance: "Other people’s happiness was never fully yours to carry. You can care deeply without taking responsibility for every outcome.", reading: d("When someone is unhappy, you may feel you have failed. Their happiness was never yours alone to carry.") },
          { key: "anxious", label: "Anxious until it’s resolved", guidance: "That unease often comes from caring deeply. Notice it, breathe, and remind yourself that some things are not yours to fix.", reading: d("Someone else’s unhappiness can make you anxious. Learning to let some things rest may bring you peace.") },
        ] },
        { key: "l2_why_give", prompt: "Do you give because you want to or because you feel obligated?", choices: [
          { key: "want", label: "Mostly because I want to", guidance: "Giving from choice is joyful and sustainable. That is generosity at its best.", reading: s("You give freely and by choice.") },
          { key: "both", label: "A mixture of both", guidance: "Most of us give for many reasons. Noticing which is which helps you choose where to say yes and where a kind no is wiser.", reading: d("Some of your giving comes from obligation. Noticing the difference can help you give with a fuller heart.") },
          { key: "obligated", label: "Often out of obligation", guidance: "Obligation can quietly exhaust us. You are allowed to give from love rather than fear, and to say no with kindness.", reading: d("Much of your giving comes from obligation. You are allowed to give from love and to rest when you need to.") },
        ] },
        { key: "l2_receive", prompt: "Are you comfortable receiving the same love and consideration that you give?", choices: [
          { key: "yes", label: "Yes, I welcome it", guidance: "Receiving gracefully allows others the joy of giving to you. Love flows both ways.", reading: s("You welcome love and care from others as freely as you give it.") },
          { key: "awkward", label: "It feels awkward", guidance: "Many generous people find receiving uncomfortable. Try simply saying thank you, without deflecting, and let it land.", reading: d("Receiving care can feel awkward. Letting love in is a practice worth growing.") },
          { key: "rarely", label: "I rarely receive it", guidance: "You deserve relationships where care flows both ways. Notice where it does, and treasure those people.", reading: d("You do not often receive the care you give. You deserve relationships where love is returned.") },
        ] },
      ],
      understanding: [
        "Generosity, compassion and nurturing are beautiful qualities. Giving to others should never require abandoning yourself.",
        "Giving can come from genuine happiness, learned responsibility, fear of rejection, obligation or a desire for validation. Understanding where yours comes from helps you give wholeheartedly.",
        "Generosity is not unhealthy. The goal is not to give less, but to give from a full heart rather than an empty one.",
      ],
      examples: [
        { who: "The friend everyone calls", text: "She always answered the phone, even when exhausted. She learned to say, “I love you, and I can’t talk tonight. Can we speak tomorrow?” Her friendships grew stronger, not weaker." },
        { who: "A devoted son", text: "He cared for his aging father with love, and learned to accept his sister’s offer of help on weekends. Receiving support helped him keep giving without burning out." },
      ],
      reflection: "Think of a recent time you gave something. Did it come from joy, obligation or something else? How did you feel afterwards?",
      forward: "This week, give one gift to yourself as thoughtfully as you would give it to someone you love, and receive one kindness from someone else without deflecting it.",
      journeyPrompt: "I'd like to explore Lesson 2 of Identity & Self-Love, \"Giving to Others Without Losing Yourself\", with you.",
    },
    {
      slug: "loving-yourself-from-within",
      title: "Loving Yourself From Within",
      focus: [
        "Understand the difference between external self-care and internal self-love.",
        "Caring for your appearance, buying things for yourself and maintaining your physical well-being are valuable. Self-love also means respecting your emotions, identity, values and personal needs.",
      ],
      questions: [
        { key: "l3_meaning", prompt: "What does loving yourself mean to you?", choices: [
          { key: "inside_out", label: "Accepting and respecting who I am inside", guidance: "That is self-love at its deepest: honoring your emotions, values and needs, not only your appearance.", reading: s("You understand self-love as respecting who you are inside.") },
          { key: "care", label: "Taking care of my body and appearance", guidance: "Caring for yourself physically is valuable. Self-love grows even richer when it includes your emotions, values and inner needs too.", reading: d("Your self-love shows up beautifully in how you care for yourself outwardly. Your inner world deserves the same attention.") },
          { key: "unsure", label: "I’m still figuring that out", guidance: "Many people have never been asked this question. Your answer can grow as you do.", reading: d("You are still discovering what loving yourself means to you, a question worth returning to.") },
        ] },
        { key: "l3_demonstrate", prompt: "How do you demonstrate love toward yourself?", choices: [
          { key: "intentional", label: "Through intentional choices each day", guidance: "Daily choices are where self-love lives: rest, honest words, boundaries and time for what matters to you.", reading: s("You demonstrate self-love through intentional daily choices.") },
          { key: "treats", label: "Mostly through treats or purchases", guidance: "Treats can be lovely. Consider adding gifts that cost nothing: rest, forgiveness, saying no, or time for your passions.", reading: d("You show yourself love mostly through treats. Adding inner forms of care may deepen it.") },
          { key: "rarely", label: "I rarely do", guidance: "Then this is a beautiful place to start. One small kindness toward yourself each day is enough.", reading: d("Showing yourself love does not come naturally yet. One small kindness each day is a meaningful beginning.") },
        ] },
        { key: "l3_understanding", prompt: "Are you as understanding with yourself as you are with others?", choices: [
          { key: "yes", label: "Yes, I extend myself grace", guidance: "Self-compassion is a strength that makes you more resilient, not less accountable.", reading: s("You extend yourself the same grace you offer others.") },
          { key: "harder", label: "I’m much harder on myself", guidance: "Try speaking to yourself the way you would speak to a dear friend in the same situation.", reading: d("You are harder on yourself than on anyone else. Speaking to yourself as you would to a dear friend may help.") },
          { key: "depends", label: "It depends on the situation", guidance: "Notice where you are gentle with yourself and where you are not. Those differences can teach you a great deal.", reading: d("Your self-understanding varies by situation. Noticing where you are hardest on yourself is a valuable insight.") },
        ] },
        { key: "l3_forgive", prompt: "Can you forgive yourself for past decisions?", choices: [
          { key: "yes", label: "Yes, I’ve made peace with my past", guidance: "Making peace with your past frees your energy for the life ahead of you.", reading: s("You have made peace with past decisions.") },
          { key: "working", label: "I’m working on it", guidance: "Forgiveness is often a process rather than a moment. Every step counts.", reading: d("You are on the path of forgiving yourself. Be patient with the process.") },
          { key: "hard", label: "Some things still weigh on me", guidance: "You made the best choices you could with what you knew then. If something still feels heavy, talking it through with someone you trust can help.", reading: d("Some past decisions still weigh on you. You deserve the same forgiveness you would offer someone you love.") },
        ] },
        { key: "l3_value", prompt: "Do you recognize your own value without external validation?", choices: [
          { key: "yes", label: "Yes, I know my worth", guidance: "Knowing your worth from within gives you steadiness, even when others do not see you clearly.", reading: s("You recognize your worth without needing others to confirm it.") },
          { key: "sometimes", label: "Sometimes I need reassurance", guidance: "Wanting reassurance is human. Try writing down three things you value about yourself and return to them on uncertain days.", reading: d("Sometimes you look to others to confirm your value. Building an inner sense of worth can steady you.") },
          { key: "rarely", label: "I rely on others to tell me", guidance: "Your worth was never in other people’s hands. It is something to rediscover from within, one gentle truth at a time.", reading: d("You often rely on others to reflect your worth. Your value exists whether or not anyone names it.") },
        ] },
        { key: "l3_choices", prompt: "Do your daily choices reflect the love you say you have for yourself?", choices: [
          { key: "mostly", label: "Mostly, yes", guidance: "Alignment between what you believe and how you live is a quiet form of integrity.", reading: s("Your daily choices largely reflect love for yourself.") },
          { key: "some", label: "In some areas, not others", guidance: "Choose one area, such as sleep, words, time or relationships, and make one choice this week that honors you.", reading: d("Some of your daily choices do not yet reflect the love you have for yourself. One small change can begin to align them.") },
          { key: "not_yet", label: "Not yet", guidance: "Honesty is where change begins. Start with one daily choice that says, “I matter.”", reading: d("Your daily choices do not yet reflect self-love. Honest awareness is the first step toward change.") },
        ] },
      ],
      understanding: [
        "Self-love begins within. It grows from how you speak to yourself, honor your needs and live by your values.",
        "As self-love deepens, decisions become wiser and more intentional, more aligned with your identity, values and well-being.",
        "Many people love others deeply while still struggling to love themselves. A healthier relationship with yourself often transforms how you experience and express love with everyone else.",
      ],
      examples: [
        { who: "The polished professional", text: "She never missed a salon appointment but spoke harshly to herself after every mistake. She began adding one kind sentence to her evening routine, and noticed she slept better." },
        { who: "A father rebuilding", text: "After a difficult divorce, he wrote himself a letter forgiving the choices he regretted. He read it whenever guilt returned, and slowly it lost its grip." },
      ],
      reflection: "Write one sentence of kindness to yourself, the kind you would say to someone you love.",
      forward: "Choose one inner act of self-love to practice daily for two weeks: a kind word, a moment of rest or an honest no.",
      journeyPrompt: "I'd like to explore Lesson 3 of Identity & Self-Love, \"Loving Yourself From Within\", with you.",
    },
    {
      slug: "you-matter-too",
      title: "You Matter Too",
      focus: [
        "Recognize the importance of your emotional needs.",
        "Everyone deserves to feel seen, heard, understood, appreciated and respected, including you.",
      ],
      questions: [
        { key: "l4_express", prompt: "Do you feel comfortable expressing your emotional needs?", choices: [
          { key: "yes", label: "Yes, I can say what I need", guidance: "Clear expression helps others love you well. It is a gift to them as well as to you.", reading: s("You can express your emotional needs clearly.") },
          { key: "some", label: "With some people, not others", guidance: "Safety matters. Notice who makes it easy, and what makes it harder with others.", reading: d("You express your needs with some people but not others. Understanding what makes it feel safe may help.") },
          { key: "no", label: "Not really", guidance: "If speaking up feels difficult, start by naming your needs privately, in writing. Clarity comes before conversation.", reading: d("Expressing your emotional needs does not feel comfortable yet. Naming them privately first can build confidence.") },
        ] },
        { key: "l4_heard", prompt: "When was the last time you felt genuinely heard?", choices: [
          { key: "recent", label: "Recently", guidance: "Treasure the people who listen well. They are part of your foundation.", reading: s("You have people in your life who genuinely hear you.") },
          { key: "while", label: "It’s been a while", guidance: "You deserve to be heard. Consider who in your life might listen well if you invited them to.", reading: d("It has been a while since you felt genuinely heard. You deserve that experience.") },
          { key: "cant_recall", label: "I can’t remember", guidance: "That can feel lonely. Your voice matters, and finding even one person, group or counselor who truly listens can make a meaningful difference.", reading: d("You cannot recall feeling truly heard. Your voice matters and deserves a listening ear.") },
        ] },
        { key: "l4_dismiss", prompt: "Do you dismiss your feelings to avoid making someone else uncomfortable?", choices: [
          { key: "rarely", label: "Rarely", guidance: "You honor your feelings while respecting others. That is a healthy balance.", reading: s("You honor your feelings even when they are uncomfortable for others.") },
          { key: "sometimes", label: "Sometimes", guidance: "Choosing your moments is wise. Just make sure your feelings eventually find a safe place to land.", reading: d("You sometimes set your feelings aside to keep others comfortable. They deserve a safe place to be expressed.") },
          { key: "often", label: "Often", guidance: "Your feelings are information, not inconvenience. Others can handle more honesty than you might expect.", reading: d("You often dismiss your feelings to protect others’ comfort. Your feelings matter just as much.") },
        ] },
        { key: "l4_important", prompt: "Do you believe your emotional needs are as important as everyone else’s?", choices: [
          { key: "yes", label: "Yes, I do", guidance: "That belief is the foundation of healthy, balanced relationships.", reading: s("You believe your emotional needs matter as much as anyone’s.") },
          { key: "head", label: "In theory, but I don’t act like it", guidance: "Knowing and living are different steps. Practice acting as if your needs matter, and belief often follows.", reading: d("You know your needs matter but do not always act on it. Practicing will help knowledge become belief.") },
          { key: "no", label: "Honestly, no", guidance: "Thank you for your honesty. You matter too. That is not selfish; it is simply true.", reading: d("You do not yet believe your needs matter as much as others’. That belief can change, gently, with time.") },
        ] },
        { key: "l4_prevents", prompt: "What prevents you from expressing what you need?", choices: [
          { key: "nothing", label: "Very little. I usually speak up", guidance: "Your openness invites honesty from others too.", reading: s("You speak up for your needs with confidence.") },
          { key: "fear", label: "Fear of rejection or conflict", guidance: "Fear is understandable. A calm, kind request is rarely the conflict we imagine, and the right people will make room for you.", reading: d("Fear of rejection or conflict can keep you quiet. Calm, kind requests are often received better than expected.") },
          { key: "dont_know", label: "I’m not always sure what I need", guidance: "Needs can be hard to name. Try finishing this sentence: “Right now I wish someone would…”", reading: d("You are still learning to identify what you need, an important first step before expressing it.") },
        ] },
      ],
      understanding: [
        "Acknowledging your emotional needs is not selfish. It is honest.",
        "Understanding your emotions and communicating your needs are essential parts of self-love.",
        "You are significant, and your happiness does not have to depend entirely on someone else noticing.",
      ],
      examples: [
        { who: "In a marriage", text: "Instead of silently resenting his partner’s long work hours, he said, “I miss you. Could we protect one evening a week that’s just ours?” She was grateful he asked." },
        { who: "At work", text: "A manager who never asked for help finally told her director, “I need clearer priorities to do my best work.” The conversation reduced her stress immediately." },
      ],
      reflection: "Complete this sentence: “I feel most seen and appreciated when…”",
      forward: "Identify one emotional need you have been quiet about, and share it this week with someone you trust, simply and kindly.",
      journeyPrompt: "I'd like to explore Lesson 4 of Identity & Self-Love, \"You Matter Too\", with you.",
    },
    {
      slug: "protecting-the-essence-of-you",
      title: "Protecting the Essence of You",
      focus: [
        "Self-love includes self-respect, authenticity and personal boundaries.",
        "You should never have to abandon who you are to be accepted by others.",
      ],
      questions: [
        { key: "l5_change", prompt: "Do you change who you are to gain acceptance?", choices: [
          { key: "no", label: "No, I stay true to myself", guidance: "Authenticity attracts the people who are right for you.", reading: s("You stay true to yourself, even when acceptance is uncertain.") },
          { key: "sometimes", label: "Sometimes, without realizing it", guidance: "Adapting to settings is normal. Notice whether you are adapting or abandoning, and choose what feels true.", reading: d("You sometimes shift who you are to be accepted. Noticing when it happens is the first step to choosing differently.") },
          { key: "often", label: "Often", guidance: "The people meant for you will love the real you. You deserve connections where you can simply be yourself.", reading: d("You often change yourself to be accepted. You deserve connections where the real you is welcome.") },
        ] },
        { key: "l5_disrespect", prompt: "What behaviors make you feel disrespected?", choices: [
          { key: "clear", label: "I know exactly what they are", guidance: "Clarity about what disrespects you is the foundation of every healthy boundary.", reading: s("You clearly know which behaviors feel disrespectful to you.") },
          { key: "some", label: "I know some, but not all", guidance: "Pay attention to moments when you feel small or uneasy. Those feelings often point to a boundary waiting to be named.", reading: d("You are still clarifying which behaviors feel disrespectful, which is valuable insight to keep developing.") },
          { key: "used", label: "I’ve gotten used to disrespect", guidance: "When disrespect becomes familiar, it can feel normal. It is not. You deserve to be treated with care.", reading: d("You may have grown used to disrespect. You deserve to be treated with care and dignity.") },
        ] },
        { key: "l5_accept", prompt: "Do you know what you are willing and unwilling to accept?", choices: [
          { key: "yes", label: "Yes, clearly", guidance: "Knowing your standards brings peace to your decisions.", reading: s("You know what you will and will not accept.") },
          { key: "mostly", label: "Mostly", guidance: "Writing your non-negotiables down can turn a feeling into a clear guide.", reading: d("Your standards are mostly clear. Writing them down can make them even steadier.") },
          { key: "not_yet", label: "Not yet", guidance: "That is what this section is for. Begin with what made you uncomfortable in the past.", reading: d("You are still discovering what you will and will not accept, an important area for growth.") },
        ] },
        { key: "l5_comfort", prompt: "Are you comfortable establishing boundaries?", choices: [
          { key: "yes", label: "Yes, calmly and kindly", guidance: "Calm, kind boundaries are a gift to every relationship. They make expectations clear.", reading: s("You set boundaries calmly and kindly.") },
          { key: "learning", label: "I’m learning", guidance: "Boundaries are a skill. Start with low-stakes situations and build from there.", reading: d("You are learning to set boundaries, a skill that grows with practice.") },
          { key: "hard", label: "It feels very hard", guidance: "If boundaries feel frightening, especially with people who have power over you, go gently. A counselor can help you practice safely.", reading: d("Setting boundaries feels hard for you. Practicing in safe, small ways can build confidence.") },
        ] },
        { key: "l5_challenged", prompt: "What happens when someone challenges your boundaries?", choices: [
          { key: "hold", label: "I hold them calmly", guidance: "Holding steady without anger is self-respect in action.", reading: s("You hold your boundaries calmly when they are tested.") },
          { key: "explain", label: "I over-explain or argue", guidance: "A boundary does not need to be defended endlessly. Saying it once, kindly and clearly, is enough.", reading: d("When your boundaries are tested, you may over-explain. A calm, simple restatement is enough.") },
          { key: "give", label: "I usually give in", guidance: "Giving in is common, especially when we fear loss. Each time you hold a boundary, it becomes a little easier.", reading: d("You often give in when boundaries are challenged. Each small act of holding them builds strength.") },
        ] },
        { key: "l5_abandon", prompt: "Do you abandon your boundaries to avoid conflict or disappointment?", choices: [
          { key: "rarely", label: "Rarely", guidance: "You trust that honest relationships can withstand a little discomfort.", reading: s("You keep your boundaries even when conflict is possible.") },
          { key: "sometimes", label: "Sometimes", guidance: "Notice which relationships make it hardest. That awareness shows where to focus.", reading: d("You sometimes set boundaries aside to keep the peace. Knowing where this happens helps you choose differently.") },
          { key: "often", label: "Often", guidance: "Peace that costs you yourself is not true peace. You deserve relationships that can hold your honesty.", reading: d("You often give up boundaries to avoid conflict. True peace includes you.") },
        ] },
      ],
      understanding: [
        "When you love yourself, you learn to protect the essence of who you are.",
        "Other people may accept or decline a connection with you. Their preferences do not determine your worth.",
        "A boundary describes what you will do. It governs your own participation and responses. It does not control another person’s behavior.",
        "Communicate a boundary simply and kindly. If it is repeatedly disregarded, you decide what you will do next, such as stepping back, ending a conversation or changing your level of involvement.",
      ],
      examples: [
        { who: "With children", text: "“I love talking with you. I won’t continue while I’m being yelled at. Let’s try again when we’re both calm.”" },
        { who: "With a spouse or partner", text: "“When plans change at the last minute, I need a call. If I don’t hear from you, I’ll go ahead with my evening.”" },
        { who: "With family", text: "“I’m not able to lend money right now, and I love you. I’m happy to help you look at other options.”" },
        { who: "In friendship", text: "“I can’t talk on the phone after 9 p.m. anymore. Let’s plan a call this weekend.”" },
        { who: "At work", text: "“I’m not available for calls on Sundays. I’ll respond first thing Monday morning.”" },
      ],
      reflection: "Name one boundary you would like to set or strengthen. What would you say, and what would you do if it were not respected?",
      forward: "Practice one clear, kind boundary this week. For deeper guidance, continue to Boundaries & Self-Worth.",
      journeyPrompt: "I'd like to explore Lesson 5 of Identity & Self-Love, \"Protecting the Essence of You\", with you.",
    },
    {
      slug: "effective-communication",
      title: "Effective Communication",
      focus: ["Communicate with intention rather than reacting to every statement, disagreement or action."],
      principles: [
        "Every statement does not deserve a response.",
        "Every action does not warrant a reaction.",
        "Every personal decision does not require justification.",
        "Understanding does not require agreement.",
        "Communicating a boundary does not require convincing someone to accept it.",
        "Listening to understand is different from listening to respond.",
      ],
      questions: [
        { key: "l6_explain", prompt: "Do you feel obligated to explain every decision you make?", choices: [
          { key: "no", label: "No, I explain when it’s helpful", guidance: "Explaining by choice rather than obligation is a sign of inner confidence.", reading: s("You explain your decisions by choice, not obligation.") },
          { key: "often", label: "Often, so people won’t be upset", guidance: "Many decisions are simply yours to make. “That doesn’t work for me” is a complete sentence.", reading: d("You often explain your decisions to keep others comfortable. Some choices are simply yours to make.") },
          { key: "always", label: "Almost always", guidance: "Constant justification can be exhausting. Try sharing a decision once, kindly, and allowing it to stand.", reading: d("You feel you must justify nearly every decision. Letting your choices stand may bring you rest.") },
        ] },
        { key: "l6_disagree", prompt: "What happens emotionally when someone disagrees with you?", choices: [
          { key: "curious", label: "I stay calm and curious", guidance: "Curiosity in disagreement is one of the most valuable communication skills you can have.", reading: s("You stay calm and curious when others disagree with you.") },
          { key: "defensive", label: "I feel defensive", guidance: "Defensiveness often means something matters deeply. Pause, breathe and ask a question before responding.", reading: d("Disagreement can make you feel defensive. A pause and a question can turn tension into understanding.") },
          { key: "shrink", label: "I go quiet or give in", guidance: "Your view matters too. Practice sharing it once, calmly, even if the other person still disagrees.", reading: d("You tend to go quiet when others disagree. Your perspective deserves to be heard.") },
        ] },
        { key: "l6_approval", prompt: "Are you communicating to create understanding or to gain approval?", choices: [
          { key: "understanding", label: "To create understanding", guidance: "Communicating for understanding frees you from needing everyone to agree.", reading: s("You communicate to create understanding rather than seek approval.") },
          { key: "mixed", label: "Sometimes for approval", guidance: "Wanting approval is human. Notice when it drives your words, and gently return to what you truly mean.", reading: d("Sometimes you communicate to gain approval. Returning to what you truly mean can make your words more powerful.") },
          { key: "approval", label: "Mostly for approval", guidance: "You do not need permission to be yourself. Speaking your truth kindly is enough, whatever the response.", reading: d("Much of your communication seeks approval. Your truth is worth sharing, whatever the response.") },
        ] },
        { key: "l6_needs", prompt: "Can you express your needs without becoming defensive?", choices: [
          { key: "yes", label: "Yes", guidance: "Calm expression of needs builds trust and respect.", reading: s("You express your needs calmly and clearly.") },
          { key: "sometimes", label: "Sometimes", guidance: "Try starting with “I feel” and “I need” rather than “You always.” It keeps the conversation open.", reading: d("You sometimes become defensive when expressing needs. “I feel” and “I need” statements can help.") },
          { key: "rarely", label: "Rarely", guidance: "If needs come out as frustration, they may have been waiting too long. Expressing them earlier and more gently helps.", reading: d("Your needs sometimes come out as frustration. Sharing them earlier may help them be heard.") },
        ] },
        { key: "l6_money", prompt: "Can you make responsible decisions about your own money without feeling guilty?", choices: [
          { key: "yes", label: "Yes, confidently", guidance: "Responsible financial independence is a healthy form of self-respect, alongside honoring any shared commitments.", reading: s("You make responsible personal financial decisions with confidence.") },
          { key: "guilt", label: "I often feel guilty", guidance: "Responsible choices about your own money do not require guilt or constant approval. Shared finances and commitments do deserve honest conversation.", reading: d("You often feel guilty about personal financial decisions. Responsible choices about your own money deserve your confidence.") },
          { key: "shared", label: "My finances are shared, and that’s complicated", guidance: "Self-love does not remove accountability for shared responsibilities. Open, respectful conversations about money protect both people.", reading: d("Shared finances feel complicated. Honest, respectful conversations can balance independence and accountability.") },
        ] },
        { key: "l6_listen", prompt: "Do you listen to understand or listen to prepare your response?", choices: [
          { key: "understand", label: "I listen to understand", guidance: "Listening to understand makes people feel truly valued.", reading: s("You listen to understand, a gift to everyone you speak with.") },
          { key: "respond", label: "I’m often preparing my reply", guidance: "Most of us do this. Try reflecting back what you heard before replying, and notice the difference.", reading: d("You often prepare your reply while others speak. Reflecting back what you heard can deepen connection.") },
          { key: "depends", label: "It depends on the topic", guidance: "Notice which topics make listening hardest. They are often the ones that matter most to you.", reading: d("Listening is harder for you on certain topics, which shows where patience can grow.") },
        ] },
      ],
      understanding: [
        "Effective communication means knowing when to speak, when to listen, when to respond and when a response is unnecessary.",
        "You can make responsible personal decisions without constantly seeking approval.",
        "Self-love and independence do not remove accountability for shared responsibilities, commitments or finances.",
        "Express yourself clearly while respecting both your own needs and the needs of others.",
      ],
      examples: [
        { who: "A critical comment", text: "When a relative criticized her career choice at dinner, she smiled and said, “I’m happy with my decision,” and changed the subject. No debate was needed." },
        { who: "Shared finances", text: "He wanted to invest in a course for himself. Rather than hiding it or over-justifying, he and his wife reviewed their budget together and agreed on a plan." },
      ],
      reflection: "Recall a recent conversation you wish had gone differently. What would you say now, and what would you leave unsaid?",
      forward: "Practice one principle this week. Choose one comment that does not need a response, and let it pass peacefully.",
      journeyPrompt: "I'd like to explore Lesson 6 of Identity & Self-Love, \"Effective Communication\", with you.",
    },
  ],
};

export const ISL_KEY_PREFIX = "isl_";
export const choiceKey = (q: string) => `${ISL_KEY_PREFIX}${q}`;
export const lessonReflectionKey = (slug: string) => `${ISL_KEY_PREFIX}${slug.replace(/-/g, "_")}`.slice(0, 60);
export const ISL_ANALYSIS_KEY = "analysis_identity_self_love";

export type ISLAnswers = Record<string, { answer: string | null; choices: string[] | null }>;

/** Final Personal Analysis assembled from prewritten interpretations of the member's selected answers. No scores, ever. */
export function assembleAnalysis(c: Curriculum, answers: ISLAnswers) {
  const discovered: string[] = []; const strengths: string[] = []; const develop: string[] = []; const forward: string[] = [];
  for (const l of c.lessons) {
    const picked = l.questions.flatMap((q) => {
      const k = answers[choiceKey(q.key)]?.choices?.[0];
      const ch = q.choices.find((x) => x.key === k);
      return ch ? [ch] : [];
    });
    if (!picked.length) continue;
    const labels = picked.map((p) => `“${p.label}”`);
    discovered.push(`Reflecting on “${l.title}”, you answered ${labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0]}.`);
    const own = answers[lessonReflectionKey(l.slug)]?.answer?.trim();
    if (own) discovered.push(`In your own words: “${own.length > 220 ? own.slice(0, own.lastIndexOf(" ", 220)) + "…" : own}”`);
    for (const p of picked) (p.reading.kind === "strength" ? strengths : develop).push(p.reading.text);
    if (picked.some((p) => p.reading.kind === "develop")) forward.push(l.forward);
  }
  if (!discovered.length) return null;
  if (!strengths.length) strengths.push("Choosing to explore these questions honestly is itself a meaningful strength.");
  if (!develop.length) develop.push("Continue returning to these lessons as life changes. Self-discovery deepens with every season.");
  if (!forward.length) forward.push("Keep nurturing the strengths you discovered, and revisit these lessons whenever you want to reflect again.");
  return { discovered, qualities: strengths.slice(0, 6), growth: develop.slice(0, 6), forward: forward.slice(0, 4) };
}

/** Every question key the curriculum stores (for validation). */
export const curriculumKeys = (c: Curriculum) => c.lessons.flatMap((l) => [...l.questions.map((q) => choiceKey(q.key)), lessonReflectionKey(l.slug)]);
