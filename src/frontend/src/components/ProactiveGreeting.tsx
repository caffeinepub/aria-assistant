/**
 * ProactiveGreeting.tsx -- Phase 117-B
 * Generates a rich, context-aware greeting from Melina once per session.
 * Reads time of day, personal profile, reminders, habits, schedule, and tone.
 */

import { useEffect, useRef } from "react";

interface Reminder {
  title: string;
  completed: boolean;
  dueTime: bigint;
}

interface PersonalProfile {
  name?: string;
  goals?: string[];
  interests?: string[];
  habits?: string[];
}

interface ScheduleEvent {
  title: string;
  startTime: string; // "HH:MM"
  date: string; // ISO date string YYYY-MM-DD
  category?: string;
}

interface HabitEntry {
  id: string;
  name: string;
  streak?: number;
  lastLogged?: number;
}

export type AssistantTone = "casual" | "humorous" | "friendly" | "formal";

interface UseProactiveGreetingOptions {
  userName: string;
  personalProfile: PersonalProfile | null;
  reminders: Reminder[];
  assistantTone: AssistantTone;
  historyLoading: boolean;
  onGreeting: (message: string) => void;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function getDayContext(): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = days[new Date().getDay()];
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  if (isWeekend) return `${day} -- a weekend`;
  if (new Date().getDay() === 1)
    return "Monday (the most feared day of the week)";
  if (new Date().getDay() === 5) return "Friday (finally)";
  return day;
}

function getLocalHabits(): HabitEntry[] {
  try {
    const raw = localStorage.getItem("aria_habits");
    return raw ? (JSON.parse(raw) as HabitEntry[]) : [];
  } catch {
    return [];
  }
}

function getLocalScheduleEventsToday(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem("aria_schedule_events");
    const all: ScheduleEvent[] = raw ? JSON.parse(raw) : [];
    const todayStr = new Date().toISOString().split("T")[0];
    return all.filter((e) => e.date === todayStr);
  } catch {
    return [];
  }
}

function buildGreeting(opts: {
  name: string;
  tone: AssistantTone;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayContext: string;
  upcomingReminders: Reminder[];
  todayEvents: ScheduleEvent[];
  habits: HabitEntry[];
  goals: string[];
}): string {
  const {
    name,
    tone,
    timeOfDay,
    dayContext,
    upcomingReminders,
    todayEvents,
    habits,
    goals,
  } = opts;
  const n = name && name !== "there" ? name : "";
  const nameTag = n ? ` ${n}` : "";
  const hour = new Date().getHours();

  // Build context fragments
  const reminderFragment =
    upcomingReminders.length > 0
      ? upcomingReminders.length === 1
        ? `you've got "${upcomingReminders[0].title}" coming up soon`
        : `you've got ${upcomingReminders.length} reminders lined up`
      : "";

  const eventFragment =
    todayEvents.length > 0
      ? `your schedule has ${todayEvents.length === 1 ? `"${todayEvents[0].title}"` : `${todayEvents.length} events`} today`
      : "";

  const habitFragment =
    habits.length > 0 ? `your ${habits[0].name} habit is waiting on you` : "";

  const goalFragment =
    goals.length > 0 ? `you mentioned wanting to ${goals[0]}` : "";

  // Pick the richest context line (priority: events > reminders > habits > goals)
  const contextLine =
    eventFragment || reminderFragment || habitFragment || goalFragment;

  // Time-of-day openers by tone
  const openers: Record<AssistantTone, Record<typeof timeOfDay, string>> = {
    casual: {
      morning: `Good morning${nameTag}. You actually showed up early -- I'm both surprised and impressed.`,
      afternoon: `Hey${nameTag}. Afternoon already. Time moves fast when you're ignoring your to-do list.`,
      evening: `Evening${nameTag}. The day's winding down -- let's see how much of it was actually productive.`,
      night: `You're up late${nameTag}. Either you're very dedicated or very avoidant. Possibly both.`,
    },
    humorous: {
      morning: `Rise and shine${nameTag}! The morning called. I told it you'd be available in 10 minutes.`,
      afternoon: `Afternoon${nameTag}! Peak productivity hours -- which means you're probably here procrastinating.`,
      evening: `${nameTag ? `${nameTag.trim()}, e` : "E"}vening has arrived. Your day review is generating... please hold.`,
      night: `${nameTag ? `${nameTag.trim()}, i` : "I"}t's late. Either you're a night owl or something went very wrong today. I'm here either way.`,
    },
    friendly: {
      morning: `Good morning${nameTag}! I hope you slept well -- it's a great day to make some progress.`,
      afternoon: `Hey${nameTag}! Hope your afternoon is going well. I'm here whenever you need me.`,
      evening: `Good evening${nameTag}! You've made it through most of the day -- let me know how I can help with the rest.`,
      night: `Hey${nameTag}, burning the midnight oil? I'm right here with you.`,
    },
    formal: {
      morning: `Good morning${nameTag}. I'm ready to assist you with today's tasks and priorities.`,
      afternoon: `Good afternoon${nameTag}. I'm available for your requests and planning needs.`,
      evening: `Good evening${nameTag}. I can assist you with end-of-day tasks or planning for tomorrow.`,
      night: `Good evening${nameTag}. Working late -- I'm available for anything you need.`,
    },
  };

  const opener = openers[tone][timeOfDay];

  // Day context add-ons (keep them optional and varied)
  const dayLines: Record<AssistantTone, string> = {
    casual: `It's ${dayContext}.`,
    humorous: `Today is ${dayContext}.`,
    friendly: `It's ${dayContext}!`,
    formal: `Today is ${dayContext}.`,
  };

  // Context follow-through
  const contextConnectors: Record<AssistantTone, string> = {
    casual: contextLine
      ? ` By the way, ${contextLine}.`
      : " No urgent alerts. You're free to just... exist for a moment.",
    humorous: contextLine
      ? ` Also -- ${contextLine}. I thought you should know.`
      : " Your task list appears suspiciously empty. Either you're ahead of schedule or haven't told me everything.",
    friendly: contextLine
      ? ` I noticed ${contextLine}.`
      : " Everything looks clear right now -- perfect time to get ahead!",
    formal: contextLine
      ? ` Note: ${contextLine}.`
      : " No pending items detected at this time.",
  };

  // Closing prompts
  const closers: Record<AssistantTone, string[]> = {
    casual: [
      " What's on your mind?",
      " What do you need from me today?",
      " What are we doing?",
      " Talk to me.",
    ],
    humorous: [
      " What can I solve for you today (or complicate -- I'm flexible)?",
      " What are we getting into today?",
      " How can I help -- or entertain you?",
    ],
    friendly: [
      " What would you like to work on today?",
      " How can I help you today?",
      " What's on your agenda?",
    ],
    formal: [
      " How may I assist you today?",
      " Please let me know how I can be of service.",
      " What are your priorities for today?",
    ],
  };

  const closerOptions = closers[tone];
  const closer = closerOptions[hour % closerOptions.length];

  // Only add day context if no specific context line (avoid overloading)
  const dayPart = contextLine ? "" : ` ${dayLines[tone]}`;

  return `${opener}${dayPart}${contextConnectors[tone]}${closer}`;
}

export function useProactiveGreeting({
  userName,
  personalProfile,
  reminders,
  assistantTone,
  historyLoading,
  onGreeting,
}: UseProactiveGreetingOptions) {
  const injectedRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally fires only when historyLoading changes; other deps are stable refs or one-time session logic
  useEffect(() => {
    if (injectedRef.current) return;
    if (historyLoading) return;

    // Only fire once per browser session
    const sessionKey = "aria_proactive_greeted";
    if (sessionStorage.getItem(sessionKey)) return;

    injectedRef.current = true;
    sessionStorage.setItem(sessionKey, "1");

    const timeOfDay = getTimeOfDay();
    const dayContext = getDayContext();
    const habits = getLocalHabits();
    const todayEvents = getLocalScheduleEventsToday();

    const now = Date.now();
    const next24hNs = BigInt(now + 24 * 60 * 60 * 1000) * 1_000_000n;
    const upcomingReminders = reminders
      .filter((r) => !r.completed && r.dueTime <= next24hNs)
      .sort((a, b) => (a.dueTime < b.dueTime ? -1 : 1))
      .slice(0, 3);

    const goals = personalProfile?.goals ?? [];

    const greeting = buildGreeting({
      name: userName,
      tone: assistantTone,
      timeOfDay,
      dayContext,
      upcomingReminders,
      todayEvents,
      habits,
      goals,
    });

    // Small delay so the UI settles before injecting
    const timer = setTimeout(() => {
      onGreeting(greeting);
    }, 800);

    return () => clearTimeout(timer);
  }, [historyLoading]);
}
