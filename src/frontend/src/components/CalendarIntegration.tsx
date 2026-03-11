/**
 * Phase 117-E: External Calendar Integration
 * Connects to external calendars via iCal/ICS URL.
 * Parses and displays upcoming events, makes them available to Melina.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, ExternalLink, RefreshCw, Unlink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end?: Date;
  description?: string;
  location?: string;
}

const STORAGE_KEY = "melina_calendar_url";
const EVENTS_KEY = "melina_calendar_events";

// Very lightweight iCal parser (handles VEVENT blocks)
function parseICS(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // unfold continuation lines
    .replace(/\n[ \t]/g, "")
    .split("\n");

  let inEvent = false;
  let current: Partial<CalendarEvent> & { uid?: string } = {};

  const parseDate = (val: string): Date => {
    // Handle VALUE=DATE or TZID= prefixes
    const raw = val.includes(":") ? val.split(":").pop()! : val;
    if (raw.length === 8) {
      // DATE format YYYYMMDD
      return new Date(
        `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
      );
    }
    // DATETIME YYYYMMDDTHHMMSSZ
    return new Date(
      raw
        .replace(
          /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
          "$1-$2-$3T$4:$5:$6",
        )
        .replace("Z", "+00:00"),
    );
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current.title && current.start) {
        events.push({
          uid: current.uid ?? Math.random().toString(36).slice(2),
          title: current.title,
          start: current.start,
          end: current.end,
          description: current.description,
          location: current.location,
        });
      }
      inEvent = false;
      current = {};
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).toUpperCase();
    const value = line
      .slice(colonIdx + 1)
      .replace(/\\n/g, "\n")
      .replace(/\\,/g, ",");

    if (key === "SUMMARY") current.title = value;
    else if (key.startsWith("DTSTART")) {
      try {
        current.start = parseDate(key.includes(":") ? line : value);
      } catch {}
    } else if (key.startsWith("DTEND")) {
      try {
        current.end = parseDate(value);
      } catch {}
    } else if (key === "DESCRIPTION") current.description = value.slice(0, 200);
    else if (key === "LOCATION") current.location = value;
    else if (key === "UID") current.uid = value;
  }

  return events;
}

async function fetchICS(url: string): Promise<CalendarEvent[]> {
  // Use a CORS proxy for external calendars
  const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxied, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return parseICS(text);
}

function formatEventDate(d: Date): string {
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function isUpcoming(d: Date): boolean {
  return d.getTime() > Date.now() - 1000 * 60 * 60; // allow events started within last hour
}

// Exported hook for ChatPage / Melina engine to access calendar events
export function useCalendarEvents(): CalendarEvent[] {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const raw = localStorage.getItem(EVENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<
        CalendarEvent & { start: string; end?: string }
      >;
      return parsed.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: e.end ? new Date(e.end) : undefined,
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const listener = () => {
      try {
        const raw = localStorage.getItem(EVENTS_KEY);
        if (!raw) {
          setEvents([]);
          return;
        }
        const parsed = JSON.parse(raw) as Array<
          CalendarEvent & { start: string; end?: string }
        >;
        setEvents(
          parsed.map((e) => ({
            ...e,
            start: new Date(e.start),
            end: e.end ? new Date(e.end) : undefined,
          })),
        );
      } catch {
        setEvents([]);
      }
    };
    window.addEventListener("melina_calendar_updated", listener);
    return () =>
      window.removeEventListener("melina_calendar_updated", listener);
  }, []);

  return events;
}

export default function CalendarIntegration() {
  const [url, setUrl] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? "",
  );
  const [inputUrl, setInputUrl] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const raw = localStorage.getItem(EVENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<
        CalendarEvent & { start: string; end?: string }
      >;
      return parsed.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: e.end ? new Date(e.end) : undefined,
      }));
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  const saveEvents = useCallback((evts: CalendarEvent[]) => {
    setEvents(evts);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(evts));
    window.dispatchEvent(new Event("melina_calendar_updated"));
  }, []);

  const doFetch = useCallback(
    async (calUrl: string) => {
      setLoading(true);
      try {
        const fetched = await fetchICS(calUrl);
        const upcoming = fetched
          .filter((e) => isUpcoming(e.start))
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .slice(0, 50);
        saveEvents(upcoming);
        toast.success(`Synced ${upcoming.length} upcoming events`);
      } catch (err) {
        toast.error("Could not fetch calendar. Check the URL and try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [saveEvents],
  );

  const handleConnect = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setUrl(trimmed);
    setInputUrl("");
    await doFetch(trimmed);
  };

  const handleRefresh = async () => {
    if (!url) return;
    await doFetch(url);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EVENTS_KEY);
    setUrl("");
    setEvents([]);
    window.dispatchEvent(new Event("melina_calendar_updated"));
    toast.success("Calendar disconnected");
  };

  const upcomingToday = events.filter((e) => {
    const today = new Date();
    return e.start.toDateString() === today.toDateString();
  });

  return (
    <div className="space-y-3" data-ocid="calendar.panel">
      <p className="font-mono text-[9px] text-muted-foreground/50 tracking-wider">
        EXTERNAL CALENDAR
      </p>

      {!url ? (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Paste a public iCal / ICS URL to sync your calendar with Melina.
            Google Calendar: Settings → &quot;Secret address in iCal
            format&quot;.
          </p>
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="webcal:// or https://... .ics"
            className="h-7 text-[10px] font-mono"
            data-ocid="calendar.input"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleConnect();
            }}
          />
          <Button
            size="sm"
            className="w-full h-7 text-[10px] font-mono"
            onClick={() => void handleConnect()}
            disabled={!inputUrl.trim() || loading}
            data-ocid="calendar.connect_button"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            {loading ? "Connecting..." : "Connect Calendar"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-mono text-primary/70 truncate flex-1">
              {url.slice(0, 40)}
              {url.length > 40 ? "..." : ""}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={() => void handleRefresh()}
                disabled={loading}
                data-ocid="calendar.refresh_button"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-destructive"
                onClick={handleDisconnect}
                data-ocid="calendar.disconnect_button"
                title="Disconnect"
              >
                <Unlink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {upcomingToday.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded p-1.5">
              <p className="text-[9px] font-mono text-primary/60 mb-1">TODAY</p>
              {upcomingToday.slice(0, 3).map((e) => (
                <div key={e.uid} className="text-[10px] truncate">
                  <span className="text-primary/80 font-medium">{e.title}</span>
                  <span className="text-muted-foreground ml-1">
                    {e.start.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <ScrollArea className="h-40">
            <div className="space-y-1">
              {events.length === 0 ? (
                <p
                  className="text-[10px] text-muted-foreground text-center py-4"
                  data-ocid="calendar.empty_state"
                >
                  No upcoming events
                </p>
              ) : (
                events.slice(0, 20).map((e, idx) => (
                  <div
                    key={e.uid}
                    className="flex items-start gap-1.5 p-1.5 rounded bg-card/30 border border-border/20"
                    data-ocid={`calendar.item.${idx + 1}`}
                  >
                    <CalendarDays className="w-3 h-3 text-primary/50 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">
                        {e.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {formatEventDate(e.start)}
                      </p>
                      {e.location && (
                        <p className="text-[9px] text-muted-foreground truncate">
                          {e.location}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[8px] px-1 py-0 flex-shrink-0"
                    >
                      {e.start.toDateString() === new Date().toDateString()
                        ? "Today"
                        : "Soon"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <p className="text-[8px] text-muted-foreground/40 text-center">
            {events.length} upcoming event{events.length !== 1 ? "s" : ""}{" "}
            synced
          </p>
        </div>
      )}
    </div>
  );
}
