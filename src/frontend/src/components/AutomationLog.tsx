/**
 * AutomationLog — Phase 6D-2
 * Shows the automation execution history from localStorage.
 */

import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ClipboardList,
  SkipForward,
  Trash2,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  type AutomationLogEntry,
  clearAutomationLog,
  loadAutomationLog,
} from "../utils/automationEngine";

const ACTION_LABELS: Record<string, string> = {
  send_message: "Sent message",
  log_habit: "Logged habit",
  create_reminder: "Created reminder",
  show_insight: "Opened insights",
  play_tts: "Spoke aloud",
};

const TRIGGER_LABELS: Record<string, string> = {
  time_daily: "Daily timer",
  time_weekly: "Weekly timer",
  reminder_due: "Reminder due",
  habit_streak: "Habit streak",
  notification_received: "Notification",
  session_start: "Session start",
};

function StatusIcon({ status }: { status: AutomationLogEntry["status"] }) {
  if (status === "success")
    return <CheckCircle2 className="w-3 h-3 text-green-400" />;
  if (status === "failed") return <XCircle className="w-3 h-3 text-red-400" />;
  return <SkipForward className="w-3 h-3 text-amber-400/80" />;
}

const STATUS_BADGE: Record<AutomationLogEntry["status"], string> = {
  success: "bg-green-500/10 border-green-500/25 text-green-400",
  failed: "bg-red-500/10 border-red-500/25 text-red-400",
  skipped: "bg-amber-500/10 border-amber-500/25 text-amber-400/80",
};

export default function AutomationLog({
  refreshKey,
}: {
  refreshKey?: number;
}) {
  const [entries, setEntries] = useState<AutomationLogEntry[]>(() =>
    loadAutomationLog().slice().reverse(),
  );

  // Reload whenever refreshKey changes (parent signals a new run)
  const [prevKey, setPrevKey] = useState(refreshKey);
  if (refreshKey !== prevKey) {
    setPrevKey(refreshKey);
    setEntries(loadAutomationLog().slice().reverse());
  }

  const handleClear = () => {
    clearAutomationLog();
    setEntries([]);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-primary/70" />
          <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
            Run Log
          </span>
        </div>
        {entries.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-6 px-2 font-mono text-[8px] uppercase text-destructive/50 hover:text-destructive border border-destructive/20 rounded-sm"
            data-ocid="automation_log.clear_button"
          >
            <Trash2 className="w-2.5 h-2.5 mr-0.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div
          className="py-6 text-center space-y-1.5"
          data-ocid="automation_log.empty_state"
        >
          <ClipboardList className="w-5 h-5 text-muted-foreground/25 mx-auto" />
          <p className="font-mono text-[10px] text-muted-foreground/50 tracking-wider">
            No runs logged yet
          </p>
          <p className="font-body text-[10px] text-muted-foreground/40">
            Run an automation to see results here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-sm bg-card/20 border border-border/30 px-2 py-1.5 space-y-0.5"
                data-ocid={`automation_log.item.${idx + 1}`}
              >
                {/* Top row */}
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={entry.status} />
                  <span className="flex-1 font-body text-[10px] text-foreground/80 truncate">
                    {entry.automationName}
                  </span>
                  <span
                    className={`font-mono text-[7px] px-1 py-0.5 rounded-[2px] border uppercase tracking-wider ${
                      STATUS_BADGE[entry.status]
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>

                {/* Pills row */}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[7px] text-muted-foreground/50 bg-card/30 border border-border/20 rounded-[2px] px-1.5 py-0.5">
                    {TRIGGER_LABELS[entry.triggerType] ?? entry.triggerType}
                  </span>
                  <span className="font-mono text-[7px] text-primary/40">
                    →
                  </span>
                  <span className="font-mono text-[7px] text-muted-foreground/50 bg-card/30 border border-border/20 rounded-[2px] px-1.5 py-0.5">
                    {ACTION_LABELS[entry.actionType] ?? entry.actionType}
                  </span>
                </div>

                {/* Result note */}
                {entry.resultMessage && (
                  <p className="font-body text-[9px] text-muted-foreground/50 leading-snug">
                    {entry.resultMessage}
                  </p>
                )}

                {/* Timestamp */}
                <p className="font-mono text-[7px] text-muted-foreground/35">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {entries.length > 0 && (
        <p className="font-mono text-[8px] text-muted-foreground/35 text-center pt-1">
          {entries.length} entr{entries.length !== 1 ? "ies" : "y"} · latest
          first
        </p>
      )}
    </div>
  );
}
