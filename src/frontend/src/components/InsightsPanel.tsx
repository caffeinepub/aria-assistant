/**
 * InsightsPanel — Phase 5
 * Smart suggestions panel driven by habits, reminders, schedule, and activity data.
 * Melina's voice throughout.
 */

import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Flame,
  Info,
  Lightbulb,
  Sparkles,
  Sun,
  Sunset,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import {
  useActivityStats,
  useReminders,
  useScheduleEventsByDate,
} from "../hooks/useQueries";

// ─── Types ─────────────────────────────────────────────────────────

type InsightType = "warning" | "tip" | "positive" | "info";

interface InsightCard {
  id: string;
  type: InsightType;
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; tab: string };
}

// ─── Habit types (mirrors HabitsPanel localStorage) ──────────────────

type HabitCategory =
  | "health"
  | "productivity"
  | "learning"
  | "fitness"
  | "other";
type HabitFrequency = "daily" | "weekly";

interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  createdAt: number;
}

interface HabitLog {
  id: string;
  habitId: string;
  completedAt: number;
}

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem("aria_habits");
    return raw ? (JSON.parse(raw) as Habit[]) : [];
  } catch {
    return [];
  }
}

function loadLogs(): HabitLog[] {
  try {
    const raw = localStorage.getItem("aria_habit_logs");
    return raw ? (JSON.parse(raw) as HabitLog[]) : [];
  } catch {
    return [];
  }
}

function getDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isLoggedToday(habitId: string, logs: HabitLog[]): boolean {
  const todayKey = getDateKey(Date.now());
  return logs.some(
    (l) => l.habitId === habitId && getDateKey(l.completedAt) === todayKey,
  );
}

function computeStreak(habit: Habit, logs: HabitLog[]): number {
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  if (habitLogs.length === 0) return 0;

  if (habit.frequency === "daily") {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = getDateKey(checkDate.getTime());
      const logged = habitLogs.some((l) => getDateKey(l.completedAt) === key);
      if (logged) {
        streak++;
      } else if (i === 0) {
        // Today not yet logged
      } else {
        break;
      }
    }
    return streak;
  }

  let streak = 0;
  const todayWeekly = new Date();
  for (let i = 0; i < 52; i++) {
    const checkDate = new Date(
      todayWeekly.getTime() - i * 7 * 24 * 60 * 60 * 1000,
    );
    const d = checkDate;
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor(
      (d.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const key = `${d.getFullYear()}-W${week}`;
    const logged = habitLogs.some((l) => {
      const ld = new Date(l.completedAt);
      const lStartOfYear = new Date(ld.getFullYear(), 0, 1);
      const lWeek = Math.floor(
        (ld.getTime() - lStartOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      return `${ld.getFullYear()}-W${lWeek}` === key;
    });
    if (logged) {
      streak++;
    } else if (i === 0) {
      // Current week not yet done
    } else {
      break;
    }
  }
  return streak;
}

// ─── Productivity tips pool ─────────────────────────────────────────

const PRODUCTIVITY_TIPS = [
  "Try the 2-minute rule: if something takes less than 2 minutes, do it now. Your future self will quietly admire your discipline.",
  "Time-blocking your schedule isn't just productive — it's a power move. Give every hour a job or it'll find one itself.",
  "The best productivity hack? Rest. Seriously. Your brain consolidates everything you learned while you sleep.",
  "One focused session beats three distracted hours. Find your deep work window and protect it like it's a state secret.",
  "Start with the task you're avoiding most. Getting it done first makes the rest of the day feel effortless.",
  "Notifications are attention thieves. Try a 30-minute focus block — no alerts, no interruptions, just you and the work.",
  "Write tomorrow's top 3 priorities tonight. Morning-you will open your eyes already knowing what to do.",
  "Taking breaks isn't weakness — it's strategy. Your brain needs white space to process, connect, and create.",
];

function getRotatingTip(): string {
  const idx =
    Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % PRODUCTIVITY_TIPS.length;
  return PRODUCTIVITY_TIPS[idx];
}

// ─── Color config ─────────────────────────────────────────────────────

const typeConfig: Record<
  InsightType,
  { border: string; badge: string; badgeText: string; iconColor: string }
> = {
  warning: {
    border: "border-l-amber-400",
    badge: "bg-amber-400/10 border-amber-400/30 text-amber-400",
    badgeText: "Warning",
    iconColor: "text-amber-400",
  },
  tip: {
    border: "border-l-cyan-400",
    badge: "bg-cyan-400/10 border-cyan-400/30 text-cyan-400",
    badgeText: "Tip",
    iconColor: "text-cyan-400",
  },
  positive: {
    border: "border-l-green-400",
    badge: "bg-green-400/10 border-green-400/30 text-green-400",
    badgeText: "Good Job",
    iconColor: "text-green-400",
  },
  info: {
    border: "border-l-violet-400",
    badge: "bg-violet-400/10 border-violet-400/30 text-violet-400",
    badgeText: "Insight",
    iconColor: "text-violet-400",
  },
};

// ─── Date helper ──────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ─── InsightsPanel ───────────────────────────────────────────────────

interface InsightsPanelProps {
  onNavigate: (tab: string) => void;
}

export default function InsightsPanel({ onNavigate }: InsightsPanelProps) {
  const { data: reminders = [] } = useReminders();
  const { data: stats } = useActivityStats();
  const { data: todayEvents = [] } = useScheduleEventsByDate(
    toDateString(new Date()),
  );

  const insights = useMemo<InsightCard[]>(() => {
    const habits = loadHabits();
    const logs = loadLogs();
    const cards: InsightCard[] = [];
    const hour = new Date().getHours();

    // ── At-risk habits ────────────────────────────────────────────
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const atRiskHabits = habits.filter((h) => {
      const streak = computeStreak(h, logs);
      const isOld = h.createdAt < oneDayAgo;
      const notLogged = !isLoggedToday(h.id, logs);
      return streak === 0 && isOld && notLogged;
    });

    if (atRiskHabits.length > 0) {
      const names = atRiskHabits
        .slice(0, 2)
        .map((h) => `"${h.name}"`)
        .join(" and ");
      cards.push({
        id: "habit-risk",
        type: "warning",
        icon: <AlertTriangle className="w-4 h-4" />,
        title: "Habit at Risk",
        body: `${names} ${atRiskHabits.length > 1 ? "haven't" : "hasn't"} been logged in a while. Even a small streak is better than a zero. Head to Habits and check in — I'll be here judging you lovingly. 😏`,
        action: { label: "View Habits", tab: "habits" },
      });
    }

    // ── High task load ────────────────────────────────────────────
    const pending = reminders.filter((r) => !r.completed);
    if (pending.length > 3) {
      cards.push({
        id: "high-load",
        type: "warning",
        icon: <Zap className="w-4 h-4" />,
        title: "High Task Load",
        body: `You've got ${pending.length} pending reminders. That's impressive commitment — or impressive procrastination. Either way, time to triage. Pick the top 3 that matter most today.`,
        action: { label: "Open Reminders", tab: "reminders" },
      });
    }

    // ── Good progress ─────────────────────────────────────────────
    const completed = Number(stats?.completedReminders ?? 0n);
    if (completed > 0) {
      cards.push({
        id: "good-progress",
        type: "positive",
        icon: <CheckCircle className="w-4 h-4" />,
        title: "Good Progress",
        body: `You've completed ${completed} reminder${completed > 1 ? "s" : ""} so far. That's not nothing — that's momentum. Keep that energy going. You're clearly capable when you try. Just saying.`,
      });
    }

    // ── Habit streak celebration ──────────────────────────────────
    const streaking = habits.filter((h) => computeStreak(h, logs) >= 3);
    if (streaking.length > 0) {
      const best = streaking.reduce((prev, curr) =>
        computeStreak(curr, logs) > computeStreak(prev, logs) ? curr : prev,
      );
      const streak = computeStreak(best, logs);
      cards.push({
        id: "streak",
        type: "positive",
        icon: <Flame className="w-4 h-4" />,
        title: `${streak}-Day Streak`,
        body: `"${best.name}" is on a ${streak}-day streak. Honestly? I'm impressed. Don't ruin it. Head to Habits to keep it going.`,
        action: { label: "View Habits", tab: "habits" },
      });
    }

    // ── Free day insight ─────────────────────────────────────────
    if (todayEvents.length === 0 && pending.length === 0) {
      cards.push({
        id: "free-day",
        type: "info",
        icon: <CalendarDays className="w-4 h-4" />,
        title: "Clear Schedule",
        body: "No events scheduled today and your reminder queue is empty. Use this breathing room intentionally — recharge, get ahead, or try something new. A clear calendar is a gift. Spend it wisely.",
        action: { label: "Open Schedule", tab: "schedule" },
      });
    }

    // ── Time-based insight ────────────────────────────────────────
    if (hour >= 5 && hour < 12) {
      cards.push({
        id: "time-morning",
        type: "info",
        icon: <Sun className="w-4 h-4" />,
        title: "Start Strong",
        body: "Morning energy is your sharpest resource of the day. Hit your hardest task in the next 90 minutes while your brain is fresh. Future-you is already grateful.",
      });
    } else if (hour >= 12 && hour < 17) {
      cards.push({
        id: "time-afternoon",
        type: "info",
        icon: <Activity className="w-4 h-4" />,
        title: "Midday Check-in",
        body: "You're halfway through the day. How's it going? A quick 5-minute review of your reminders and schedule keeps the afternoon from slipping away unnoticed.",
        action: { label: "View Dashboard", tab: "dashboard" },
      });
    } else if (hour >= 17) {
      cards.push({
        id: "time-evening",
        type: "info",
        icon: <Sunset className="w-4 h-4" />,
        title: "Wind Down",
        body: "The evening belongs to recovery. Wrap up what needs wrapping, log your habits, and plan tomorrow's top 3. A calm evening is the foundation of a strong tomorrow.",
        action: { label: "View Habits", tab: "habits" },
      });
    }

    // ── Productivity tip (always included) ───────────────────────
    cards.push({
      id: "prod-tip",
      type: "tip",
      icon: <Lightbulb className="w-4 h-4" />,
      title: "Productivity Tip",
      body: getRotatingTip(),
    });

    return cards.slice(0, 6);
  }, [reminders, stats, todayEvents]);

  if (insights.length === 0) {
    return (
      <div className="py-6 text-center" data-ocid="insights.empty_state">
        <Sparkles className="w-6 h-6 mx-auto text-muted-foreground/30 mb-2" />
        <p className="font-mono text-[10px] text-muted-foreground/50 tracking-wider">
          No insights yet
        </p>
        <p className="font-body text-[9px] text-muted-foreground/40 mt-1">
          Add habits and reminders to unlock Melina's analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="w-3 h-3 text-primary/60" />
        <span className="font-mono text-[9px] text-primary/60 tracking-widest uppercase">
          Melina's Insights
        </span>
        <div className="flex-1 h-px bg-primary/10" />
        <span className="font-mono text-[8px] text-muted-foreground/40 tracking-wider">
          {insights.length} cards
        </span>
      </div>

      <AnimatePresence>
        {insights.map((card, idx) => {
          const cfg = typeConfig[card.type];
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={`rounded-sm border-l-2 ${cfg.border} border border-border/25 bg-card/20 p-2.5 space-y-1.5 hover:bg-card/30 transition-colors`}
              data-ocid={`insights.item.${idx + 1}`}
            >
              {/* Header row */}
              <div className="flex items-center gap-1.5">
                <span className={cfg.iconColor}>{card.icon}</span>
                <span
                  className={`font-mono text-[8px] px-1.5 py-0.5 rounded-sm border tracking-wider uppercase ${cfg.badge}`}
                >
                  {cfg.badgeText}
                </span>
                <span className="font-mono text-[9px] text-foreground/75 font-medium">
                  {card.title}
                </span>
              </div>

              {/* Body */}
              <p className="font-body text-[10px] text-muted-foreground/80 leading-relaxed">
                {card.body}
              </p>

              {/* Action button */}
              {card.action && (
                <button
                  type="button"
                  onClick={() => onNavigate(card.action!.tab)}
                  className={`flex items-center gap-0.5 font-mono text-[8px] tracking-wider uppercase transition-colors ${cfg.iconColor} hover:opacity-100 opacity-70`}
                  data-ocid={`insights.action_button.${idx + 1}`}
                >
                  {card.action.label}
                  <ChevronRight className="w-2.5 h-2.5" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Timestamp */}
      <div className="pt-1 flex items-center justify-center gap-1.5 opacity-40">
        <Info className="w-2.5 h-2.5 text-muted-foreground/60" />
        <span className="font-mono text-[8px] text-muted-foreground/60 tracking-wider">
          Updated just now · based on your data
        </span>
      </div>
    </div>
  );
}
