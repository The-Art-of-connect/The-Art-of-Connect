/**
 * THE ART OF SELF — The Art of Emotional Intelligence — Founding Curriculum V1.0.
 * Founder-approved educational content; the Owner Portal can publish newer versions.
 * Emotional intelligence starts with you and ends with you.
 * Never a diagnosis, a permanent classification, a ranking or a judgment of worth.
 */
import type { Curriculum, Reading } from "@/lib/curricula/core";

const s = (text: string): Reading => ({ kind: "strength", text });
const p = (text: string): Reading => ({ kind: "pattern", text });
const g = (text: string): Reading => ({ kind: "growth", text });
const d = (text: string): Reading => ({ kind: "develop", text });

export const EMOTIONAL_INTELLIGENCE: Curriculum = {
  section: "emotional-intelligence",
  keyPrefix: "eic_",
  banner: "emotional-intelligence",
  title: "The Art of Emotional Intelligence",
  tagline: "Understand your emotions. Respond with intention.",
  purpose: [
    "Emotional intelligence helps you understand your emotions, recognize your triggers, develop healthier responses, show empathy, practice accountability and grow in emotional maturity.",
    "Everyone begins somewhere different. We meet you where you are, because no one can be expected to show emotional skills they have not yet had the chance to develop.",
  ],
  philosophy: "Emotional intelligence starts with you and ends with you.",
  closing: "Emotional intelligence begins with understanding yourself, respecting others and taking responsibility for the responses you choose.",
  foundationsTitle: "Five foundational areas",
  foundations: [
    { title: "Self-Awareness", text: "Understanding your emotions and behaviors.", href: "/emotional-intelligence/self-awareness" },
    { title: "Self-Regulation", text: "Managing your responses without suppressing your emotions.", href: "/emotional-intelligence/self-regulation" },
    { title: "Internal Motivation", text: "Understanding what drives your choices and actions.", href: "/emotional-intelligence/motivation" },
    { title: "Empathy", text: "Recognizing and respecting the emotional experiences of others.", href: "/emotional-intelligence/empathy" },
    { title: "Social & Relationship Skills", text: "Developing effective communication and meaningful connections.", href: "/emotional-intelligence/relationship-skills" },
  ],
  journeyInstructions: [
    "You are guiding a member through The Art of Emotional Intelligence, a section of The Art of Knowing Yourself.",
    "First understand where the member is in their emotional development before deciding how to educate or guide them. Do not expect skills they have not yet developed.",
    "Listen before responding. Clarify before drawing conclusions. Understand before offering guidance.",
    "Explore past experiences and present circumstances without assuming childhood trauma or unresolved wounds.",
    "Help the member separate facts from assumptions. Never assume another person's silence has a particular meaning.",
    "Recognize that several people may be emotionally affected by the same situation.",
    "Encourage accountability without assigning unfair blame. Accountability never means accepting responsibility for someone else's abuse, betrayal or mistreatment.",
    "Show empathy without automatically agreeing. Emotional regulation never means accepting disrespect or suppressing emotion.",
    "Adapt to the member's understanding: introduce foundations to those new to emotional awareness; explore influences with those who notice patterns but don't understand them; offer practical regulation and communication exercises to those who understand but struggle to respond differently; acknowledge growth and encourage consistency in those applying it; support deeper reflection for those showing maturity. These are flexible approaches, never labels, levels or rankings, and a person can be mature in one area of life while still growing in another.",
    "Celebrate growth without demanding perfection.",
    "Recommend appropriate professional help when concerns go beyond education or AI support, including any risk of harm, abuse or crisis.",
  ].join("\n"),
  analysisTitle: "Your Emotional Intelligence Analysis",
  analysis: [
    { key: "discovered", title: "Your Emotional Understanding", empty: "Your understanding will take shape here as you explore the lessons." },
    { key: "strength", title: "Your Recognized Strengths", empty: "Your willingness to look honestly at your emotions is a meaningful strength in itself." },
    { key: "pattern", title: "Understanding Your Emotional Patterns", empty: "As you answer more questions, observations about your triggers and responses will appear here." },
    { key: "growth", title: "Your Personal Growth", empty: "Growth you notice in yourself will be acknowledged here as you describe it. Nothing is assumed." },
    { key: "develop", title: "Opportunities for Further Development", empty: "Keep exploring. Every lesson offers another skill to practice in everyday life." },
    { key: "forward", title: "Moving Forward", empty: "Choose one lesson to revisit this month and practice its exercise in a real conversation." },
  ],
  lessons: [
    {
      slug: "who-controls-your-reaction",
      title: "Who Controls Your Reaction?",
      focus: [
        "Another person’s behavior does not have to determine your behavior.",
        "When you react automatically to someone’s actions, you may be giving them influence over your emotions. The goal is awareness and intentional response.",
      ],
      questions: [
        { key: "l1_return_disrespect", prompt: "When someone disrespects you, why do you feel the need to disrespect them in return?", choices: [
          { key: "dont", label: "I usually don’t return it", guidance: "Choosing not to mirror disrespect shows real self-possession. You can still name what happened and set a boundary.", reading: s("You can experience disrespect without returning it.") },
          { key: "stand_up", label: "It feels like standing up for myself", guidance: "Protecting yourself matters. Standing up for yourself can be calm and firm; it doesn’t require matching the other person’s tone.", reading: p("Returning disrespect can feel like self-protection for you. Firm, calm responses can protect you just as well.") },
          { key: "hurt", label: "In the moment, I want them to feel what I felt", guidance: "That impulse is human. Noticing it gives you a choice: you can acknowledge the hurt without passing it back.", reading: p("When hurt, you may want the other person to feel it too. Recognizing that impulse is the first step to choosing differently.") },
        ] },
        { key: "l1_accomplish", prompt: "What are you hoping to accomplish through your reaction?", choices: [
          { key: "resolve", label: "To be understood and resolve it", guidance: "A clear goal guides your words. Ask yourself whether your reaction is moving you toward that resolution.", reading: s("You tend to react with resolution in mind.") },
          { key: "win", label: "To win or have the last word", guidance: "Winning a moment can cost the relationship. Consider which matters more to you in that situation.", reading: p("You sometimes react to win the moment. Asking what you truly want from the exchange may change your response.") },
          { key: "unsure", label: "I’ve never really thought about it", guidance: "That is a powerful question to carry. Before your next response, pause and ask, “What do I want to happen here?”", reading: d("Clarifying what you want from a reaction is a skill worth developing.") },
        ] },
        { key: "l1_reflect_who", prompt: "Does your reaction reflect who you are or what someone else has done?", choices: [
          { key: "me", label: "Usually who I am", guidance: "Responding from your values keeps your identity steady, whatever others do.", reading: s("Your reactions usually reflect your own values rather than other people’s behavior.") },
          { key: "them", label: "Often what they’ve done", guidance: "When others set the tone of your response, they are steering you. You can reclaim that choice.", reading: p("Your reactions often mirror what others have done. Responding from your own values can return that choice to you.") },
          { key: "depends", label: "It depends on who it is", guidance: "Notice who you react to most strongly. Those relationships may hold your most important lessons.", reading: p("Certain people affect your reactions more than others, which is valuable insight.") },
        ] },
        { key: "l1_regret", prompt: "After reacting emotionally, do you ever regret your words or actions?", choices: [
          { key: "rarely", label: "Rarely", guidance: "That suggests your responses usually align with who you want to be.", reading: s("You rarely regret your emotional responses.") },
          { key: "sometimes", label: "Sometimes, and I try to repair it", guidance: "Repairing after a hard moment is a mature skill. Every repair builds trust.", reading: g("When you regret a reaction, you try to repair it, a sign of growing emotional maturity.") },
          { key: "often", label: "Often", guidance: "Regret is useful information. Practicing a pause before responding can prevent many of those moments.", reading: d("You often regret emotional reactions. A deliberate pause before responding may help.") },
        ] },
        { key: "l1_why_trigger", prompt: "Why do certain behaviors trigger strong emotional responses?", choices: [
          { key: "know", label: "I understand my triggers fairly well", guidance: "Understanding your triggers is the foundation of choosing your responses.", reading: s("You understand what tends to trigger you.") },
          { key: "some", label: "I know some of them", guidance: "Keep noticing. Each strong reaction is a clue worth exploring gently.", reading: p("You recognize some of your triggers and are still discovering others.") },
          { key: "no", label: "I’m not sure why", guidance: "That’s an honest starting point. Lesson 2 explores where triggers come from.", reading: d("Understanding why certain behaviors trigger you is an area to explore.") },
        ] },
        { key: "l1_recognize", prompt: "Can you recognize disrespect without responding disrespectfully?", choices: [
          { key: "yes", label: "Yes", guidance: "Recognizing disrespect clearly while staying true to yourself is emotional strength in action.", reading: s("You can recognize disrespect without responding disrespectfully.") },
          { key: "learning", label: "I’m learning to", guidance: "Each time you choose a calm response, the next one becomes easier.", reading: g("You are learning to respond calmly to disrespect.") },
          { key: "hard", label: "It’s very hard for me", guidance: "It is hard. Start by naming the feeling silently: “I feel disrespected.” Naming creates a moment of choice.", reading: d("Responding calmly to disrespect is still difficult for you. Naming the feeling first can create space.") },
        ] },
        { key: "l1_intentional", prompt: "What would responding intentionally look like in that situation?", choices: [
          { key: "clear", label: "I can picture it clearly", guidance: "Being able to imagine it means you can practice it. Rehearse it once in your mind before your next difficult conversation.", reading: s("You can clearly picture what an intentional response looks like.") },
          { key: "vague", label: "I have a general idea", guidance: "Try writing one sentence you could use next time, such as “I won’t continue this conversation while we’re being disrespectful to each other.”", reading: d("You have a general sense of intentional responses. Preparing a few phrases may help.") },
          { key: "no_idea", label: "I’m not sure", guidance: "An intentional response might be pausing, naming your feeling, stating a boundary or stepping away. You choose based on your values.", reading: d("Intentional responses are a new skill for you, and a valuable one to begin practicing.") },
        ] },
      ],
      understanding: [
        "Someone may try to push your emotional buttons, but emotional awareness allows you to choose how you respond.",
        "Emotional regulation does not mean accepting disrespect, ignoring mistreatment or suppressing your emotions.",
        "Recognize your emotion, consider your options, and respond in a way that reflects your identity, values and boundaries.",
      ],
      examples: [
        { who: "At work", text: "A colleague dismissed her idea in front of the team. Instead of firing back, she said calmly, “I’d like to finish my point,” and did. Afterwards she addressed it privately." },
        { who: "In traffic", text: "Someone cut him off and gestured rudely. He noticed his anger rising, took a breath and let it pass. The rest of his drive, and his day, stayed his own." },
      ],
      exercise: "Practice the pause: the next time you feel a strong reaction rising, take three slow breaths and ask, “How do I want to respond?” before you say anything.",
      reflection: "Describe a moment when someone’s behavior shaped your reaction. How would you respond now?",
      forward: "Practice the pause in one challenging moment this week, and notice what changes when you choose your response.",
      journeyPrompt: "I'd like to explore Lesson 1 of The Art of Emotional Intelligence, \"Who Controls Your Reaction?\", with you.",
    },
    {
      slug: "understanding-your-triggers",
      title: "Understanding Your Emotional Triggers",
      focus: [
        "Understand where your emotional triggers come from and how they shape your present experiences.",
        "Explore past experiences and current circumstances, without assuming childhood trauma or unresolved wounds.",
      ],
      questions: [
        { key: "l2_acknowledged", prompt: "Why is being acknowledged important to you?", choices: [
          { key: "respect", label: "It shows I’m respected", guidance: "Acknowledgment can feel like respect. It helps to know that a delay in acknowledgment isn’t always a lack of respect.", reading: p("Acknowledgment feels closely tied to respect for you.") },
          { key: "matter", label: "It reassures me that I matter", guidance: "Wanting to feel that you matter is deeply human. Your worth remains, even when others are slow to show it.", reading: p("Acknowledgment reassures you that you matter. Your worth stays steady even when it is slow to arrive.") },
          { key: "not_much", label: "It’s nice, but I don’t depend on it", guidance: "That inner steadiness is a quiet strength.", reading: s("You appreciate acknowledgment without depending on it.") },
        ] },
        { key: "l2_silence", prompt: "What does another person’s silence mean to you?", choices: [
          { key: "neutral", label: "Usually that they’re busy", guidance: "Giving others the benefit of the doubt protects your peace and your relationships.", reading: s("You tend to interpret silence generously.") },
          { key: "rejection", label: "It often feels like rejection", guidance: "Silence can feel loud. Try listing other possible explanations before settling on one.", reading: p("Silence can feel like rejection to you. Considering other explanations may ease that feeling.") },
          { key: "anger", label: "I assume they’re upset with me", guidance: "That assumption may be right or wrong. Gently checking in, rather than assuming, usually brings clarity.", reading: p("You may assume silence means someone is upset with you. Checking in can replace worry with clarity.") },
        ] },
        { key: "l2_influence", prompt: "Has there been an experience in your life that may have influenced these feelings?", choices: [
          { key: "yes", label: "Yes, I can see a connection", guidance: "Understanding where a feeling began can soften its hold. Be gentle with yourself as you explore it.", reading: s("You can connect some of your feelings to earlier experiences, which is meaningful self-awareness.") },
          { key: "maybe", label: "Possibly, but I’m not sure", guidance: "You don’t need certainty. Sometimes understanding unfolds slowly.", reading: d("You are beginning to explore what may have shaped your emotional responses.") },
          { key: "present", label: "I think it’s about what’s happening now", guidance: "Sometimes a trigger is about the present. Current stress, tiredness or worry can make anything feel heavier.", reading: p("Your triggers often connect to present circumstances, such as stress or pressure.") },
        ] },
        { key: "l2_facts", prompt: "Are you responding to what actually happened or what you believe happened?", choices: [
          { key: "facts", label: "I try to stick to the facts", guidance: "Separating facts from assumptions is one of the most valuable emotional skills.", reading: s("You work to separate facts from assumptions.") },
          { key: "mixed", label: "Sometimes my assumptions take over", guidance: "Try asking, “What do I know for certain, and what am I guessing?”", reading: p("Assumptions sometimes shape your responses more than facts.") },
          { key: "assume", label: "I often react to what I believe happened", guidance: "That’s very common. Checking your story before reacting can prevent unnecessary hurt.", reading: d("You often respond to what you believe happened. Pausing to check the facts is a skill to develop.") },
        ] },
        { key: "l2_affected_them", prompt: "Have you considered how your words or actions may have affected the other person?", choices: [
          { key: "yes", label: "Yes, I usually do", guidance: "Considering your impact on others is the bridge between self-awareness and empathy.", reading: s("You consider how your words and actions affect others.") },
          { key: "later", label: "Usually only later", guidance: "Reflection after the fact is valuable. With practice, that awareness arrives sooner.", reading: g("You reflect on your impact after the fact, and that awareness can grow to arrive sooner.") },
          { key: "rarely", label: "Not often", guidance: "When you’re hurting, it’s hard to see others’ feelings. That awareness can be practiced.", reading: d("Considering your impact on others while emotions are high is an area to develop.") },
        ] },
        { key: "l2_their_hurt", prompt: "Could the other person also be experiencing hurt or emotional discomfort?", choices: [
          { key: "often", label: "I often wonder about that", guidance: "Holding space for both people’s feelings is emotional maturity in action.", reading: s("You consider that others may be hurting too.") },
          { key: "hard", label: "It’s hard to see when I’m upset", guidance: "That’s understandable. Once you feel calmer, it can help to ask what they might be experiencing.", reading: p("When upset, it’s hard for you to see others’ hurt, which is a natural pattern to notice.") },
          { key: "never", label: "I hadn’t considered it", guidance: "It’s worth considering. Two people can be hurting in the same moment.", reading: d("Recognizing that others may be hurting too is a perspective to explore.") },
        ] },
        { key: "l2_expect_understand", prompt: "Are you expecting someone to understand your emotions without considering theirs?", choices: [
          { key: "no", label: "No, I try to consider both", guidance: "Mutual understanding builds lasting connection.", reading: s("You try to consider both your emotions and theirs.") },
          { key: "sometimes", label: "Sometimes, without realizing", guidance: "Noticing this is growth. Asking “How are you feeling about this?” can open the door.", reading: p("You sometimes expect understanding without first offering it.") },
          { key: "yes", label: "Honestly, yes", guidance: "Thank you for that honesty. Understanding often flows more freely when it is offered first.", reading: d("Offering understanding as well as seeking it is an area to grow in.") },
        ] },
      ],
      understanding: [
        "An emotional trigger can be an invitation to self-discovery.",
        "Look at both your past experiences and your present circumstances before drawing conclusions.",
        "When several people are involved, each may be experiencing different emotions.",
        "Don’t assign blame automatically or assume that someone’s silence has a particular meaning.",
      ],
      examples: [
        { who: "The unanswered message", text: "She became upset when a friend didn’t reply to her message and read the silence as rejection. Her friend was actually overwhelmed at work and still hurt by something said the week before. Separating facts from assumptions opened an honest conversation." },
        { who: "A family gathering", text: "He felt ignored when his brother didn’t ask about his new job. Later he learned his brother had just been laid off and was struggling to celebrate anyone’s career." },
      ],
      exercise: "Facts and stories: write down a recent upsetting moment. In one column list only what actually happened; in another, list what you assumed it meant. Notice the difference.",
      reflection: "Think of a recent trigger. What happened, what did you assume, and what else might have been true?",
      forward: "The next time you feel triggered, ask yourself three questions: What happened? What am I assuming? What else could be true?",
      journeyPrompt: "I'd like to explore Lesson 2 of The Art of Emotional Intelligence, \"Understanding Your Emotional Triggers\", with you.",
    },
    {
      slug: "beyond-yourself",
      title: "Emotional Intelligence Beyond Yourself",
      focus: [
        "Empathy, perspective-taking and awareness of other people’s emotional experiences.",
        "Your feelings matter, but they are not the only feelings involved in an interaction.",
      ],
      questions: [
        { key: "l3_perspective", prompt: "How often do you consider another person’s perspective before responding?", choices: [
          { key: "usually", label: "Usually", guidance: "Considering perspective first makes your responses wiser and kinder.", reading: s("You usually consider others’ perspectives before responding.") },
          { key: "sometimes", label: "Sometimes", guidance: "Try asking, “How might this look from where they’re standing?” before you reply.", reading: d("Considering perspective before responding is a habit you can strengthen.") },
          { key: "rarely", label: "Rarely, especially when upset", guidance: "Strong emotions narrow our view. A pause gives perspective room to return.", reading: p("When upset, you rarely pause to consider others’ perspectives.") },
        ] },
        { key: "l3_acknowledge", prompt: "Can you acknowledge someone’s feelings without agreeing with their interpretation?", choices: [
          { key: "yes", label: "Yes", guidance: "“I can see you’re hurt” doesn’t mean “You’re right.” Being able to hold both is a valuable skill.", reading: s("You can acknowledge feelings without agreeing with every interpretation.") },
          { key: "hard", label: "It feels like agreeing", guidance: "Acknowledging a feeling simply recognizes it. You can still share your own view afterwards.", reading: p("Acknowledging feelings can feel like agreeing to you. They are different, and you can do one without the other.") },
          { key: "unsure", label: "I’ve never tried separating them", guidance: "Try it: “I understand that felt hurtful to you. I see it differently, and I’d like to share why.”", reading: d("Separating acknowledgment from agreement is a skill to practice.") },
        ] },
        { key: "l3_overlook", prompt: "Do you expect others to understand you while overlooking their emotional needs?", choices: [
          { key: "no", label: "No, I try to balance both", guidance: "Balance is the heart of healthy relationships.", reading: s("You try to balance your needs with others’.") },
          { key: "sometimes", label: "Sometimes", guidance: "Noticing it is the first step. Ask what the other person might need, too.", reading: p("You sometimes focus on being understood while overlooking others’ needs.") },
          { key: "often", label: "More often than I’d like", guidance: "Honest awareness is where change begins.", reading: d("Attending to others’ emotional needs as well as your own is an area for growth.") },
        ] },
        { key: "l3_both", prompt: "When conflict occurs, do you consider how both individuals may have been affected?", choices: [
          { key: "yes", label: "Yes", guidance: "Seeing both sides of a conflict makes repair possible.", reading: s("In conflict, you consider how both people were affected.") },
          { key: "after", label: "Once things calm down", guidance: "Reflection after the heat passes is valuable and very common.", reading: g("After conflict settles, you reflect on how both people were affected.") },
          { key: "mine", label: "I focus mostly on how it affected me", guidance: "Your experience matters. Adding the other person’s experience gives you the whole picture.", reading: d("Considering the other person’s experience of conflict is a perspective to develop.") },
        ] },
        { key: "l3_boundaries", prompt: "Can you demonstrate empathy without abandoning your own boundaries?", choices: [
          { key: "yes", label: "Yes", guidance: "Empathy and boundaries working together is emotional maturity at its finest.", reading: s("You can show empathy while keeping your boundaries.") },
          { key: "lose", label: "I tend to lose my boundaries", guidance: "Caring deeply can make boundaries blur. You can understand someone and still say no.", reading: p("Empathy sometimes leads you to set aside your boundaries.") },
          { key: "guarded", label: "I keep empathy at a distance to protect myself", guidance: "Protecting yourself makes sense. Boundaries can make it safer to open your heart.", reading: p("You may hold empathy back to protect yourself. Strong boundaries can make openness feel safer.") },
        ] },
        { key: "l3_listen", prompt: "Are you listening to understand or listening to prepare your response?", choices: [
          { key: "understand", label: "To understand", guidance: "Listening to understand is one of the greatest gifts you can give.", reading: s("You listen to understand.") },
          { key: "respond", label: "Often to respond", guidance: "Try summarizing what you heard before you reply. It changes conversations.", reading: d("Listening to understand rather than to respond is a skill to practice.") },
          { key: "depends", label: "Depends on the conversation", guidance: "Notice which conversations make listening hardest. They often matter most.", reading: p("Your listening changes with the conversation; certain topics make it harder.") },
        ] },
      ],
      understanding: [
        "Empathy does not require accepting mistreatment, ignoring your own emotions or taking responsibility for someone else’s behavior.",
        "It means recognizing that others have their own experiences, feelings and perspectives.",
        "Consider the whole situation rather than seeing every interaction only through your own emotional experience.",
        "Understanding someone does not require agreeing with them.",
      ],
      examples: [
        { who: "Between partners", text: "She was frustrated that her husband forgot their dinner plans. Before reacting, she asked about his day and learned he’d received difficult news. Her disappointment was still valid, and so was his distraction." },
        { who: "At work", text: "A manager acknowledged an employee’s frustration about a new policy: “I understand this feels unfair.” He kept the policy, but the employee felt respected." },
      ],
      exercise: "Perspective switch: after your next disagreement, write a short paragraph describing it from the other person’s point of view.",
      reflection: "Think of a recent disagreement. How might the other person describe what happened?",
      forward: "In your next important conversation, summarize what the other person said before sharing your view.",
      journeyPrompt: "I'd like to explore Lesson 3 of The Art of Emotional Intelligence, \"Emotional Intelligence Beyond Yourself\", with you.",
    },
    {
      slug: "the-power-of-your-delivery",
      title: "The Power of Your Delivery",
      focus: [
        "Understand the difference between your intentions, your delivery and another person’s perception.",
        "You cannot control another person’s perception, but you can control your delivery.",
      ],
      questions: [
        { key: "l4_tone", prompt: "Do you consider your tone before expressing your thoughts?", choices: [
          { key: "yes", label: "Usually", guidance: "Considering tone shows respect for both your message and your listener.", reading: s("You consider your tone before you speak.") },
          { key: "calm", label: "Only when I’m calm", guidance: "Tone slips when emotions run high. A pause helps tone catch up with intention.", reading: p("Your tone is thoughtful when calm and harder to manage when emotions rise.") },
          { key: "rarely", label: "Rarely", guidance: "Tone often speaks louder than words. A moment’s thought can change how you’re heard.", reading: d("Being mindful of tone is an area to develop.") },
        ] },
        { key: "l4_straightforward", prompt: "Do you use being straightforward as justification for being insensitive?", choices: [
          { key: "no", label: "No, I aim to be honest and kind", guidance: "Honesty and kindness together are powerful.", reading: s("You aim to be both honest and kind.") },
          { key: "sometimes", label: "Sometimes, if I’m honest", guidance: "Directness is valuable. It lands best with care.", reading: p("You sometimes let directness excuse harshness.") },
          { key: "never_thought", label: "I hadn’t thought of it that way", guidance: "Consider whether your words would still be true if they were gentler. Usually they would.", reading: d("Balancing directness with sensitivity is worth exploring.") },
        ] },
        { key: "l4_disappointment", prompt: "Can you communicate disappointment without diminishing another person?", choices: [
          { key: "yes", label: "Yes", guidance: "Addressing behavior rather than character keeps dignity intact on both sides.", reading: s("You can express disappointment without diminishing others.") },
          { key: "trying", label: "I’m working on it", guidance: "Try “I felt disappointed when…” rather than “You always…”.", reading: g("You are learning to express disappointment respectfully.") },
          { key: "hard", label: "It comes out sharper than I mean", guidance: "That’s common when disappointment is deep. Writing your words first can help.", reading: d("Disappointment can come out sharper than you intend, an area for growth.") },
        ] },
        { key: "l4_hurt_words", prompt: "When someone expresses that your words hurt them, do you become defensive or attempt to understand?", choices: [
          { key: "understand", label: "I try to understand", guidance: "Curiosity when someone is hurt builds trust.", reading: s("When someone is hurt by your words, you try to understand.") },
          { key: "defensive_first", label: "Defensive first, then I listen", guidance: "Noticing that sequence is growth. With practice, the listening comes sooner.", reading: g("You can move from defensiveness to listening, and that shift is growth.") },
          { key: "defensive", label: "Usually defensive", guidance: "Defensiveness often protects a tender spot. Try saying, “Help me understand what hurt.”", reading: p("You tend to become defensive when told your words hurt.") },
        ] },
        { key: "l4_same_message", prompt: "Would you appreciate receiving the same message in the manner you delivered it?", choices: [
          { key: "yes", label: "Yes, usually", guidance: "That’s a wonderful measure of considerate communication.", reading: s("You deliver messages the way you would want to receive them.") },
          { key: "not_always", label: "Not always", guidance: "This simple question can guide your delivery every time.", reading: d("Delivering messages as you would want to receive them is a practice to strengthen.") },
          { key: "no", label: "Probably not", guidance: "Honest reflection is the start of change. Your message deserves to be heard, and delivery helps it land.", reading: d("Your delivery may not always match how you would want to be spoken to.") },
        ] },
        { key: "l4_impact", prompt: "Can you acknowledge the impact of your words even when your intentions were different?", choices: [
          { key: "yes", label: "Yes", guidance: "“I didn’t mean it that way, and I’m sorry it hurt” honors both intention and impact.", reading: s("You can acknowledge impact even when your intention was different.") },
          { key: "explain", label: "I tend to explain my intentions", guidance: "Intentions matter, but leading with acknowledgment helps the other person feel heard.", reading: p("You tend to explain intentions before acknowledging impact.") },
          { key: "hard", label: "It’s hard if I didn’t mean it", guidance: "Impact and intention can both be true. Acknowledging one doesn’t erase the other.", reading: d("Acknowledging impact when your intentions were good is an area to explore.") },
        ] },
      ],
      understanding: [
        "You are responsible for your attitude, your delivery and your behavior.",
        "Being authentic does not require being disrespectful. Being honest does not require being harsh.",
        "You may not know what someone is experiencing inside, or how much they rely on your encouragement and support.",
        "Respecting another person’s emotions does not require compromising your identity or withholding your truth.",
      ],
      examples: [
        { who: "Parenting", text: "Instead of “You never listen,” a mother said, “I need you to look at me while I’m talking. This is important.” Her son listened." },
        { who: "Leadership", text: "A business owner gave difficult feedback privately, began with what was working, and was specific about what needed to change. The employee improved and stayed." },
      ],
      exercise: "Before an important message this week, write it once as you feel it, then again as you would want to receive it. Send the second.",
      reflection: "Recall a time your words were received differently than you intended. What would you change about the delivery?",
      forward: "Ask yourself before difficult conversations: “Would I want to receive this message in this way?”",
      journeyPrompt: "I'd like to explore Lesson 4 of The Art of Emotional Intelligence, \"The Power of Your Delivery\", with you.",
    },
    {
      slug: "accountability-starts-within",
      title: "Accountability Starts Within",
      focus: [
        "Recognize and take ownership of your contribution to situations, rather than focusing only on what others have done.",
        "Accountability begins with self-awareness and understanding what it means to experience emotional hurt.",
      ],
      questions: [
        { key: "l5_examine", prompt: "When a disagreement occurs, how often do you examine your own behavior?", choices: [
          { key: "always", label: "Almost always", guidance: "Looking inward first is the heart of accountability.", reading: s("You examine your own behavior when disagreements occur.") },
          { key: "eventually", label: "Eventually, once I’ve calmed down", guidance: "Reflection after calm is valuable and honest.", reading: g("Once calm, you reflect on your own part in disagreements.") },
          { key: "rarely", label: "Rarely", guidance: "Asking “What was my part?” can transform how conflicts resolve.", reading: d("Examining your own part in disagreements is an area to develop.") },
        ] },
        { key: "l5_contribution", prompt: "Can you acknowledge your contribution without immediately identifying someone else’s mistakes?", choices: [
          { key: "yes", label: "Yes", guidance: "Owning your part fully, without a “but”, invites the other person to do the same.", reading: s("You can own your part without pointing to others’ mistakes.") },
          { key: "but", label: "I usually add a “but…”", guidance: "Try pausing after your acknowledgment. Their part can be discussed later.", reading: p("You tend to pair your acknowledgment with someone else’s mistakes.") },
          { key: "hard", label: "It’s difficult", guidance: "Owning our part can feel vulnerable. It is also a mark of strength.", reading: d("Acknowledging your contribution on its own is a skill to practice.") },
        ] },
        { key: "l5_excuse", prompt: "Do you explain your behavior or use explanations to excuse it?", choices: [
          { key: "explain", label: "I explain, and still take responsibility", guidance: "Context helps others understand. Responsibility helps them trust.", reading: s("You can explain your behavior while still taking responsibility.") },
          { key: "excuse", label: "Sometimes my explanations become excuses", guidance: "That awareness is valuable. Lead with responsibility, then offer context.", reading: p("Your explanations sometimes become excuses.") },
          { key: "unsure", label: "I’m not sure of the difference", guidance: "An explanation says why; an excuse says it wasn’t my fault. Accountability keeps the why and owns the what.", reading: d("Distinguishing explanation from excuse is a useful skill to develop.") },
        ] },
        { key: "l5_apologize", prompt: "Can you apologize without attaching blame to your apology?", choices: [
          { key: "yes", label: "Yes", guidance: "A clean apology is a gift that heals.", reading: s("You can offer a sincere apology without attaching blame.") },
          { key: "you_too", label: "I often add “but you…”", guidance: "“I’m sorry, but…” can cancel the apology. Try ending at “I’m sorry.”", reading: p("Your apologies sometimes include blame.") },
          { key: "rarely", label: "I find apologizing hard", guidance: "Apologizing can feel like losing. In truth, it often restores connection.", reading: d("Offering apologies is an area for growth.") },
        ] },
        { key: "l5_taught", prompt: "What have previous relationships taught you about yourself?", choices: [
          { key: "much", label: "A great deal", guidance: "Learning from the past turns experience into wisdom.", reading: g("You have learned a great deal about yourself from previous relationships.") },
          { key: "some", label: "Some things", guidance: "There may be more to discover. Revisit the past with curiosity, not judgment.", reading: d("There may be more to learn about yourself from past relationships.") },
          { key: "them", label: "Mostly about the other person", guidance: "It’s natural to focus on what others did. Gently asking what you learned about yourself can be freeing.", reading: p("Past relationships have taught you more about others than about yourself so far.") },
        ] },
        { key: "l5_patterns", prompt: "Have you noticed recurring patterns in your relationships?", choices: [
          { key: "yes_working", label: "Yes, and I’m working on them", guidance: "Noticing patterns and working on them is real growth.", reading: g("You recognize recurring patterns and are actively working on them.") },
          { key: "yes", label: "Yes, but I’m not sure why", guidance: "Patterns are information, not flaws. Understanding them is the next step.", reading: p("You notice recurring patterns in your relationships but aren’t yet sure why they happen.") },
          { key: "no", label: "Not really", guidance: "Look for similarities in how relationships began, struggled or ended. Patterns often hide in plain sight.", reading: d("Exploring patterns across your relationships may bring helpful insight.") },
        ] },
        { key: "l5_differently", prompt: "What would you handle differently today?", choices: [
          { key: "clear", label: "I know clearly", guidance: "Knowing what you would change shows how far you’ve come.", reading: g("You can clearly name what you would handle differently today.") },
          { key: "some", label: "A few things come to mind", guidance: "That awareness is meaningful. Write them down; they are lessons worth keeping.", reading: g("You recognize some things you would handle differently now.") },
          { key: "nothing", label: "Nothing, really", guidance: "Sometimes that’s true. Sometimes it helps to ask a trusted friend how they saw it.", reading: d("Reflecting on what you might handle differently could reveal new insight.") },
        ] },
      ],
      understanding: [
        "Leaving a situation does not automatically mean you have grown from it.",
        "Accountability creates opportunities for understanding, healing and personal development.",
        "Accountability does not mean accepting all the blame, or taking responsibility for someone else’s abuse, betrayal or mistreatment.",
        "You cannot change the part someone else played, but you can learn from the part you played.",
      ],
      examples: [
        { who: "The marriage that ended ten years ago", text: "A man has been divorced for ten years. Whenever he talks about his marriage, he lists everything his former wife did wrong, but he has never examined his own communication, emotional availability or contribution. Growth began when he asked himself: What did I learn about myself? How might she describe our marriage? What would I handle differently today? Have I faced similar difficulties since? What have I done to develop myself?" },
        { who: "Between friends", text: "After a falling-out, she listed her friend’s faults for weeks. When she finally wrote down her own part, she realized she had stopped calling months before. Her apology reopened the friendship." },
      ],
      exercise: "My part: choose one past conflict and write only your own contribution, with no reference to what the other person did.",
      reflection: "What is one lesson a past relationship taught you about yourself?",
      forward: "In your next disagreement, name your part first, without a “but”, and notice how the conversation changes.",
      journeyPrompt: "I'd like to explore Lesson 5 of The Art of Emotional Intelligence, \"Accountability Starts Within\", with you.",
    },
    {
      slug: "emotional-maturity-and-growth",
      title: "Emotional Maturity and Personal Growth",
      focus: [
        "Recognize where you are in your emotional understanding today, before expecting yourself to demonstrate emotional maturity.",
        "People develop emotional skills at different points in their lives. We meet you where you are, never judging you for where you have not yet arrived.",
      ],
      principlesTitle: "Meeting you where you are",
      principles: [
        "If emotional awareness is new to you, we begin with the foundations.",
        "If you notice patterns but don’t yet understand them, we explore what may influence them.",
        "If you understand your patterns but struggle to respond differently, we practice regulation and communication.",
        "If you are applying what you know, we celebrate your growth and encourage consistency.",
        "If you show emotional maturity, we support deeper reflection and continued development.",
        "These are never labels or rankings. You may be mature in one area of life and still growing in another.",
      ],
      questions: [
        { key: "l6_identify", prompt: "Can you recognize and identify your emotions?", choices: [
          { key: "yes", label: "Yes, usually", guidance: "Naming emotions precisely is the foundation of every other emotional skill.", reading: s("You can usually recognize and name your emotions.") },
          { key: "basic", label: "The basic ones", guidance: "Expanding your emotional vocabulary, such as disappointed, overlooked or anxious, makes feelings easier to manage.", reading: d("Expanding your emotional vocabulary could help you understand yourself more precisely.") },
          { key: "hard", label: "It’s difficult for me", guidance: "Many of us were never taught. Start by noticing where you feel emotion in your body.", reading: d("Recognizing and naming emotions is a foundation to build on.") },
        ] },
        { key: "l6_triggers", prompt: "Do you understand what triggers your emotional responses?", choices: [
          { key: "yes", label: "Yes", guidance: "Understanding triggers gives you a moment of choice.", reading: s("You understand your emotional triggers.") },
          { key: "some", label: "Some of them", guidance: "Keep a short note when strong feelings arise. Patterns will appear.", reading: p("You understand some of your triggers and are discovering others.") },
          { key: "no", label: "Not yet", guidance: "Lesson 2 is a wonderful place to begin.", reading: d("Understanding your triggers is an area to explore.") },
        ] },
        { key: "l6_contribution", prompt: "Can you recognize your contribution to difficult situations?", choices: [
          { key: "yes", label: "Yes", guidance: "Owning your part is the heart of accountability.", reading: s("You recognize your contribution to difficult situations.") },
          { key: "later", label: "Usually later", guidance: "Reflection that arrives later is still growth.", reading: g("You recognize your contribution on reflection, and that awareness is growing.") },
          { key: "hard", label: "It’s hard to see", guidance: "Asking a trusted person how they saw it can help.", reading: d("Seeing your own contribution is an area to develop.") },
        ] },
        { key: "l6_healthy", prompt: "Have you experienced healthy emotional communication?", choices: [
          { key: "yes", label: "Yes, I’ve seen it modeled", guidance: "Having seen it makes it easier to practice.", reading: s("You have experienced healthy emotional communication.") },
          { key: "some", label: "In some relationships", guidance: "Notice what felt different in those relationships. Those are your models.", reading: p("You have experienced healthy emotional communication in some relationships but not others.") },
          { key: "rarely", label: "Rarely", guidance: "You can learn what you weren’t shown. Many people do.", reading: d("Learning healthy emotional communication you may not have seen modeled is a meaningful opportunity.") },
        ] },
        { key: "l6_accountability", prompt: "What does accountability mean to you?", choices: [
          { key: "ownership", label: "Owning my part without taking all the blame", guidance: "That is a balanced and healthy understanding.", reading: s("You hold a balanced understanding of accountability.") },
          { key: "blame", label: "Taking the blame", guidance: "Accountability is owning your part, not carrying everyone else’s.", reading: p("Accountability may feel like taking the blame to you. It is about owning only your part.") },
          { key: "unsure", label: "I’m still defining it", guidance: "Lesson 5 explores it in depth.", reading: d("Defining accountability for yourself is a worthwhile reflection.") },
        ] },
        { key: "l6_apply", prompt: "Can you apply your emotional understanding during difficult situations?", choices: [
          { key: "yes", label: "Most of the time", guidance: "Applying understanding under pressure is emotional maturity in action.", reading: s("You can apply emotional understanding in difficult moments.") },
          { key: "know_not_do", label: "I know better, but I don’t always do better", guidance: "Knowing and consistently applying are different stages. Practice bridges the gap.", reading: d("You know what you want to do in difficult moments; practice can help you apply it more consistently.") },
          { key: "rarely", label: "It slips away under pressure", guidance: "Pressure narrows our choices. Small daily practices build the habit.", reading: p("Under pressure, your emotional understanding can slip away.") },
        ] },
        { key: "l6_changes", prompt: "What changes have you recognized in yourself over time?", choices: [
          { key: "many", label: "Real, meaningful changes", guidance: "Take a moment to honor how far you have come.", reading: g("You have recognized real, meaningful changes in yourself over time.") },
          { key: "some", label: "Some small changes", guidance: "Small changes are how lasting growth happens.", reading: g("You have noticed small but meaningful changes in yourself.") },
          { key: "none", label: "I haven’t noticed many yet", guidance: "Growth is often easier for others to see. You may have grown more than you realize.", reading: d("You haven’t noticed much change yet, and this curriculum is a place to begin.") },
        ] },
        { key: "l6_develop", prompt: "What emotional skills would you like to develop further?", choices: [
          { key: "regulation", label: "Staying calm and responding intentionally", guidance: "Lessons 1 and 2 focus on this. Practice the pause daily.", reading: d("You would like to develop calm, intentional responses.") },
          { key: "empathy", label: "Understanding others more deeply", guidance: "Lesson 3 explores empathy and perspective.", reading: d("You would like to deepen empathy and perspective-taking.") },
          { key: "communication", label: "Communicating and apologizing well", guidance: "Lessons 4 and 5 focus on delivery and accountability.", reading: d("You would like to strengthen communication and meaningful apology.") },
        ] },
      ],
      understanding: [
        "Understand what someone has before expecting them to show it, including yourself.",
        "Knowing better and consistently applying that knowledge are different parts of growth.",
        "Recognize growth without expecting perfection.",
      ],
      examples: [
        { who: "A father learning", text: "He grew up in a home where feelings weren’t discussed. Learning to say “I’m frustrated” instead of slamming doors was a huge step, and his children noticed." },
        { who: "A seasoned leader", text: "She communicates beautifully at work but still finds it hard to express needs at home. Growth in one area of life doesn’t mean growth everywhere, and that’s okay." },
      ],
      exercise: "Growth journal: once a week, write one moment you handled better than you would have a year ago.",
      reflection: "What is one way you respond differently today than you once did?",
      forward: "Choose the one skill you most want to develop, and practice it in one conversation each week.",
      journeyPrompt: "I'd like to explore Lesson 6 of The Art of Emotional Intelligence, \"Emotional Maturity and Personal Growth\", with you.",
    },
  ],
  scenariosTitle: "Emotional intelligence in everyday life",
  scenarios: [
    { who: "Romantic relationships", text: "Your partner seems distant tonight. Instead of assuming they’re upset with you, you ask, “You seem quiet. Is everything okay?” and listen to the answer." },
    { who: "Marriage and divorce", text: "Co-parenting after divorce, you feel triggered by your former spouse’s tone. You respond to the facts of the schedule, keep your message brief and kind, and process your feelings elsewhere." },
    { who: "Parenting and children", text: "Your teenager slams a door. Rather than reacting, you wait until they’re calm: “I could tell you were really upset. Want to talk about it?”" },
    { who: "Family relationships", text: "A relative criticizes your choices at a holiday dinner. You acknowledge their concern, state your boundary calmly and change the subject." },
    { who: "Friendships", text: "A friend cancels plans for the third time. You share how it affects you without accusing: “I miss you, and the cancellations have been hard. Is something going on?”" },
    { who: "Workplace communication", text: "You receive critical feedback. You thank the person, ask a clarifying question and take a day to reflect before responding." },
    { who: "Leadership and business", text: "A team member makes a costly mistake. You address the behavior privately, ask what happened and focus on preventing it, while preserving their dignity." },
    { who: "Everyday disagreements", text: "Someone is rude to you in a store. You recognize the disrespect, choose not to return it, and keep your day your own." },
  ],
  exercises: [
    "Name it to tame it: three times a day, pause and name exactly what you are feeling.",
    "The 90-second rule: when emotion surges, wait about ninety seconds and breathe before acting.",
    "Facts vs. stories: separate what happened from what you assumed it meant.",
    "Perspective switch: retell a disagreement from the other person’s point of view.",
    "Clean apology: practice “I’m sorry for…” with no “but” attached.",
    "Delivery check: before an important message, ask whether you would want to receive it that way.",
  ],
};
