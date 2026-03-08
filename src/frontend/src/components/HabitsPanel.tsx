/**
 * HabitsPanel — Phase 4 Habit Tracking Module
 * localStorage-based, no backend required.
 */

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Flame, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Storage helpers ─────────────────────────────────────────────────

const HABITS_KEY = "aria_habits";
const LOGS_KEY = "aria_habit_logs";

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    return raw ? (JSON.parse(raw) as Habit[]) : [];
  } catch {
    return [];
  }
}

function saveHabits(habits: Habit[]) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

function loadLogs(): HabitLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? (JSON.parse(raw) as HabitLog[]) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: HabitLog[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// ─── Streak & progress helpers ────────────────────────────────────────

function getDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getWeekKey(ts: number): string {
  const d = new Date(ts);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.floor(
    (d.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return `${d.getFullYear()}-W${week}`;
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
        // Today not logged yet — still counts if yesterday was logged
      } else {
        break;
      }
    }
    return streak;
  }
  // Weekly
  let streak = 0;
  const todayWeekly = new Date();

  for (let i = 0; i < 52; i++) {
    const checkDate = new Date(
      todayWeekly.getTime() - i * 7 * 24 * 60 * 60 * 1000,
    );
    const key = getWeekKey(checkDate.getTime());
    const logged = habitLogs.some((l) => getWeekKey(l.completedAt) === key);
    if (logged) {
      streak++;
    } else if (i === 0) {
      // Current week not done yet
    } else {
      break;
    }
  }
  return streak;
}

function getProgressThisWeek(
  habit: Habit,
  logs: HabitLog[],
): { done: number; target: number } {
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  const now = new Date();
  // Week starts Monday
  const dayOfWeek = (now.getDay() + 6) % 7;
  const weekStart = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
  weekStart.setHours(0, 0, 0, 0);

  const done = habitLogs.filter(
    (l) => l.completedAt >= weekStart.getTime(),
  ).length;

  if (habit.frequency === "daily") {
    return { done, target: 7 };
  }
  return { done, target: 1 };
}

// ─── Category config ──────────────────────────────────────────────────

const categoryConfig: Record<
  HabitCategory,
  { label: string; colorClass: string; badgeClass: string }
> = {
  health: {
    label: "Health",
    colorClass: "text-cyan-400",
    badgeClass: "bg-cyan-400/10 border-cyan-400/30 text-cyan-400",
  },
  productivity: {
    label: "Productivity",
    colorClass: "text-amber-400",
    badgeClass: "bg-amber-400/10 border-amber-400/30 text-amber-400",
  },
  learning: {
    label: "Learning",
    colorClass: "text-violet-400",
    badgeClass: "bg-violet-400/10 border-violet-400/30 text-violet-400",
  },
  fitness: {
    label: "Fitness",
    colorClass: "text-green-400",
    badgeClass: "bg-green-400/10 border-green-400/30 text-green-400",
  },
  other: {
    label: "Other",
    colorClass: "text-muted-foreground",
    badgeClass: "bg-muted/20 border-border/40 text-muted-foreground",
  },
};

// ─── HabitsPanel ─────────────────────────────────────────────────────

export default function HabitsPanel() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits);
  const [logs, setLogs] = useState<HabitLog[]>(loadLogs);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<HabitCategory>("health");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");

  // Persist on change
  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  const handleAdd = () => {
    const trimName = name.trim();
    if (!trimName) return;

    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: trimName,
      category,
      frequency,
      createdAt: Date.now(),
    };

    setHabits((prev) => [...prev, newHabit]);
    setName("");
    toast.success("Habit added");
  };

  const handleCheckin = (habitId: string) => {
    if (isLoggedToday(habitId, logs)) return;

    const log: HabitLog = {
      id: crypto.randomUUID(),
      habitId,
      completedAt: Date.now(),
    };
    setLogs((prev) => [...prev, log]);
    toast.success("Habit checked in!");
  };

  const handleDelete = (habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setLogs((prev) => prev.filter((l) => l.habitId !== habitId));
    toast.success("Habit removed");
  };

  return (
    <div className="space-y-2">
      {/* Add form */}
      <div className="p-2 rounded-sm bg-card/20 border border-border/40 space-y-1.5">
        <input
          type="text"
          placeholder="Habit name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          className="w-full h-7 px-2 rounded-sm font-body text-xs hud-input"
          data-ocid="habits.input"
        />

        <div className="grid grid-cols-2 gap-1.5">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as HabitCategory)}
          >
            <SelectTrigger
              className="h-7 hud-input text-[10px] font-mono rounded-sm border-primary/20 focus:border-primary/60 px-2"
              data-ocid="habits.category_select"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border font-mono text-xs">
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="productivity">Productivity</SelectItem>
              <SelectItem value="learning">Learning</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={frequency}
            onValueChange={(v) => setFrequency(v as HabitFrequency)}
          >
            <SelectTrigger
              className="h-7 hud-input text-[10px] font-mono rounded-sm border-primary/20 focus:border-primary/60 px-2"
              data-ocid="habits.frequency_select"
            >
              <SelectValue placeholder="Freq." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border font-mono text-xs">
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!name.trim()}
          className="w-full h-7 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
          data-ocid="habits.add_button"
        >
          + Add Habit
        </Button>
      </div>

      {/* Habit list */}
      {habits.length === 0 ? (
        <div
          className="py-5 text-center space-y-2"
          data-ocid="habits.empty_state"
        >
          <Activity className="w-6 h-6 mx-auto text-muted-foreground/30" />
          <p className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
            No habits tracked yet
          </p>
          <p className="font-body text-[10px] text-muted-foreground/40 italic">
            &ldquo;Every streak starts with a single day, {"\u2014"}{" "}
            Melina&rdquo;
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {habits.map((habit, idx) => {
              const loggedToday = isLoggedToday(habit.id, logs);
              const streak = computeStreak(habit, logs);
              const progress = getProgressThisWeek(habit, logs);
              const catCfg = categoryConfig[habit.category];

              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-sm px-2 py-2 bg-card/20 border border-border/40 hover:border-primary/30 transition-all"
                  data-ocid={`habits.item.${idx + 1}`}
                >
                  {/* Top row: name + delete */}
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs text-foreground/85 truncate">
                        {habit.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(habit.id)}
                      className="h-5 w-5 p-0 text-destructive/40 hover:text-destructive rounded-sm flex-shrink-0 -mt-0.5"
                      data-ocid={`habits.delete_button.${idx + 1}`}
                      aria-label="Delete habit"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Middle row: category badge + frequency */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className={`font-mono text-[8px] px-1.5 py-0.5 rounded-sm border tracking-wider uppercase ${catCfg.badgeClass}`}
                    >
                      {catCfg.label}
                    </span>
                    <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
                      {habit.frequency}
                    </span>
                  </div>

                  {/* Stats row: streak + progress */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {streak > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-amber-400/80" />
                        <span className="font-mono text-[9px] text-amber-400/80">
                          {streak} streak
                        </span>
                      </div>
                    )}
                    <span className="font-mono text-[9px] text-muted-foreground/60">
                      {progress.done}/{progress.target}{" "}
                      {habit.frequency === "daily" ? "this week" : "this week"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-1.5">
                    <div className="w-full h-0.5 bg-border/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progress.done >= progress.target
                            ? "bg-green-400/70"
                            : "bg-primary/50"
                        }`}
                        style={{
                          width: `${Math.min(100, (progress.done / progress.target) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Check-in button */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCheckin(habit.id)}
                    disabled={loggedToday}
                    className={`w-full h-6 font-mono text-[8px] tracking-widest uppercase rounded-sm transition-all ${
                      loggedToday
                        ? "bg-green-400/10 border border-green-400/30 text-green-400/70 cursor-default"
                        : "bg-primary/10 hover:bg-primary/20 border border-primary/25 hover:border-primary/50 text-primary"
                    }`}
                    data-ocid={`habits.checkin_button.${idx + 1}`}
                  >
                    {loggedToday ? "✓ Done today" : "Log Today"}
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
