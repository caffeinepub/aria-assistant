import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { motion } from "motion/react";
import { useActivityStats } from "../hooks/useQueries";

// ── Stat Card ─────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | bigint;
  icon: React.ReactNode;
  accentClass: string;
  glowClass: string;
  ocid: string;
  fullWidth?: boolean;
}

function StatCard({
  label,
  value,
  icon,
  accentClass,
  glowClass,
  ocid,
  fullWidth = false,
}: StatCardProps) {
  const numVal = typeof value === "bigint" ? Number(value) : value;
  const isActive = numVal > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-sm p-2.5 bg-card/20 border transition-all duration-300 ${
        isActive ? `${glowClass} border-opacity-60` : "border-border/30"
      } ${fullWidth ? "col-span-2" : ""}`}
      data-ocid={ocid}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`font-mono text-[7px] tracking-[0.25em] uppercase ${
            isActive ? accentClass : "text-muted-foreground/40"
          }`}
        >
          {label}
        </span>
        <div
          className={`transition-colors ${
            isActive ? accentClass : "text-muted-foreground/25"
          }`}
        >
          {icon}
        </div>
      </div>
      <div
        className={`font-mono text-2xl font-bold tracking-tight transition-colors ${
          isActive ? accentClass : "text-muted-foreground/40"
        }`}
      >
        {numVal.toLocaleString()}
      </div>
    </motion.div>
  );
}

// ── Melina Status Quote ───────────────────────────────────────────
function getMelinaStatus(
  pendingReminders: number,
  unreadNotifications: number,
  completedReminders: number,
): string {
  if (pendingReminders > 3) {
    return "You have several things on your plate. Let me know if you need help prioritizing.";
  }
  if (unreadNotifications > 0) {
    return "You have unread alerts. Shall I go through them with you?";
  }
  if (completedReminders > pendingReminders && completedReminders > 0) {
    return "You're ahead of schedule. Great work today.";
  }
  return "All systems nominal. I'm here whenever you need me.";
}

// ── DashboardPanel ────────────────────────────────────────────────
export default function DashboardPanel() {
  const { data: stats, isLoading } = useActivityStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-2 p-0.5" data-ocid="dashboard.loading_state">
        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-sm bg-muted/20" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-sm bg-muted/20" />
        <Skeleton className="h-16 w-full rounded-sm bg-muted/10" />
      </div>
    );
  }

  const pending = Number(stats.pendingReminders);
  const unread = Number(stats.unreadNotifications);
  const completed = Number(stats.completedReminders);
  const statusText = getMelinaStatus(pending, unread, completed);

  return (
    <div className="space-y-2" data-ocid="dashboard.panel">
      {/* Header label */}
      <p className="font-mono text-[8px] text-muted-foreground/40 tracking-[0.3em] uppercase">
        System Status Overview
      </p>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <StatCard
          label="Total Messages"
          value={stats.totalMessages}
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          accentClass="text-cyan-400"
          glowClass="border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.12)]"
          ocid="dashboard.total_messages.card"
        />
        <StatCard
          label="Pending"
          value={stats.pendingReminders}
          icon={<Clock className="w-3.5 h-3.5" />}
          accentClass="text-amber-400"
          glowClass="border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.12)]"
          ocid="dashboard.pending_reminders.card"
        />
        <StatCard
          label="Completed"
          value={stats.completedReminders}
          icon={<CheckCircle className="w-3.5 h-3.5" />}
          accentClass="text-green-400"
          glowClass="border-green-500/40 shadow-[0_0_8px_rgba(74,222,128,0.12)]"
          ocid="dashboard.completed_reminders.card"
        />
        <StatCard
          label="Memory"
          value={stats.memoryEntries}
          icon={<Brain className="w-3.5 h-3.5" />}
          accentClass="text-violet-400"
          glowClass="border-violet-500/40 shadow-[0_0_8px_rgba(167,139,250,0.12)]"
          ocid="dashboard.memory_entries.card"
        />
        {/* Full-width — Active Alerts */}
        <StatCard
          label="Active Alerts"
          value={stats.unreadNotifications}
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          accentClass="text-red-400"
          glowClass="border-red-500/40 shadow-[0_0_8px_rgba(248,113,113,0.12)]"
          ocid="dashboard.active_alerts.card"
          fullWidth
        />
      </div>

      {/* Melina status quote */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="flex items-start gap-2 p-2.5 rounded-sm bg-card/10 border border-border/25 mt-1"
        data-ocid="dashboard.status_card"
      >
        <div className="w-5 h-5 rounded-full overflow-hidden border border-primary/30 flex-shrink-0 mt-0.5">
          <img
            src="/assets/generated/melina-avatar.dim_400x500.png"
            alt="Melina"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <p className="font-body text-[10px] text-muted-foreground/70 italic leading-relaxed">
          &ldquo;{statusText}&rdquo;
        </p>
      </motion.div>
    </div>
  );
}
