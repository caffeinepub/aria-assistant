import {
  ChatWallpaperOverlay,
  DEFAULT_WALLPAPER,
  type WallpaperConfig,
  WallpaperPicker,
  loadWallpaper,
} from "@/components/WallpaperPicker";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ChevronUp,
  Copy,
  ImagePlus,
  Keyboard,
  LogOut,
  Maximize2,
  Menu,
  Mic,
  MicOff,
  Minimize2,
  RefreshCw,
  Search,
  Send,
  StopCircle,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatTone } from "../backend.d";
import { useCalendarEvents } from "../components/CalendarIntegration";
import FloatingBubble from "../components/FloatingBubble";
import { useGoals } from "../components/GoalsEngine";
import MelinaAnimatedAvatar from "../components/MelinaAnimatedAvatar";
import NotificationAdvisor from "../components/NotificationAdvisor";
import NotificationHub from "../components/NotificationHub";
import OfflineBanner, { useOfflineMode } from "../components/OfflineMode";
import {
  buildPersonalContext,
  usePersonalIntelligence,
} from "../components/PersonalIntelligence";
import {
  type AssistantTone,
  useProactiveGreeting,
} from "../components/ProactiveGreeting";
import ReminderBanner from "../components/ReminderBanner";
import SettingsSheet from "../components/SettingsSheet";
import SidebarTabs from "../components/SidebarTabs";
import { WakeWord } from "../components/WakeWord";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAssistantSettings,
  useChatHistory,
  useChatHistoryCount,
  useClearChat,
  useCreateReminder,
  useMemoryEntries,
  useNotifications,
  useReminders,
  useSaveUserProfile,
  useSendMessage,
  useUpdateMemory,
  useUpdateSettings,
  useUserProfile,
} from "../hooks/useQueries";
import {
  type PersonalityTone,
  applyLanguagePrefix,
  applyPersonalityTone,
  detectLanguage,
  generateMelinaResponse,
  getGreetingPool,
} from "../lib/melina-engine";

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
              <MelinaAnimatedAvatar
                status={status}
                size="fullscreen"
                className="w-full h-full"
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

// ─── Constants ────────────────────────────────────────────────────────
const WINDOW_SIZE = 100; // max messages rendered at once
const LOAD_MORE_STEP = 50; // messages to load when clicking "Load earlier"
const SCROLL_THRESHOLD = 200; // px from bottom to trigger auto-scroll
const JUMP_THRESHOLD = 300; // px from bottom to show "Jump to latest"

// ─── ChatPage ─────────────────────────────────────────────────────────

export default function ChatPage() {
  const { clear } = useInternetIdentity();
  const { data: chatHistory = [], isLoading: historyLoading } =
    useChatHistory();
  const { data: chatHistoryCount } = useChatHistoryCount();
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
  const createReminder = useCreateReminder();
  const { profile: personalProfile, updateFromMessage: updatePersonalProfile } =
    usePersonalIntelligence();
  const calendarEvents = useCalendarEvents();

  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState<MelinaStatus>("idle");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [bubbleRestored, setBubbleRestored] = useState(
    () => localStorage.getItem("melina_bubble_removed") !== "true",
  );
  const { isOffline } = useOfflineMode();
  const { goalsContext } = useGoals();
  const isFirstTabChange = useRef(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState<WallpaperConfig>(() =>
    loadWallpaper(),
  );

  // Windowed rendering: how many messages from the start to hide
  const [windowOffset, setWindowOffset] = useState(0);

  // Smart auto-scroll & jump-to-latest
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // TTS state
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  // Auto-speak state (localStorage-backed)
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(
    () => localStorage.getItem("aria_auto_speak") === "true",
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const alertShownRef = useRef(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // Total message count (use backend count if available, fallback to local)
  const totalMsgCount =
    chatHistoryCount !== undefined
      ? Number(chatHistoryCount) +
        localMessages.filter(
          (m) => m.id.startsWith("user-") || m.id.startsWith("ai-"),
        ).length
      : localMessages.length;

  // Windowed messages: only show a slice for performance
  const allMessages = localMessages;
  const windowStart = Math.max(0, windowOffset);
  const visibleMessages =
    allMessages.length > WINDOW_SIZE
      ? allMessages.slice(windowStart, windowStart + WINDOW_SIZE)
      : allMessages;
  const hiddenEarlierCount = windowStart;
  const hasMoreEarlier = windowStart > 0;

  // Load earlier messages handler
  const handleLoadEarlier = useCallback(() => {
    setWindowOffset((prev) => Math.max(0, prev - LOAD_MORE_STEP));
    // After prepending, keep scroll position roughly the same
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 200;
      }
    });
  }, []);

  // Reset bubbleRestored after first tab navigation (so normal hide-on-chat rule takes over)
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeTab change is the trigger
  useEffect(() => {
    if (isFirstTabChange.current) {
      isFirstTabChange.current = false;
      return;
    }
    setBubbleRestored(false);
  }, [activeTab]);

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

  // Sync backend history to local messages (no cap — all messages)
  useEffect(() => {
    if (chatHistory.length > 0 && localMessages.length === 0) {
      const synced: LocalMessage[] = chatHistory.map((m, i) => ({
        id: `hist-${i}`,
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
        timestamp: Number(m.timestamp) / 1_000_000,
      }));
      setLocalMessages(synced);
      // Start windowed at the end so latest messages are visible
      if (synced.length > WINDOW_SIZE) {
        setWindowOffset(synced.length - WINDOW_SIZE);
      }
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [chatHistory, localMessages.length]);

  // Smart scroll: track if user is near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsNearBottom(distFromBottom <= SCROLL_THRESHOLD);
      setShowJumpToLatest(distFromBottom > JUMP_THRESHOLD);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Phase 117-B: Proactive Intelligence greeting
  useProactiveGreeting({
    userName,
    personalProfile: personalProfile
      ? {
          ...personalProfile,
          name: personalProfile.name ?? undefined,
        }
      : null,
    reminders,
    assistantTone:
      (assistantSettings?.tone as AssistantTone) ??
      ("friendly" as AssistantTone),
    historyLoading,
    onGreeting: (message) => {
      const injected: LocalMessage = {
        id: `proactive-greeting-${Date.now()}`,
        role: "assistant",
        content: message,
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id.startsWith("proactive-greeting")))
          return prev;
        return [...prev, injected];
      });
    },
  });

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

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }

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

  // ── Automation external-message injection ────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { content } = (e as CustomEvent<{ content: string }>).detail;
      if (!content) return;
      const injected = {
        id: `automation-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant" as const,
        content,
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => [...prev, injected]);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 80);
    };
    window.addEventListener("melina:external-message", handler);
    return () => window.removeEventListener("melina:external-message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Automation navigate-tab ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { tab } = (e as CustomEvent<{ tab: string }>).detail;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener("melina:navigate-tab", handler);
    return () => window.removeEventListener("melina:navigate-tab", handler);
  }, []);

  // ── Smart auto-scroll helper ──────────────────────────────────────────
  const scrollToBottom = useCallback(
    (force = false) => {
      requestAnimationFrame(() => {
        if (scrollRef.current && (force || isNearBottom)) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    },
    [isNearBottom],
  );

  const jumpToLatest = useCallback(() => {
    if (allMessages.length > WINDOW_SIZE) {
      setWindowOffset(allMessages.length - WINDOW_SIZE);
    }
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      setShowJumpToLatest(false);
      setIsNearBottom(true);
    });
  }, [allMessages.length]);

  // ── Greeting ──────────────────────────────────────────────────────────
  const getGreeting = useCallback((): string => {
    const pool = getGreetingPool(userName);
    return pool[Math.floor(Math.random() * pool.length)];
  }, [userName]);

  // ── Bubble inject (proactive greeting from FloatingBubble) ──────────
  const handleBubbleInject = useCallback((injectedContent: string) => {
    const injected: LocalMessage = {
      id: `bubble-inject-${Date.now()}`,
      role: "assistant",
      content: injectedContent,
      timestamp: Date.now(),
    };
    setLocalMessages((prev) => [...prev, injected]);
  }, []);

  // ── Send message ──────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const rawMsg = (text ?? inputText).trim();
    const imageLabel = attachedImage
      ? `[Image attached: ${attachedImage.name}] `
      : "";
    const msg = imageLabel + rawMsg;
    if (!msg || sendMessage.isPending) return;

    const userMsg: LocalMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: Date.now(),
    };

    setLocalMessages((prev) => {
      const updated = [...prev, userMsg];
      if (updated.length > WINDOW_SIZE) {
        setWindowOffset(updated.length - WINDOW_SIZE);
      }
      return updated;
    });
    scrollToBottom(true);
    setInputText("");
    setStatus("thinking");

    try {
      // 120-E: Offline mode fallback
      if (isOffline) {
        setStatus("responding");
        const personalityTone2 =
          (localStorage.getItem(
            "melina_personality_tone",
          ) as PersonalityTone) ?? "balanced";
        const fullContext2 = [
          buildPersonalContext(personalProfile),
          goalsContext,
        ]
          .filter(Boolean)
          .join("\n");
        const offlineResult = generateMelinaResponse({
          message: msg,
          tone: assistantSettings?.tone ?? ChatTone.friendly,
          userName,
          memoryEntries,
          pendingReminders: pendingRemindersData,
          chatHistory: allMessages
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
          personalContext: fullContext2,
        });
        const detectedLang2 = detectLanguage(msg);
        const tonedOffline = applyPersonalityTone(
          offlineResult.response,
          personalityTone2,
        );
        const finalOffline = applyLanguagePrefix(
          tonedOffline,
          detectedLang2,
          msg,
        );
        const offlineMsg: LocalMessage = {
          id: `ai-offline-${Date.now()}`,
          role: "assistant",
          content: `[Offline] ${finalOffline}`,
          timestamp: Date.now(),
        };
        setLocalMessages((prev) => {
          const updated = [...prev, offlineMsg];
          if (updated.length > WINDOW_SIZE)
            setWindowOffset(updated.length - WINDOW_SIZE);
          return updated;
        });
        scrollToBottom(true);
        if (offlineResult.learnedName) {
          void updateMemory.mutateAsync({
            key: "name",
            value: offlineResult.learnedName,
          });
        }
        setTimeout(() => setStatus("idle"), 1500);
        return;
      }
      await sendMessage.mutateAsync(msg);
      setStatus("responding");

      // 117-E: Auto-detect reminder intent and add to Reminders tab
      const autoReminderMatch = msg.match(
        /remind(?:\s+me)?\s+(?:to\s+)?(.+?)\s+(?:at|on|by|in)\s+([\d:apmAPM ]+(?:am|pm)?(?:\s+(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday))?)/i,
      );
      if (autoReminderMatch) {
        const title = autoReminderMatch[1].trim();
        const timeStr = autoReminderMatch[2].trim();
        const dueDate = new Date();
        const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch) {
          let hours = Number.parseInt(timeMatch[1]);
          const mins = timeMatch[2] ? Number.parseInt(timeMatch[2]) : 0;
          const meridiem = timeMatch[3]?.toLowerCase();
          if (meridiem === "pm" && hours < 12) hours += 12;
          if (meridiem === "am" && hours === 12) hours = 0;
          dueDate.setHours(hours, mins, 0, 0);
          if (dueDate.getTime() < Date.now())
            dueDate.setDate(dueDate.getDate() + 1);
          void createReminder
            .mutateAsync({
              title,
              note: "Auto-detected from chat",
              dueTime: BigInt(dueDate.getTime()) * 1_000_000n,
            })
            .catch(() => {});
        }
      }

      const tone = assistantSettings?.tone ?? ChatTone.friendly;
      const contextHistory = allMessages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      updatePersonalProfile(msg);
      const personalContext = buildPersonalContext(personalProfile);
      // 120-F: Detect language
      const detectedLang = detectLanguage(msg);
      // 120-D: Read personality tone
      const personalityTone =
        (localStorage.getItem("melina_personality_tone") as PersonalityTone) ??
        "balanced";
      // 120-C: Inject goals context
      const fullContext = [personalContext, goalsContext]
        .filter(Boolean)
        .join("\n");

      const engineResult = generateMelinaResponse({
        message: msg,
        tone,
        userName,
        memoryEntries,
        pendingReminders: pendingRemindersData,
        chatHistory: contextHistory,
        personalContext: fullContext,
      });
      // Apply personality tone
      const tonedResponse = applyPersonalityTone(
        engineResult.response,
        personalityTone,
      );
      // Apply language prefix
      const finalResponse = applyLanguagePrefix(
        tonedResponse,
        detectedLang,
        msg,
      );
      engineResult.response = finalResponse;

      const aiMsg: LocalMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: engineResult.response,
        timestamp: Date.now(),
      };

      setLocalMessages((prev) => {
        const updated = [...prev, aiMsg];
        if (updated.length > WINDOW_SIZE) {
          setWindowOffset(updated.length - WINDOW_SIZE);
        }
        return updated;
      });
      scrollToBottom(true);

      if (autoSpeakEnabled && hasTTS) {
        speak(aiMsg.id, aiMsg.content);
      }

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

  // ── Regenerate last response ────────────────────────────────────────
  const handleRegenerate = () => {
    const msgs = [...localMessages];
    const lastAiIdx = msgs.map((m) => m.role).lastIndexOf("assistant");
    if (lastAiIdx === -1) return;
    const lastUserMsg = msgs
      .slice(0, lastAiIdx)
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMsg) return;
    const newMsgs = msgs.filter((_, i) => i !== lastAiIdx);
    setLocalMessages(newMsgs);
    void handleSend(lastUserMsg.content);
  };

  // ── Copy message to clipboard ───────────────────────────────────────
  const handleCopyMessage = (id: string, content: string) => {
    void navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(
        () => setCopiedId((prev) => (prev === id ? null : prev)),
        2000,
      );
    });
  };

  // ── Render markdown-like message content ────────────────────────────
  const renderMessageContent = (text: string): React.ReactNode => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    const renderInline = (line: string, key: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let i = 0;

      while (remaining.length > 0) {
        const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
        const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
        const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);

        if (!boldMatch && !italicMatch && !codeMatch) {
          parts.push(remaining);
          break;
        }

        const firstBold = boldMatch
          ? remaining.indexOf("**")
          : Number.POSITIVE_INFINITY;
        const firstItalic = italicMatch
          ? remaining.indexOf("*", remaining.startsWith("**") ? 2 : 0)
          : Number.POSITIVE_INFINITY;
        const firstCode = codeMatch
          ? remaining.indexOf("`")
          : Number.POSITIVE_INFINITY;

        if (firstBold <= firstItalic && firstBold <= firstCode && boldMatch) {
          if (boldMatch[1]) parts.push(boldMatch[1]);
          parts.push(<strong key={`${key}-b${i}`}>{boldMatch[2]}</strong>);
          remaining = boldMatch[3];
        } else if (firstCode <= firstItalic && codeMatch) {
          if (codeMatch[1]) parts.push(codeMatch[1]);
          parts.push(
            <code
              key={`${key}-c${i}`}
              className="px-1 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs"
            >
              {codeMatch[2]}
            </code>,
          );
          remaining = codeMatch[3];
        } else if (italicMatch) {
          if (italicMatch[1]) parts.push(italicMatch[1]);
          parts.push(<em key={`${key}-i${i}`}>{italicMatch[2]}</em>);
          remaining = italicMatch[3];
        } else {
          parts.push(remaining);
          break;
        }
        i++;
      }

      return parts.length === 1 && typeof parts[0] === "string"
        ? (parts[0] as string)
        : parts;
    };

    let inList = false;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-0.5 my-1 pl-1">
            {listItems}
          </ul>,
        );
        listItems = [];
        inList = false;
      }
    };

    let keyCounter = 0;
    for (const line of lines) {
      const isBullet = /^[•\-] /.test(line);
      const kc = keyCounter++;
      const stableKey = `k${kc}`;
      if (isBullet) {
        inList = true;
        const text2 = line.replace(/^[•\-] /, "");
        listItems.push(
          <li key={stableKey} className="flex gap-1.5 items-start">
            <span className="text-primary/70 mt-0.5 flex-shrink-0">•</span>
            <span>{renderInline(text2, stableKey)}</span>
          </li>,
        );
      } else {
        if (inList) flushList();
        if (line.trim() === "") {
          elements.push(<br key={stableKey} />);
        } else {
          elements.push(
            <span key={stableKey} className="block">
              {renderInline(line, stableKey)}
            </span>,
          );
        }
      }
    }

    if (inList) flushList();
    return <>{elements}</>;
  };

  const handleClearChat = async () => {
    try {
      await clearChat.mutateAsync();
      setLocalMessages([]);
      setWindowOffset(0);
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
          id: `voice-${Date.now()}`,
          role: "user",
          content: "[Voice Note]",
          timestamp: Date.now(),
          audioUrl: url,
          isVoiceNote: true,
          pendingSend: true,
        };
        setLocalMessages((prev) => [...prev, voiceMsg]);
        scrollToBottom(true);
        for (const t of stream.getTracks()) {
          t.stop();
        }
      };

      mr.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied.");
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

  const dismissVoiceNote = (id: string) => {
    if (speakingId) stopSpeaking();
    setLocalMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const sendVoiceNote = (id: string) => {
    setLocalMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pendingSend: false } : m)),
    );
    void handleSend(
      "[Voice note received — please respond to my voice message]",
    );
  };

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
      action: () => {
        setActiveTab("reminders");
        setSidebarOpen(true);
      },
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
      action: () => {
        setActiveTab("stats");
        setSidebarOpen(true);
      },
    },
    {
      id: "go-schedule",
      label: "Open Schedule Planner",
      ocid: "command_palette.item.7",
      action: () => {
        setActiveTab("schedule");
        setSidebarOpen(true);
      },
    },
    {
      id: "go-insights",
      label: "View Insights",
      ocid: "command_palette.item.8",
      action: () => {
        setActiveTab("insights");
        setSidebarOpen(true);
      },
    },
  ];

  const displayName = assistantSettings?.assistantDisplayName || "Melina";

  return (
    <div
      className="h-screen bg-background hud-grid flex flex-col overflow-hidden relative"
      ref={chatContainerRef}
    >
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
                <MelinaAnimatedAvatar
                  status={displayStatus}
                  size="md"
                  className="w-full h-full"
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

      {/* ── Sidebar Sheet (hamburger menu — all screen sizes) ─────────── */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 sm:w-80 p-0 bg-card/95 border-r border-border/60 flex flex-col backdrop-blur-md"
          data-ocid="sidebar.sheet"
        >
          {/* Avatar section */}
          <div className="relative flex-shrink-0">
            <div className="relative overflow-hidden scanlines">
              <div
                className={`absolute inset-0 z-10 pointer-events-none rounded-sm ${getExpressionClass(displayStatus)}`}
              />
              <MelinaAnimatedAvatar
                status={displayStatus}
                size="lg"
                className="w-full avatar-glow"
                style={{ maxHeight: "220px" }}
              />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute top-2 left-2 font-mono text-[8px] text-primary/60 tracking-widest z-20">
                ARIA·UNIT·001
              </div>
              <div className="absolute top-2 right-2 font-mono text-[8px] text-primary/60 tracking-widest z-20">
                ONLINE
              </div>
              {/* Fullscreen button in sidebar */}
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  setIsFullScreen(true);
                }}
                className="absolute bottom-8 right-2 z-20 p-1.5 rounded-sm border border-primary/30 text-primary/50 hover:text-primary hover:border-primary/60 bg-background/40 backdrop-blur-sm transition-all"
                aria-label="Full-screen avatar"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <div className="absolute bottom-3 left-0 right-8 text-center z-20">
                <h2 className="font-display text-xl font-bold tracking-[0.4em] glow-cyan text-primary uppercase">
                  {displayName.toUpperCase()}
                </h2>
              </div>
            </div>
            <div className="flex justify-center py-1.5 border-b border-border/30">
              <StatusDot status={displayStatus} />
            </div>
          </div>
          {/* All tabs */}
          <div className="flex-1 overflow-hidden">
            <SidebarTabs
              messageCount={allMessages.length}
              memoryCount={memoryEntries.length}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
              }}
              onSendToChat={(msg) => {
                void handleSend(msg);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/20 backdrop-blur-sm flex-shrink-0"
        data-ocid="chat.header"
      >
        {/* Left: avatar thumb + identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-full overflow-hidden border border-primary/50 flex-shrink-0 avatar-glow ${getExpressionClass(displayStatus)}`}
          >
            <MelinaAnimatedAvatar
              status={displayStatus}
              size="sm"
              className="w-full h-full"
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold tracking-[0.25em] text-primary glow-cyan uppercase">
                {displayName.toUpperCase()}
              </span>
              {allMessages.length > 0 && (
                <span className="font-mono text-[8px] text-muted-foreground/40 tracking-wider hidden sm:inline flex-shrink-0">
                  [{totalMsgCount > 0 ? totalMsgCount : allMessages.length}{" "}
                  msgs]
                </span>
              )}
            </div>
            <StatusDot status={displayStatus} />
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
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
                className="flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all"
                aria-label="Stop speaking"
                data-ocid="chat.speaking_indicator"
              >
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
                <span className="font-mono text-[8px] tracking-[0.2em] text-primary uppercase hidden sm:inline">
                  SPEAKING
                </span>
                <VolumeX className="w-2.5 h-2.5 text-primary/70" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Fullscreen avatar */}
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="h-7 w-7 flex items-center justify-center rounded-sm border border-primary/20 text-primary/50 hover:text-primary hover:border-primary/50 bg-background/30 transition-all"
            aria-label="Full-screen avatar"
            data-ocid="avatar.fullscreen_button"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Username */}
          {userProfile && (
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider hidden md:block px-1">
              {userProfile.username}
            </span>
          )}

          {/* Command palette */}
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

          {/* Wallpaper Picker */}
          <WallpaperPicker current={chatWallpaper} onApply={setChatWallpaper} />

          {/* Notification Hub */}
          <NotificationHub />

          {/* Settings */}
          <SettingsSheet />

          {/* Logout */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-7 px-2 text-muted-foreground hover:text-destructive font-mono text-xs tracking-wider rounded-sm"
            data-ocid="nav.logout_button"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1">Exit</span>
          </Button>

          {/* Hamburger menu */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-primary rounded-sm border border-border/40 hover:border-primary/40 transition-all"
            aria-label="Open menu"
            data-ocid="nav.menu_button"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </header>
      {/* Offline banner */}
      <OfflineBanner />

      {/* ── Main Chat Area ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-h-0">
        {/* ── Chat Column ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 relative">
          <ChatWallpaperOverlay config={chatWallpaper} />
          {/* Messages scroll container */}
          <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef}>
            <div className="p-4 space-y-3 max-w-4xl mx-auto">
              {historyLoading ? (
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
                <div
                  className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 px-4"
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
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {[
                      {
                        label: "What can you do?",
                        ocid: "chat.suggestion.button.1",
                      },
                      {
                        label: "Tell me a joke",
                        ocid: "chat.suggestion.button.2",
                      },
                      {
                        label: "Help me plan my day",
                        ocid: "chat.suggestion.button.3",
                      },
                      {
                        label: "How are you feeling?",
                        ocid: "chat.suggestion.button.4",
                      },
                    ].map(({ label, ocid }) => (
                      <button
                        key={label}
                        type="button"
                        data-ocid={ocid}
                        onClick={() => {
                          setInputText(label);
                          void handleSend(label);
                        }}
                        className="px-3 py-2 rounded-sm border border-primary/20 bg-primary/5 hover:bg-primary/15 hover:border-primary/50 font-body text-xs text-foreground/70 hover:text-foreground transition-all text-left"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Load Earlier Messages button */}
                  {hasMoreEarlier && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-1.5 pb-2"
                      data-ocid="chat.load_earlier_button"
                    >
                      <button
                        type="button"
                        onClick={handleLoadEarlier}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-sm border border-primary/30 bg-card/30 hover:bg-primary/10 hover:border-primary/60 transition-all font-mono text-[10px] tracking-wider text-primary/70 hover:text-primary"
                      >
                        <ChevronUp className="w-3 h-3" />
                        Load earlier messages
                      </button>
                      <span className="font-mono text-[9px] text-muted-foreground/40 tracking-wider">
                        Showing {visibleMessages.length} of {allMessages.length}{" "}
                        messages
                        {hiddenEarlierCount > 0 &&
                          ` · ${hiddenEarlierCount} earlier hidden`}
                      </span>
                    </motion.div>
                  )}

                  {/* Show count label when windowed */}
                  {allMessages.length > WINDOW_SIZE && !hasMoreEarlier && (
                    <div className="flex justify-center pb-1">
                      <span className="font-mono text-[9px] text-muted-foreground/30 tracking-wider">
                        Showing latest {visibleMessages.length} of{" "}
                        {allMessages.length} messages
                      </span>
                    </div>
                  )}

                  {/* Messages */}
                  {visibleMessages.map((msg, idx) => (
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
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/30 flex-shrink-0 mb-1">
                          <MelinaAnimatedAvatar
                            status="idle"
                            size="sm"
                            className="w-full h-full"
                          />
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] sm:max-w-[65%] space-y-1 ${
                          msg.role === "user" ? "items-end" : "items-start"
                        } flex flex-col`}
                      >
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
                            <div className="font-body text-sm leading-relaxed text-foreground/90 relative group/msg">
                              {renderMessageContent(msg.content)}
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyMessage(msg.id, msg.content)
                                }
                                className="absolute -top-2 -right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded-sm bg-card/80 border border-border/60 text-muted-foreground/60 hover:text-foreground hover:border-primary/50"
                                aria-label="Copy message"
                                data-ocid="chat.copy_button"
                              >
                                {copiedId === msg.id ? (
                                  <span className="text-[8px] font-mono text-primary">
                                    ✓
                                  </span>
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

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
                          <MelinaAnimatedAvatar
                            status="thinking"
                            size="sm"
                            className="w-full h-full"
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

                  {/* Regenerate last response */}
                  {localMessages.length > 0 &&
                    localMessages[localMessages.length - 1]?.role ===
                      "assistant" &&
                    status === "idle" && (
                      <div className="flex justify-center pt-1 pb-0.5">
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-sm border border-border/40 bg-card/30 hover:bg-primary/10 hover:border-primary/40 font-mono text-[9px] text-muted-foreground/50 hover:text-primary/70 transition-all tracking-wider"
                          data-ocid="chat.regenerate_button"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          Regenerate
                        </button>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>

          {/* Jump to latest floating button */}
          <AnimatePresence>
            {showJumpToLatest && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.2 }}
                onClick={jumpToLatest}
                className="absolute bottom-20 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary/40 bg-card/80 hover:bg-primary/20 backdrop-blur-sm text-primary/80 hover:text-primary transition-all shadow-[0_0_20px_rgba(0,255,247,0.15)] font-mono text-[10px] tracking-wider"
                aria-label="Jump to latest messages"
                data-ocid="chat.jump_to_latest_button"
              >
                <ArrowDown className="w-3 h-3" />
                Jump to latest
              </motion.button>
            )}
          </AnimatePresence>

          {/* Notification Advisor */}
          {/* 117-E: Reminder & Calendar Banner Notifications */}
          <ReminderBanner
            reminders={reminders}
            calendarEvents={calendarEvents}
          />

          <NotificationAdvisor
            notificationsEnabled={
              assistantSettings?.notificationsEnabled ?? true
            }
          />

          {/* Wake Word */}
          {/* Phase 118-A: Floating Bubble */}
          <FloatingBubble
            visible={bubbleRestored || (!!activeTab && activeTab !== "chat")}
            messages={localMessages}
            onSend={(text) => {
              void handleSend(text);
            }}
            isSending={sendMessage.isPending}
            currentTab={activeTab}
            onInjectMessage={handleBubbleInject}
          />
          <WakeWord
            onActivate={() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
            onCommand={(text) => {
              setInputText(text);
              setTimeout(() => handleSend(text), 100);
            }}
            isRecording={isRecording}
            disabled={sendMessage.isPending}
          />

          {/* ── Input Bar ──────────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-t border-border/50 bg-card/10 backdrop-blur-sm p-3">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
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
                <AlertDialogContent
                  className="bg-card border-border font-body max-w-sm"
                  data-ocid="chat.dialog"
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-foreground">
                      Clear Chat History
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground font-mono text-xs">
                      This will permanently delete all{" "}
                      <span className="text-primary font-semibold">
                        {allMessages.length}
                      </span>{" "}
                      messages. Melina&apos;s memories will be preserved.
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
                      Clear All{" "}
                      {allMessages.length > 0 && `(${allMessages.length})`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Text input */}
              <div className="flex-1 flex flex-col gap-0.5">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 2000);
                    setInputText(val);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={
                    isRecording
                      ? "Recording voice note..."
                      : "Message Melina..."
                  }
                  disabled={isRecording || sendMessage.isPending}
                  className="w-full px-3 py-2 rounded-sm font-body text-sm hud-input disabled:opacity-50 resize-none overflow-hidden min-h-[36px] leading-relaxed"
                  autoComplete="off"
                  data-ocid="chat.input"
                  style={{ height: "36px" }}
                />
                {inputText.length > 0 && (
                  <span
                    className={`font-mono text-[9px] text-right pr-1 transition-colors ${inputText.length > 1800 ? "text-destructive/70" : "text-muted-foreground/40"}`}
                  >
                    {inputText.length}/2000
                  </span>
                )}
              </div>

              {/* Attached image badge */}
              {attachedImage && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/30 text-primary font-mono text-[10px] flex-shrink-0 max-w-[160px]">
                  <ImagePlus className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{attachedImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="ml-0.5 opacity-60 hover:opacity-100"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}

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

              {/* Hidden image file input */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setAttachedImage(file);
                  e.target.value = "";
                }}
              />

              {/* Image upload button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => imageInputRef.current?.click()}
                className={`h-9 w-9 p-0 rounded-sm flex-shrink-0 transition-all ${
                  attachedImage
                    ? "text-primary border border-primary/40"
                    : "text-muted-foreground hover:text-primary hover:border-primary/40"
                }`}
                data-ocid="chat.image_upload_button"
                title={attachedImage ? attachedImage.name : "Attach image"}
              >
                <ImagePlus className="w-4 h-4" />
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
                  className="mt-1.5 flex items-center gap-1.5 overflow-hidden max-w-4xl mx-auto"
                >
                  <MicOff className="w-3 h-3 text-destructive/70" />
                  <span className="font-mono text-[10px] text-destructive/80 tracking-wider">
                    Recording... tap mic to stop
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-border/30 py-1 px-4 text-center bg-card/5">
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
