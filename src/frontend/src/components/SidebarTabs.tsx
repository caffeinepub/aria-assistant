import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Camera,
  Check,
  FolderOpen,
  Mail,
  MessageSquare,
  Trash2,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AssistantSettings, IntegrationStatus } from "../backend.d";
import { ChatTone } from "../backend.d";
import {
  useAssistantSettings,
  useCompleteReminder,
  useCreateReminder,
  useDeleteReminder,
  useIntegrationStatus,
  useReminders,
  useSetIntegration,
  useUpdateSettings,
  useUserProfile,
} from "../hooks/useQueries";
import AnalyticsPanel from "./AnalyticsPanel";
import AvatarViewer3D from "./AvatarViewer3D";
import CalendarIntegration from "./CalendarIntegration";
import DashboardPanel from "./DashboardPanel";
import GamingIntegration from "./GamingIntegration";
import GoalsEngine from "./GoalsEngine";
import HabitAnalytics from "./HabitAnalytics";
import HabitsPanel from "./HabitsPanel";
import InsightsPanel from "./InsightsPanel";
import LocationServices from "./LocationServices";
import MemoryPanel from "./MemoryPanel";
import { ConnectedProfileView } from "./PersonalIntelligence";
import SchedulePlanner from "./SchedulePlanner";
import SmartHome from "./SmartHome";
import TaskAutomation from "./TaskAutomation";

// ── Integration grid ────────────────────────────────────────────────
type IntegrationKey = keyof IntegrationStatus;

interface IntegrationCardProps {
  label: string;
  icon: React.ReactNode;
  integrationKey: IntegrationKey;
  enabled: boolean;
  onToggle: (key: string, enabled: boolean) => void;
  isPending: boolean;
  ocid: string;
}

function IntegrationCard({
  label,
  icon,
  integrationKey,
  enabled,
  onToggle,
  isPending,
  ocid,
}: IntegrationCardProps) {
  return (
    <div
      className={`rounded-sm p-2.5 flex flex-col items-center gap-1.5 transition-all ${
        enabled
          ? "integration-card-connected bg-primary/5"
          : "integration-card-disconnected bg-card/20"
      }`}
    >
      <div
        className={`transition-colors ${enabled ? "text-primary" : "text-muted-foreground/40"}`}
      >
        {icon}
      </div>
      <span
        className={`font-mono text-[8px] tracking-wider uppercase ${
          enabled ? "text-primary/80" : "text-muted-foreground/50"
        }`}
      >
        {label}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={(v) => onToggle(integrationKey, v)}
        disabled={isPending}
        className="scale-75 data-[state=checked]:bg-primary"
        data-ocid={ocid}
      />
    </div>
  );
}

// ── Reminders tab ──────────────────────────────────────────────────
function RemindersTab() {
  const { data: reminders = [], isLoading } = useReminders();
  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const deleteReminder = useDeleteReminder();

  const [title, setTitle] = useState("");
  const [dueDateTime, setDueDateTime] = useState("");
  const [note, setNote] = useState("");

  const handleAdd = async () => {
    const trimTitle = title.trim();
    if (!trimTitle || !dueDateTime) return;

    const dueMs = new Date(dueDateTime).getTime();
    if (Number.isNaN(dueMs)) {
      toast.error("Invalid date/time");
      return;
    }

    const dueTimeNs = BigInt(dueMs) * 1_000_000n;

    try {
      await createReminder.mutateAsync({
        title: trimTitle,
        note: note.trim(),
        dueTime: dueTimeNs,
      });
      setTitle("");
      setDueDateTime("");
      setNote("");
      toast.success("Reminder added");
    } catch {
      toast.error("Failed to add reminder");
    }
  };

  const handleComplete = async (id: bigint) => {
    try {
      await completeReminder.mutateAsync(id);
      toast.success("Reminder completed");
    } catch {
      toast.error("Failed to complete reminder");
    }
  };

  const handleDelete = async (id: bigint) => {
    try {
      await deleteReminder.mutateAsync(id);
      toast.success("Reminder deleted");
    } catch {
      toast.error("Failed to delete reminder");
    }
  };

  const sorted = [...reminders].sort((a, b) => {
    const at = Number(a.dueTime) / 1_000_000;
    const bt = Number(b.dueTime) / 1_000_000;
    return at - bt;
  });

  return (
    <div className="space-y-2">
      {/* Add form */}
      <div className="p-2 rounded-sm bg-card/20 border border-border/40 space-y-1.5">
        <input
          type="text"
          placeholder="Reminder title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-7 px-2 rounded-sm font-body text-xs hud-input"
          data-ocid="reminders.input"
        />
        <input
          type="datetime-local"
          value={dueDateTime}
          onChange={(e) => setDueDateTime(e.target.value)}
          className="w-full h-7 px-2 rounded-sm font-mono text-[10px] hud-input"
        />
        <textarea
          placeholder="Optional note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-2 py-1 rounded-sm font-body text-xs hud-input resize-none"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void handleAdd()}
          disabled={!title.trim() || !dueDateTime || createReminder.isPending}
          className="w-full h-7 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
          data-ocid="reminders.add_button"
        >
          {createReminder.isPending ? "Adding..." : "+ Add Reminder"}
        </Button>
      </div>

      {/* Reminder list */}
      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-sm bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-4 text-center" data-ocid="reminders.empty_state">
          <p className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
            No reminders set
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {sorted.map((r, idx) => {
              const dueMs = Number(r.dueTime) / 1_000_000;
              const dueDate = new Date(dueMs);
              const isOverdue = dueMs < Date.now() && !r.completed;

              return (
                <motion.div
                  key={r.id.toString()}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className={`rounded-sm px-2 py-1.5 flex items-start gap-1.5 border transition-all ${
                    r.completed
                      ? "bg-muted/10 border-border/20 opacity-50"
                      : isOverdue
                        ? "bg-destructive/5 border-destructive/25"
                        : "bg-card/20 border-border/40 hover:border-primary/30"
                  }`}
                  data-ocid={`reminders.item.${idx + 1}`}
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p
                      className={`font-body text-xs truncate ${
                        r.completed
                          ? "line-through text-muted-foreground/50"
                          : "text-foreground/85"
                      }`}
                    >
                      {r.title}
                    </p>
                    <p
                      className={`font-mono text-[9px] ${
                        isOverdue && !r.completed
                          ? "text-destructive/70"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {dueDate.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {dueDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {r.note && (
                      <p className="font-body text-[9px] text-muted-foreground/50 truncate">
                        {r.note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                    {!r.completed && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleComplete(r.id)}
                        disabled={completeReminder.isPending}
                        className="h-5 w-5 p-0 text-green-400/60 hover:text-green-400 rounded-sm"
                        data-ocid={`reminders.complete_button.${idx + 1}`}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDelete(r.id)}
                      disabled={deleteReminder.isPending}
                      className="h-5 w-5 p-0 text-destructive/50 hover:text-destructive rounded-sm"
                      data-ocid={`reminders.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Profile tab ──────────────────────────────────────────────────
function ProfileTab() {
  const { data: userProfile } = useUserProfile();
  const { data: settings } = useAssistantSettings();
  const updateSettings = useUpdateSettings();

  const [tone, setTone] = useState<ChatTone>(ChatTone.friendly);
  const [displayName, setDisplayName] = useState("Melina");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setTone(settings.tone);
      setDisplayName(settings.assistantDisplayName || "Melina");
      setNotificationsEnabled(settings.notificationsEnabled);
    }
  }, [settings]);

  const handleSaveSettings = async (patch: Partial<AssistantSettings>) => {
    if (!settings) return;
    try {
      await updateSettings.mutateAsync({
        ...settings,
        ...patch,
      });
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  const toneLabels: Record<ChatTone, string> = {
    [ChatTone.formal]: "Formal",
    [ChatTone.friendly]: "Friendly",
    [ChatTone.casual]: "Teasing",
    [ChatTone.humorous]: "Witty",
  };

  return (
    <div className="space-y-3">
      {userProfile && (
        <div className="p-2.5 rounded-sm bg-card/20 border border-border/40 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider w-12">
              User
            </span>
            <span className="font-body text-xs text-foreground/85 truncate">
              {userProfile.username}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider w-12">
              Email
            </span>
            <span className="font-body text-xs text-foreground/70 truncate">
              {userProfile.email}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
          Assistant Name
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() =>
            void handleSaveSettings({
              assistantDisplayName: displayName.trim() || "Melina",
            })
          }
          placeholder="Melina"
          className="w-full h-7 px-2 rounded-sm font-body text-xs hud-input"
        />
      </div>

      <div className="space-y-1.5">
        <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
          Personality Tone
        </span>
        <div className="grid grid-cols-2 gap-1">
          {(Object.values(ChatTone) as ChatTone[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTone(t);
                void handleSaveSettings({ tone: t });
              }}
              className={`h-7 rounded-sm font-mono text-[9px] tracking-wider uppercase border transition-all ${
                tone === t
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-card/20 border-border/40 text-muted-foreground/60 hover:border-primary/25 hover:text-muted-foreground"
              }`}
            >
              {toneLabels[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-1 border-t border-border/30">
        <span className="font-mono text-[10px] text-muted-foreground/70 tracking-wider uppercase">
          Notifications
        </span>
        <Switch
          checked={notificationsEnabled}
          onCheckedChange={(v) => {
            setNotificationsEnabled(v);
            void handleSaveSettings({ notificationsEnabled: v });
          }}
          className="scale-75 data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  );
}

// ── Integrations tab ────────────────────────────────────────────────
function IntegrationsTab() {
  const { data: status } = useIntegrationStatus();
  const setIntegration = useSetIntegration();

  const handleToggle = (key: string, enabled: boolean) => {
    void setIntegration.mutateAsync({ integration: key, enabled }).catch(() => {
      toast.error(`Failed to update ${key} integration`);
    });
  };

  const integrations: {
    label: string;
    key: IntegrationKey;
    icon: React.ReactNode;
    ocid: string;
  }[] = [
    {
      label: "Calendar",
      key: "calendar",
      icon: <CalendarDays className="w-4 h-4" />,
      ocid: "integrations.calendar_switch",
    },
    {
      label: "Messages",
      key: "messages",
      icon: <MessageSquare className="w-4 h-4" />,
      ocid: "integrations.messages_switch",
    },
    {
      label: "Email",
      key: "email",
      icon: <Mail className="w-4 h-4" />,
      ocid: "integrations.email_switch",
    },
    {
      label: "Files",
      key: "files",
      icon: <FolderOpen className="w-4 h-4" />,
      ocid: "integrations.files_switch",
    },
    {
      label: "Camera",
      key: "camera",
      icon: <Camera className="w-4 h-4" />,
      ocid: "integrations.camera_switch",
    },
    {
      label: "Contacts",
      key: "contacts",
      icon: <Users className="w-4 h-4" />,
      ocid: "integrations.contacts_switch",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] text-muted-foreground/50 tracking-wider">
        PERMISSION-BASED INTEGRATIONS
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {integrations.map((item) => (
          <IntegrationCard
            key={item.key}
            label={item.label}
            icon={item.icon}
            integrationKey={item.key}
            enabled={status?.[item.key] ?? false}
            onToggle={handleToggle}
            isPending={setIntegration.isPending}
            ocid={item.ocid}
          />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border/20">
        <CalendarIntegration />
      </div>
    </div>
  );
}

// ── Main SidebarTabs ────────────────────────────────────────────
export default function SidebarTabs({
  messageCount,
  memoryCount,
  activeTab,
  onTabChange,
  onSendToChat,
}: {
  messageCount: number;
  memoryCount: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSendToChat?: (msg: string) => void;
}) {
  const tabClass =
    "flex-1 h-full rounded-none text-[5.5px] font-mono tracking-[0.03em] uppercase px-0 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border-r border-border/20";

  return (
    <Tabs
      value={activeTab}
      defaultValue="dashboard"
      onValueChange={onTabChange}
      className="flex-1 flex flex-col overflow-hidden sidebar-tabs"
    >
      {/* Row 1: main tabs */}
      <TabsList className="flex w-full rounded-none bg-card/10 border-b border-border/20 h-7 p-0 flex-shrink-0">
        <TabsTrigger
          value="dashboard"
          className={tabClass}
          data-ocid="sidebar.dashboard_tab"
        >
          Dash
        </TabsTrigger>
        <TabsTrigger
          value="stats"
          className={tabClass}
          data-ocid="sidebar.stats_tab"
        >
          Stats
        </TabsTrigger>
        <TabsTrigger
          value="insights"
          className={tabClass}
          data-ocid="sidebar.insights_tab"
        >
          Insght
        </TabsTrigger>
        <TabsTrigger
          value="profile"
          className={tabClass}
          data-ocid="sidebar.profile_tab"
        >
          Prof
        </TabsTrigger>
        <TabsTrigger
          value="reminders"
          className={tabClass}
          data-ocid="sidebar.reminders_tab"
        >
          Rmnd
        </TabsTrigger>
      </TabsList>

      {/* Row 2: secondary tabs */}
      <TabsList className="flex w-full rounded-none bg-card/10 border-b border-border/30 h-7 p-0 flex-shrink-0">
        <TabsTrigger
          value="schedule"
          className={tabClass}
          data-ocid="sidebar.schedule_tab"
        >
          Sched
        </TabsTrigger>
        <TabsTrigger
          value="habits"
          className={tabClass}
          data-ocid="sidebar.habits_tab"
        >
          Habits
        </TabsTrigger>
        <TabsTrigger
          value="habit-analytics"
          className={tabClass}
          data-ocid="sidebar.habit_analytics_tab"
        >
          H.Stats
        </TabsTrigger>
        <TabsTrigger
          value="memory"
          className={tabClass}
          data-ocid="sidebar.memory_tab"
        >
          Mem
        </TabsTrigger>
        <TabsTrigger
          value="integrations"
          className={tabClass}
          data-ocid="sidebar.integrations_tab"
        >
          Intgr
        </TabsTrigger>
        <TabsTrigger
          value="automate"
          className={tabClass}
          data-ocid="sidebar.automate_tab"
        >
          Auto
        </TabsTrigger>
        <TabsTrigger
          value="you"
          className={tabClass}
          data-ocid="sidebar.you_tab"
        >
          You
        </TabsTrigger>
        <TabsTrigger
          value="smart-home"
          className={tabClass}
          data-ocid="sidebar.smarthome_tab"
        >
          Home
        </TabsTrigger>
        <TabsTrigger
          value="gaming"
          className={tabClass}
          data-ocid="sidebar.gaming_tab"
        >
          Game
        </TabsTrigger>
        <TabsTrigger
          value="location"
          className={tabClass}
          data-ocid="sidebar.location_tab"
        >
          Loc
        </TabsTrigger>
        <TabsTrigger
          value="goals"
          className={tabClass}
          data-ocid="sidebar.goals_tab"
        >
          Goals
        </TabsTrigger>
        <TabsTrigger
          value="avatar3d"
          className={tabClass}
          data-ocid="sidebar.avatar3d_tab"
        >
          3D
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="dashboard" className="m-0 p-2">
          <DashboardPanel />
        </TabsContent>

        <TabsContent value="stats" className="m-0 p-2">
          <AnalyticsPanel />
        </TabsContent>

        <TabsContent value="insights" className="m-0 p-2">
          <InsightsPanel onNavigate={onTabChange ?? (() => {})} />
        </TabsContent>

        <TabsContent value="profile" className="m-0 p-2 space-y-2">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="reminders" className="m-0 p-2">
          <RemindersTab />
        </TabsContent>

        <TabsContent value="schedule" className="m-0 p-2 h-full">
          <SchedulePlanner />
        </TabsContent>

        <TabsContent value="habits" className="m-0 p-2">
          <HabitsPanel />
        </TabsContent>

        <TabsContent value="habit-analytics" className="m-0 p-2">
          <HabitAnalytics />
        </TabsContent>

        <TabsContent value="memory" className="m-0 p-2">
          <MemoryPanel />
        </TabsContent>

        <TabsContent value="integrations" className="m-0 p-2">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="automate" className="m-0 p-2">
          <TaskAutomation />
        </TabsContent>
        <TabsContent value="you" className="m-0 p-2">
          <ConnectedProfileView />
        </TabsContent>
        <TabsContent value="smart-home" className="m-0 p-2">
          <SmartHome />
        </TabsContent>
        <TabsContent value="gaming" className="m-0 p-2">
          <GamingIntegration />
        </TabsContent>
        <TabsContent value="location" className="m-0 p-0 h-full">
          <LocationServices onSendToChat={onSendToChat ?? (() => {})} />
        </TabsContent>
        <TabsContent value="goals" className="m-0 p-2">
          <GoalsEngine />
        </TabsContent>
        <TabsContent value="avatar3d" className="m-0 p-2 h-full">
          <AvatarViewer3D />
        </TabsContent>
      </div>

      {/* HUD data strips at bottom */}
      <div className="flex-shrink-0 space-y-1 px-2 py-1.5 border-t border-border/20">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
            Messages
          </span>
          <span className="font-mono text-[9px] text-primary/60">
            {messageCount}
          </span>
        </div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
            Memories
          </span>
          <span className="font-mono text-[9px] text-primary/60">
            {memoryCount}
          </span>
        </div>
      </div>
    </Tabs>
  );
}
