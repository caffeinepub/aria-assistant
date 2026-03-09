import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCreateReminder } from "../hooks/useQueries";
import {
  fireSessionStartAutomations,
  runAutomation,
} from "../utils/automationEngine";
import AutomationLog from "./AutomationLog";

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  triggerType: TriggerType;
  action: string;
  actionType: ActionType;
  enabled: boolean;
  lastRun?: number;
  runCount: number;
  createdAt: number;
}

type TriggerType =
  | "time_daily"
  | "time_weekly"
  | "reminder_due"
  | "habit_streak"
  | "notification_received"
  | "session_start";

type ActionType =
  | "send_message"
  | "log_habit"
  | "create_reminder"
  | "show_insight"
  | "play_tts";

const TRIGGER_OPTIONS: {
  value: TriggerType;
  label: string;
  example: string;
}[] = [
  {
    value: "time_daily",
    label: "Every day at a time",
    example: "e.g. 08:00 AM",
  },
  {
    value: "time_weekly",
    label: "Every week on a day",
    example: "e.g. Monday",
  },
  {
    value: "reminder_due",
    label: "When a reminder is due",
    example: "Any reminder",
  },
  {
    value: "habit_streak",
    label: "When habit streak reached",
    example: "e.g. 7 days",
  },
  {
    value: "notification_received",
    label: "When notification arrives",
    example: "Any alert",
  },
  {
    value: "session_start",
    label: "When I start a session",
    example: "On login",
  },
];

const ACTION_OPTIONS: { value: ActionType; label: string; example: string }[] =
  [
    {
      value: "send_message",
      label: "Send me a message",
      example: "e.g. Good morning!",
    },
    {
      value: "log_habit",
      label: "Suggest logging a habit",
      example: "e.g. Water",
    },
    {
      value: "create_reminder",
      label: "Create a reminder",
      example: "e.g. Team standup",
    },
    {
      value: "show_insight",
      label: "Show an insight card",
      example: "Daily summary",
    },
    {
      value: "play_tts",
      label: "Speak a message aloud",
      example: "e.g. Time to focus!",
    },
  ];

const TRIGGER_ICONS: Record<TriggerType, React.ReactNode> = {
  time_daily: <Clock className="w-3 h-3" />,
  time_weekly: <Calendar className="w-3 h-3" />,
  reminder_due: <Bell className="w-3 h-3" />,
  habit_streak: <Activity className="w-3 h-3" />,
  notification_received: <MessageSquare className="w-3 h-3" />,
  session_start: <RefreshCw className="w-3 h-3" />,
};

const ACTION_COLORS: Record<ActionType, string> = {
  send_message: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  log_habit: "bg-green-500/15 text-green-400 border-green-500/30",
  create_reminder: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  show_insight: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  play_tts: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const STORAGE_KEY = "melina_automations";

function loadAutomations(): Automation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Automation[]) : [];
  } catch {
    return [];
  }
}

function saveAutomations(automations: Automation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(automations));
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface AutomationCardProps {
  automation: Automation;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  isRunning: boolean;
}

function AutomationCard({
  automation,
  index,
  onToggle,
  onDelete,
  onRun,
  isRunning,
}: AutomationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const triggerOpt = TRIGGER_OPTIONS.find(
    (t) => t.value === automation.triggerType,
  );
  const actionOpt = ACTION_OPTIONS.find(
    (a) => a.value === automation.actionType,
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className={`rounded-sm border transition-all ${
        automation.enabled
          ? "bg-card/20 border-primary/20 hover:border-primary/40"
          : "bg-muted/5 border-border/20 opacity-60"
      }`}
      data-ocid={`automations.item.${index}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Zap
          className={`w-3 h-3 flex-shrink-0 ${
            automation.enabled ? "text-primary" : "text-muted-foreground/40"
          }`}
        />
        <span className="flex-1 font-body text-xs truncate text-foreground/85">
          {automation.name}
        </span>
        <span className="font-mono text-[8px] text-muted-foreground/50">
          ×{automation.runCount}
        </span>
        <Switch
          checked={automation.enabled}
          onCheckedChange={() => onToggle(automation.id)}
          className="scale-[0.65] data-[state=checked]:bg-primary"
          data-ocid={`automations.toggle.${index}`}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground/50 hover:text-primary transition-colors"
          data-ocid={`automations.expand.${index}`}
        >
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Trigger → Action pills */}
      <div className="flex items-center gap-1 px-2 pb-1.5">
        <span className="flex items-center gap-1 bg-card/30 border border-border/30 rounded-[2px] px-1.5 py-0.5">
          {TRIGGER_ICONS[automation.triggerType]}
          <span className="font-mono text-[8px] text-muted-foreground/70 truncate max-w-[70px]">
            {automation.trigger || triggerOpt?.label}
          </span>
        </span>
        <span className="font-mono text-[8px] text-primary/50">→</span>
        <span
          className={`font-mono text-[8px] rounded-[2px] px-1.5 py-0.5 border ${
            ACTION_COLORS[automation.actionType]
          } truncate max-w-[80px]`}
        >
          {automation.action || actionOpt?.label}
        </span>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1.5 border-t border-border/20 pt-1.5">
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Trigger
                  </p>
                  <p className="font-body text-[10px] text-foreground/70">
                    {triggerOpt?.label}
                  </p>
                  <p className="font-mono text-[9px] text-primary/60">
                    {automation.trigger}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Action
                  </p>
                  <p className="font-body text-[10px] text-foreground/70">
                    {actionOpt?.label}
                  </p>
                  <p className="font-mono text-[9px] text-primary/60">
                    {automation.action}
                  </p>
                </div>
              </div>
              {automation.lastRun && (
                <p className="font-mono text-[8px] text-muted-foreground/40">
                  Last run: {new Date(automation.lastRun).toLocaleString()}
                </p>
              )}
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onRun(automation.id)}
                  disabled={isRunning}
                  className="flex-1 h-6 font-mono text-[8px] tracking-wider uppercase text-green-400/70 hover:text-green-400 hover:bg-green-400/5 rounded-sm border border-green-400/20"
                  data-ocid={`automations.run_button.${index}`}
                >
                  <Play className="w-2.5 h-2.5 mr-1" />
                  {isRunning ? "Running..." : "Run Now"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(automation.id)}
                  className="h-6 px-2 text-destructive/50 hover:text-destructive hover:bg-destructive/5 rounded-sm border border-destructive/20"
                  data-ocid={`automations.delete_button.${index}`}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface CreateFormProps {
  onCreated: (automation: Automation) => void;
  onCancel: () => void;
}

function CreateForm({ onCreated, onCancel }: CreateFormProps) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("session_start");
  const [triggerDetail, setTriggerDetail] = useState("");
  const [actionType, setActionType] = useState<ActionType>("send_message");
  const [actionDetail, setActionDetail] = useState("");

  const triggerOpt = TRIGGER_OPTIONS.find((t) => t.value === triggerType)!;
  const actionOpt = ACTION_OPTIONS.find((a) => a.value === actionType)!;

  const handleCreate = () => {
    if (!name.trim() || !actionDetail.trim()) {
      toast.error("Please fill in the name and action detail");
      return;
    }
    const automation: Automation = {
      id: genId(),
      name: name.trim(),
      trigger: triggerDetail.trim() || triggerOpt.example,
      triggerType,
      action: actionDetail.trim(),
      actionType,
      enabled: true,
      runCount: 0,
      createdAt: Date.now(),
    };
    onCreated(automation);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="p-2.5 rounded-sm bg-card/25 border border-primary/25 space-y-2"
      data-ocid="automations.create_form"
    >
      <p className="font-mono text-[9px] text-primary/70 uppercase tracking-widest">
        New Automation
      </p>

      {/* Name */}
      <div>
        <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
          Name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning Motivator"
          className="w-full h-7 px-2 mt-0.5 rounded-sm font-body text-xs hud-input"
          data-ocid="automations.name_input"
        />
      </div>

      {/* Trigger */}
      <div>
        <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
          Trigger
        </span>
        <select
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as TriggerType)}
          className="w-full h-7 px-2 mt-0.5 rounded-sm font-mono text-[10px] hud-input"
          data-ocid="automations.trigger_select"
        >
          {TRIGGER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={triggerDetail}
          onChange={(e) => setTriggerDetail(e.target.value)}
          placeholder={triggerOpt.example}
          className="w-full h-6 px-2 mt-0.5 rounded-sm font-mono text-[10px] hud-input"
          data-ocid="automations.trigger_detail_input"
        />
      </div>

      {/* Action */}
      <div>
        <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
          Action
        </span>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value as ActionType)}
          className="w-full h-7 px-2 mt-0.5 rounded-sm font-mono text-[10px] hud-input"
          data-ocid="automations.action_select"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={actionDetail}
          onChange={(e) => setActionDetail(e.target.value)}
          placeholder={actionOpt.example}
          className="w-full h-6 px-2 mt-0.5 rounded-sm font-mono text-[10px] hud-input"
          data-ocid="automations.action_detail_input"
        />
      </div>

      <div className="flex gap-1.5">
        <Button
          type="button"
          size="sm"
          onClick={handleCreate}
          className="flex-1 h-7 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
          data-ocid="automations.create_button"
        >
          <Zap className="w-3 h-3 mr-1" />
          Create
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-7 px-3 font-mono text-[9px] uppercase border border-border/30 rounded-sm text-muted-foreground/60 hover:text-foreground"
          data-ocid="automations.cancel_button"
        >
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main TaskAutomation ─────────────────────────────────────────────

export default function TaskAutomation() {
  const [automations, setAutomations] = useState<Automation[]>(() =>
    loadAutomations(),
  );
  const [showCreate, setShowCreate] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"rules" | "log">("rules");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [logRefreshKey, setLogRefreshKey] = useState(0);

  const createReminderMutation = useCreateReminder();

  // Backend createReminder wrapper
  const backendCreateReminder = async (
    title: string,
    note: string,
    dueTime: bigint,
  ) => {
    return createReminderMutation.mutateAsync({ title, note, dueTime });
  };

  // Store createReminder in a ref so the session-start effect
  // can access the latest version without re-firing
  const createReminderRef = useRef(backendCreateReminder);
  useEffect(() => {
    createReminderRef.current = backendCreateReminder;
  });

  // Fire session_start automations once per session
  useEffect(() => {
    const current = loadAutomations();
    if (current.length === 0) return;

    // Small delay so app has finished loading
    const timer = setTimeout(() => {
      void fireSessionStartAutomations(current, createReminderRef.current).then(
        () => {
          setLogRefreshKey((k) => k + 1);
        },
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const persist = (updated: Automation[]) => {
    setAutomations(updated);
    saveAutomations(updated);
  };

  const handleCreated = (automation: Automation) => {
    const updated = [automation, ...automations];
    persist(updated);
    setShowCreate(false);
    toast.success(`Automation "${automation.name}" created`);
  };

  const handleToggle = (id: string) => {
    const updated = automations.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a,
    );
    persist(updated);
  };

  const handleDelete = (id: string) => {
    const target = automations.find((a) => a.id === id);
    const updated = automations.filter((a) => a.id !== id);
    persist(updated);
    if (target) toast.success(`Automation "${target.name}" removed`);
  };

  const handleRun = async (id: string) => {
    const target = automations.find((a) => a.id === id);
    if (!target) return;

    setRunningId(id);
    try {
      await runAutomation(target, backendCreateReminder);

      // Update run count + lastRun
      const updated = automations.map((a) =>
        a.id === id
          ? { ...a, runCount: a.runCount + 1, lastRun: Date.now() }
          : a,
      );
      persist(updated);

      toast.success(`"${target.name}" executed successfully`);
      setLogRefreshKey((k) => k + 1);

      // Switch to log tab so user sees the result
      setActiveSubTab("log");
    } catch {
      toast.error(`Failed to run "${target.name}"`);
    } finally {
      setRunningId(null);
    }
  };

  const activeCount = automations.filter((a) => a.enabled).length;

  return (
    <div className="space-y-2">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary/70" />
          <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
            Task Automations
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeCount > 0 && (
            <Badge
              variant="outline"
              className="h-4 px-1.5 font-mono text-[8px] text-primary/70 border-primary/30 rounded-[2px]"
            >
              {activeCount} active
            </Badge>
          )}
          {activeSubTab === "rules" && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreate((v) => !v)}
              className="h-6 px-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-mono text-[8px] tracking-wider rounded-sm"
              data-ocid="automations.add_button"
            >
              <Plus className="w-2.5 h-2.5 mr-0.5" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Sub-tab switcher: Rules / Log */}
      <div className="flex rounded-sm overflow-hidden border border-border/30">
        <button
          type="button"
          onClick={() => setActiveSubTab("rules")}
          className={`flex-1 h-6 flex items-center justify-center gap-1 font-mono text-[8px] tracking-wider uppercase transition-all ${
            activeSubTab === "rules"
              ? "bg-primary/10 text-primary border-r border-border/30"
              : "bg-card/10 text-muted-foreground/50 hover:text-muted-foreground border-r border-border/30"
          }`}
          data-ocid="automations.rules_tab"
        >
          <Zap className="w-2.5 h-2.5" />
          Rules
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("log")}
          className={`flex-1 h-6 flex items-center justify-center gap-1 font-mono text-[8px] tracking-wider uppercase transition-all ${
            activeSubTab === "log"
              ? "bg-primary/10 text-primary"
              : "bg-card/10 text-muted-foreground/50 hover:text-muted-foreground"
          }`}
          data-ocid="automations.log_tab"
        >
          <ClipboardList className="w-2.5 h-2.5" />
          Log
        </button>
      </div>

      {/* Rules view */}
      {activeSubTab === "rules" && (
        <div className="space-y-2">
          {/* Create form */}
          <AnimatePresence>
            {showCreate && (
              <CreateForm
                onCreated={handleCreated}
                onCancel={() => setShowCreate(false)}
              />
            )}
          </AnimatePresence>

          {/* Automation list */}
          {automations.length === 0 && !showCreate ? (
            <div
              className="py-6 text-center space-y-1.5"
              data-ocid="automations.empty_state"
            >
              <Zap className="w-5 h-5 text-muted-foreground/25 mx-auto" />
              <p className="font-mono text-[10px] text-muted-foreground/50 tracking-wider">
                No automations yet
              </p>
              <p className="font-body text-[10px] text-muted-foreground/40">
                Create rules that let Melina act for you automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence>
                {automations.map((automation, idx) => (
                  <AutomationCard
                    key={automation.id}
                    automation={automation}
                    index={idx + 1}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onRun={(id) => void handleRun(id)}
                    isRunning={runningId === automation.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {automations.length > 0 && (
            <p className="font-mono text-[8px] text-muted-foreground/35 text-center pt-1">
              {automations.length} rule{automations.length !== 1 ? "s" : ""} ·{" "}
              {activeCount} active
            </p>
          )}
        </div>
      )}

      {/* Log view */}
      {activeSubTab === "log" && <AutomationLog refreshKey={logRefreshKey} />}
    </div>
  );
}
