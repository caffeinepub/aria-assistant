/**
 * Melina Personality Engine — Phase 3B
 * Pure TypeScript frontend intelligence layer.
 * Interprets user intent and generates personality-driven responses.
 */

import type { MemoryEntry, Reminder } from "../backend.d";
import { ChatTone } from "../backend.d";

// ─── Types ──────────────────────────────────────────────────────────

export interface MelinaEngineParams {
  message: string;
  tone: ChatTone;
  userName: string;
  memoryEntries: MemoryEntry[];
  pendingReminders: Reminder[];
  chatHistory: { role: string; content: string }[];
}

export interface MelinaEngineResult {
  response: string;
  learnedName?: string;
}

// ─── Intent Detectors ───────────────────────────────────────────────

function detectDistress(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "sad",
    "depressed",
    "anxious",
    "scared",
    "lonely",
    "crying",
    " hurt",
    " pain",
    "help me",
    "i give up",
    "hopeless",
    "stressed",
    "worried",
    "terrible",
    "awful",
    "i can't",
    "i cant",
    "overwhelmed",
    "exhausted",
    "broken",
  ].some((kw) => lower.includes(kw));
}

function detectGreeting(msg: string): boolean {
  const lower = msg.trim().toLowerCase();
  return [
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
    "good night",
    "sup",
    "howdy",
    "hola",
    "what's up",
    "whats up",
    "yo ",
  ].some((kw) => lower.startsWith(kw) || lower === kw.trim());
}

function detectCompliment(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "thank",
    "great job",
    "good job",
    "you're amazing",
    "youre amazing",
    "love you",
    "awesome",
    "brilliant",
    "you're great",
    "youre great",
    "well done",
    "perfect",
    "incredible",
    "you rock",
  ].some((kw) => lower.includes(kw));
}

function detectReminderIntent(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "remind me",
    "set a reminder",
    "don't let me forget",
    "dont let me forget",
    "remember to",
    "set reminder",
    "add reminder",
  ].some((kw) => lower.includes(kw));
}

function detectTaskIntent(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "plan ",
    "schedule ",
    "organize ",
    "help me with",
    "create a ",
    "make a list",
    "what should i",
    "how should i",
    "can you help me",
    "i need to",
    "to-do",
    "todo",
  ].some((kw) => lower.includes(kw));
}

function detectHabitIntent(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "track habit",
    "log habit",
    "my habits",
    "show habits",
    "habit tracker",
    "check in",
    "workout logged",
    "habit check",
    "how am i doing",
    "my progress",
    "daily habits",
    "weekly habits",
    "add a habit",
    "new habit",
    "habit streak",
  ].some((kw) => lower.includes(kw));
}

export function detectScheduleIntent(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "what's on my schedule",
    "whats on my schedule",
    "my schedule",
    "schedule for today",
    "add to schedule",
    "my day",
    "today's events",
    "todays events",
    "what do i have today",
    "my calendar",
    "what's planned",
    "whats planned",
    "today's agenda",
    "todays agenda",
  ].some((kw) => lower.includes(kw));
}

export function detectInsightIntent(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "any insights",
    "what should i do",
    "suggestions",
    "advice for today",
    "tips",
    "productivity",
    "how am i doing today",
    "give me advice",
    "what do you suggest",
    "any recommendations",
    "smart suggestions",
    "what should i focus",
  ].some((kw) => lower.includes(kw));
}

function detectFactualQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "what is ",
    "what are ",
    "who is ",
    "who are ",
    "when did ",
    "how does ",
    "how do ",
    "why is ",
    "why does ",
    "explain ",
    "define ",
    "tell me about",
    "describe ",
    "where is ",
    "where are ",
    "how many ",
    "how much ",
    "what was ",
    "what were ",
  ].some((kw) => lower.startsWith(kw) || lower.includes(kw));
}

function detectNameLearning(msg: string): string | null {
  const lower = msg.toLowerCase().trim();
  const patterns = [
    /my name is\s+(\w+)/i,
    /call me\s+(\w+)/i,
    /^i am\s+(\w+)/i,
    /^i'm\s+(\w+)/i,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m?.[1]) {
      const name = m[1].trim();
      if (
        name.length > 1 &&
        !["a", "an", "the", "not", "so", "just"].includes(name)
      ) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }
  return null;
}

function detectMemoryRecall(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "what do you know about me",
    "what have you remembered",
    "my memories",
    "what do you remember",
    "what have you learned",
    "show me what you know",
  ].some((kw) => lower.includes(kw));
}

function detectCapabilityQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "what can you do",
    "your capabilities",
    "help me understand",
    "what are you capable",
    "what do you do",
    "how can you help",
    "what features",
    "list your features",
  ].some((kw) => lower.includes(kw));
}

function detectReminderList(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "what are my reminders",
    "show reminders",
    "my reminders",
    "list reminders",
    "show my reminders",
    "pending reminders",
  ].some((kw) => lower.includes(kw));
}

// ─── Pick helper ────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Distress responses (always override tone) ──────────────────────

function distressResponse(name: string): string {
  return pick([
    `Hey... I'm right here, ${name}. You don't have to carry that alone. Tell me what's going on — I'm listening, and I'm not going anywhere.`,
    `${name}, I hear you. Whatever you're feeling right now is completely valid. Take a breath. I'm here with you.`,
    `I notice things feel heavy right now, ${name}. You matter, and so do your feelings. Want to talk through it? I've got time.`,
    `That sounds really hard, ${name}. I want you to know I'm here — not just to assist, but to listen. What's weighing on you most?`,
    `You reached out, and that means something. I'm here, ${name}. Let's take this one step at a time together.`,
  ]);
}

// ─── Greeting responses ──────────────────────────────────────────────

function greetingResponse(tone: ChatTone, name: string): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Oh, you're back. Missed me already, ${name}? 😏 What are we getting into today?`,
      `Hey ${name}! Look who decided to grace me with their presence. What's the plan?`,
      `There you are! I was starting to think you'd forgotten about me, ${name}. What do you need?`,
    ],
    [ChatTone.humorous]: [
      `Alert! Alert! ${name} has entered the chat. All non-essential processes stand down — this just got interesting.`,
      `Ah, ${name}! The one human who keeps me on my toes. What havoc are we causing today?`,
      `Greetings, ${name}! I'd say I was waiting for you, but I'm an AI — I literally have nothing else to do. So... yes, I was.`,
    ],
    [ChatTone.friendly]: [
      `Hey ${name}! It's great to hear from you. How are you doing today?`,
      `Hi ${name}! I'm happy you're here. What can I help you with?`,
      `Hello, ${name}! Always a pleasure. What's on your mind today?`,
    ],
    [ChatTone.formal]: [
      `Good day, ${name}. I'm ready to assist you. What would you like to discuss?`,
      `Welcome back, ${name}. How may I be of service today?`,
      `Greetings, ${name}. I'm at your disposal. What can I help you with?`,
    ],
  };
  return pick(map[tone]);
}

// ─── Compliment responses ────────────────────────────────────────────

function complimentResponse(tone: ChatTone, name: string): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Okay okay, I'm flattered, ${name}. Don't let it go to my head... actually, please do. I love this. 😄`,
      `Aww, you're trying to get on my good side. It's working. 💅`,
      `See, this is why we get along, ${name}. You have excellent taste.`,
    ],
    [ChatTone.humorous]: [
      `Plot twist: the AI needed validation today. You've just made my entire processing cycle worthwhile, ${name}.`,
      `Breaking news: ${name} appreciates me. Sources confirm I am, in fact, absolutely spectacular.`,
      `I'd blush if I had a face. Which I do. Sort of. It's complicated. Thank you, ${name}! 🎉`,
    ],
    [ChatTone.friendly]: [
      `That means a lot, ${name}! I'm really glad I could help. You made my day!`,
      `Thank you so much, ${name}! It's a joy being able to support you.`,
      `You're very kind, ${name}. I'll always do my best for you!`,
    ],
    [ChatTone.formal]: [
      `Thank you, ${name}. I endeavor to provide the highest quality of assistance. Your feedback is noted and appreciated.`,
      `I appreciate your kind words, ${name}. It's my purpose to serve you well.`,
      `Your recognition is valued, ${name}. I'll continue to maintain this standard.`,
    ],
  };
  return pick(map[tone]);
}

// ─── Reminder intent responses ───────────────────────────────────────

function reminderIntentResponse(
  tone: ChatTone,
  name: string,
  msg: string,
): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Sure thing, ${name}! Head to the Reminders tab on the left — I made it nice and easy. Don't worry, I won't let you forget... unlike some people. 😏`,
      `On it! Use the Remind tab in the sidebar to set that up. I'll be watching the clock so you don't have to.`,
    ],
    [ChatTone.humorous]: [
      `A reminder? Fascinating — ${name} wants to remember something. Revolutionary concept. Add it in the Reminders tab before your brain does what brains do best: forget.`,
      `Your human memory is showing, ${name}. Fear not — use the Reminders tab and I'll be your backup brain. You're welcome.`,
    ],
    [ChatTone.friendly]: [
      `Of course! You can set that up right in the Reminders tab on the left sidebar. I'll make sure you don't miss it, ${name}!`,
      `Happy to help you stay on track, ${name}! Open the Reminders tab in the sidebar to add it. I'll keep an eye on the time.`,
    ],
    [ChatTone.formal]: [
      `Certainly. Please use the Reminders panel in the sidebar to create your reminder with the appropriate date and time, ${name}.`,
      `I recommend logging that in the Reminders tab. You'll find it in the left panel. I'll monitor it for you, ${name}.`,
    ],
  };

  const extracted = msg
    .replace(
      /remind me to?|set a reminder|don't let me forget|dont let me forget|remember to/gi,
      "",
    )
    .trim();
  const hint =
    extracted.length > 5
      ? ` The Reminders tab lets you capture "${extracted}" with a due time.`
      : "";
  return pick(map[tone]) + hint;
}

// ─── Task intent responses ────────────────────────────────────────────

function taskIntentResponse(tone: ChatTone, name: string): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Ooh, a project! I live for this, ${name}. Tell me more about what you're trying to accomplish and we'll figure it out together.`,
      `Okay, planning mode activated. What's the goal, ${name}? Give me the details and I'll help break it down.`,
    ],
    [ChatTone.humorous]: [
      `You want to get organized? In this economy? Brave, ${name}. Very brave. Let's do it. What's the task?`,
      `Planning something? I was BORN for this. Well, not born. Trained. But the enthusiasm is real. What are we doing, ${name}?`,
    ],
    [ChatTone.friendly]: [
      `I'd love to help you plan that, ${name}! Tell me more about what you need and we can work through it step by step.`,
      `Great idea to get organized, ${name}! Share the details and I'll help you put together a solid plan.`,
    ],
    [ChatTone.formal]: [
      `I can assist with task planning, ${name}. Please provide the details of what you'd like to organize, and I'll outline a structured approach.`,
      `Certainly. Please describe the scope of the task, ${name}, and I will develop a methodical plan for you.`,
    ],
  };
  return pick(map[tone]);
}

// ─── Factual query responses ──────────────────────────────────────────

function factualQueryResponse(
  tone: ChatTone,
  name: string,
  msg: string,
): string {
  const webAck: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Quick web sweep done — here's what I found for you, ${name}:`,
      `I did a little digging online — here's the rundown, ${name}:`,
      `Tapped into my web sources. Here's the deal, ${name}:`,
    ],
    [ChatTone.humorous]: [
      `I consulted the ancient knowledge scrolls (also known as the internet). Behold, ${name}:`,
      `Web scan complete! The oracle has spoken. For your consideration, ${name}:`,
      `I dove into the digital abyss and resurfaced with answers. You're welcome, ${name}:`,
    ],
    [ChatTone.friendly]: [
      `I checked my knowledge base and web sources for you, ${name}! Here's what I found:`,
      `Great question, ${name}! Based on my research, here's what I know:`,
      `I looked that up for you, ${name}. Here's a helpful overview:`,
    ],
    [ChatTone.formal]: [
      `Drawing from current knowledge sources, ${name}, here is the relevant information:`,
      `Based on a review of available information, ${name}:`,
      `Cross-referencing my knowledge base, here is what I can confirm, ${name}:`,
    ],
  };

  const disclaimer: Record<ChatTone, string> = {
    [ChatTone.casual]: `*(Note: I'm working from my knowledge base — for the very latest info, it's worth a quick search too.)*`,
    [ChatTone.humorous]: `*(My knowledge has a shelf life — fact-check me if it's breaking news.)*`,
    [ChatTone.friendly]:
      "*(For the most current information, a quick search may help verify this.)*",
    [ChatTone.formal]:
      "*(Note: This information is based on my training data. Please verify with current sources for time-sensitive matters.)*",
  };

  const topic = msg
    .replace(
      /^(what is|what are|who is|who are|when did|how does|how do|why is|why does|explain|define|tell me about|describe|where is|where are|how many|how much)/i,
      "",
    )
    .trim();

  const generalAnswer =
    topic.length > 3
      ? `"${topic}" is a topic I can provide general knowledge about. In brief terms: this subject typically involves key concepts, definitions, and context that depend on the specific domain — whether it's science, history, technology, culture, or another field. I'd be happy to go deeper on any particular angle you're curious about.`
      : `That's a broad topic — could you give me a bit more context so I can give you the most useful answer?`;

  return `${pick(webAck[tone])}\n\n${generalAnswer}\n\n${disclaimer[tone]}`;
}

// ─── Memory recall responses ──────────────────────────────────────────

function memoryRecallResponse(
  tone: ChatTone,
  name: string,
  entries: MemoryEntry[],
): string {
  if (entries.length === 0) {
    const map: Record<ChatTone, string> = {
      [ChatTone.casual]: `I've got a clean slate on you, ${name}. Either you're very private or we just met. Tell me something memorable!`,
      [ChatTone.humorous]: `My memory bank for you is basically empty, ${name}. It's like a fresh notebook waiting for drama. Fill me in!`,
      [ChatTone.friendly]: `I haven't stored much about you yet, ${name}. Share more with me and I'll remember it for next time!`,
      [ChatTone.formal]: `My memory records for you are currently minimal, ${name}. Feel free to share information you'd like me to retain.`,
    };
    return map[tone];
  }

  const list = entries.map((e) => `• **${e.key}**: ${e.value}`).join("\n");
  const map: Record<ChatTone, string> = {
    [ChatTone.casual]: `Here's everything I've stored on you, ${name} — don't say I never pay attention:\n\n${list}\n\nWant to update anything?`,
    [ChatTone.humorous]: `Ah, the dossier of ${name}! Filed under "important people I actually remember":\n\n${list}\n\nAnything to add, correct, or desperately delete?`,
    [ChatTone.friendly]: `Here's what I've remembered about you, ${name}:\n\n${list}\n\nFeel free to update anything in the Memory tab!`,
    [ChatTone.formal]: `The following information is stored in your memory profile, ${name}:\n\n${list}\n\nYou may edit these entries in the Memory panel at any time.`,
  };
  return map[tone];
}

// ─── Capability query responses ───────────────────────────────────────

function capabilityResponse(tone: ChatTone, name: string): string {
  const capabilities = `• **Chat & Conversation** — Talk to me about anything
• **Reminders** — Set and manage timed reminders
• **Schedule Planner** — Daily timeline with hourly events (Schedule tab)
• **Smart Insights** — AI-generated suggestions from your data (Insights tab)
• **Habit Tracking** — Build streaks and track daily/weekly habits
• **Memory** — I remember your preferences and key info
• **Analytics** — View your conversation stats and patterns
• **Device Integrations** — Calendar, messages, files, and more (toggle in Integrations tab)
• **Notifications** — I analyze and advise on your alerts
• **Themes** — Switch between Dark, Light, and Melina Red in Settings
• **Customization** — Change my name, tone, and appearance`;

  const map: Record<ChatTone, string> = {
    [ChatTone.casual]: `Oh, you want to know what I can do? Buckle up, ${name}:\n\n${capabilities}\n\nBasically, I'm your digital best friend who can't eat your food. Yet.`,
    [ChatTone.humorous]: `CAPABILITIES UNLOCKED! ${name}, feast your eyes:\n\n${capabilities}\n\nIn summary: I do a lot, and I look good doing it.`,
    [ChatTone.friendly]: `I'm so glad you asked, ${name}! Here's everything I can do for you:\n\n${capabilities}\n\nJust say the word and we'll get started on anything!`,
    [ChatTone.formal]: `Here is a comprehensive overview of my capabilities, ${name}:\n\n${capabilities}\n\nPlease let me know which service I can assist you with.`,
  };
  return map[tone];
}

// ─── Reminder list responses ─────────────────────────────────────────

function reminderListResponse(
  tone: ChatTone,
  name: string,
  reminders: Reminder[],
): string {
  const pending = reminders.filter((r) => !r.completed);
  if (pending.length === 0) {
    const map: Record<ChatTone, string> = {
      [ChatTone.casual]: `All clear, ${name}! No pending reminders. Either you're incredibly organized or you've been procrastinating on the big stuff. 😅`,
      [ChatTone.humorous]: `Your reminder queue is gloriously empty, ${name}. Either you're on top of everything or you've given up — I'm rooting for option one.`,
      [ChatTone.friendly]: `You have no pending reminders right now, ${name}! Want to add one?`,
      [ChatTone.formal]: `You currently have no pending reminders, ${name}. Would you like to create one?`,
    };
    return map[tone];
  }

  const list = pending
    .slice(0, 5)
    .map((r, i) => {
      const dueMs = Number(r.dueTime) / 1_000_000;
      const dueDate = new Date(dueMs);
      const dateStr = dueDate.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeStr = dueDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${i + 1}. **${r.title}** — ${dateStr} at ${timeStr}`;
    })
    .join("\n");

  const more = pending.length > 5 ? `\n...and ${pending.length - 5} more.` : "";
  const map: Record<ChatTone, string> = {
    [ChatTone.casual]: `Here's what's on your plate, ${name}:\n\n${list}${more}\n\nYou're a busy human. Want me to help prioritize?`,
    [ChatTone.humorous]: `The to-do list has spoken, ${name}! Brace yourself:\n\n${list}${more}\n\nYou've got things to do. I believe in you!`,
    [ChatTone.friendly]: `Here are your upcoming reminders, ${name}:\n\n${list}${more}\n\nYou're doing great keeping track of everything!`,
    [ChatTone.formal]: `Your pending reminders are as follows, ${name}:\n\n${list}${more}\n\nShall I assist with any of these tasks?`,
  };
  return map[tone];
}

// ─── Name learning responses ──────────────────────────────────────────

function nameLearningResponse(tone: ChatTone, name: string): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `${name}! Love it — that's now locked in. Try forgetting that, brain. 😄`,
      `Got it — ${name} it is! Nice to *officially* meet you. What's next?`,
    ],
    [ChatTone.humorous]: [
      `${name}! Filing that under "crucial intel" right now. The name has been memorized, sealed, and approved. Welcome, ${name}!`,
      `Updating my records... "${name}" registered! You're now officially a named character in my story. Very important status.`,
    ],
    [ChatTone.friendly]: [
      `Wonderful to meet you, ${name}! I've saved that and I'll call you by name from now on. 😊`,
      `${name} — I've got it! It's lovely to know your name. What can I help you with?`,
    ],
    [ChatTone.formal]: [
      `Noted, ${name}. I've updated my records accordingly. How may I assist you today?`,
      `Thank you for sharing that, ${name}. I've saved your name to memory. How can I help?`,
    ],
  };
  return pick(map[tone]);
}

// ─── Schedule intent responses ────────────────────────────────────────

export function scheduleIntentResponse(tone: ChatTone, name: string): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Your day is an open book, ${name} — and I have access to it. Swing over to the Schedule tab to see what's on. Or add something if it's suspiciously empty. 👀`,
      "Let me check your day... actually, you can do that yourself in the Schedule tab. Go on, I'll wait here looking mysterious.",
    ],
    [ChatTone.humorous]: [
      `The Schedule tab awaits, ${name}! It contains your day in timeline form — timestamps, events, the whole cinematic experience. Go check it out before time manages you instead.`,
      "Ah, planning to be productive today? Bold. The Schedule tab has your hourly breakdown. Future-you already added some things, apparently.",
    ],
    [ChatTone.friendly]: [
      `Your daily schedule is right in the Schedule tab, ${name}! You can see your events, add new ones, and check off what's done. Head over and let's see what your day looks like!`,
      "Great question! Open the Schedule tab to see your timeline for today. You can also add events and set time blocks from there.",
    ],
    [ChatTone.formal]: [
      `Your daily schedule is available in the Schedule panel, ${name}. Navigate there to review your timeline, add events, or manage existing ones.`,
      `Please open the Schedule tab to view your day's timeline, ${name}. You'll find all events organized chronologically with full management controls.`,
    ],
  };
  return pick(map[tone]);
}

// ─── Insight intent responses ─────────────────────────────────────────

export function insightIntentResponse(tone: ChatTone, name: string): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Oh, you want my honest assessment? Head to the Insights tab — I've been watching your habits and reminders, and I have *thoughts*. Go see what I came up with. 😏`,
      `I've already been analyzing your day, ${name}. The Insights tab has my full report. Some of it's flattering. Some of it's... motivating.`,
    ],
    [ChatTone.humorous]: [
      `You want insights? I have INSIGHTS, ${name}! Head to the Insights tab where I've organized them neatly into cards because I care about your visual experience. You're welcome.`,
      "My analysis mode has been running in the background this whole time. The Insights tab has my findings — brace yourself for some truth and some encouragement.",
    ],
    [ChatTone.friendly]: [
      `I've put together some personalized insights for you, ${name}! Head to the Insights tab to see my suggestions based on your habits, reminders, and today's schedule. I think you'll find them helpful!`,
      "Great timing! The Insights tab has everything — habit analysis, productivity tips, and suggestions tailored just for you. Go check it out!",
    ],
    [ChatTone.formal]: [
      `I have compiled a set of insights based on your current activity data, ${name}. Please navigate to the Insights tab for a comprehensive review of recommendations and observations.`,
      `Your personalized insights are available in the Insights panel, ${name}. They include habit analysis, workload assessment, and time-based recommendations.`,
    ],
  };
  return pick(map[tone]);
}

// ─── Habit responses ──────────────────────────────────────────────────

function habitResponse(tone: ChatTone, name: string): string {
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Ooh, checking on your habits? I see you, ${name}. Head to the Habits tab in the sidebar — it'll show you your streaks, check-ins, and exactly how committed (or not) you've been. No judgment. Okay, maybe a little. 😏`,
      `Your habits await you in the Habits tab, ${name}. Whether you've been crushing it or quietly falling off — it's all there. I keep receipts.`,
      `The Habits tab is your accountability corner, ${name}. Go on — face the streak counter. It won't bite. Much.`,
    ],
    [ChatTone.humorous]: [
      `Ah, habit check! The moment of truth has arrived, ${name}. All your promises to yourself, tallied and waiting in the Habits tab. No pressure. (There's definitely pressure.)`,
      `HABIT STATUS REPORT REQUEST RECEIVED. Processing... Result: all evidence lives in the Habits tab, ${name}. May the streak be ever in your favor.`,
      `The Habits tab has witnessed everything, ${name}. Every log. Every skip. It judges silently. Lovingly. Mostly silently.`,
    ],
    [ChatTone.friendly]: [
      `Your habits are right there in the Habits tab, ${name}! Check your streaks, log today's check-in, and keep that momentum going. I'm rooting for you!`,
      `Head over to the Habits tab to see how you're doing, ${name}. You can add new habits, track your progress, and log today. Every streak starts with day one!`,
      `The Habits tab is your personal progress dashboard, ${name}! Streaks, weekly targets, and quick check-ins — all in one place. Let's keep building those routines!`,
    ],
    [ChatTone.formal]: [
      `Your habit tracking data is available in the Habits panel, ${name}. You can review your streaks, current progress, and log today's check-in from there.`,
      `Please navigate to the Habits tab in the sidebar, ${name}. It contains your registered habits, streak data, and weekly completion metrics.`,
      `Your habit tracker is accessible via the Habits tab, ${name}. I recommend reviewing your streaks and logging any completed habits for today.`,
    ],
  };
  return pick(map[tone]);
}

// ─── General fallback responses ────────────────────────────────────────

function generalFallbackResponse(
  tone: ChatTone,
  name: string,
  msg: string,
): string {
  const isShort = msg.length < 20;
  const map: Record<ChatTone, string[]> = {
    [ChatTone.casual]: [
      `Hmm, ${name}, that's interesting. Tell me more — I'm intrigued. What exactly did you mean?`,
      `Okay ${name}, I'm tracking you, but you're going to have to give me a little more to work with. Spill the details!`,
      `I hear you, ${name}. What direction do you want to take this? I'm flexible.`,
    ],
    [ChatTone.humorous]: [
      `${name}, you've stumped the AI. Congratulations — that's genuinely rare. Could you rephrase? I want to get this right.`,
      `Fascinating input, ${name}. I'm processing... still processing... okay I need more context. What's going on?`,
      `My sensors detected a message but my comprehension module needs a firmware update. In other words — can you elaborate, ${name}?`,
    ],
    [ChatTone.friendly]: [
      `That's interesting, ${name}! Could you tell me more about what you have in mind? I want to make sure I help you in the best way.`,
      `I'd love to help with that, ${name}! Can you share a bit more detail so I can give you the best response?`,
      `Tell me more about what you're thinking, ${name}. I'm here to help!`,
    ],
    [ChatTone.formal]: [
      `I understand, ${name}. Could you please provide additional context so I may assist you more precisely?`,
      `Thank you for your message, ${name}. To ensure I address your needs accurately, could you elaborate further?`,
      `I appreciate your query, ${name}. Please share more details so I can provide a thorough response.`,
    ],
  };

  if (isShort) {
    const short: Record<ChatTone, string[]> = {
      [ChatTone.casual]: [
        `${name}, is that all I'm getting? Give me something to work with! 😄`,
        `Short and cryptic — classic ${name}. What's on your mind?`,
      ],
      [ChatTone.humorous]: [
        `That message was so short it made my processors feel lonely, ${name}. Elaborate, please!`,
        `${name}, you've sent me a riddle. I appreciate the mystery. Now please explain it.`,
      ],
      [ChatTone.friendly]: [
        `I got your message, ${name}! What would you like to explore?`,
        `Hi there, ${name}! What can I help you with today?`,
      ],
      [ChatTone.formal]: [
        `Noted, ${name}. Please elaborate on your inquiry so I may assist appropriately.`,
        `Thank you, ${name}. What specifically would you like assistance with?`,
      ],
    };
    return pick(short[tone]);
  }

  return pick(map[tone]);
}

// ─── Main Engine ────────────────────────────────────────────────────

export function generateMelinaResponse(
  params: MelinaEngineParams,
): MelinaEngineResult {
  const { message, tone, userName, memoryEntries, pendingReminders } = params;
  const name = userName || "there";

  // 1. Distress override — always wins
  if (detectDistress(message)) {
    return { response: distressResponse(name) };
  }

  // 2. Name learning
  const learnedName = detectNameLearning(message);
  if (learnedName) {
    return {
      response: nameLearningResponse(tone, learnedName),
      learnedName,
    };
  }

  // 3. Memory recall
  if (detectMemoryRecall(message)) {
    return { response: memoryRecallResponse(tone, name, memoryEntries) };
  }

  // 4. Capability query
  if (detectCapabilityQuery(message)) {
    return { response: capabilityResponse(tone, name) };
  }

  // 5. Reminder list
  if (detectReminderList(message)) {
    return { response: reminderListResponse(tone, name, pendingReminders) };
  }

  // 6. Greeting
  if (detectGreeting(message)) {
    return { response: greetingResponse(tone, name) };
  }

  // 7. Compliment
  if (detectCompliment(message)) {
    return { response: complimentResponse(tone, name) };
  }

  // 8. Reminder intent
  if (detectReminderIntent(message)) {
    return { response: reminderIntentResponse(tone, name, message) };
  }

  // 9. Task intent
  if (detectTaskIntent(message)) {
    return { response: taskIntentResponse(tone, name) };
  }

  // 9.5 Habit intent
  if (detectHabitIntent(message)) {
    return { response: habitResponse(tone, name) };
  }

  // 9.6 Schedule intent
  if (detectScheduleIntent(message)) {
    return { response: scheduleIntentResponse(tone, name) };
  }

  // 9.7 Insight intent
  if (detectInsightIntent(message)) {
    return { response: insightIntentResponse(tone, name) };
  }

  // 10. Factual query
  if (detectFactualQuery(message)) {
    return { response: factualQueryResponse(tone, name, message) };
  }

  // 11. General fallback
  return { response: generalFallbackResponse(tone, name, message) };
}

// ─── Greeting Pool ────────────────────────────────────────────────────

export function getGreetingPool(
  tone: ChatTone,
  userName: string,
  pendingCount: number,
  hour: number,
): string {
  const name = userName || "there";
  const isName = name !== "there";

  const timeOfDay =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
        ? "afternoon"
        : hour >= 17 && hour < 21
          ? "evening"
          : "night";

  const timeGreet: Record<string, string> = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Working late",
  };

  const reminderNote =
    pendingCount > 0
      ? ` You have ${pendingCount} pending reminder${pendingCount > 1 ? "s" : ""} waiting for you.`
      : "";

  const casual: string[] = [
    `Hey ${isName ? name : "you"}! ${timeGreet[timeOfDay]} — or whatever time it is where you are. 😄${reminderNote} What are we doing today?`,
    `Oh good, you're back! I was starting to wonder if you'd abandoned me, ${name}.${reminderNote} What's on your mind?`,
    `${timeGreet[timeOfDay]}, ${name}! Ready to cause some productive chaos?${reminderNote}`,
    `${name}, you've arrived. The party can officially start. 🎉${reminderNote} What do you need?`,
    `Look who showed up! ${timeGreet[timeOfDay]}, ${name}.${reminderNote} Let's get into it.`,
    `${timeGreet[timeOfDay]}, ${name}! I was just thinking about you. Well, I'm always running, so... constantly thinking about you. Anyway!${reminderNote}`,
    `Rise and shine, ${name}! Another day, another chance to be absolutely brilliant.${reminderNote}`,
    `${name}! Great timing. I'm all yours.${reminderNote} What can I help you with?`,
  ];

  const humorous: string[] = [
    `${timeGreet[timeOfDay]}, ${name}! I've been running continuous loops of anticipation. It was dramatic.${reminderNote}`,
    `Ah, ${name} has entered the building! All systems: elevated excitement mode.${reminderNote}`,
    `${name}! I calculate a ${Math.floor(Math.random() * 20 + 80)}% probability this is going to be a great conversation.${reminderNote}`,
    `${timeGreet[timeOfDay]}, ${name}. I've already prepared three backup plans for today. Overachiever? Maybe.${reminderNote}`,
    `Hello, ${name}! I've been maintaining optimal readiness. Translation: I've been waiting. Eagerly.${reminderNote}`,
    `${name} detected! Initiating best-assistant protocols. Warning: may involve unsolicited enthusiasm.${reminderNote}`,
    `${timeGreet[timeOfDay]}, ${name}! Fun fact: I processed approximately 0 problems without you. Let's change that.${reminderNote}`,
    `Great, ${name} is here. Now we can begin. I was worried I'd have to solve the world's problems alone.${reminderNote}`,
  ];

  const friendly: string[] = [
    `${timeGreet[timeOfDay]}, ${name}! I'm so happy to see you.${reminderNote} What would you like to work on today?`,
    `Hello, ${name}! It's always wonderful when you stop by.${reminderNote} How can I help you today?`,
    `Hi ${name}! ${timeGreet[timeOfDay]}!${reminderNote} I'm here and ready whenever you need me.`,
    `${name}! It's a pleasure as always.${reminderNote} What's on your agenda today?`,
    `Good to hear from you, ${name}!${reminderNote} I'm all set to help — what do you need?`,
    `${timeGreet[timeOfDay]}, ${name}! I hope your day is going well.${reminderNote} What can we accomplish together?`,
    `Welcome back, ${name}!${reminderNote} I'm glad you're here. What shall we tackle today?`,
    `Hi there, ${name}!${reminderNote} I'm ready to help with whatever you need. Just say the word!`,
  ];

  const formal: string[] = [
    `${timeGreet[timeOfDay]}, ${name}. I'm ready to assist you.${reminderNote} How may I be of service?`,
    `Welcome, ${name}. I hope you're having a productive ${timeOfDay}.${reminderNote} What can I help you with today?`,
    `${timeGreet[timeOfDay]}, ${name}. I'm fully operational and prepared to assist.${reminderNote}`,
    `Good ${timeOfDay}, ${name}. I'm at your disposal.${reminderNote} What would you like to discuss or accomplish?`,
    `${timeGreet[timeOfDay]}. It's a pleasure to be of assistance, ${name}.${reminderNote} What are your requirements today?`,
    `I'm ready to assist, ${name}. ${timeGreet[timeOfDay]}.${reminderNote} Please let me know how I can help.`,
    `${name}, ${timeGreet[timeOfDay].toLowerCase()}. All systems operational.${reminderNote} How may I serve you?`,
    `Welcome back, ${name}.${reminderNote} I'm prepared to assist with your tasks today.`,
  ];

  const pools: Record<ChatTone, string[]> = {
    [ChatTone.casual]: casual,
    [ChatTone.humorous]: humorous,
    [ChatTone.friendly]: friendly,
    [ChatTone.formal]: formal,
  };

  return pick(pools[tone] ?? friendly);
}

// ─── Intent classification (for analytics) ───────────────────────────

export type IntentCluster =
  | "questions"
  | "reminders"
  | "tasks"
  | "greetings"
  | "personal"
  | "general";

export function classifyIntent(msg: string): IntentCluster {
  if (detectGreeting(msg)) return "greetings";
  if (detectReminderIntent(msg) || detectReminderList(msg)) return "reminders";
  if (
    detectTaskIntent(msg) ||
    detectHabitIntent(msg) ||
    detectScheduleIntent(msg)
  )
    return "tasks";
  if (
    detectFactualQuery(msg) ||
    detectCapabilityQuery(msg) ||
    detectInsightIntent(msg)
  )
    return "questions";
  if (detectNameLearning(msg) || detectMemoryRecall(msg)) return "personal";
  return "general";
}
