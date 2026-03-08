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
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Mic, MicOff, Send, StopCircle, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import MemoryPanel from "../components/MemoryPanel";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useChatHistory,
  useClearChat,
  useMemoryEntries,
  useSaveUserProfile,
  useSendMessage,
  useUserProfile,
} from "../hooks/useQueries";

type MelinaStatus = "idle" | "thinking" | "responding";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  audioUrl?: string;
  isVoiceNote?: boolean;
};

function formatTime(ts: number | bigint): string {
  const date = new Date(typeof ts === "bigint" ? Number(ts) / 1_000_000 : ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusDot({ status }: { status: MelinaStatus }) {
  const config = {
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
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span
        className={`font-mono text-[9px] tracking-[0.3em] uppercase ${config.color}`}
      >
        {config.label}
      </span>
    </div>
  );
}

export default function ChatPage() {
  const { clear } = useInternetIdentity();
  const { data: chatHistory = [], isLoading: historyLoading } =
    useChatHistory();
  const { data: memoryEntries = [] } = useMemoryEntries();
  const { data: userProfile } = useUserProfile();
  const saveProfile = useSaveUserProfile();
  const sendMessage = useSendMessage();
  const clearChat = useClearChat();

  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState<MelinaStatus>("idle");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  // Hide welcome overlay after 3.5s
  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll helper — called imperatively after message updates
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  // Build greeting
  const getGreeting = useCallback((): string => {
    const nameMemory = memoryEntries.find(
      (e) => e.key.toLowerCase() === "name",
    );
    const name = nameMemory?.value || userProfile?.username || "there";
    return `Hello, ${name}. I'm Melina — your personal ARIA companion. I'm ready to assist you. What can I help you with today?`;
  }, [memoryEntries, userProfile]);

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
      const result = await sendMessage.mutateAsync(msg);
      setStatus("responding");

      const aiMsg: LocalMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: result.response,
        timestamp: Date.now(),
      };

      setLocalMessages((prev) => [...prev, aiMsg]);
      scrollToBottom();

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
          content: "[Voice Note]",
          timestamp: Date.now(),
          audioUrl: url,
          isVoiceNote: true,
        };
        setLocalMessages((prev) => [...prev, voiceMsg]);
        scrollToBottom();

        // Clean up stream tracks
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

  const allMessages = localMessages;

  return (
    <div className="h-screen bg-background hud-grid flex flex-col overflow-hidden relative">
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
                className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-primary/50 avatar-glow"
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
                  MELINA
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
          <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/40">
            <img
              src="/assets/generated/melina-avatar.dim_600x800.png"
              alt="Melina"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div>
            <span className="font-mono text-xs tracking-widest text-primary uppercase">
              ARIA
            </span>
            <span className="font-mono text-[9px] text-muted-foreground ml-2 tracking-wider">
              v1.0.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userProfile && (
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider hidden sm:block">
              {userProfile.username}
            </span>
          )}
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

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ── */}
        <aside className="w-72 xl:w-80 flex-shrink-0 border-r border-border/50 flex flex-col bg-card/10 backdrop-blur-sm overflow-hidden">
          {/* Avatar section */}
          <div className="relative flex-shrink-0">
            <div className="relative overflow-hidden scanlines">
              <img
                src="/assets/generated/melina-avatar.dim_600x800.png"
                alt="Melina Avatar"
                className="w-full object-cover avatar-glow"
                style={{ maxHeight: "300px", objectPosition: "top" }}
              />

              {/* Overlay gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />

              {/* HUD overlay elements */}
              <div className="absolute top-2 left-2 font-mono text-[8px] text-primary/60 tracking-widest">
                ARIA·UNIT·001
              </div>
              <div className="absolute top-2 right-2 font-mono text-[8px] text-primary/60 tracking-widest">
                ONLINE
              </div>

              {/* Bottom name overlay */}
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <h2 className="font-display text-2xl font-bold tracking-[0.4em] glow-cyan text-primary uppercase">
                  MELINA
                </h2>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex justify-center py-2 border-b border-border/30">
              <StatusDot status={status} />
            </div>
          </div>

          {/* Scrollable bottom section */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Memory Panel */}
            <MemoryPanel />

            {/* HUD data strips */}
            <div className="mt-3 space-y-1.5 px-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                  Messages
                </span>
                <span className="font-mono text-[9px] text-primary/70">
                  {allMessages.length}
                </span>
              </div>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                  Memories
                </span>
                <span className="font-mono text-[9px] text-primary/70">
                  {memoryEntries.length}
                </span>
              </div>
            </div>
          </div>
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
                          ) : (
                            <p className="font-body text-sm leading-relaxed text-foreground/90">
                              {msg.content}
                            </p>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className="font-mono text-[9px] text-muted-foreground/60 px-1">
                          {formatTime(msg.timestamp)}
                        </span>
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
