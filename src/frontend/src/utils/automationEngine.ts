/**
 * Automation Engine — Phase 6D-2
 * Executes automation rules against live app state.
 */

import type { Automation } from "../components/TaskAutomation";

const LOG_KEY = "melina_automation_log";
const MAX_LOG_ENTRIES = 100;

export interface AutomationLogEntry {
  id: string;
  automationId: string;
  automationName: string;
  triggerType: string;
  actionType: string;
  status: "success" | "failed" | "skipped";
  resultMessage: string;
  timestamp: number;
}

export function loadAutomationLog(): AutomationLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as AutomationLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveAutomationLog(entries: AutomationLogEntry[]): void {
  const pruned = entries.slice(-MAX_LOG_ENTRIES);
  localStorage.setItem(LOG_KEY, JSON.stringify(pruned));
}

export function clearAutomationLog(): void {
  localStorage.removeItem(LOG_KEY);
}

function appendLog(entry: Omit<AutomationLogEntry, "id" | "timestamp">) {
  const entries = loadAutomationLog();
  entries.push({
    ...entry,
    id: Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
  });
  saveAutomationLog(entries);
}

// Dispatches a message as Melina into the chat via CustomEvent
function injectMelinaMessage(content: string) {
  window.dispatchEvent(
    new CustomEvent("melina:external-message", { detail: { content } }),
  );
}

// Speak text aloud via Web Speech API
function speakText(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 1.05;
  utt.lang = "en-US";
  window.speechSynthesis.speak(utt);
}

// Log a habit check-in by matching habit name (case-insensitive)
function logHabitByName(nameHint: string): boolean {
  try {
    interface HabitObj {
      id: string;
      name: string;
    }
    interface HabitLogObj {
      id: string;
      habitId: string;
      completedAt: number;
    }

    const habits: HabitObj[] = JSON.parse(
      localStorage.getItem("aria_habits") ?? "[]",
    );
    const logs: HabitLogObj[] = JSON.parse(
      localStorage.getItem("aria_habit_logs") ?? "[]",
    );

    const needle = nameHint.toLowerCase().trim();
    const habit = habits.find((h) => h.name.toLowerCase().includes(needle));

    if (!habit) return false;

    // Check if already logged today
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const alreadyLogged = logs.some((l) => {
      const d = new Date(l.completedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return l.habitId === habit.id && key === todayKey;
    });

    if (alreadyLogged) return false;

    logs.push({
      id: Math.random().toString(36).slice(2, 10),
      habitId: habit.id,
      completedAt: Date.now(),
    });
    localStorage.setItem("aria_habit_logs", JSON.stringify(logs));

    // Dispatch storage event for HabitsPanel to re-read
    window.dispatchEvent(
      new StorageEvent("storage", { key: "aria_habit_logs" }),
    );
    return true;
  } catch {
    return false;
  }
}

// Navigate to Insights tab via CustomEvent
function navigateToInsights() {
  window.dispatchEvent(
    new CustomEvent("melina:navigate-tab", { detail: { tab: "insights" } }),
  );
}

export interface RunAutomationOptions {
  automation: Automation;
  /** createReminder backend function */
  createReminder?: (
    title: string,
    note: string,
    dueTime: bigint,
  ) => Promise<unknown>;
}

/**
 * Run a single automation rule and log the result.
 * Returns the log entry created.
 */
export async function runAutomation(
  automation: Automation,
  createReminder?: (
    title: string,
    note: string,
    dueTime: bigint,
  ) => Promise<unknown>,
): Promise<AutomationLogEntry> {
  let status: AutomationLogEntry["status"] = "success";
  let resultMessage = "";

  try {
    switch (automation.actionType) {
      case "send_message": {
        const msg = automation.action || `Automation: ${automation.name}`;
        injectMelinaMessage(msg);
        resultMessage = `Injected message: "${msg.slice(0, 60)}${msg.length > 60 ? "…" : ""}"`;
        break;
      }

      case "log_habit": {
        const nameHint =
          automation.action || automation.trigger || automation.name;
        const logged = logHabitByName(nameHint);
        if (logged) {
          resultMessage = `Habit logged: "${nameHint}"`;
          injectMelinaMessage(
            `I've logged your habit "${nameHint}" for today. Keep it up! ✓`,
          );
        } else {
          status = "skipped";
          resultMessage = `Habit "${nameHint}" not found or already logged today`;
        }
        break;
      }

      case "create_reminder": {
        if (!createReminder) {
          status = "failed";
          resultMessage = "Backend not available";
          break;
        }
        const title = automation.action || automation.name;
        const dueTime = BigInt(Date.now() + 24 * 60 * 60 * 1000) * 1_000_000n;
        await createReminder(title, "", dueTime);
        resultMessage = `Created reminder: "${title}" (due in 24h)`;
        injectMelinaMessage(
          `I've created a reminder for "${title}" — due tomorrow. I've added it to your Reminders tab.`,
        );
        break;
      }

      case "show_insight": {
        navigateToInsights();
        injectMelinaMessage(
          "I've opened your Insights panel. Take a look at what I've put together for you.",
        );
        resultMessage = "Navigated to Insights tab";
        break;
      }

      case "play_tts": {
        const text = automation.action || automation.name;
        speakText(text);
        resultMessage = `Speaking: "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`;
        break;
      }

      default:
        status = "skipped";
        resultMessage = "Unknown action type";
    }
  } catch (err) {
    status = "failed";
    resultMessage = err instanceof Error ? err.message : "Unknown error";
  }

  const entry: Omit<AutomationLogEntry, "id" | "timestamp"> = {
    automationId: automation.id,
    automationName: automation.name,
    triggerType: automation.triggerType,
    actionType: automation.actionType,
    status,
    resultMessage,
  };

  appendLog(entry);

  return {
    ...entry,
    id: Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
  };
}

/**
 * Fire all enabled session_start automations.
 * Uses sessionStorage to ensure they only fire once per session.
 */
export async function fireSessionStartAutomations(
  automations: Automation[],
  createReminder?: (
    title: string,
    note: string,
    dueTime: bigint,
  ) => Promise<unknown>,
): Promise<void> {
  const SESSION_KEY = "melina_session_automations_fired";
  if (sessionStorage.getItem(SESSION_KEY)) return;
  sessionStorage.setItem(SESSION_KEY, "1");

  const sessionOnes = automations.filter(
    (a) => a.enabled && a.triggerType === "session_start",
  );

  for (const a of sessionOnes) {
    // Small stagger to avoid flooding the chat
    await new Promise((r) => setTimeout(r, 600));
    await runAutomation(a, createReminder);
  }
}
