import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Brain,
  CalendarDays,
  Clock,
  Gauge,
  Keyboard,
  LogOut,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  Search,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatTone } from "../backend.d";
import NotificationAdvisor from "../components/NotificationAdvisor";
import SettingsSheet from "../components/SettingsSheet";
import SidebarTabs from "../components/SidebarTabs";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAssistantSettings,
  useChatHistory,
  useClearChat,
  useMemoryEntries,
  useNotifications,
  useReminders,
  useSaveUserProfile,
  useSendMessage,
  useUpdateMemory,
  useUpdateSettings,
  useUserProfile,
} from "../hooks/useQueries";
import { generateMelinaResponse, getGreetingPool } from "../lib/melina-engine";

type MelinaStatus = "idle" | "thinking" | "responding" | "alert";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  audioUrl?: string;
  isVoiceNote?: boolean;
  pendingSend?: boolean;
};

function formatTime(ts: number | bigint): string {
  const date = new Date(typeof ts === "bigint" ? Number(ts) / 1_000_000 : ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusDot({ status }: { status: MelinaStatus }) {
  const config: Record<
    MelinaStatus,
    { dot: string; label: string; color: string }
  > = {
    idle: {
      dot: "pulse-idle bg-cyan",
      label: "IDLE",
      color: "text-primary/70",
    },
    thinking: {
      dot: "pulse-thinking bg-yellow-400",
      label: "THINKING",
      color: "text-yellow-400/80",
    },
    responding: {
      dot: "pulse-responding bg-green-400",
      label: "RESPONDING",
      color: "text-green-400/80",
    },
    alert: {
      dot: "bg-destructive pulse-alert",
      label: "ALERT",
      color: "text-destructive/80",
    },
  };

  const cfg = config[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span
        className={`font-mono text-[9px] tracking-[0.3em] uppercase ${cfg.color}`}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function getExpressionClass(status: MelinaStatus): string {
  const map: Record<MelinaStatus, string> = {
    idle: "expr-idle",
    thinking: "expr-thinking",
    responding: "expr-responding",
    alert: "expr-alert",
  };
  return map[status];
}

// ─── Command Palette ─────────────────────────────────────────────────

interface CommandPaletteAction {
  id: string;
  label: string;
  ocid: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
}

function CommandPaletteModal({
  open,
  onClose,
  actions,
}: CommandPaletteModalProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          data-ocid="command_palette.dialog"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative z-10 w-full max-w-sm mx-4 rounded-sm bg-card border border-primary/30 shadow-[0_0_40px_rgba(0,255,247,0.12)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HUD corner decorations */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/60 pointer-events-none" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/60 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/60 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/60 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
              <Search className="w-3.5 h-3.5 text-primary/50 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent font-mono text-xs text-foreground/90 placeholder:text-muted-foreground/40 outline-none"
                data-ocid="command_palette.search_input"
              />
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                aria-label="Close command palette"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Label */}
            <div className="px-3 pt-2 pb-1">
              <span className="font-mono text-[7px] text-muted-foreground/40 tracking-widest uppercase">
                Commands
              </span>
            </div>

            {/* Actions */}
            <div className="pb-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 font-mono text-[10px] text-muted-foreground/50 text-center">
                  No commands match
                </p>
              ) : (
                filtered.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 font-body text-xs text-foreground/80 hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2"
                    data-ocid={action.ocid}
                  >
                    <span className="w-1 h-1 rounded-full bg-primary/40 flex-shrink-0" />
                    {action.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Full-Screen Avatar Overlay ───────────────────────────────────────

interface FullScreenAvatarProps {
  open: boolean;
  onClose: () => void;
  status: MelinaStatus;
  displayName: string;
  lastMessage: string;
}

function FullScreenAvatar({
  open,
  onClose,
  status,
  displayName,
  lastMessage,
}: FullScreenAvatarProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          data-ocid="avatar.fullscreen_modal"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-background/98 backdrop-blur-md" />

          {/* HUD scanline overlay */}
          <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />

          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/40 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/40 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/40 pointer-events-none" />

          {/* Top HUD labels */}
          <div className="absolute top-6 left-6 font-mono text-[9px] text-primary/40 tracking-widest z-10">
            ARIA·UNIT·001
          </div>
          <div className="absolute top-6 right-12 font-mono text-[9px] text-primary/40 tracking-widest z-10">
            FULLSCREEN·MODE
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-sm border border-border/40 text-muted-foreground/60 hover:text-primary hover:border-primary/40 bg-card/20 backdrop-blur-sm transition-all"
            aria-label="Exit full-screen"
            data-ocid="avatar.fullscreen_close_button"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-6 px-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`relative rounded-sm overflow-hidden border-2 border-primary/40 avatar-glow ${getExpressionClass(status)}`}
              style={{ width: "min(480px, 85vw)", maxHeight: "65vh" }}
            >
              {/* Expression ring */}
              <div
                className={`absolute inset-0 z-10 pointer-events-none ${getExpressionClass(status)}`}
              />
              <img
                src="/assets/generated/melina-avatar.dim_600x800.png"
                alt="Melina"
                className="w-full h-full object-cover object-top"
                style={{ maxHeight: "65vh" }}
              />
              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background/80 to-transparent" />
              {/* Name overlay */}
              <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                <h2 className="font-display text-3xl font-bold tracking-[0.4em] glow-cyan text-primary uppercase">
                  {displayName.toUpperCase()}
                </h2>
                <div className="flex justify-center mt-2">
                  <StatusDot status={status} />
                </div>
              </div>
            </motion.div>

            {/* Last message subtitle */}
            {lastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="max-w-md text-center"
              >
                <p
                  className="font-body text-sm text-muted-foreground/70 italic leading-relaxed line-clamp-2"
                  style={{
                    WebkitLineClamp: 2,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  &ldquo;{lastMessage}&rdquo;
                </p>
              </motion.div>
            )}
          </div>

          {/* Bottom HUD strip */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className="font-mono text-[8px] text-primary/30 tracking-[0.4em] uppercase">
              Press ESC to exit
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ChatPage ─────────────────────────────────────────────────────────

export default function ChatPage() {
  const { clear } = useInternetIdentity();
  const { data: chatHistory = [], isLoading: historyLoading } =
    useChatHistory();
  const { data: memoryEntries = [] } = useMemoryEntries();
  const { data: userProfile } = useUserProfile();
  const { data: notifications = [] } = useNotifications();
  const { data: reminders = [] } = useReminders();
  const { data: assistantSettings } = useAssistantSettings();
  const saveProfile = useSaveUserProfile();
  const sendMessage = useSendMessage();
  const clearChat = useClearChat();
  const updateMemory = useUpdateMemory();
  const updateSettings = useUpdateSettings();

  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState<MelinaStatus>("idle");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileActiveNavTab, setMobileActiveNavTab] = useState<string>("chat");

  // TTS state
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  // Auto-speak state (localStorage-backed)
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(
    () => localStorage.getItem("aria_auto_speak") === "true",
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const reminderInjectedRef = useRef(false);
  const insightInjectedRef = useRef(false);
  const alertShownRef = useRef(false);

  // Derived unread count and display status
  const unreadCount = notifications.filter((n) => !n.dismissed).length;
  const displayStatus: MelinaStatus =
    status === "idle" && unreadCount > 0 ? "alert" : status;

  // Derived user name from memory or profile
  const nameMemory = memoryEntries.find((e) => e.key.toLowerCase() === "name");
  const userName = nameMemory?.value || userProfile?.username || "there";

  // Pending reminders count
  const pendingRemindersData = reminders.filter((r) => !r.completed);

  // Last Melina message for fullscreen subtitle
  const lastMelinaMsg = [...localMessages]
    .reverse()
    .find((m) => m.role === "assistant");

  // Save pending profile from registration
  useEffect(() => {
    if (userProfile === null && !profileSaved) {
      const pending = sessionStorage.getItem("aria_pending_profile");
      if (pending) {
        try {
          const parsed = JSON.parse(pending) as {
            username: string;
            email: string;
          };
          void saveProfile.mutateAsync(parsed).then(() => {
            sessionStorage.removeItem("aria_pending_profile");
            setProfileSaved(true);
          });
        } catch {
          // ignore parse errors
        }
      }
    }
  }, [userProfile, profileSaved, saveProfile]);

  // Sync backend history to local messages
  useEffect(() => {
    if (chatHistory.length > 0 && localMessages.length === 0) {
      const synced: LocalMessage[] = chatHistory.map((m, i) => ({
        id: `hist-${i}`,
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
        timestamp: Number(m.timestamp) / 1_000_000,
      }));
      setLocalMessages(synced);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [chatHistory, localMessages.length]);

  // Proactive reminder injection (once per session)
  useEffect(() => {
    if (reminderInjectedRef.current) return;
    if (historyLoading) return;
    if (reminders.length === 0) return;

    const now = Date.now();
    const next24hNs = BigInt(now + 24 * 60 * 60 * 1000) * 1_000_000n;
    const upcoming = reminders.filter(
      (r) => !r.completed && r.dueTime <= next24hNs,
    );

    if (upcoming.length > 0) {
      reminderInjectedRef.current = true;
      const first = upcoming.sort((a, b) =>
        a.dueTime < b.dueTime ? -1 : 1,
      )[0];
      const injected: LocalMessage = {
        id: `proactive-reminder-${Date.now()}`,
        role: "assistant",
        content: `You have ${upcoming.length} reminder${upcoming.length > 1 ? "s" : ""} coming up soon. Your next one: "${first.title}". Would you like me to help prepare?`,
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => {
        if (prev.length > 0 && prev[0].id.startsWith("proactive-reminder")) {
          return prev;
        }
        return [injected, ...prev];
      });
    }
  }, [reminders, historyLoading]);

  // Proactive insight injection (once per session, after habit/reminder data loads)
  useEffect(() => {
    if (insightInjectedRef.current) return;
    if (historyLoading) return;

    // Only inject if user has habits or reminders
    let habitsRaw: { id: string; name: string; createdAt: number }[] = [];
    try {
      const raw = localStorage.getItem("aria_habits");
      habitsRaw = raw ? (JSON.parse(raw) as typeof habitsRaw) : [];
    } catch {
      habitsRaw = [];
    }

    const hasData = habitsRaw.length > 0 || reminders.length > 0;
    if (!hasData) return;

    insightInjectedRef.current = true;

    const tone = assistantSettings?.tone ?? ChatTone.friendly;
    const name = userName !== "there" ? userName : "";

    // Pick an at-risk habit if any
    const atRiskHabit = habitsRaw.find((h) => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return h.createdAt < oneDayAgo;
    });

    let body = "";
    if (atRiskHabit) {
      const habitName = atRiskHabit.name;
      const toneMap: Record<ChatTone, string> = {
        [ChatTone.casual]: `Hey${name ? ` ${name}` : ""}... I noticed "${habitName}" hasn't been checked in lately. Your streak's looking a little lonely. Head to Habits to log it — I'll be here not judging you. (I'm judging a little.)`,
        [ChatTone.humorous]: `${name ? `${name}, ` : ""}just running a background analysis and "${habitName}" raised a flag. The streak counter is giving me worried eyes. Head to Habits — save us both the drama.`,
        [ChatTone.friendly]: `${name ? `Hi ${name}! ` : ""}I noticed "${habitName}" hasn't been logged in a while. Want to head to the Habits tab and check in? Every step counts! Head over to Insights for a full picture.`,
        [ChatTone.formal]: `${name ? `${name}, ` : ""}a review of your habit data indicates "${habitName}" may be falling behind schedule. I recommend visiting the Habits tab to log your progress and checking the Insights tab for a full report.`,
      };
      body = toneMap[tone];
    } else if (reminders.length > 0) {
      const pending = reminders.filter((r) => !r.completed);
      if (pending.length > 0) {
        const toneMap: Record<ChatTone, string> = {
          [ChatTone.casual]: `${name ? `Hey ${name}, ` : ""}you've got ${pending.length} reminder${pending.length > 1 ? "s" : ""} waiting. Check the Insights tab — I've put together some thoughts on your day.`,
          [ChatTone.humorous]: `${name ? `${name}, ` : ""}${pending.length} reminder${pending.length > 1 ? "s" : ""} detected. The Insights tab has my full professional assessment of your situation. Spoiler: you've got things to do.`,
          [ChatTone.friendly]: `${name ? `${name}, ` : ""}I see you have ${pending.length} pending reminder${pending.length > 1 ? "s" : ""}. Hop over to the Insights tab for my personalized suggestions for today!`,
          [ChatTone.formal]: `${name ? `${name}, ` : ""}you currently have ${pending.length} pending reminder${pending.length > 1 ? "s" : ""}. I have compiled relevant insights in the Insights panel for your review.`,
        };
        body = toneMap[tone];
      }
    }

    if (!body) return;

    const injected: LocalMessage = {
      id: `proactive-insight-${Date.now()}`,
      role: "assistant",
      content: body,
      timestamp: Date.now(),
    };

    setTimeout(() => {
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id.startsWith("proactive-insight"))) return prev;
        return [...prev, injected];
      });
    }, 4000); // delay so reminder injection goes first
  }, [reminders, historyLoading, userName, assistantSettings?.tone]);

  // Alert status flash when unread notifications appear
  useEffect(() => {
    if (alertShownRef.current) return;
    if (
      unreadCount > 0 &&
      (assistantSettings?.notificationsEnabled ?? true) &&
      status === "idle"
    ) {
      alertShownRef.current = true;
      setStatus("alert" as MelinaStatus);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [unreadCount, assistantSettings?.notificationsEnabled, status]);

  // Hide welcome overlay after 3.5s
  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement;

      // Escape
      if (e.key === "Escape") {
        if (isFullScreen) {
          setIsFullScreen(false);
          return;
        }
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
      }

      // Ctrl+K / Cmd+K → command palette
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }

      // Ctrl+Shift+M / Cmd+Shift+M → toggle memory tracking
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "m") {
        e.preventDefault();
        if (assistantSettings) {
          void updateSettings
            .mutateAsync({
              ...assistantSettings,
              memoryTrackingEnabled: !assistantSettings.memoryTrackingEnabled,
            })
            .then(() => {
              toast.success(
                `Memory tracking ${!assistantSettings.memoryTrackingEnabled ? "enabled" : "disabled"}`,
              );
            });
        }
        return;
      }

      // "/" → focus chat input (when not already in an input)
      if (e.key === "/" && !isInInput) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullScreen, commandPaletteOpen, assistantSettings, updateSettings]);

  // ── Sync auto-speak from localStorage storage events ─────────────────
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "aria_auto_speak") {
        setAutoSpeakEnabled(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ── Auto-scroll helper ───────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  // ── Greeting ──────────────────────────────────────────────────────────
  const getGreeting = useCallback((): string => {
    const tone = assistantSettings?.tone ?? ChatTone.friendly;
    const hour = new Date().getHours();
    return getGreetingPool(tone, userName, pendingRemindersData.length, hour);
  }, [assistantSettings, userName, pendingRemindersData.length]);

  // ── Send message ──────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg || sendMessage.isPending) return;

    const userMsg: LocalMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: Date.now(),
    };

    setLocalMessages((prev) => [...prev, userMsg]);
    scrollToBottom();
    setInputText("");
    setStatus("thinking");

    try {
      // Persist to backend (for history)
      await sendMessage.mutateAsync(msg);
      setStatus("responding");

      // Generate Melina's response via personality engine
      const tone = assistantSettings?.tone ?? ChatTone.friendly;
      const engineResult = generateMelinaResponse({
        message: msg,
        tone,
        userName,
        memoryEntries,
        pendingReminders: pendingRemindersData,
        chatHistory: localMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const aiMsg: LocalMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: engineResult.response,
        timestamp: Date.now(),
      };

      setLocalMessages((prev) => [...prev, aiMsg]);
      scrollToBottom();

      // Auto-speak if enabled
      if (autoSpeakEnabled && hasTTS) {
        speak(aiMsg.id, aiMsg.content);
      }

      // If a name was learned, store it in memory
      if (engineResult.learnedName) {
        void updateMemory.mutateAsync({
          key: "name",
          value: engineResult.learnedName,
        });
      }

      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      toast.error("Melina is unavailable. Try again.");
      setStatus("idle");
    }
  };

  const handleClearChat = async () => {
    try {
      await clearChat.mutateAsync();
      setLocalMessages([]);
      toast.success("Chat history cleared");
    } catch {
      toast.error("Failed to clear chat");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);

        const voiceMsg: LocalMessage = {
          id: `vn-${Date.now()}`,
          role: "user",
          content: "[Voice note recorded]",
          timestamp: Date.now(),
          audioUrl: url,
          isVoiceNote: true,
          pendingSend: true,
        };
        setLocalMessages((prev) => [...prev, voiceMsg]);
        scrollToBottom();

        for (const t of stream.getTracks()) t.stop();
      };

      mr.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  // TTS helpers
  const speak = (id: string, text: string) => {
    if (!hasTTS) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1.1;
    utt.onend = () => setSpeakingId(null);
    utt.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utt);
  };

  const stopSpeaking = () => {
    if (hasTTS) window.speechSynthesis.cancel();
    setSpeakingId(null);
  };

  // Voice note dismiss
  const dismissVoiceNote = (id: string) => {
    if (speakingId) stopSpeaking();
    setLocalMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // Send voice note to Melina
  const sendVoiceNote = (id: string) => {
    setLocalMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pendingSend: false } : m)),
    );
    void handleSend(
      "[Voice note received — please respond to my voice message]",
    );
  };

  const allMessages = localMessages;

  // ── Command Palette Actions ─────────────────────────────────────────
  const commandActions: CommandPaletteAction[] = [
    {
      id: "fullscreen",
      label: "Open Full-Screen Avatar",
      ocid: "command_palette.item.1",
      action: () => setIsFullScreen(true),
    },
    {
      id: "new-reminder",
      label: "New Reminder",
      ocid: "command_palette.item.2",
      action: () => setActiveTab("reminders"),
    },
    {
      id: "clear-chat",
      label: "Clear Chat History",
      ocid: "command_palette.item.3",
      action: () => {
        void handleClearChat();
      },
    },
    {
      id: "toggle-memory",
      label: "Toggle Memory Tracking",
      ocid: "command_palette.item.4",
      action: () => {
        if (assistantSettings) {
          void updateSettings
            .mutateAsync({
              ...assistantSettings,
              memoryTrackingEnabled: !assistantSettings.memoryTrackingEnabled,
            })
            .then(() => {
              toast.success(
                `Memory tracking ${!assistantSettings.memoryTrackingEnabled ? "enabled" : "disabled"}`,
              );
            });
        }
      },
    },
    {
      id: "mute-notifications",
      label: "Mute Notifications",
      ocid: "command_palette.item.5",
      action: () => {
        if (assistantSettings) {
          void updateSettings
            .mutateAsync({
              ...assistantSettings,
              notificationsEnabled: false,
            })
            .then(() => {
              toast.success("Notifications muted");
            });
        }
      },
    },
    {
      id: "go-analytics",
      label: "Go to Analytics",
      ocid: "command_palette.item.6",
      action: () => setActiveTab("stats"),
    },
    {
      id: "go-schedule",
      label: "Open Schedule Planner",
      ocid: "command_palette.item.7",
      action: () => setActiveTab("schedule"),
    },
    {
      id: "go-insights",
      label: "View Insights",
      ocid: "command_palette.item.8",
      action: () => setActiveTab("insights"),
    },
  ];

  const displayName = assistantSettings?.assistantDisplayName || "Melina";

  return (
    <div className="h-screen bg-background hud-grid flex flex-col overflow-hidden relative">
      {/* Full-screen avatar overlay */}
      <FullScreenAvatar
        open={isFullScreen}
        onClose={() => setIsFullScreen(false)}
        status={displayStatus}
        displayName={displayName}
        lastMessage={lastMelinaMsg?.content ?? ""}
      />

      {/* Command palette */}
      <CommandPaletteModal
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        actions={commandActions}
      />

      {/* Welcome Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className={`w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-primary/50 avatar-glow ${getExpressionClass(displayStatus)}`}
              >
                <img
                  src="/assets/generated/melina-avatar.dim_600x800.png"
                  alt="Melina"
                  className="w-full h-full object-cover object-top"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <h1 className="font-display text-4xl font-bold glow-cyan text-primary tracking-widest">
                  {displayName.toUpperCase()}
                </h1>
                <p className="font-mono text-xs text-muted-foreground mt-1 tracking-[0.3em] uppercase">
                  ARIA Intelligence Online
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 pulse-responding" />
                <span className="font-mono text-xs text-green-400/80 tracking-widest">
                  SYSTEM READY
                </span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="font-body text-sm text-muted-foreground max-w-xs mx-auto"
              >
                {getGreeting()}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Nav */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/20 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile: avatar button to open sidebar sheet */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="w-6 h-6 rounded-full overflow-hidden border border-primary/40 flex-shrink-0 md:pointer-events-none"
            aria-label="Open sidebar"
            data-ocid="mobile.avatar_button"
          >
            <img
              src="/assets/generated/melina-avatar.dim_600x800.png"
              alt="Melina"
              className="w-full h-full object-cover object-top"
            />
          </button>
          <div>
            <span className="font-mono text-xs tracking-widest text-primary uppercase">
              ARIA
            </span>
            <span className="font-mono text-[9px] text-muted-foreground ml-2 tracking-wider">
              v5.0.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Speaking indicator */}
          <AnimatePresence>
            {speakingId !== null && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all"
                aria-label="Stop speaking"
                data-ocid="chat.speaking_indicator"
              >
                {/* Animated wave bars */}
                <span className="flex items-end gap-0.5 h-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-full bg-primary"
                      style={{
                        height: `${40 + i * 20}%`,
                        animation: `wave-bar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                      }}
                    />
                  ))}
                </span>
                <span className="font-mono text-[8px] tracking-[0.2em] text-primary uppercase">
                  SPEAKING
                </span>
                <VolumeX className="w-2.5 h-2.5 text-primary/70" />
              </motion.button>
            )}
          </AnimatePresence>

          {userProfile && (
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider hidden sm:block">
              {userProfile.username}
            </span>
          )}

          {/* Command palette trigger */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCommandPaletteOpen(true)}
            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-primary rounded-sm"
            title="Command Palette (Ctrl+K)"
            data-ocid="command_palette_open"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </Button>

          {/* Settings gear */}
          <SettingsSheet />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-7 px-2 text-muted-foreground hover:text-destructive font-mono text-xs tracking-wider rounded-sm"
            data-ocid="nav.logout_button"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Disconnect</span>
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-card/95 border-r border-border/60 flex flex-col backdrop-blur-md"
          data-ocid="mobile.sidebar_sheet"
        >
          {/* Avatar section in sheet */}
          <div className="relative flex-shrink-0">
            <div className="relative overflow-hidden scanlines">
              <div
                className={`absolute inset-0 z-10 pointer-events-none rounded-sm ${getExpressionClass(displayStatus)}`}
              />
              <img
                src="/assets/generated/melina-avatar.dim_600x800.png"
                alt="Melina Avatar"
                className="w-full object-cover avatar-glow"
                style={{ maxHeight: "200px", objectPosition: "top" }}
              />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute top-2 left-2 font-mono text-[8px] text-primary/60 tracking-widest z-20">
                ARIA·UNIT·001
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center z-20">
                <h2 className="font-display text-lg font-bold tracking-[0.4em] glow-cyan text-primary uppercase">
                  {displayName.toUpperCase()}
                </h2>
              </div>
            </div>
            <div className="flex justify-center py-1.5 border-b border-border/30">
              <StatusDot status={displayStatus} />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <SidebarTabs
              messageCount={allMessages.length}
              memoryCount={memoryEntries.length}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel (hidden on mobile) ── */}
        <aside className="hidden md:flex w-72 xl:w-80 flex-shrink-0 border-r border-border/50 flex-col bg-card/10 backdrop-blur-sm overflow-hidden">
          {/* Avatar section */}
          <div className="relative flex-shrink-0">
            <div className="relative overflow-hidden scanlines">
              {/* Expression ring overlay */}
              <div
                className={`absolute inset-0 z-10 pointer-events-none rounded-sm ${getExpressionClass(displayStatus)}`}
              />

              <img
                src="/assets/generated/melina-avatar.dim_600x800.png"
                alt="Melina Avatar"
                className="w-full object-cover avatar-glow"
                style={{ maxHeight: "240px", objectPosition: "top" }}
              />

              {/* Overlay gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />

              {/* HUD overlay elements */}
              <div className="absolute top-2 left-2 font-mono text-[8px] text-primary/60 tracking-widest z-20">
                ARIA·UNIT·001
              </div>
              <div className="absolute top-2 right-2 font-mono text-[8px] text-primary/60 tracking-widest z-20">
                ONLINE
              </div>

              {/* Fullscreen button */}
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="absolute bottom-8 right-2 z-20 p-1.5 rounded-sm border border-primary/30 text-primary/50 hover:text-primary hover:border-primary/60 bg-background/40 backdrop-blur-sm transition-all"
                aria-label="Full-screen avatar"
                data-ocid="avatar.fullscreen_button"
              >
                <Maximize2 className="w-3 h-3" />
              </button>

              {/* Bottom name overlay */}
              <div className="absolute bottom-3 left-0 right-8 text-center z-20">
                <h2 className="font-display text-xl font-bold tracking-[0.4em] glow-cyan text-primary uppercase">
                  {displayName.toUpperCase()}
                </h2>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex justify-center py-1.5 border-b border-border/30">
              <StatusDot status={displayStatus} />
            </div>
          </div>

          {/* Tabbed sidebar */}
          <SidebarTabs
            messageCount={allMessages.length}
            memoryCount={memoryEntries.length}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </aside>

        {/* ── Right Panel ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chat area */}
          <ScrollArea
            className="flex-1"
            ref={scrollRef as React.RefObject<HTMLDivElement>}
          >
            <div className="p-4 space-y-3 min-h-full">
              {historyLoading ? (
                /* Skeleton loader */
                <div className="space-y-3" data-ocid="chat.loading_state">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
                    >
                      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                      <Skeleton
                        className={`h-12 rounded-sm ${i % 2 === 0 ? "w-1/2" : "w-2/3"}`}
                      />
                    </div>
                  ))}
                </div>
              ) : allMessages.length === 0 ? (
                /* Empty state */
                <div
                  className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4"
                  data-ocid="chat.empty_state"
                >
                  <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary/50 pulse-idle" />
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                      No messages yet
                    </p>
                    <p className="font-body text-sm text-muted-foreground/60 mt-1">
                      Say something to Melina
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground/40 mt-2 tracking-wider">
                      Press / to focus input · Ctrl+K for commands
                    </p>
                  </div>
                </div>
              ) : (
                /* Messages */
                <>
                  {allMessages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 15, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={`flex gap-2 items-end ${
                        msg.role === "user" ? "flex-row-reverse" : ""
                      }`}
                      data-ocid={`chat.message.item.${idx + 1}`}
                    >
                      {/* Avatar icon for Melina */}
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/30 flex-shrink-0 mb-1">
                          <img
                            src="/assets/generated/melina-avatar.dim_600x800.png"
                            alt="Melina"
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                      )}

                      <div
                        className={`max-w-[70%] space-y-1 ${
                          msg.role === "user" ? "items-end" : "items-start"
                        } flex flex-col`}
                      >
                        {/* Bubble */}
                        <div
                          className={`rounded-sm px-3 py-2 ${
                            msg.role === "user"
                              ? "bubble-user"
                              : "bubble-melina"
                          }`}
                        >
                          {msg.isVoiceNote && msg.audioUrl ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Mic className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                                <audio
                                  controls
                                  src={msg.audioUrl}
                                  className="h-7 w-48 sm:w-64"
                                  style={{ minWidth: "160px" }}
                                >
                                  <track kind="captions" />
                                </audio>
                              </div>
                              {msg.pendingSend && (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => sendVoiceNote(msg.id)}
                                    className="font-mono text-[9px] px-2 py-0.5 rounded-sm border border-primary/40 text-primary/80 hover:bg-primary/10 hover:border-primary/70 transition-all"
                                    data-ocid="chat.voice_send_button"
                                  >
                                    Send to Melina
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => dismissVoiceNote(msg.id)}
                                    className="h-5 w-5 flex items-center justify-center rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                    data-ocid="chat.voice_dismiss_button"
                                    aria-label="Dismiss voice note"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="font-body text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                              {msg.content}
                            </p>
                          )}
                        </div>

                        {/* Timestamp + TTS button */}
                        <div className="flex items-center gap-1 px-1">
                          <span className="font-mono text-[9px] text-muted-foreground/60">
                            {formatTime(msg.timestamp)}
                          </span>
                          {msg.role === "assistant" && hasTTS && (
                            <button
                              type="button"
                              onClick={() => speak(msg.id, msg.content)}
                              className={`h-5 w-5 p-0 flex items-center justify-center rounded-sm transition-all ${
                                speakingId === msg.id
                                  ? "text-primary drop-shadow-[0_0_4px_currentColor]"
                                  : "text-muted-foreground/30 hover:text-muted-foreground/70"
                              }`}
                              aria-label={
                                speakingId === msg.id
                                  ? "Stop speaking"
                                  : "Read aloud"
                              }
                              data-ocid={`chat.tts_button.${idx + 1}`}
                            >
                              {speakingId === msg.id ? (
                                <VolumeX className="w-3 h-3" />
                              ) : (
                                <Volume2 className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Thinking indicator */}
                  <AnimatePresence>
                    {status === "thinking" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2 items-end"
                        data-ocid="chat.loading_state"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/30 flex-shrink-0">
                          <img
                            src="/assets/generated/melina-avatar.dim_600x800.png"
                            alt="Melina"
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="bubble-melina rounded-sm px-4 py-3 flex gap-1.5 items-center">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Notification Advisor (between messages and input) */}
          <NotificationAdvisor
            notificationsEnabled={
              assistantSettings?.notificationsEnabled ?? true
            }
          />

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-border/50 bg-card/10 backdrop-blur-sm p-3">
            <div className="flex items-center gap-2">
              {/* Clear button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground/60 hover:text-destructive rounded-sm flex-shrink-0"
                    data-ocid="chat.clear_button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border font-body max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-foreground">
                      Clear Chat History
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground font-mono text-xs">
                      This will permanently delete all messages. Melina&apos;s
                      memories will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      className="font-mono text-xs rounded-sm"
                      data-ocid="chat.cancel_button"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleClearChat()}
                      className="bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/40 font-mono text-xs rounded-sm"
                      data-ocid="chat.confirm_button"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={
                  isRecording ? "Recording voice note..." : "Message Melina..."
                }
                disabled={isRecording || sendMessage.isPending}
                className="flex-1 h-9 px-3 rounded-sm font-body text-sm hud-input disabled:opacity-50"
                autoComplete="off"
                data-ocid="chat.input"
              />

              {/* Voice button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleVoiceToggle}
                className={`h-9 w-9 p-0 rounded-sm flex-shrink-0 transition-all ${
                  isRecording
                    ? "text-destructive border border-destructive/40 recording bg-destructive/10"
                    : "text-muted-foreground hover:text-primary hover:border-primary/40"
                }`}
                data-ocid="chat.voice_button"
              >
                {isRecording ? (
                  <StopCircle className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>

              {/* Send button */}
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSend()}
                disabled={
                  !inputText.trim() || sendMessage.isPending || isRecording
                }
                className="h-9 w-9 p-0 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/70 rounded-sm flex-shrink-0 disabled:opacity-40 transition-all hover:shadow-cyan-glow"
                data-ocid="chat.send_button"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Mic status */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1.5 flex items-center gap-1.5 overflow-hidden"
                >
                  <MicOff className="w-3 h-3 text-destructive/70" />
                  <span className="font-mono text-[10px] text-destructive/80 tracking-wider">
                    Recording... tap mic to stop
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="flex md:hidden flex-shrink-0 border-t border-border/50 bg-card/30 backdrop-blur-md">
        {[
          {
            id: "chat",
            label: "Chat",
            icon: MessageSquare,
            ocid: "mobile.nav_chat_button",
            action: () => {
              setMobileActiveNavTab("chat");
              setMobileSidebarOpen(false);
            },
          },
          {
            id: "dashboard",
            label: "Dash",
            icon: Gauge,
            ocid: "mobile.nav_dashboard_button",
            action: () => {
              setMobileActiveNavTab("dashboard");
              setActiveTab("dashboard");
              setMobileSidebarOpen(true);
            },
          },
          {
            id: "reminders",
            label: "Remind",
            icon: Clock,
            ocid: "mobile.nav_reminders_button",
            action: () => {
              setMobileActiveNavTab("reminders");
              setActiveTab("reminders");
              setMobileSidebarOpen(true);
            },
          },
          {
            id: "schedule",
            label: "Sched",
            icon: CalendarDays,
            ocid: "mobile.nav_schedule_button",
            action: () => {
              setMobileActiveNavTab("schedule");
              setActiveTab("schedule");
              setMobileSidebarOpen(true);
            },
          },
          {
            id: "habits",
            label: "Habits",
            icon: Activity,
            ocid: "mobile.nav_habits_button",
            action: () => {
              setMobileActiveNavTab("habits");
              setActiveTab("habits");
              setMobileSidebarOpen(true);
            },
          },
          {
            id: "insights",
            label: "Insight",
            icon: Sparkles,
            ocid: "mobile.nav_insights_button",
            action: () => {
              setMobileActiveNavTab("insights");
              setActiveTab("insights");
              setMobileSidebarOpen(true);
            },
          },
        ].map(({ id, label, icon: Icon, ocid, action }) => (
          <button
            key={id}
            type="button"
            onClick={action}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all ${
              mobileActiveNavTab === id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            }`}
            data-ocid={ocid}
          >
            <Icon className="w-4 h-4" />
            <span className="font-mono text-[8px] tracking-wider uppercase">
              {label}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <footer className="hidden md:block flex-shrink-0 border-t border-border/30 py-1 px-4 text-center bg-card/5">
        <p className="font-mono text-[9px] text-muted-foreground/30 tracking-wider">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/40 hover:text-primary/70 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
