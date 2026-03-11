import { Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

interface FloatingBubbleProps {
  visible: boolean;
  messages?: LocalMessage[];
  onSend?: (text: string) => void;
  isSending?: boolean;
  currentTab?: string;
  onInjectMessage?: (content: string) => void;
}

const STORAGE_KEY = "melina_bubble_position";
const REMOVED_KEY = "melina_bubble_removed";
const OVERLAY_KEY = "melina_bubble_overlay_open";

function getDefaultPosition() {
  return { x: window.innerWidth - 80, y: 24 };
}

function clampPosition(x: number, y: number) {
  const size = 56;
  const maxX = window.innerWidth - size - 8;
  const maxY = window.innerHeight - size - 8;
  return {
    x: Math.max(8, Math.min(x, maxX)),
    y: Math.max(8, Math.min(y, maxY)),
  };
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function FloatingBubble({
  visible,
  messages = [],
  onSend,
  isSending = false,
  currentTab,
  onInjectMessage,
}: FloatingBubbleProps) {
  const [removed, setRemoved] = useState(() => {
    return localStorage.getItem(REMOVED_KEY) === "true";
  });

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const p = JSON.parse(stored);
        return clampPosition(p.x, p.y);
      }
    } catch {}
    return getDefaultPosition();
  });

  const [showMenu, setShowMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(() => {
    if (localStorage.getItem(REMOVED_KEY) === "true") return false;
    return localStorage.getItem(OVERLAY_KEY) === "true";
  });
  const [inputText, setInputText] = useState("");

  const dragStart = useRef<{
    mouseX: number;
    mouseY: number;
    posX: number;
    posY: number;
  } | null>(null);
  const hasMoved = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastGreetedTab = useRef<string | null>(null);

  // Persist overlay open state to localStorage
  useEffect(() => {
    localStorage.setItem(OVERLAY_KEY, overlayOpen ? "true" : "false");
  }, [overlayOpen]);

  // Auto-scroll to bottom when overlay opens or new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length triggers scroll
  useEffect(() => {
    if (overlayOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [overlayOpen, messages.length]);

  // Focus input when overlay opens
  useEffect(() => {
    if (overlayOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [overlayOpen]);

  // Proactive tab-aware greeting when overlay opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional tab greeting on open
  useEffect(() => {
    if (!overlayOpen || !currentTab || !onInjectMessage) return;
    if (lastGreetedTab.current === currentTab) return;
    const tab = currentTab.toLowerCase();
    let greeting = "Hey, I'm right here if you need anything — just ask.";
    if (tab === "habits" || tab === "h.stats") {
      greeting =
        "I see you're on the Habits tab — need help tracking something or checking your streaks?";
    } else if (tab === "reminders") {
      greeting =
        "Checking your reminders? I can help you add new ones or review what's coming up.";
    } else if (tab === "schedule" || tab === "sched") {
      greeting =
        "Planning your day? I can walk you through your schedule or help you add new events.";
    } else if (tab === "insights" || tab === "insght") {
      greeting =
        "On the Insights tab — want me to highlight anything from your patterns?";
    } else if (tab === "memory") {
      greeting =
        "Looking through your memory? I can help you recall something specific.";
    } else if (tab === "dashboard") {
      greeting =
        "Back at the dashboard — want a quick status update on your habits and reminders?";
    } else if (tab === "automation" || tab === "auto" || tab === "log") {
      greeting =
        "Playing with automations? I can help you create or troubleshoot rules.";
    } else if (tab === "patterns") {
      greeting =
        "Looks like you're on Patterns — want me to walk you through your trends?";
    } else if (tab === "you") {
      greeting =
        "Checking out your profile? Let me know if you want to update anything I know about you.";
    } else if (tab === "smart-home") {
      greeting =
        "On the Smart Home panel — need help controlling lights, the thermostat, or cameras?";
    } else if (tab === "integrations") {
      greeting =
        "On Integrations — need help connecting a calendar or managing your settings?";
    }
    lastGreetedTab.current = currentTab;
    onInjectMessage(greeting);
  }, [overlayOpen]);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const savePosition = useCallback((x: number, y: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
  }, []);

  // Mouse drag handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) return;
      hasMoved.current = false;
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      setDragging(true);

      function onMove(ev: MouseEvent) {
        if (!dragStart.current) return;
        const dx = ev.clientX - dragStart.current.mouseX;
        const dy = ev.clientY - dragStart.current.mouseY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
        const clamped = clampPosition(
          dragStart.current.posX + dx,
          dragStart.current.posY + dy,
        );
        setPosition(clamped);
      }

      function onUp() {
        setDragging(false);
        dragStart.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [position],
  );

  // Save position whenever it changes
  useEffect(() => {
    savePosition(position.x, position.y);
  }, [position, savePosition]);

  // Touch drag handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      hasMoved.current = false;
      dragStart.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        posX: position.x,
        posY: position.y,
      };

      longPressTimer.current = setTimeout(() => {
        if (!hasMoved.current) {
          setShowMenu(true);
        }
      }, 600);
    },
    [position],
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.mouseX;
    const dy = touch.clientY - dragStart.current.mouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    const clamped = clampPosition(
      dragStart.current.posX + dx,
      dragStart.current.posY + dy,
    );
    setPosition(clamped);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    dragStart.current = null;
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  }, []);

  const handleRemove = useCallback(() => {
    setShowMenu(false);
    setOverlayOpen(false);
    setRemoved(true);
    localStorage.setItem(REMOVED_KEY, "true");
  }, []);

  const handleBubbleClick = useCallback(() => {
    if (hasMoved.current) return; // was a drag, not a tap
    setShowMenu(false);
    setOverlayOpen((v) => !v);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isSending || !onSend) return;
    onSend(text);
    setInputText("");
  }, [inputText, isSending, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (removed) return null;

  return (
    <>
      {/* Large Chat Overlay */}
      <AnimatePresence>
        {overlayOpen && visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm"
            onClick={() => setOverlayOpen(false)}
            data-ocid="bubble_overlay.modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="absolute inset-4 md:inset-8 lg:inset-16 flex flex-col rounded-2xl overflow-hidden border border-red-900/40 bg-background shadow-2xl shadow-black/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Overlay Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-card/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-900 via-red-700 to-black border border-red-500/50 flex items-center justify-center">
                    <span className="text-xs font-bold text-red-200">M</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      Melina
                    </p>
                    <p className="text-xs text-muted-foreground font-mono tracking-wider">
                      ARIA ASSISTANT
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOverlayOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  data-ocid="bubble_overlay.close_button"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center h-full gap-2 text-center"
                    data-ocid="bubble_overlay.empty_state"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-900 via-red-700 to-black border border-red-500/40 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-red-200">M</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Hey, I'm Melina.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ask me anything.
                    </p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    data-ocid={`bubble_overlay.item.${msg.role}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-900 via-red-700 to-black border border-red-500/40 flex items-center justify-center mr-2 mt-1 shrink-0">
                        <span className="text-[9px] font-bold text-red-200">
                          M
                        </span>
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border/60 text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          msg.role === "user"
                            ? "text-primary-foreground/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div
                    className="flex justify-start"
                    data-ocid="bubble_overlay.loading_state"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-900 via-red-700 to-black border border-red-500/40 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <span className="text-[9px] font-bold text-red-200">
                        M
                      </span>
                    </div>
                    <div className="bg-card border border-border/60 rounded-2xl rounded-bl-sm px-4 py-2.5">
                      <div className="flex gap-1 items-center h-4">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border/60 bg-card/60 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Melina..."
                    disabled={isSending}
                    className="flex-1 bg-muted/30 border border-border/60 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
                    data-ocid="bubble_overlay.input"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputText.trim() || isSending}
                    className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    data-ocid="bubble_overlay.submit_button"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bubble */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              zIndex: 9999,
              userSelect: "none",
              touchAction: "none",
            }}
            data-ocid="floating_bubble.button"
          >
            {/* Bubble button */}
            <button
              type="button"
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onContextMenu={onContextMenu}
              onClick={handleBubbleClick}
              className={[
                "w-14 h-14 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-red-900 via-red-700 to-black",
                "border-2 shadow-lg shadow-red-900/50",
                overlayOpen
                  ? "border-red-400 scale-95"
                  : "border-red-500/60 hover:scale-105 hover:border-red-400",
                "cursor-grab active:cursor-grabbing",
                "transition-all duration-150",
                dragging ? "scale-95 shadow-xl" : "",
              ].join(" ")}
              title="Melina - tap to chat"
            >
              {/* Pulse ring */}
              {!overlayOpen && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20 pointer-events-none" />
              )}
              {/* Avatar initials / icon */}
              <span className="relative font-bold text-lg text-red-200 tracking-wider select-none pointer-events-none">
                M
              </span>
            </button>

            {/* Context menu */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 right-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[140px] z-50"
                  data-ocid="floating_bubble.dropdown_menu"
                >
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="w-full px-4 py-2.5 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors font-body"
                    data-ocid="floating_bubble.delete_button"
                  >
                    Remove bubble
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-2.5 text-sm text-left text-muted-foreground hover:bg-muted/20 transition-colors font-body"
                    data-ocid="floating_bubble.cancel_button"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
