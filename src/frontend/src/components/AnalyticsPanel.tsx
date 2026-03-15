/**
 * AnalyticsPanel — Phase 3B
 * Conversation analytics derived from chat history and memory entries.
 * No external chart library — pure CSS/Tailwind bars.
 */

import { motion } from "motion/react";
import { useChatHistory, useMemoryEntries } from "../hooks/useQueries";
import { type IntentCluster, classifyIntent } from "../lib/melina-engine";

// ─── Helpers ────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return DAY_NAMES[d.getDay()];
}

function getDateKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toDateString();
}

// ─── Cluster config ──────────────────────────────────────────────────

const CLUSTER_CONFIG: Record<
  IntentCluster,
  { label: string; colorClass: string; bgClass: string }
> = {
  questions: {
    label: "Questions",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-400/20 border-cyan-400/40",
  },
  reminders: {
    label: "Reminders",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-400/20 border-amber-400/40",
  },
  tasks: {
    label: "Tasks",
    colorClass: "text-violet-400",
    bgClass: "bg-violet-400/20 border-violet-400/40",
  },
  greetings: {
    label: "Greetings",
    colorClass: "text-green-400",
    bgClass: "bg-green-400/20 border-green-400/40",
  },
  personal: {
    label: "Personal",
    colorClass: "text-red-400",
    bgClass: "bg-red-400/20 border-red-400/40",
  },
  general: {
    label: "General",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/20 border-border/40",
  },
};

// ─── AnalyticsPanel ──────────────────────────────────────────────────

export default function AnalyticsPanel() {
  const { data: chatHistory = [], isLoading } = useChatHistory();
  const { data: memoryEntries = [] } = useMemoryEntries();

  // ── Compute stats ──
  const userMessages = chatHistory.filter((m) => m.role === "user");

  // 7-day heatmap
  const heatmap = Array.from({ length: 7 }, (_, i) => {
    const key = getDateKey(6 - i);
    const count = userMessages.filter((m) => {
      const d = new Date(Number(m.timestamp) / 1_000_000);
      return d.toDateString() === key;
    }).length;
    return { day: getDayLabel(6 - i), count };
  });

  const maxCount = Math.max(...heatmap.map((h) => h.count), 1);

  // Topic clusters
  const clusterCounts: Record<IntentCluster, number> = {
    questions: 0,
    reminders: 0,
    tasks: 0,
    greetings: 0,
    personal: 0,
    general: 0,
  };
  for (const m of userMessages) {
    const cluster = classifyIntent(m.content);
    clusterCounts[cluster]++;
  }
  const hasTopics = Object.values(clusterCounts).some((v) => v > 0);

  // Most active hour
  const hourCounts: Record<number, number> = {};
  for (const m of userMessages) {
    const h = new Date(Number(m.timestamp) / 1_000_000).getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  let mostActiveHour = -1;
  let maxHourCount = 0;
  for (const [h, c] of Object.entries(hourCounts)) {
    if (c > maxHourCount) {
      maxHourCount = c;
      mostActiveHour = Number.parseInt(h);
    }
  }
  const mostActiveHourStr =
    mostActiveHour >= 0 ? `${String(mostActiveHour).padStart(2, "0")}:00` : "—";

  const totalMessages = chatHistory.length;
  const memoryCount = memoryEntries.length;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-3 p-0.5" data-ocid="analytics.panel">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-sm bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty state ──
  if (userMessages.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 gap-3"
        data-ocid="analytics.empty_state"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden border border-primary/20 opacity-50">
          <img
            src="/assets/generated/melina-avatar.dim_400x500.png"
            alt="Melina"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="text-center">
          <p className="font-mono text-[9px] text-muted-foreground/50 tracking-widest uppercase">
            No data yet
          </p>
          <p className="font-body text-[10px] text-muted-foreground/40 mt-0.5">
            Start chatting to see your analytics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-ocid="analytics.panel">
      {/* Header */}
      <p className="font-mono text-[8px] text-muted-foreground/40 tracking-[0.3em] uppercase">
        Conversation Analytics
      </p>

      {/* Session insights */}
      <div className="grid grid-cols-2 gap-1.5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-sm p-2 bg-card/20 border border-cyan-500/20"
        >
          <span className="font-mono text-[7px] text-cyan-400/60 tracking-widest uppercase block mb-1">
            Total Msgs
          </span>
          <span className="font-mono text-xl font-bold text-cyan-400">
            {totalMessages}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-sm p-2 bg-card/20 border border-violet-500/20"
        >
          <span className="font-mono text-[7px] text-violet-400/60 tracking-widest uppercase block mb-1">
            Memories
          </span>
          <span className="font-mono text-xl font-bold text-violet-400">
            {memoryCount}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-sm p-2 bg-card/20 border border-amber-500/20 col-span-2"
        >
          <span className="font-mono text-[7px] text-amber-400/60 tracking-widest uppercase block mb-0.5">
            Peak Activity Hour
          </span>
          <span className="font-mono text-lg font-bold text-amber-400">
            {mostActiveHourStr}
          </span>
        </motion.div>
      </div>

      {/* 7-Day Heatmap */}
      <div
        className="rounded-sm p-2.5 bg-card/20 border border-border/40 space-y-2"
        data-ocid="analytics.heatmap.panel"
      >
        <p className="font-mono text-[7px] text-muted-foreground/40 tracking-widest uppercase">
          7-Day Message Activity
        </p>
        <div className="flex items-end gap-1 h-14">
          {heatmap.map((day, i) => {
            const heightPct = Math.max(
              (day.count / maxCount) * 100,
              day.count > 0 ? 10 : 4,
            );
            // Use offset from today as a stable key (0=oldest, 6=today)
            const dayKey = `heatmap-day-${i}`;
            return (
              <motion.div
                key={dayKey}
                className="flex-1 flex flex-col items-center gap-0.5"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                style={{ transformOrigin: "bottom" }}
              >
                <span className="font-mono text-[7px] text-muted-foreground/50">
                  {day.count > 0 ? day.count : ""}
                </span>
                <div
                  className={`w-full rounded-[2px] transition-all ${
                    day.count > 0
                      ? "bg-primary/50 border border-primary/30"
                      : "bg-muted/20 border border-border/20"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="font-mono text-[6px] text-muted-foreground/50 uppercase">
                  {day.day}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Topic Clusters */}
      <div
        className="rounded-sm p-2.5 bg-card/20 border border-border/40 space-y-2"
        data-ocid="analytics.topics.panel"
      >
        <p className="font-mono text-[7px] text-muted-foreground/40 tracking-widest uppercase">
          Topic Clusters
        </p>
        {hasTopics ? (
          <div className="flex flex-wrap gap-1">
            {(Object.keys(CLUSTER_CONFIG) as IntentCluster[]).map(
              (cluster, i) => {
                const count = clusterCounts[cluster];
                if (count === 0) return null;
                const cfg = CLUSTER_CONFIG[cluster];
                return (
                  <motion.div
                    key={cluster}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-mono tracking-wider ${cfg.bgClass} ${cfg.colorClass}`}
                  >
                    <span className="uppercase">{cfg.label}</span>
                    <span className="font-bold">{count}</span>
                  </motion.div>
                );
              },
            )}
          </div>
        ) : (
          <p className="font-mono text-[9px] text-muted-foreground/40 italic">
            No topics detected yet
          </p>
        )}
      </div>
    </div>
  );
}
