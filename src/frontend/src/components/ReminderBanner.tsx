/**
 * Phase 117-E: Reminder & Calendar Event Banner Notifications
 * Shows a visual HUD-style banner at the top of the screen when reminders or events are due.
 */
import { Button } from "@/components/ui/button";
import { AlarmClock, CalendarDays, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "./CalendarIntegration";

interface BannerItem {
  id: string;
  type: "reminder" | "calendar";
  title: string;
  subtitle?: string;
}

interface Props {
  reminders: Array<{
    id: bigint | string;
    title: string;
    dueTime: bigint | number;
    completed: boolean;
  }>;
  calendarEvents: CalendarEvent[];
}

export default function ReminderBanner({ reminders, calendarEvents }: Props) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const shownIds = useRef<Set<string>>(new Set());

  const dismiss = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  // Check reminders every 30s
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const r of reminders) {
        if (r.completed) continue;
        const dueMs =
          typeof r.dueTime === "bigint"
            ? Number(r.dueTime) / 1_000_000
            : Number(r.dueTime);
        const id = `reminder-${String(r.id)}`;
        // Fire if due within the next 60s or overdue within 5 min
        if (
          dueMs <= now + 60_000 &&
          dueMs >= now - 5 * 60_000 &&
          !shownIds.current.has(id)
        ) {
          shownIds.current.add(id);
          setBanners((prev) => [
            { id, type: "reminder", title: r.title, subtitle: "Reminder due" },
            ...prev.filter((b) => b.id !== id),
          ]);
        }
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [reminders]);

  // Check calendar events every 60s
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const e of calendarEvents) {
        const id = `cal-${e.uid}`;
        const startMs = e.start.getTime();
        if (
          startMs <= now + 5 * 60_000 &&
          startMs >= now - 5 * 60_000 &&
          !shownIds.current.has(id)
        ) {
          shownIds.current.add(id);
          setBanners((prev) => [
            {
              id,
              type: "calendar",
              title: e.title,
              subtitle: e.start.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            ...prev.filter((b) => b.id !== id),
          ]);
        }
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [calendarEvents]);

  // Auto-dismiss after 10s
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setTimeout(() => {
      setBanners((prev) => prev.slice(0, -1));
    }, 10_000);
    return () => clearTimeout(timer);
  }, [banners]);

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-1.5 w-[min(96vw,420px)] pointer-events-none">
      <AnimatePresence>
        {banners.slice(0, 3).map((banner) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-lg border border-primary/40 bg-background/95 backdrop-blur shadow-lg shadow-primary/10"
            data-ocid="reminder.toast"
          >
            <div className="flex-shrink-0">
              {banner.type === "reminder" ? (
                <AlarmClock className="w-4 h-4 text-primary" />
              ) : (
                <CalendarDays className="w-4 h-4 text-cyan-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {banner.subtitle && (
                <p className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">
                  {banner.subtitle}
                </p>
              )}
              <p className="text-[11px] font-medium truncate">{banner.title}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 flex-shrink-0 opacity-60 hover:opacity-100"
              onClick={() => dismiss(banner.id)}
              data-ocid="reminder.close_button"
            >
              <X className="w-3 h-3" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
