import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NotificationSource } from "../backend.d";
import {
  useDismissNotification,
  useNotifications,
  useSeedNotifications,
} from "../hooks/useQueries";

interface NotificationAdvisorProps {
  notificationsEnabled?: boolean;
}

function SourceIcon({ source }: { source: NotificationSource }) {
  const cls = "w-3.5 h-3.5 flex-shrink-0";
  if (source === NotificationSource.calendar)
    return <CalendarDays className={`${cls} text-primary`} />;
  if (source === NotificationSource.email)
    return <Mail className={`${cls} text-accent`} />;
  return <MessageSquare className={`${cls} text-green-400`} />;
}

export default function NotificationAdvisor({
  notificationsEnabled = true,
}: NotificationAdvisorProps) {
  const { data: notifications = [], isLoading } = useNotifications();
  const dismiss = useDismissNotification();
  const seed = useSeedNotifications();
  const seededRef = useRef(false);
  const [expanded, setExpanded] = useState(false);

  // Auto-seed if empty on mount
  useEffect(() => {
    if (!isLoading && notifications.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void seed.mutateAsync();
    }
  }, [isLoading, notifications.length, seed]);

  const active = notifications.filter((n) => !n.dismissed);
  const unreadCount = active.length;

  const handleAct = (suggestion: string) => {
    toast.success(suggestion, {
      description: "Melina has noted your action.",
      duration: 4000,
    });
  };

  const handleDismiss = async (id: bigint) => {
    try {
      await dismiss.mutateAsync(id);
    } catch {
      toast.error("Failed to dismiss notification");
    }
  };

  return (
    <div
      className="flex-shrink-0 border-t border-border/30"
      data-ocid="notifications.panel"
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors notification-panel-header"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-3.5 h-3.5 text-primary/70" />
            {unreadCount > 0 && notificationsEnabled && (
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            )}
          </div>
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-primary/70">
            Notifications
          </span>
          {unreadCount > 0 && (
            <Badge
              variant="outline"
              className="font-mono text-[8px] h-4 px-1.5 border-destructive/40 text-destructive bg-destructive/10"
            >
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground/50">
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </div>
      </button>

      {/* Expandable panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-2 pb-2 space-y-1.5 max-h-56 overflow-y-auto">
              {isLoading || seed.isPending ? (
                <div
                  className="py-3 text-center"
                  data-ocid="notifications.loading_state"
                >
                  <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                    Loading...
                  </span>
                </div>
              ) : active.length === 0 ? (
                <div
                  className="py-3 text-center"
                  data-ocid="notifications.empty_state"
                >
                  <p className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                    No active notifications
                  </p>
                </div>
              ) : (
                active.map((notif, idx) => (
                  <motion.div
                    key={notif.id.toString()}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="rounded-sm bg-card/30 border border-border/40 p-2 space-y-1.5"
                  >
                    {/* Source + content */}
                    <div className="flex items-start gap-2">
                      <SourceIcon source={notif.source} />
                      <p className="font-body text-xs text-foreground/85 leading-snug flex-1">
                        {notif.content}
                      </p>
                    </div>

                    {/* Melina's suggestion */}
                    {notif.suggestion && (
                      <p className="font-body text-[10px] text-muted-foreground/70 italic pl-5 leading-snug">
                        Melina: &ldquo;{notif.suggestion}&rdquo;
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pl-5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAct(notif.suggestion)}
                        className="h-5 px-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-mono text-[9px] tracking-wider rounded-sm"
                        data-ocid={`notifications.act_button.${idx + 1}`}
                      >
                        Act
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDismiss(notif.id)}
                        disabled={dismiss.isPending}
                        className="h-5 px-2 text-muted-foreground/60 hover:text-muted-foreground font-mono text-[9px] rounded-sm"
                        data-ocid={`notifications.dismiss_button.${idx + 1}`}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
