/**
 * HabitAnalytics — Phase 6B
 * Isolated component: streak heatmaps, category breakdown, and weekly charts.
 * Reads from the same localStorage keys as HabitsPanel — no backend needed.
 */

import { useMemo } from "react";

// ─── Types (mirrored from HabitsPanel) ───────────────────────────────
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

// ─── Storage helpers ──────────────────────────────────────────────────
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

// ─── Date helpers ─────────────────────────────────────────────────────
function getDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayLabel(dateKey: string): string {
  const d = new Date(dateKey);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Category config ──────────────────────────────────────────────────
const categoryConfig: Record<
  HabitCategory,
  { label: string; color: string; bg: string }
> = {
  health: { label: "Health", color: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
  productivity: {
    label: "Productivity",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.15)",
  },
  learning: {
    label: "Learning",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.15)",
  },
  fitness: { label: "Fitness", color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  other: { label: "Other", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
};

// Stable day-of-week labels for the heatmap header
const DOW_LABELS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

// Stable legend opacity steps
const LEGEND_STEPS = [
  { key: "step-1", opacity: 0.08 },
  { key: "step-2", opacity: 0.25 },
  { key: "step-3", opacity: 0.45 },
  { key: "step-4", opacity: 0.65 },
  { key: "step-5", opacity: 0.95 },
];

// ─── Build last-N-days array ──────────────────────────────────────────
function buildDayRange(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    result.push(getDateKey(d.getTime()));
  }
  return result;
}

// ─── Heatmap cell intensity ───────────────────────────────────────────
function getHeatIntensity(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0;
  return Math.min(1, count / maxCount);
}

// ─── HabitAnalytics ──────────────────────────────────────────────────
export default function HabitAnalytics() {
  const habits = useMemo(() => loadHabits(), []);
  const logs = useMemo(() => loadLogs(), []);

  // ── 28-day heatmap data ─────────────────────────────────────────────
  const days28 = useMemo(() => buildDayRange(28), []);

  const heatmapData = useMemo(() => {
    return days28.map((dateKey) => {
      const count = logs.filter(
        (l) => getDateKey(l.completedAt) === dateKey,
      ).length;
      return { dateKey, count };
    });
  }, [days28, logs]);

  const maxDayCount = useMemo(
    () => Math.max(1, ...heatmapData.map((d) => d.count)),
    [heatmapData],
  );

  // ── Per-habit streaks ────────────────────────────────────────────────
  const habitStreaks = useMemo(() => {
    return habits.map((habit) => {
      const habitLogs = logs.filter((l) => l.habitId === habit.id);
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today.getTime() - i * 86400000);
        const key = getDateKey(checkDate.getTime());
        const logged = habitLogs.some((l) => getDateKey(l.completedAt) === key);
        if (logged) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
      return { habit, streak };
    });
  }, [habits, logs]);

  // ── Category breakdown ───────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const counts: Record<HabitCategory, number> = {
      health: 0,
      productivity: 0,
      learning: 0,
      fitness: 0,
      other: 0,
    };
    // use for...of instead of forEach to satisfy lint
    for (const h of habits) {
      counts[h.category]++;
    }
    const total = habits.length || 1;
    return (Object.entries(counts) as [HabitCategory, number][])
      .map(([cat, count]) => ({
        cat,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .filter((x) => x.count > 0);
  }, [habits]);

  // ── 7-day bar chart (completions per day) ────────────────────────────
  const days7 = useMemo(() => buildDayRange(7), []);
  const barData = useMemo(() => {
    return days7.map((dateKey) => {
      const count = logs.filter(
        (l) => getDateKey(l.completedAt) === dateKey,
      ).length;
      const d = new Date(dateKey);
      const label = d.toLocaleDateString([], { weekday: "short" });
      return { dateKey, count, label };
    });
  }, [days7, logs]);
  const maxBarCount = useMemo(
    () => Math.max(1, ...barData.map((d) => d.count)),
    [barData],
  );

  // ── Total stats ──────────────────────────────────────────────────────
  const totalCompletions = logs.length;
  const totalHabits = habits.length;
  const avgStreak =
    habitStreaks.length > 0
      ? Math.round(
          habitStreaks.reduce((s, h) => s + h.streak, 0) / habitStreaks.length,
        )
      : 0;
  const bestStreak =
    habitStreaks.length > 0
      ? Math.max(...habitStreaks.map((h) => h.streak))
      : 0;

  // ── Empty state ──────────────────────────────────────────────────────
  if (habits.length === 0) {
    return (
      <div
        className="py-8 text-center space-y-2"
        data-ocid="habit_analytics.empty_state"
      >
        <p className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
          No habits tracked yet
        </p>
        <p className="font-body text-[10px] text-muted-foreground/40 italic">
          &ldquo;Add habits in the Habits tab to see your analytics.&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-ocid="habit_analytics.panel">
      {/* ── Stat cards */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: "Habits", value: totalHabits, color: "text-cyan-400" },
          {
            label: "Check-ins",
            value: totalCompletions,
            color: "text-violet-400",
          },
          { label: "Avg Streak", value: avgStreak, color: "text-amber-400" },
          { label: "Best Streak", value: bestStreak, color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-sm p-2 bg-card/20 border border-border/40 text-center"
          >
            <div className={`font-mono text-base font-bold ${color}`}>
              {value}
            </div>
            <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider mt-0.5">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── 7-day bar chart */}
      <div className="rounded-sm p-2 bg-card/20 border border-border/40">
        <p className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider mb-2">
          7-Day Activity
        </p>
        <div className="flex items-end gap-1 h-16">
          {barData.map(({ dateKey, count, label }) => {
            const pct = count / maxBarCount;
            const todayKey = getDateKey(Date.now());
            const isToday = dateKey === todayKey;
            return (
              <div
                key={dateKey}
                className="flex-1 flex flex-col items-center gap-0.5"
              >
                <div className="w-full flex items-end" style={{ height: 44 }}>
                  <div
                    className="w-full rounded-t-sm transition-all duration-300"
                    style={{
                      height: `${Math.max(4, pct * 100)}%`,
                      background: isToday
                        ? "rgba(239,68,68,0.6)"
                        : "rgba(99,102,241,0.4)",
                      border: isToday
                        ? "1px solid rgba(239,68,68,0.8)"
                        : "1px solid rgba(99,102,241,0.2)",
                    }}
                  />
                </div>
                <span
                  className={`font-mono text-[7px] uppercase tracking-wide ${
                    isToday ? "text-red-400" : "text-muted-foreground/50"
                  }`}
                >
                  {label}
                </span>
                {count > 0 && (
                  <span className="font-mono text-[7px] text-primary/60">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 28-day heatmap */}
      <div className="rounded-sm p-2 bg-card/20 border border-border/40">
        <p className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider mb-2">
          28-Day Heatmap
        </p>
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
        >
          {/* Day-of-week header with stable string keys */}
          {DOW_LABELS.map(({ key, label }) => (
            <div
              key={key}
              className="font-mono text-[7px] text-muted-foreground/40 text-center mb-0.5"
            >
              {label}
            </div>
          ))}
          {heatmapData.map(({ dateKey, count }) => {
            const intensity = getHeatIntensity(count, maxDayCount);
            const todayKey = getDateKey(Date.now());
            const isToday = dateKey === todayKey;
            const opacity = intensity === 0 ? 0.08 : 0.2 + intensity * 0.75;
            return (
              <div
                key={dateKey}
                title={`${getDayLabel(dateKey)}: ${count} check-in${count !== 1 ? "s" : ""}`}
                className="aspect-square rounded-sm transition-all cursor-default"
                style={{
                  background: isToday
                    ? `rgba(239,68,68,${opacity})`
                    : `rgba(99,102,241,${opacity})`,
                  border: isToday
                    ? "1px solid rgba(239,68,68,0.5)"
                    : "1px solid transparent",
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-[7px] text-muted-foreground/40">
            Less
          </span>
          <div className="flex gap-0.5">
            {/* Legend with stable keys */}
            {LEGEND_STEPS.map(({ key, opacity }) => (
              <div
                key={key}
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: `rgba(99,102,241,${opacity})` }}
              />
            ))}
          </div>
          <span className="font-mono text-[7px] text-muted-foreground/40">
            More
          </span>
        </div>
      </div>

      {/* ── Per-habit streaks */}
      <div className="rounded-sm p-2 bg-card/20 border border-border/40">
        <p className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider mb-2">
          Habit Streaks
        </p>
        <div className="space-y-1.5">
          {[...habitStreaks]
            .sort((a, b) => b.streak - a.streak)
            .map(({ habit, streak }, idx) => {
              const cfg = categoryConfig[habit.category];
              const maxS = bestStreak || 1;
              const pct = (streak / maxS) * 100;
              return (
                <div
                  key={habit.id}
                  data-ocid={`habit_analytics.streak.${idx + 1}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-body text-[10px] text-foreground/80 truncate flex-1">
                      {habit.name}
                    </span>
                    <span
                      className="font-mono text-[9px] ml-1 flex-shrink-0"
                      style={{ color: cfg.color }}
                    >
                      {streak}d
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-border/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cfg.color }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="rounded-sm p-2 bg-card/20 border border-border/40">
          <p className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider mb-2">
            By Category
          </p>
          <div className="space-y-1.5">
            {categoryBreakdown.map(({ cat, count, pct }) => {
              const cfg = categoryConfig[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground/60">
                      {count} habit{count !== 1 ? "s" : ""} · {pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-border/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cfg.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
