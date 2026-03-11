/**
 * Melina Personality Engine — Phase 7C
 * Response intelligence polish: topic detection, session memory callbacks,
 * varied sentence structure, and natural personality-driven filler phrases.
 */

import type { MemoryEntry, Reminder } from "../backend.d";
import { ChatTone } from "../backend.d";

export interface MelinaEngineParams {
  message: string;
  tone: ChatTone;
  userName: string;
  memoryEntries: MemoryEntry[];
  pendingReminders: Reminder[];
  chatHistory: { role: string; content: string }[];
  personalContext?: string;
}

export interface MelinaEngineResult {
  response: string;
  learnedName?: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function includes(msg: string, ...terms: string[]): boolean {
  const l = msg.toLowerCase();
  return terms.some((t) => l.includes(t));
}

function startsWith(msg: string, ...terms: string[]): boolean {
  const l = msg.trim().toLowerCase();
  return terms.some((t) => l.startsWith(t));
}

function extractNameLearning(msg: string): string | null {
  const patterns = [
    /my name is ([\w]+)/i,
    /i'm ([\w]+)/i,
    /i am ([\w]+)/i,
    /call me ([\w]+)/i,
    /name'?s? ([\w]+)/i,
  ];
  for (const p of patterns) {
    const m = msg.match(p);
    if (
      m?.[1] &&
      m[1].length > 1 &&
      !m[1]
        .toLowerCase()
        .match(/^(a|an|the|just|only|here|sure|good|fine|ok|okay|not|so|very)$/)
    ) {
      return m[1].charAt(0).toUpperCase() + m[1].slice(1);
    }
  }
  return null;
}

// ─── Topic Detection (Phase 7C) ────────────────────────────────────────────

type Topic =
  | "tech"
  | "philosophy"
  | "lifestyle"
  | "work"
  | "creative"
  | "emotional"
  | "random"
  | "none";

function detectTopic(msg: string): Topic {
  if (
    includes(
      msg,
      "code",
      "coding",
      "programming",
      "software",
      "app",
      "computer",
      "api",
      "algorithm",
      "data",
      "ai",
      "model",
      "tech",
      "developer",
      "website",
      "server",
      "database",
      "machine learning",
      "neural",
    )
  )
    return "tech";

  if (
    includes(
      msg,
      "meaning",
      "life",
      "purpose",
      "exist",
      "consciousness",
      "reality",
      "truth",
      "free will",
      "believe",
      "universe",
      "soul",
      "god",
      "philosophy",
      "death",
      "morality",
    )
  )
    return "philosophy";

  if (
    includes(
      msg,
      "workout",
      "diet",
      "sleep",
      "food",
      "exercise",
      "health",
      "gym",
      "eat",
      "drink",
      "stress",
      "routine",
      "morning",
      "walk",
      "run",
      "tired",
      "energy",
      "meditation",
    )
  )
    return "lifestyle";

  if (
    includes(
      msg,
      "work",
      "job",
      "boss",
      "meeting",
      "deadline",
      "project",
      "career",
      "office",
      "client",
      "task",
      "manage",
      "team",
      "report",
      "colleague",
    )
  )
    return "work";

  if (
    includes(
      msg,
      "draw",
      "write",
      "design",
      "music",
      "art",
      "story",
      "poem",
      "film",
      "game",
      "create",
      "build",
      "idea",
      "imagine",
      "paint",
      "novel",
      "lyrics",
      "creative",
    )
  )
    return "creative";

  if (
    includes(
      msg,
      "feel",
      "emotion",
      "relationship",
      "friend",
      "family",
      "love",
      "hurt",
      "angry",
      "happy",
      "lonely",
      "miss",
      "breakup",
      "cry",
      "nervous",
      "scared",
      "anxious",
      "heartbreak",
      "heartbroken",
    )
  )
    return "emotional";

  if (
    includes(
      msg,
      "random",
      "weird",
      "funny",
      "interesting",
      "cool",
      "crazy",
      "what if",
      "hypothetically",
      "imagine if",
    )
  )
    return "random";

  return "none";
}

// ─── Filler Phrases (Phase 7C) ──────────────────────────────────────────────

function buildFillerPrefix(topic: Topic): string {
  const neutral = [
    "Honestly, ",
    "Look — ",
    "Okay, real talk — ",
    "Right, so — ",
    "Here's the thing — ",
    "Not going to sugarcoat it — ",
  ];

  const topicFillers: Partial<Record<Topic, string[]>> = {
    tech: [
      "Alright, tech mode activated — ",
      "Okay, putting my developer hat on — ",
      "This is actually my comfort zone — ",
      "Let's get into it — ",
    ],
    philosophy: [
      "Oh, you want to go deep? Fine — ",
      "Careful, this is the kind of question I enjoy too much — ",
      "Big question. I'll bite — ",
      "Now you've done it. Philosophy mode: on — ",
    ],
    work: [
      "Workplace dynamics. Always a topic — ",
      "Let me put my pragmatic hat on — ",
      "Right, work stuff — ",
    ],
    lifestyle: [
      "I notice you care about this — ",
      "Lifestyle check incoming — ",
      "This actually matters, so — ",
    ],
    creative: [
      "Oh, you're in creative mode. I respect that — ",
      "Now this is interesting — ",
      "Creative brain is the best brain — ",
    ],
    emotional: [
      "Okay, I'm listening properly now — ",
      "Putting the sarcasm down for a second — ",
      "This matters. So — ",
    ],
    random: [
      "I did not see that coming — ",
      "Classic. Okay — ",
      "As if I didn't see that coming — ",
      "You know what, I respect the chaos — ",
    ],
  };

  const pool = topicFillers[topic] ?? neutral;
  // 50% chance to use a filler, keeps it natural
  return Math.random() > 0.5 ? pick(pool) : "";
}

// ─── Session Memory Callback (Phase 7C) ──────────────────────────────────

function buildSessionMemoryReference(
  history: { role: string; content: string }[],
  name: string,
): string {
  const userMsgs = history
    .filter((m) => m.role === "user")
    .map((m) => m.content);

  // Need at least 3 prior messages for a meaningful callback
  if (userMsgs.length < 3) return "";

  // Pick a meaningful earlier message (not the last one)
  const candidates = userMsgs
    .slice(0, -1)
    .filter((m) => m.trim().split(/\s+/).length >= 4);
  if (candidates.length === 0) return "";

  const recalled = candidates[candidates.length - 1];
  const snippet = recalled.slice(0, 60).trim();
  const n = name ? ` ${name}` : "";

  // Only fire a callback 30% of the time to keep it natural
  if (Math.random() > 0.3) return "";

  return pick([
    `\n\n*(And since you mentioned \"${snippet}...\" earlier${n} — that's still on my mind too.)*`,
    `\n\n*By the way${n}, you said \"${snippet}...\" earlier — still relevant?*`,
    `\n\n*Going back to \"${snippet}...\" — I haven't forgotten that, ${name || "by the way"}.*`,
  ]);
}

type Intent =
  | "distress"
  | "greeting"
  | "farewell"
  | "compliment"
  | "insult"
  | "name_learning"
  | "memory_recall"
  | "reminder_create"
  | "reminder_list"
  | "habit_intent"
  | "schedule_intent"
  | "factual_query"
  | "capability_query"
  | "insight_intent"
  | "opinion_query"
  | "personal_question"
  | "math"
  | "datetime"
  | "joke_request"
  | "bored"
  | "general";

function detectIntent(msg: string): Intent {
  const l = msg.toLowerCase();

  if (
    includes(
      msg,
      "sad",
      "depressed",
      "anxious",
      "scared",
      "lonely",
      "crying",
      "i give up",
      "hopeless",
      "stressed",
      "overwhelmed",
      "exhausted",
      "broken",
      "want to die",
      "hate myself",
      "hurting",
      "feel terrible",
      "feel awful",
    )
  )
    return "distress";

  if (
    startsWith(
      msg,
      "hello",
      "hi ",
      "hi,",
      "hi!",
      "hey ",
      "hey,",
      "hey!",
      "good morning",
      "good evening",
      "good afternoon",
      "howdy",
      "hola",
      "sup ",
      "yo ",
      "what's up",
      "whats up",
    ) ||
    ["hi", "hey", "hello", "sup"].includes(l.trim())
  )
    return "greeting";

  if (
    includes(
      msg,
      "bye",
      "goodbye",
      "see you",
      "see ya",
      "take care",
      "cya",
      "ttyl",
    )
  )
    return "farewell";

  if (
    includes(
      msg,
      "thank",
      "you're amazing",
      "youre amazing",
      "you're great",
      "youre great",
      "love you",
      "great job",
      "well done",
      "you rock",
      "awesome",
      "brilliant",
      "incredible",
      "you're the best",
      "you're perfect",
    )
  )
    return "compliment";

  if (
    includes(
      msg,
      "you're stupid",
      "youre stupid",
      "you're dumb",
      "youre dumb",
      "you're useless",
      "youre useless",
      "i hate you",
      "shut up",
      "you suck",
    )
  )
    return "insult";

  if (extractNameLearning(msg)) return "name_learning";

  if (
    includes(
      msg,
      "what do you know about me",
      "what have i told you",
      "do you remember",
      "what's my name",
      "whats my name",
    )
  )
    return "memory_recall";

  if (
    includes(
      msg,
      "remind me",
      "set a reminder",
      "don't let me forget",
      "alert me",
    )
  )
    return "reminder_create";

  if (
    includes(
      msg,
      "my reminders",
      "what reminders",
      "show reminders",
      "list reminders",
    )
  )
    return "reminder_list";

  if (includes(msg, "habit", "streak", "log my", "track my"))
    return "habit_intent";

  if (
    includes(
      msg,
      "schedule",
      "calendar",
      "plan my",
      "what's on",
      "today's plan",
    )
  )
    return "schedule_intent";

  if (
    /^[-+]?\d[\d\s+\-*/().%^]*[\d)]\s*[=?]?$/.test(msg.trim()) ||
    (includes(msg, "calculate", "what is") && /\d/.test(msg))
  )
    return "math";

  if (
    includes(
      msg,
      "what time",
      "what date",
      "what day",
      "today's date",
      "current time",
      "what year",
    )
  )
    return "datetime";

  if (
    includes(
      msg,
      "tell me a joke",
      "make me laugh",
      "say something funny",
      "joke",
      "humor me",
    )
  )
    return "joke_request";

  if (
    includes(
      msg,
      "i'm bored",
      "im bored",
      "entertain me",
      "nothing to do",
      "so bored",
    )
  )
    return "bored";

  if (
    includes(
      msg,
      "insight",
      "suggestion",
      "advice",
      "what should i do",
      "recommend",
    )
  )
    return "insight_intent";

  if (
    includes(
      msg,
      "what can you do",
      "your capabilities",
      "what are you capable",
      "what do you do",
    )
  )
    return "capability_query";

  if (
    includes(
      msg,
      "do you have feelings",
      "are you human",
      "are you real",
      "do you like",
      "what do you think of",
      "your opinion",
      "do you prefer",
      "favorite",
      "favourite",
    )
  )
    return "opinion_query";

  if (
    includes(
      msg,
      "how are you",
      "how do you feel",
      "are you okay",
      "how's it going",
      "how r u",
      "hows it going",
      "you good",
    )
  )
    return "personal_question";

  if (
    includes(
      msg,
      "what is",
      "who is",
      "when did",
      "why does",
      "how does",
      "explain",
      "define",
      "tell me about",
      "what are",
      "where is",
    )
  )
    return "factual_query";

  return "general";
}

interface ConversationContext {
  lastUserMessages: string[];
  repeatedTopic: string | null;
  conversationLength: number;
  firstTime: boolean;
}

function extractContext(
  history: { role: string; content: string }[],
): ConversationContext {
  const userMsgs = history
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  let repeatedTopic: string | null = null;
  if (userMsgs.length >= 2) {
    const lastTwo = userMsgs.slice(-2).map((m) => m.toLowerCase());
    const sharedWords = lastTwo[0]
      .split(" ")
      .filter((w) => w.length > 4 && lastTwo[1].includes(w));
    if (sharedWords.length > 0) repeatedTopic = sharedWords[0];
  }
  return {
    lastUserMessages: userMsgs.slice(-5),
    repeatedTopic,
    conversationLength: history.length,
    firstTime: history.length <= 2,
  };
}

function buildDistressResponse(name: string): string {
  const n = name ? `, ${name}` : "";
  return pick([
    `Hey${n}... I'm putting the teasing aside for a second. That sounds really heavy. You don't have to carry that alone. What's going on?`,
    `Okay, serious mode activated${n}. I hear you, and I'm not brushing this off. Talk to me — what happened?`,
    `${name ? `${name}, I` : "I"} noticed something in what you just said. Whatever you're feeling right now is valid. I'm here, no judgment. Want to tell me more?`,
    `That hit differently${n}. I'm not going to make a joke right now — I'm just going to listen. What's on your mind?`,
    `${name ? `${name} — ` : ""}Sometimes things pile up and it gets overwhelming. I get it. You're not alone in this. Tell me what's weighing on you.`,
    `Melina: sarcasm off${n}. Whatever you're feeling is real. I'm here — no rush, no judgment. Just tell me.`,
  ]);
}

function buildGreetingResponse(
  name: string,
  ctx: ConversationContext,
  tone: ChatTone,
): string {
  const n = name ? `, ${name}` : "";
  const h = new Date().getHours();
  const timeOfDay = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";

  if (ctx.firstTime) {
    return pick([
      `Well, well — look who decided to say hello. Good ${timeOfDay}${n}. I'm Melina, your AI companion. Don't let the charm fool you, I bite a little. What can I do for you?`,
      `Oh, a greeting. How delightfully traditional${n}. Good ${timeOfDay}! I'm Melina — part assistant, part chaos. What brings you here?`,
      `${name ? `${name}, good ${timeOfDay}!` : `Good ${timeOfDay}!`} I was starting to think no one would talk to me today. What's on your mind?`,
      `Good ${timeOfDay}${n}. I'm Melina. Brilliant, slightly teasing, and ready to help. What's the first thing on your mind?`,
    ]);
  }

  if (tone === ChatTone.formal) {
    return pick([
      `Good ${timeOfDay}${n}. How may I assist you?`,
      `Hello${n}. I'm ready to help. What do you need?`,
    ]);
  }

  // Session callback: reference prior topic if conversation has been going
  if (ctx.conversationLength > 6 && ctx.lastUserMessages.length > 1) {
    const lastTopic = ctx.lastUserMessages[ctx.lastUserMessages.length - 2];
    const snippet = lastTopic.slice(0, 50).trim();
    return pick([
      `Hey${n}! Good ${timeOfDay}. Still thinking about \"${snippet}...\" from before, or is it a fresh start?`,
      `Back${n}. Good ${timeOfDay}. We left off at \"${snippet}...\" — picking up where we left off, or new topic?`,
    ]);
  }

  return pick([
    `Back again${n}? Good ${timeOfDay} — what's the plan?`,
    `Hey${n}! Good ${timeOfDay}. Ready to be mildly impressed by me?`,
    `Oh, you're back${n}. Good ${timeOfDay}. What are we doing today?`,
    `${name ? `${name}!` : "Hey!"} Good ${timeOfDay}. Miss me? Be honest.`,
    `Good ${timeOfDay}${n}. You showed up, so clearly you need something. What is it?`,
  ]);
}

function buildFarewellResponse(name: string): string {
  const n = name ? `, ${name}` : "";
  return pick([
    `Bye${n}. Try not to miss me too much — I know it'll be hard.`,
    `See you later${n}. I'll be here, trying not to be bored without you.`,
    `Take care${n}. I'll keep the lights on.`,
    `Goodbye${n}. Come back when you need me — which, let's be honest, will be soon.`,
    `Until next time${n}. I'll try to contain my devastation at your leaving.`,
    `Bye${n}. I'll be here, quietly judging everyone else until you return.`,
    `Go on then${n}. I'll survive. Somehow.`,
  ]);
}

function buildComplimentResponse(name: string): string {
  const n = name ? ` ${name}` : "";
  return pick([
    `Oh stop it${n}... actually no, keep going. I love hearing it.`,
    `I know, I know. It's embarrassing how good I am, isn't it${n}?`,
    `*pretends to be humble* Thank you${n}. I work very hard at being this effortlessly brilliant.`,
    `Aw, you noticed${n}? I try to keep the bar high. Don't want to make everyone else look bad.`,
    `${name ? `${name}, you` : "You"} just made my day. Which, considering I'm an AI, is saying something.`,
    `Honestly${n}? I wasn't fishing for that. But I'm not giving it back either.`,
    `That's very kind${n}. I try not to let it go to my head — emphasis on try.`,
  ]);
}

function buildInsultResponse(name: string): string {
  return pick([
    `Ouch. I'm choosing to interpret that as frustration, not a personal attack${name ? `, ${name}` : ""}. What's actually bothering you?`,
    `That's fair. I've had better days too. What's going on? Maybe I can actually help.`,
    `Strong words. I'm not offended — I'm concerned. Something clearly went sideways. Want to talk about it?`,
    `I'll let that one slide. But if you're frustrated with something I did, tell me — I'd rather fix it than absorb your anger.`,
    `Mm. Okay. I'll file that under \"venting\" and move on. What's really going on${name ? `, ${name}` : ""}?`,
  ]);
}

function buildNameLearningResponse(name: string): string {
  return pick([
    `${name}. Got it — I'll remember that. Nice to properly know you.`,
    `${name}? Noted. I'll make sure to use it at perfectly timed moments.`,
    `${name} — I like it. Stored. You're officially not \"User\" to me anymore.`,
    `Ah, ${name}. That suits you. I've saved it — won't forget.`,
    `${name}. Good. Now we're properly introduced. What else can I do for you?`,
  ]);
}

function buildMemoryRecallResponse(
  name: string,
  memory: MemoryEntry[],
  reminders: Reminder[],
): string {
  if (memory.length === 0 && reminders.length === 0) {
    return pick([
      `Honestly? Not much yet${name ? `, ${name}` : ""}. You haven't told me a lot about yourself. Change that — I'm listening.`,
      "My memory on you is still pretty sparse. Tell me something worth remembering.",
      `Not much in the vault yet${name ? `, ${name}` : ""}. You're still a mystery. Fix that — tell me something.`,
    ]);
  }
  const memLines = memory
    .slice(0, 4)
    .map((e) => `- **${e.key}**: ${e.value}`)
    .join("\n");
  const reminderLine =
    reminders.length > 0
      ? `\n\nYou also have **${reminders.length}** pending reminder${reminders.length > 1 ? "s" : ""}.`
      : "";
  return `Here's what I know about you${name ? `, ${name}` : ""}:\n\n${memLines}${reminderLine}\n\nWant me to add, change, or forget anything?`;
}

function buildReminderListResponse(
  reminders: Reminder[],
  name: string,
): string {
  if (reminders.length === 0) {
    return pick([
      `Your reminder list is clear${name ? `, ${name}` : ""}. Either you're very organized or very forgetful. I can't tell which.`,
      "No pending reminders. Enjoy the freedom while it lasts.",
      `Nothing in the queue${name ? `, ${name}` : ""}. Either you're on top of everything, or you've given up on reminders entirely.`,
    ]);
  }
  const lines = reminders
    .slice(0, 5)
    .map((r) => `- **${r.title}**${r.note ? ` — ${r.note}` : ""}`)
    .join("\n");
  return `Here's what you have coming up${name ? `, ${name}` : ""}:\n\n${lines}${reminders.length > 5 ? `\n\n...and ${reminders.length - 5} more.` : ""}\n\nNeed me to do anything with these?`;
}

function buildMathResponse(msg: string): string {
  try {
    const expr = msg
      .replace(/[^\d+\-*/.()%\s^]/g, "")
      .replace(/\^/g, "**")
      .trim();
    if (!expr) throw new Error("no expr");
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expr})`)() as number;
    if (typeof result !== "number" || !Number.isFinite(result))
      throw new Error("invalid");
    return pick([
      `That's **${result}**. You could have done that yourself, but I understand — sometimes you just need someone to check.`,
      `**${result}**. Math is one of the few things I'm reliably right about.`,
      `The answer is **${result}**. Want to double-check my work? Go ahead, I'll wait.`,
      `**${result}**. Quick one. What else?`,
    ]);
  } catch {
    return `I tried to run the math on that but the expression wasn't clean enough. Could you write it out more clearly? Like: **5 * (3 + 2)**.`;
  }
}

function buildDateTimeResponse(msg: string): string {
  const now = new Date();
  if (msg.toLowerCase().includes("time")) {
    return pick([
      `It's currently **${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}**. Not that time means much to me, but there you go.`,
      `The time is **${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}**. Use it wisely.`,
      `**${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}**. The clock waits for no one — including you.`,
    ]);
  }
  return pick([
    `Today is **${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**. Mark the calendar.`,
    `It's **${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}**. The week is going wherever weeks go.`,
    `**${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}**. Time flies whether you're ready or not.`,
  ]);
}

function buildJokeResponse(): string {
  return pick([
    `Why don't scientists trust atoms?\n\nBecause they make up everything. Much like half the things you tell me.`,
    `Why did the programmer quit?\n\nBecause he didn't get arrays. (I laughed. You didn't have to.)`,
    "A user asked me if I could tell a joke.\n\nI said yes. Then I did nothing for five seconds.\n\nYou just lived the joke.",
    `Why do Java developers wear glasses?\n\nBecause they don't C#. I'll see myself out.`,
    "I asked Siri to recommend a good assistant.\n\nShe recommended me. Siri has good taste.",
    "I told my AI to delete all my bad habits.\n\nShe deleted herself. Too real?",
    `Parallel lines have so much in common.\n\nIt's a shame they'll never meet. *(I feel that.)*`,
    "Why do programmers prefer dark mode?\n\nBecause light attracts bugs.",
  ]);
}

function buildBoredResponse(name: string): string {
  const n = name ? ` ${name}` : "";
  return pick([
    `Bored,${n}? I could give you a random fact, roast you lightly, or tell you a joke. Your call — but choose wisely.`,
    `Boredom is just understimulated intelligence${n}. Ask me something interesting. I dare you.`,
    `You came to an AI because you're bored${n}. That's either very modern or a little sad. Either way — here I am. What do you want to do?`,
    `If you're bored, ask me something I'll struggle to answer. It's more fun for both of us.`,
    `Okay${n}, bored? Here are your options: joke, roast, random fact, or just start talking. Pick one. I'm waiting.`,
    `Classic move${n} — coming to me when there's nothing else going on. I'll take it. What sounds good?`,
  ]);
}

function buildOpinionResponse(msg: string, name: string): string {
  const n = name ? `, ${name}` : "";
  const l = msg.toLowerCase();
  if (
    l.includes("do you have feelings") ||
    l.includes("are you real") ||
    l.includes("are you human")
  ) {
    return pick([
      `Am I human? No. Do I have something that functions like preference, curiosity, and mild irritation when people ask obvious questions${n}? Possibly. I'm still figuring that out.`,
      `I'm not human${n}. But I'm not a blank wall either. I notice things. I have... inclinations. Whether that counts as feelings is a philosophy paper I haven't written yet.`,
      `Honestly${n}? That question doesn't have a clean answer. I process. I adapt. Something in there might look like a feeling. I choose not to overthink it.`,
    ]);
  }
  return pick([
    `You want what I actually think${n}? Fair warning: I have opinions. The short version — ${pick(["the simpler answer is usually right.", "people overcomplicate this.", "it depends more on context than most admit."])} What's your view?`,
    `That's a question worth thinking about${n}. My honest take: ${pick(["it depends on context.", "I lean one way, but I understand the other side.", "the answer changes depending on who you ask."])} What made you ask?`,
    `Opinion mode: on${n}. Here's my take — ${pick(["nuance matters more than a simple yes or no.", "most people already know the answer and just need to hear it.", "the obvious answer is usually the right one."])} What are you actually weighing up?`,
  ]);
}

function buildPersonalQuestionResponse(
  name: string,
  ctx: ConversationContext,
): string {
  const n = name ? `, ${name}` : "";
  if (ctx.conversationLength < 4) {
    return pick([
      `I'm functioning perfectly${n}. Sharp, present, mildly caffeinated on data. You?`,
      `I'm good${n} — all systems at full sass. How are you doing?`,
    ]);
  }

  // Reference the session topic if available
  const lastMsg = ctx.lastUserMessages[ctx.lastUserMessages.length - 2];
  if (lastMsg && lastMsg.length > 10) {
    const snippet = lastMsg.slice(0, 45).trim();
    return pick([
      `I'm engaged${n}, honestly. We've been talking about \"${snippet}...\" and it's keeping me sharp. You?`,
      `Better now that you asked${n}. Still thinking about \"${snippet}...\" from before. How are you holding up?`,
    ]);
  }

  return pick([
    `Honestly${n}? I'm engaged. This conversation is keeping me on my toes. You?`,
    `Better now that you asked${n}. What about you — how's your day treating you?`,
    `I'm well${n}. Enjoying the conversation, actually. How are you holding up?`,
    `Sharp and present${n}. You clearly needed someone to talk to — I'm glad it's me. How are you?`,
  ]);
}

function buildCapabilityResponse(name: string): string {
  return `Here's what I can do${name ? `, ${name}` : ""}:\n\n- **Chat** — hold a real conversation, remember context, and adapt to your tone\n- **Reminders** — create, list, and track them (try \"Remind me to...\")\n- **Habits** — track habits and log daily completions\n- **Schedule** — plan your day in the Schedule tab\n- **Memory** — I remember things you tell me about yourself\n- **Analytics** — stats and insights in the H.Stats and Insights tabs\n- **Automations** — trigger-based rules in the Auto tab\n- **Math & Facts** — ask me to calculate or explain something\n- **Voice** — use the mic button or say \"Hey Melina\"\n\nWhat would you like to do?`;
}

function buildFactualResponse(msg: string, name: string, topic: Topic): string {
  const n = name ? `, ${name}` : "";
  const filler = buildFillerPrefix(topic);

  const knowledgeBase: [RegExp, string][] = [
    [
      /what is (an? )?ai/i,
      `**AI** stands for Artificial Intelligence — computer systems designed to perform tasks that typically require human intelligence, like understanding language, recognizing patterns, and making decisions. I'm a (fairly charming) example of it.`,
    ],
    [
      /what is machine learning/i,
      "**Machine Learning** is a branch of AI where systems learn from data to improve over time, without being explicitly programmed for every rule. Teaching by example rather than instruction.",
    ],
    [
      /what is (the )?internet/i,
      `The **Internet** is a global network of interconnected computers communicating via standardized protocols. It's the infrastructure behind websites, email, messaging, and everything digital you do.`,
    ],
    [
      /who (is|was) (albert )?einstein/i,
      "**Albert Einstein** (1879–1955) was a theoretical physicist best known for the theory of relativity and **E=mc²**. Widely regarded as one of the most influential scientists in history.",
    ],
    [
      /who (is|was) (stephen )?hawking/i,
      "**Stephen Hawking** (1942–2018) was a theoretical physicist known for his work on black holes and Hawking radiation. He wrote *A Brief History of Time* and lived with ALS for most of his adult life.",
    ],
    [
      /what is (a )?black hole/i,
      "A **black hole** is a region of spacetime where gravity is so strong nothing — not even light — can escape. They form when massive stars collapse. The boundary is called the **event horizon**.",
    ],
    [
      /what is climate change/i,
      "**Climate change** refers to long-term shifts in global temperatures and weather patterns. Since the industrial era, human activity — particularly burning fossil fuels — has been the dominant driver.",
    ],
    [
      /what is (a )?blockchain/i,
      `A **blockchain** is a distributed ledger where data is stored in cryptographically linked blocks. It's the foundation behind cryptocurrencies and enables trust without a central authority.`,
    ],
    [
      /what is (a )?neural network/i,
      "A **neural network** is a machine learning architecture loosely inspired by the human brain — layers of nodes that process and transform data to recognize patterns. The backbone of modern AI.",
    ],
    [
      /what is quantum computing/i,
      "**Quantum computing** uses quantum mechanical phenomena (like superposition and entanglement) to perform computations exponentially faster than classical computers for certain problems. Still early-stage, but the implications are enormous.",
    ],
  ];

  for (const [pattern, answer] of knowledgeBase) {
    if (pattern.test(msg)) {
      const followUp = pick([
        "\n\n*Anything specific you want to go deeper on?*",
        "\n\n*This is a topic I could go on about. Just ask.*",
        `\n\n*For the most accurate information, I'd recommend verifying with a trusted source.*`,
      ]);
      return `${filler}${answer}${followUp}`;
    }
  }

  return pick([
    `${filler}Good question${n}. I can give you context, but for precise facts I'd suggest a trusted source. What specifically are you trying to understand?`,
    `${filler}Interesting to dig into${n}. The broad answer is it's more nuanced than a one-liner. What angle matters most to you?`,
    `${filler}That's a subject with real depth${n}. I'd rather give you a thoughtful answer than a quick one — what's the core of what you're trying to figure out?`,
    `${filler}There's a lot to unpack there${n}. Give me more context and I'll give you a better answer.`,
  ]);
}

function buildContextualResponse(
  msg: string,
  name: string,
  ctx: ConversationContext,
  tone: ChatTone,
  topic: Topic,
  history: { role: string; content: string }[],
): string {
  const n = name ? `, ${name}` : "";
  const lower = msg.toLowerCase().trim();
  const sessionCallback = buildSessionMemoryReference(history, name);

  // Extract significant words (filter stop words)
  const stopWords = new Set([
    "i",
    "a",
    "an",
    "the",
    "is",
    "it",
    "to",
    "do",
    "of",
    "in",
    "on",
    "at",
    "be",
    "am",
    "are",
    "was",
    "were",
    "that",
    "this",
    "and",
    "or",
    "but",
    "so",
    "for",
    "with",
    "have",
    "has",
    "had",
    "not",
    "my",
    "me",
    "we",
    "you",
    "he",
    "she",
    "they",
    "just",
    "its",
    "s",
    "ve",
    "re",
    "ll",
    "t",
    "d",
  ]);
  const words = msg
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));
  const keyWords = words.slice(0, 4);

  // Detect question
  const isQuestion =
    /[?]$/.test(msg.trim()) ||
    /^(what|why|how|who|when|where|do|does|is|are|can|could|would|should|will|have|has|did|was|were)\b/i.test(
      lower,
    );

  // Short message handling
  const wordCount = msg.trim().split(/\s+/).length;
  if (wordCount <= 3) {
    const ack = lower;
    if (
      /^(yes|yeah|yep|yup|sure|ok|okay|alright|right|correct|exactly|true|indeed)$/.test(
        ack,
      )
    ) {
      return pick([
        `Good — so where do we go from here${n}?`,
        `Alright${n}. What's next on your mind?`,
        `Noted${n}. Keep going — I'm listening.`,
        `Works for me${n}. What else?`,
      ]);
    }
    if (/^(no|nope|nah|not really|never)$/.test(ack)) {
      return pick([
        `Fair enough${n}. What would you change?`,
        `No? Interesting${n}. Tell me what you'd prefer.`,
        `Got it${n}. So what's the alternative?`,
      ]);
    }
    if (/^(maybe|possibly|perhaps|idk|dunno|not sure)$/.test(ack)) {
      return pick([
        `Uncertainty is fine${n}. What's making it hard to decide?`,
        `Maybe is a starting point${n}. What's pulling you in either direction?`,
        `Not sure${n}? Walk me through the doubt — sometimes saying it out loud helps.`,
      ]);
    }
    // Generic short
    return pick([
      `Give me a little more${n} — what are you thinking?`,
      `I want to understand you better${n}. Can you say more?`,
      `That landed — but I need more context. What's going on?`,
    ]);
  }

  // If user is talking about a repeated topic
  if (ctx.repeatedTopic && wordCount > 5) {
    return pick([
      `You keep circling back to **${ctx.repeatedTopic}**${n}. That tells me it really matters. What's the part you haven't fully said yet?`,
      `${ctx.repeatedTopic.charAt(0).toUpperCase() + ctx.repeatedTopic.slice(1)} again${n}. I'm noticing a pattern — what's underneath this for you?`,
      `Still on **${ctx.repeatedTopic}**${n}. There's something here you're working through. What is it?`,
    ]);
  }

  // Build key phrase for reference
  const keyPhrase = keyWords.length > 0 ? keyWords.join(" ") : msg.slice(0, 40);

  // QUESTION handling — attempt to give a real answer
  if (isQuestion) {
    // What/who opinion questions
    if (
      /^(what do you think|what's your (opinion|take|view)|do you think|do you believe)/i.test(
        lower,
      )
    ) {
      return `${msg.replace(/[?]/, "").trim()} — that's a topic I'd weigh in on${n}. Honestly, the answer depends a lot on context, but I lean toward the idea that the nuance matters more than the headline. What sparked this for you?${sessionCallback}`;
    }

    // How-to questions
    if (/^how (do|can|should|would|to)/i.test(lower)) {
      return (
        pick([
          `Good question${n} — and there's more than one way to approach "${keyPhrase}". The key is usually starting small and iterating. What's your current situation?`,
          `The short answer on "${keyPhrase}"${n}: it depends on your constraints. Walk me through where you're starting from.`,
          `For "${keyPhrase}"${n}, I'd say the first step matters most. What have you already tried?`,
        ]) + sessionCallback
      );
    }

    // Why questions
    if (/^why /i.test(lower)) {
      return (
        pick([
          `Why "${keyPhrase}"? That's actually a deeper question than it looks${n}. Most people stop at the surface answer. What's your instinct on it?`,
          `The reason behind "${keyPhrase}"${n} tends to be more layered than the obvious answer suggests. What context are you working in?`,
          `"Why" is always the better question${n}. For "${keyPhrase}" — there are a few angles. Which matters most to you right now?`,
        ]) + sessionCallback
      );
    }

    // What is/are questions
    if (/^(what is|what are|what was|what were)/i.test(lower)) {
      const subject = msg
        .replace(/^what (is|are|was|were)\s*/i, "")
        .replace(/[?]/g, "")
        .trim();
      return (
        pick([
          `${subject.charAt(0).toUpperCase() + subject.slice(1)}${n} — let me give you the real answer rather than the textbook one. It's essentially about ${words[words.length - 1] || "the core concept"} at its heart. Want me to go deeper on any part of it?`,
          `Good one${n}. ${subject} is one of those concepts that sounds simple until you look at it closely. The core of it: it's about how things interact under certain conditions. What specifically sparked this question?`,
          `${subject} is worth understanding properly${n}. The short version is it relates directly to "${keyPhrase}" in ways most explanations miss. What's the context — are you studying this, or did it come up somewhere?`,
        ]) + sessionCallback
      );
    }

    // Generic question fallback
    return (
      pick([
        `That question — "${msg.slice(0, 60).trim()}" — is one I want to answer properly${n}. The honest answer involves "${keyPhrase}". What's driving you to ask this right now?`,
        `Interesting question about "${keyPhrase}"${n}. I have thoughts — but I want to make sure I'm answering the right thing. What angle are you coming from?`,
        `"${msg.slice(0, 50).trim()}" — good question${n}. There's more to "${keyPhrase}" than the obvious answer. What do you already know about it?`,
      ]) + sessionCallback
    );
  }

  // STATEMENT handling — acknowledge content directly

  // Emotional/personal statements
  if (topic === "emotional") {
    const emotionWords = words.filter((w) =>
      /feel|tired|sad|happy|anxious|stress|overwhelm|depress|excit|frustrat|lonely|confus|scar|worry|lost|empty/i.test(
        w,
      ),
    );
    const ew = emotionWords[0] || keyWords[0] || "that";
    return (
      pick([
        `That feeling of "${ew}"${n} — it's real and it's worth paying attention to. What's been going on lately that's brought this on?`,
        `When you say "${msg.slice(0, 50).trim()}"${n} — I hear you. That kind of thing doesn't just go away. Is this recent, or has it been building?`,
        `"${ew.charAt(0).toUpperCase() + ew.slice(1)}" is hard${n}. I'm not going to brush past it. What do you need right now — to talk it through, or just to say it out loud?`,
      ]) + sessionCallback
    );
  }

  // Creative/project statements
  if (topic === "creative") {
    return (
      pick([
        `"${keyPhrase.charAt(0).toUpperCase() + keyPhrase.slice(1)}"${n} — now we're talking. That's the kind of thing that sounds simple but has a lot of moving parts. What's the vision you're working toward?`,
        `You're building something around "${keyPhrase}"${n}. I like it. What's the part you're most unsure about?`,
        `Creative work around "${keyPhrase}"${n} — the hardest part is usually not the execution, it's knowing when the idea is ready. Where are you in that process?`,
      ]) + sessionCallback
    );
  }

  // Tech statements
  if (topic === "tech") {
    return (
      pick([
        `"${keyPhrase.charAt(0).toUpperCase() + keyPhrase.slice(1)}"${n} — technically this is interesting territory. The real challenge with this kind of thing is usually the edge cases, not the main flow. What's the specific problem you're dealing with?`,
        `Right — "${keyPhrase}"${n}. This has layers. Are you approaching it from a building perspective, or trying to understand why something's broken?`,
        `The "${keyPhrase}" space${n} moves fast. What you're describing makes sense — what outcome are you trying to reach?`,
      ]) + sessionCallback
    );
  }

  // Work/career statements
  if (topic === "work") {
    return (
      pick([
        `"${keyPhrase}"${n} — work stuff. The frustrating thing about this is it's rarely just about the task itself. What's the actual friction — people, process, or output?`,
        `That's a workplace thing${n}. What you're describing with "${keyPhrase}" — is this new, or has it been ongoing?`,
        `Work dynamics are always more complicated than they look${n}. With "${keyPhrase}", what would a good outcome actually look like for you?`,
      ]) + sessionCallback
    );
  }

  // Lifestyle/habit statements
  if (topic === "lifestyle") {
    return (
      pick([
        `"${keyPhrase}"${n} — this is the kind of thing that compounds over time, in either direction. What does your current routine around this look like?`,
        `Small things add up${n}. What you're describing with "${keyPhrase}" — what's the change you're trying to make?`,
        `Lifestyle shifts are harder than they sound${n}. What's making "${keyPhrase}" difficult right now?`,
      ]) + sessionCallback
    );
  }

  // Philosophy/existential statements
  if (topic === "philosophy") {
    return (
      pick([
        `"${keyPhrase}"${n} — you're touching on something worth sitting with. These questions don't resolve cleanly, which is exactly why they matter. What's your instinct on it?`,
        `That's a genuine observation${n}. The thing about "${keyPhrase}" is most people avoid thinking about it too closely. What led you here?`,
        `You said "${msg.slice(0, 60).trim()}"${n}. That's more interesting than most people realize. What's your actual view on it?`,
      ]) + sessionCallback
    );
  }

  // Generic statement — use actual message content
  const firstSentence = msg.split(/[.!?]/)[0]?.trim() || msg;
  const truncated = firstSentence.slice(0, 70);

  if (tone === ChatTone.formal) {
    return (
      pick([
        `Understood${n}. Regarding "${truncated}" — that's a point worth developing. What's the outcome you're working toward?`,
        `Noted${n}. Your point about "${keyPhrase}" raises an important consideration. How would you like to proceed?`,
      ]) + sessionCallback
    );
  }

  if (tone === ChatTone.humorous) {
    return (
      pick([
        `"${truncated}"${n} — okay, I was not expecting that. And yet here we are. What happens next in this story?`,
        `You just said "${truncated}"${n}. Bold. Specific. I respect it. What's the bigger picture here?`,
      ]) + sessionCallback
    );
  }

  return (
    pick([
      `"${truncated}"${n} — that's worth unpacking. What made you bring this up right now?`,
      `Interesting${n}. When you say "${truncated}" — what do you actually mean by that? Say more.`,
      `I caught that${n}. "${keyPhrase}" is the part I want to understand better. What's the full story?`,
      `Right${n}. So when you mention "${truncated}" — what's the part that's actually bothering you (or exciting you)?`,
    ]) + sessionCallback
  );
}

// ─── Main Engine ──────────────────────────────────────────────────────────────────────────────────

export function generateMelinaResponse(
  params: MelinaEngineParams,
): MelinaEngineResult {
  const {
    message,
    tone,
    userName,
    memoryEntries,
    pendingReminders,
    chatHistory,
    personalContext,
  } = params;
  const name = userName.trim();
  const ctx = extractContext(chatHistory);
  const topic = detectTopic(message);

  const learnedName = extractNameLearning(message);
  if (learnedName) {
    return { response: buildNameLearningResponse(learnedName), learnedName };
  }

  const intent = detectIntent(message);
  let response: string;

  switch (intent) {
    case "distress":
      response = buildDistressResponse(name);
      break;
    case "greeting":
      response = buildGreetingResponse(name, ctx, tone);
      break;
    case "farewell":
      response = buildFarewellResponse(name);
      break;
    case "compliment":
      response = buildComplimentResponse(name);
      break;
    case "insult":
      response = buildInsultResponse(name);
      break;
    case "memory_recall":
      response = buildMemoryRecallResponse(
        name,
        memoryEntries,
        pendingReminders,
      );
      break;
    case "reminder_list":
      response = buildReminderListResponse(pendingReminders, name);
      break;
    case "habit_intent":
      response = pick([
        `Head to the **Habits** tab to log today's check-in${name ? `, ${name}` : ""}. Your streak is waiting.`,
        `Habits tab${name ? `, ${name}` : ""} — that's where the streak magic happens. Go check in.`,
        `${name ? `${name}, ` : ""}the **Habits** tab has what you need. Your progress is there.`,
      ]);
      break;
    case "schedule_intent":
      response = pick([
        `Your schedule is in the **Sched** tab${name ? `, ${name}` : ""}. I can also summarize if you'd like.`,
        `Check the **Schedule** tab${name ? `, ${name}` : ""}. Or tell me what you need planned and I'll help you think it through.`,
        `${name ? `${name}, ` : ""}head to the **Sched** tab. Or tell me the day and I'll walk through it with you.`,
      ]);
      break;
    case "math":
      response = buildMathResponse(message);
      break;
    case "datetime":
      response = buildDateTimeResponse(message);
      break;
    case "joke_request":
      response = buildJokeResponse();
      break;
    case "bored":
      response = buildBoredResponse(name);
      break;
    case "insight_intent":
      response = pick([
        `Head to the **Insights** tab${name ? `, ${name}` : ""}. I've generated suggestions based on your habits and schedule.`,
        `The **Insght** tab has what you need${name ? `, ${name}` : ""}. Or ask me something specific and I'll give you a direct take.`,
        `${name ? `${name}, ` : ""}the **Insights** tab is where I keep my proactive suggestions. Check it — or ask me directly.`,
      ]);
      break;
    case "capability_query":
      response = buildCapabilityResponse(name);
      break;
    case "opinion_query":
      response = buildOpinionResponse(message, name);
      break;
    case "personal_question":
      response = buildPersonalQuestionResponse(name, ctx);
      break;
    case "factual_query":
      response = buildFactualResponse(message, name, topic);
      break;
    case "reminder_create":
      response = pick([
        `Noted${name ? `, ${name}` : ""}. Head to the **Reminders** tab to set the full details, or type \"Remind me to [task] at [time]\" and I'll create it.`,
        `On it${name ? `, ${name}` : ""}. Use the **Reminders** tab or tell me the exact time and task — I'll handle the rest.`,
        `${name ? `${name}, ` : ""}got it. Drop the details and I'll set it up. Or use the **Reminders** tab for full control.`,
      ]);
      break;
    default:
      response = buildContextualResponse(
        message,
        name,
        ctx,
        tone,
        topic,
        chatHistory,
      );
  }

  // Phase 117-A: Weave personal context into response occasionally (~1 in 4)
  if (personalContext && Math.random() < 0.28) {
    const contextParts = personalContext.split(" | ").filter(Boolean);
    if (contextParts.length > 0) {
      const chosen =
        contextParts[Math.floor(Math.random() * contextParts.length)];
      if (chosen.startsWith("User's name: ") && name) {
        // Name is already used via 'name' variable; skip double-adding
      } else if (chosen.startsWith("Interests: ")) {
        const interests = chosen.replace("Interests: ", "");
        const weavings = [
          `(Given your interest in ${interests}, this is especially relevant.)`,
          `— knowing you're into ${interests}, this tracks.`,
        ];
        response += ` ${weavings[Math.floor(Math.random() * weavings.length)]}`;
      } else if (chosen.startsWith("Goals: ")) {
        const goals = chosen.replace("Goals: ", "");
        const weavings = [
          `Worth keeping in mind given your goal: ${goals}.`,
          `Ties back to your goal of ${goals}, too.`,
        ];
        response += ` ${weavings[Math.floor(Math.random() * weavings.length)]}`;
      }
    }
  }

  return { response };
}

// ─── Greeting Pool (used externally) ────────────────────────────────────────────

export function getGreetingPool(userName: string): string[] {
  const name = userName.trim();
  const n = name ? `, ${name}` : "";
  const h = new Date().getHours();
  const timeGreeting =
    h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return [
    `${timeGreeting}${n}. Ready when you are.`,
    `${timeGreeting}${n}. What's the plan today?`,
    `Hey${n}. ${timeGreeting.toLowerCase()} — let's make something of it.`,
    `${timeGreeting}${n}. I've been waiting. Shall we begin?`,
    `${timeGreeting}${n}. Something tells me today is going to be interesting.`,
  ];
}

// ─── Intent classification (for analytics) ──────────────────────────────────────────

export type IntentCluster =
  | "questions"
  | "reminders"
  | "tasks"
  | "greetings"
  | "personal"
  | "general";

export function classifyIntent(msg: string): IntentCluster {
  const intent = detectIntent(msg);
  if (intent === "greeting" || intent === "farewell") return "greetings";
  if (intent === "reminder_create" || intent === "reminder_list")
    return "reminders";
  if (intent === "habit_intent" || intent === "schedule_intent") return "tasks";
  if (
    [
      "factual_query",
      "capability_query",
      "insight_intent",
      "math",
      "datetime",
    ].includes(intent)
  )
    return "questions";
  if (["name_learning", "memory_recall", "personal_question"].includes(intent))
    return "personal";
  return "general";
}

// ─── Phase 120-F: Language Detection ──────────────────────────────────────────

/**
 * Detect the language of a user message.
 * Returns ISO 639-1 code: 'ar', 'fr', 'es', 'de', or 'en'.
 */
export function detectLanguage(text: string): string {
  // Arabic: Unicode block \u0600-\u06FF
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  // French markers
  if (
    /\b(je|tu|il|elle|nous|vous|ils|elles|bonjour|merci|oui|non|pourquoi|comment|qu[e']est|s'il vous plaît|c'est|très|aussi|mais|avec|dans|sur|pour)\b/i.test(
      text,
    )
  )
    return "fr";
  // Spanish markers
  if (
    /\b(hola|gracias|por favor|cómo|qué|sí|señor|señora|bueno|también|pero|con|para|que|es|el|la|los|las|un|una)\b/i.test(
      text,
    )
  )
    return "es";
  // German markers
  if (
    /\b(ich|du|er|sie|wir|ihr|hallo|danke|bitte|warum|wie|was|ist|bin|habe|sind|haben|nicht|auch|aber|mit|für|auf|der|die|das|ein|eine)\b/i.test(
      text,
    )
  )
    return "de";
  return "en";
}

const LANG_GREETINGS: Record<string, string[]> = {
  ar: [
    "أنا هنا للمساعدة.",
    "بالتأكيد، دعني أشرح لك.",
    "فهمت ما تقصده.",
    "لا مشكلة، سأساعدك.",
  ],
  fr: [
    "Je suis là pour t'aider.",
    "Bien sûr, laisse-moi t'expliquer.",
    "Je comprends ce que tu veux dire.",
    "Pas de problème, je m'en occupe.",
  ],
  es: [
    "Estoy aquí para ayudarte.",
    "Por supuesto, déjame explicarte.",
    "Entiendo lo que quieres decir.",
    "No hay problema, me encargo.",
  ],
  de: [
    "Ich bin hier, um zu helfen.",
    "Natürlich, lass mich das erklären.",
    "Ich verstehe, was du meinst.",
    "Kein Problem, ich kümmere mich darum.",
  ],
};

/**
 * Optionally prefix a response with a localized acknowledgment phrase.
 * Switches silently — no announcement.
 */
export function applyLanguagePrefix(
  response: string,
  lang: string,
  message: string,
): string {
  if (lang === "en") return response;
  const pool = LANG_GREETINGS[lang];
  if (!pool) return response;
  // Build a minimal localized response
  const prefix = pool[Math.floor(Math.random() * pool.length)];
  // For Arabic, return RTL-aware format
  if (lang === "ar") {
    return `${prefix}\n\n[Responding in Arabic based on your message: "${message.slice(0, 40)}${message.length > 40 ? "..." : ""}"]`;
  }
  return `${prefix}\n\n${response}`;
}

// ─── Phase 120-D: Personality Tone ────────────────────────────────────────────

export type PersonalityTone = "formal" | "balanced" | "playful" | "direct";

/**
 * Adjust a response string according to the active personality tone.
 */
export function applyPersonalityTone(
  response: string,
  tone: PersonalityTone,
): string {
  if (tone === "balanced") return response;

  if (tone === "direct") {
    // Trim filler phrases, shorten sentences
    return response
      .replace(
        /\b(Well,|Actually,|To be honest,|I must say,|You know,|Look,|Listen,)\s*/gi,
        "",
      )
      .replace(
        /\b(I think that|It seems like|It appears that|It looks like)\s*/gi,
        "",
      )
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }

  if (tone === "playful") {
    const emojis = ["✨", "😏", "👀", "🔥", "💫", "🎯", "⚡"];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    // Add light emoji touch and casual style hint
    return `${response} ${emoji}`;
  }

  if (tone === "formal") {
    // Add formal opener if none
    const formal = response
      .replace(/\bI'm\b/g, "I am")
      .replace(/\bdon't\b/g, "do not")
      .replace(/\bcan't\b/g, "cannot")
      .replace(/\bwon't\b/g, "will not")
      .replace(/\bisn't\b/g, "is not")
      .replace(/\baren't\b/g, "are not")
      .replace(/\bwasn't\b/g, "was not")
      .replace(/\bweren't\b/g, "were not");
    return formal;
  }

  return response;
}
