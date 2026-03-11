/**
 * Phase 120-B: Notification Hub
 * Bell icon with badge + popover notification panel.
 */

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Calendar,
  CheckCheck,
  Clock,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export interface HubNotification {
  id: string;
  type: "reminder" | "calendar" | "habit" | "system";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = "melina_hub_notifications";

const SEED_NOTIFICATIONS: HubNotification[] = [
  {
    id: "seed-1",
    type: "system",
    title: "Phase 120 Online",
    body: "Avatar animation, goals engine, and offline mode are now active.",
    timestamp: Date.now() - 120_000,
    read: false,
  },
  {
    id: "seed-2",
    type: "habit",
    title: "Habit Streak Achieved",
    body: "You've completed your Morning Routine 7 days in a row. Keep it up!",
    timestamp: Date.now() - 600_000,
    read: false,
  },
  {
    id: "seed-3",
    type: "reminder",
    title: "Upcoming Reminder",
    body: "Review weekly goals \u2014 scheduled for this evening.",
    timestamp: Date.now() - 3_600_000,
    read: false,
  },
];

function loadNotifications(): HubNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HubNotification[];
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
  return SEED_NOTIFICATIONS;
}

function saveNotifications(notifs: HubNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
}

const TYPE_ICONS: Record<HubNotification["type"], React.ReactNode> = {
  reminder: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  calendar: <Calendar className="w-3.5 h-3.5 text-blue-400" />,
  habit: <Trophy className="w-3.5 h-3.5 text-green-400" />,
  system: <Zap className="w-3.5 h-3.5 text-primary" />,
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/** Add a notification from outside \u2014 e.g. from reminder engine */
export function addHubNotification(
  notif: Omit<HubNotification, "id" | "read">,
) {
  const notifs = loadNotifications();
  const newNotif: HubNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
  };
  const updated = [newNotif, ...notifs].slice(0, 50);
  saveNotifications(updated);
  window.dispatchEvent(new CustomEvent("melina:hub-notification"));
  return newNotif;
}

export default function NotificationHub() {
  const [notifications, setNotifications] =
    useState<HubNotification[]>(loadNotifications);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Listen for external notification pushes
  useEffect(() => {
    const handler = () => setNotifications(loadNotifications());
    window.addEventListener("melina:hub-notification", handler);
    return () => window.removeEventListener("melina:hub-notification", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const dismiss = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    setNotifications(updated);
    saveNotifications(updated);
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary rounded-sm relative"
        aria-label={`Notifications \u2014 ${unread} unread`}
        data-ocid="notifications.open_modal_button"
      >
        <Bell className="w-3.5 h-3.5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
            <span className="font-mono text-[8px] font-bold text-white leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 z-[200] rounded-sm border border-border/60 bg-card shadow-2xl shadow-black/40 overflow-hidden"
            data-ocid="notifications.panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/80">
              <div className="flex items-center gap-2">
                <Bell className="w-3 h-3 text-primary/60" />
                <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-primary/70">
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="bg-destructive/20 text-destructive font-mono text-[8px] px-1.5 py-0.5 rounded-sm">
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-muted-foreground/50 hover:text-primary transition-colors"
                  aria-label="Mark all read"
                  data-ocid="notifications.mark_all_button"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span className="font-mono text-[8px]">Mark all</span>
                </button>
              )}
            </div>

            {/* Notification list */}
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div
                  className="p-6 text-center"
                  data-ocid="notifications.empty_state"
                >
                  <Bell className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="font-mono text-[10px] text-muted-foreground/40 tracking-wider">
                    No notifications
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {notifications.map((notif, idx) => (
                    <button
                      key={notif.id}
                      type="button"
                      className={`w-full text-left flex gap-2.5 px-3 py-2.5 hover:bg-muted/10 transition-colors group ${
                        notif.read ? "opacity-60" : ""
                      }`}
                      onClick={() => markRead(notif.id)}
                      data-ocid={`notifications.item.${idx + 1}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {TYPE_ICONS[notif.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={`font-mono text-[10px] tracking-wide leading-tight ${
                              notif.read
                                ? "text-muted-foreground/70"
                                : "text-foreground/90"
                            }`}
                          >
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="font-body text-[10px] text-muted-foreground/60 mt-0.5 leading-snug line-clamp-2">
                          {notif.body}
                        </p>
                        <p className="font-mono text-[8px] text-muted-foreground/40 mt-1">
                          {timeAgo(notif.timestamp)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notif.id);
                        }}
                        className="flex-shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-muted-foreground"
                        aria-label="Dismiss"
                        data-ocid={`notifications.delete_button.${idx + 1}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
