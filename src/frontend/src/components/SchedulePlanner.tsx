/**
 * SchedulePlanner — Phase 5
 * Daily timeline schedule planner with hourly slots, event cards,
 * reminders overlay, and HUD aesthetic.
 */

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Reminder, ScheduleEvent } from "../backend.d";
import {
  useCompleteScheduleEvent,
  useCreateScheduleEvent,
  useDeleteScheduleEvent,
  useReminders,
  useScheduleEventsByDate,
} from "../hooks/useQueries";

// ─── Constants ─────────────────────────────────────────────────────

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 56; // px per hour

type EventCategory = "work" | "personal" | "health" | "learning" | "other";

const categoryConfig: Record<
  EventCategory,
  { label: string; bg: string; border: string; text: string }
> = {
  work: {
    label: "Work",
    bg: "bg-cyan-400/10",
    border: "border-l-cyan-400",
    text: "text-cyan-400",
  },
  personal: {
    label: "Personal",
    bg: "bg-violet-400/10",
    border: "border-l-violet-400",
    text: "text-violet-400",
  },
  health: {
    label: "Health",
    bg: "bg-green-400/10",
    border: "border-l-green-400",
    text: "text-green-400",
  },
  learning: {
    label: "Learning",
    bg: "bg-amber-400/10",
    border: "border-l-amber-400",
    text: "text-amber-400",
  },
  other: {
    label: "Other",
    bg: "bg-muted/20",
    border: "border-l-muted-foreground/40",
    text: "text-muted-foreground",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function offsetFromHour(hour: number, minute = 0): number {
  return (hour - START_HOUR + minute / 60) * HOUR_HEIGHT;
}

function durationPx(
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
): number {
  const dur = (endHour - startHour) * 60 + (endMin - startMin);
  return Math.max(24, (dur / 60) * HOUR_HEIGHT);
}

function tsToHourMin(ns: bigint): { h: number; m: number } {
  const ms = Number(ns) / 1_000_000;
  const d = new Date(ms);
  return { h: d.getHours(), m: d.getMinutes() };
}

function formatHourMin(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
}

// ─── Add Event Form ─────────────────────────────────────────────────

interface AddEventFormProps {
  selectedDate: string;
  onClose: () => void;
}

function AddEventForm({ selectedDate, onClose }: AddEventFormProps) {
  const createEvent = useCreateScheduleEvent();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState<EventCategory>("work");
  const [note, setNote] = useState("");

  // Sync date when selectedDate changes
  useEffect(() => {
    setDate(selectedDate);
  }, [selectedDate]);

  const handleSubmit = async () => {
    const trimTitle = title.trim();
    if (!trimTitle || !date || !startTime || !endTime) {
      toast.error("Title, date, start, and end time are required");
      return;
    }

    const startDate = new Date(`${date}T${startTime}:00`);
    const endDate = new Date(`${date}T${endTime}:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast.error("Invalid date or time");
      return;
    }
    if (endDate <= startDate) {
      toast.error("End time must be after start time");
      return;
    }

    const startNs = BigInt(startDate.getTime()) * 1_000_000n;
    const endNs = BigInt(endDate.getTime()) * 1_000_000n;

    try {
      await createEvent.mutateAsync({
        title: trimTitle,
        note: note.trim(),
        category,
        startTime: startNs,
        endTime: endNs,
        date,
      });
      toast.success("Event added");
      onClose();
    } catch {
      toast.error("Failed to add event");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="p-2.5 rounded-sm bg-card/20 border border-primary/20 space-y-2 mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-mono text-[9px] text-primary/60 tracking-widest uppercase">
            New Event
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Close form"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <input
          type="text"
          placeholder="Event title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-7 px-2 rounded-sm font-body text-xs hud-input"
          data-ocid="schedule.title_input"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-7 px-2 rounded-sm font-mono text-[10px] hud-input"
          data-ocid="schedule.date_input"
        />

        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
              Start
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-7 px-2 rounded-sm font-mono text-[10px] hud-input"
              data-ocid="schedule.start_time_input"
            />
          </div>
          <div className="space-y-0.5">
            <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
              End
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-7 px-2 rounded-sm font-mono text-[10px] hud-input"
              data-ocid="schedule.end_time_input"
            />
          </div>
        </div>

        <Select
          value={category}
          onValueChange={(v) => setCategory(v as EventCategory)}
        >
          <SelectTrigger
            className="h-7 hud-input text-[10px] font-mono rounded-sm border-primary/20 focus:border-primary/60 px-2"
            data-ocid="schedule.category_select"
          >
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border font-mono text-xs">
            {(Object.keys(categoryConfig) as EventCategory[]).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryConfig[cat].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <textarea
          placeholder="Optional note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-2 py-1 rounded-sm font-body text-xs hud-input resize-none"
          data-ocid="schedule.note_textarea"
        />

        <Button
          type="button"
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={
            !title.trim() ||
            !date ||
            !startTime ||
            !endTime ||
            createEvent.isPending
          }
          className="w-full h-7 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
          data-ocid="schedule.submit_button"
        >
          {createEvent.isPending ? "Adding..." : "+ Add Event"}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Event Card (positioned in timeline) ────────────────────────────

interface EventCardProps {
  event: ScheduleEvent;
  topPx: number;
  heightPx: number;
  index: number;
}

function EventCard({ event, topPx, heightPx, index }: EventCardProps) {
  const deleteEvent = useDeleteScheduleEvent();
  const completeEvent = useCompleteScheduleEvent();

  const cat =
    (event.category as EventCategory) in categoryConfig
      ? (event.category as EventCategory)
      : "other";
  const cfg = categoryConfig[cat];

  const { h: sh, m: sm } = tsToHourMin(event.startTime);
  const { h: eh, m: em } = tsToHourMin(event.endTime);

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const handleComplete = async () => {
    try {
      await completeEvent.mutateAsync(event.id);
      toast.success("Event marked complete");
    } catch {
      toast.error("Failed to complete event");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.2 }}
      className={`absolute left-0 right-1 rounded-sm border-l-2 px-1.5 py-1 ${cfg.bg} ${cfg.border} border border-border/20 overflow-hidden transition-all ${
        event.completed ? "opacity-40" : ""
      }`}
      style={{ top: topPx, height: heightPx, minHeight: 24 }}
      data-ocid={`schedule.item.${index + 1}`}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="flex-1 min-w-0 space-y-0.5">
          <p
            className={`font-body text-[10px] font-medium leading-tight truncate ${
              event.completed
                ? "line-through text-muted-foreground/50"
                : "text-foreground/90"
            }`}
          >
            {event.title}
          </p>
          {heightPx > 36 && (
            <p className={`font-mono text-[8px] ${cfg.text} opacity-80`}>
              {formatHourMin(sh, sm)} – {formatHourMin(eh, em)}
            </p>
          )}
          {heightPx > 52 && event.note && (
            <p className="font-body text-[8px] text-muted-foreground/60 truncate">
              {event.note}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          {!event.completed && (
            <button
              type="button"
              onClick={() => void handleComplete()}
              disabled={completeEvent.isPending}
              className="w-4 h-4 flex items-center justify-center rounded-sm text-green-400/60 hover:text-green-400 transition-colors"
              aria-label="Mark complete"
              data-ocid={`schedule.complete_button.${index + 1}`}
            >
              <Check className="w-2.5 h-2.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleteEvent.isPending}
            className="w-4 h-4 flex items-center justify-center rounded-sm text-destructive/40 hover:text-destructive transition-colors"
            aria-label="Delete event"
            data-ocid={`schedule.delete_button.${index + 1}`}
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Reminder Slot (read-only amber overlay) ──────────────────────

interface ReminderSlotProps {
  reminder: Reminder;
  topPx: number;
}

function ReminderSlot({ reminder, topPx }: ReminderSlotProps) {
  const { h, m } = tsToHourMin(reminder.dueTime);
  return (
    <div
      className="absolute left-0 right-1 rounded-sm border-l-2 border-l-amber-400 bg-amber-400/8 border border-amber-400/20 px-1.5 py-0.5 overflow-hidden"
      style={{ top: topPx, height: 24, minHeight: 24 }}
      title={`Reminder: ${reminder.title} at ${formatHourMin(h, m)}`}
    >
      <div className="flex items-center gap-1">
        <Clock className="w-2.5 h-2.5 text-amber-400/70 flex-shrink-0" />
        <p className="font-body text-[9px] text-amber-400/80 truncate">
          {reminder.title}
        </p>
      </div>
    </div>
  );
}

// ─── SchedulePlanner ─────────────────────────────────────────────────

export default function SchedulePlanner() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const dateStr = toDateString(selectedDate);
  const isToday = dateStr === toDateString(new Date());

  const { data: events = [], isLoading } = useScheduleEventsByDate(dateStr);
  const { data: reminders = [] } = useReminders();

  // Current time position (only for today)
  const currentTimePx = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < START_HOUR || h >= END_HOUR) return null;
    return offsetFromHour(h, m);
  }, [isToday]);

  // Filter reminders for today
  const todayReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (r.completed) return false;
      const ms = Number(r.dueTime) / 1_000_000;
      const d = new Date(ms);
      return toDateString(d) === dateStr;
    });
  }, [reminders, dateStr]);

  // Navigate days
  const prevDay = () => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() - 1);
      return next;
    });
  };
  const nextDay = () => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      return next;
    });
  };

  // Scroll to current time on mount
  useEffect(() => {
    if (isToday && currentTimePx !== null && timelineRef.current) {
      const scrollTop = Math.max(0, currentTimePx - 100);
      timelineRef.current.scrollTop = scrollTop;
    }
  }, [isToday, currentTimePx]);

  const totalHours = END_HOUR - START_HOUR + 1;

  return (
    <div className="flex flex-col h-full space-y-1.5">
      {/* Date navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevDay}
          className="h-6 w-6 flex items-center justify-center rounded-sm border border-border/40 text-muted-foreground/60 hover:text-primary hover:border-primary/40 transition-all"
          aria-label="Previous day"
          data-ocid="schedule.prev_day_button"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1.5 flex-1 justify-center">
          <CalendarDays className="w-3 h-3 text-primary/60" />
          <span className="font-mono text-[10px] text-foreground/80 tracking-wider">
            {selectedDate.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          {isToday && (
            <span className="font-mono text-[8px] px-1 py-0.5 rounded-sm bg-primary/10 border border-primary/25 text-primary/70 uppercase tracking-wider">
              Today
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={nextDay}
          className="h-6 w-6 flex items-center justify-center rounded-sm border border-border/40 text-muted-foreground/60 hover:text-primary hover:border-primary/40 transition-all"
          aria-label="Next day"
          data-ocid="schedule.next_day_button"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add event toggle */}
      <Button
        type="button"
        size="sm"
        onClick={() => setShowForm((v) => !v)}
        className="w-full h-7 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/50 font-mono text-[9px] tracking-widest uppercase rounded-sm flex items-center gap-1.5"
        data-ocid="schedule.add_event_button"
      >
        <Plus className="w-3 h-3" />
        {showForm ? "Cancel" : "Add Event"}
      </Button>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <AddEventForm
            selectedDate={dateStr}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-1.5" data-ocid="schedule.loading_state">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-sm bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          ref={timelineRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: "calc(100vh - 320px)", minHeight: 200 }}
        >
          <div
            className="relative"
            style={{ height: totalHours * HOUR_HEIGHT }}
          >
            {/* Hour grid lines */}
            {Array.from({ length: totalHours }).map((_, i) => {
              const hour = START_HOUR + i;
              const top = i * HOUR_HEIGHT;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border/15"
                  style={{ top }}
                >
                  <span className="absolute left-0 top-0.5 font-mono text-[8px] text-muted-foreground/40 leading-none select-none w-8 text-right pr-1">
                    {hour < 10 ? `0${hour}` : hour}:00
                  </span>
                </div>
              );
            })}

            {/* Event area (left offset for time labels) */}
            <div
              className="absolute"
              style={{ left: 36, right: 0, top: 0, bottom: 0 }}
            >
              {/* Current time indicator */}
              {currentTimePx !== null && (
                <div
                  className="absolute left-0 right-0 z-10 flex items-center"
                  style={{ top: currentTimePx - 1 }}
                >
                  <div className="w-2 h-2 rounded-full bg-destructive flex-shrink-0 -ml-1" />
                  <div className="flex-1 h-px bg-destructive/60" />
                </div>
              )}

              {/* Reminder slots */}
              <AnimatePresence>
                {todayReminders.map((r) => {
                  const ms = Number(r.dueTime) / 1_000_000;
                  const d = new Date(ms);
                  const h = d.getHours();
                  const m = d.getMinutes();
                  if (h < START_HOUR || h >= END_HOUR) return null;
                  const top = offsetFromHour(h, m);
                  return (
                    <ReminderSlot
                      key={r.id.toString()}
                      reminder={r}
                      topPx={top}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Events */}
              <AnimatePresence>
                {events.map((evt, idx) => {
                  const startMs = Number(evt.startTime) / 1_000_000;
                  const endMs = Number(evt.endTime) / 1_000_000;
                  const sd = new Date(startMs);
                  const ed = new Date(endMs);
                  const sh = sd.getHours();
                  const sm = sd.getMinutes();
                  const eh = ed.getHours();
                  const em = ed.getMinutes();

                  // Clamp to visible range
                  const clampedSh = Math.max(START_HOUR, sh);
                  const clampedEh = Math.min(END_HOUR, eh);
                  if (clampedSh >= END_HOUR) return null;

                  const top = offsetFromHour(
                    clampedSh,
                    sh >= START_HOUR ? sm : 0,
                  );
                  const height = durationPx(
                    clampedSh,
                    sh >= START_HOUR ? sm : 0,
                    clampedEh,
                    eh <= END_HOUR ? em : 0,
                  );

                  return (
                    <EventCard
                      key={evt.id.toString()}
                      event={evt}
                      topPx={top}
                      heightPx={height}
                      index={idx}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Empty state overlay */}
              {events.length === 0 && todayReminders.length === 0 && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  data-ocid="schedule.empty_state"
                >
                  <div className="text-center space-y-1 opacity-40">
                    <CalendarDays className="w-5 h-5 mx-auto text-muted-foreground/50" />
                    <p className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                      No events scheduled
                    </p>
                    <p className="font-body text-[9px] text-muted-foreground/40">
                      Add one above
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
