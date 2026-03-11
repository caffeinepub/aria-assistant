/**
 * Phase 117-A: Personal Intelligence Engine
 * Extracts profile facts from chat messages and stores them in localStorage.
 */

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Trash2, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalProfile {
  name: string | null;
  interests: string[];
  goals: string[];
  preferences: string[];
  facts: string[];
}

const STORAGE_KEY = "melina_personal_profile";

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function loadProfile(): PersonalProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersonalProfile;
  } catch {
    // ignore
  }
  return { name: null, interests: [], goals: [], preferences: [], facts: [] };
}

export function saveProfile(profile: PersonalProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Extraction logic ─────────────────────────────────────────────────────────

function dedup(arr: string[]): string[] {
  return [
    ...new Set(arr.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  ].map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

export function extractFromMessage(
  userMessage: string,
  currentProfile: PersonalProfile,
): PersonalProfile {
  const msg = userMessage.trim();
  const updated = { ...currentProfile };

  // Name extraction
  const namePatterns = [
    /my name is ([\w]+)/i,
    /i'?m ([\w]+)/i,
    /call me ([\w]+)/i,
    /name'?s? ([\w]+)/i,
  ];
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "just",
    "only",
    "here",
    "sure",
    "good",
    "fine",
    "ok",
    "okay",
    "not",
    "so",
    "very",
    "also",
    "already",
    "going",
    "trying",
    "planning",
    "doing",
    "working",
  ]);
  for (const p of namePatterns) {
    const m = msg.match(p);
    if (m?.[1] && m[1].length > 1 && !stopWords.has(m[1].toLowerCase())) {
      updated.name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
      break;
    }
  }

  // Interest extraction
  const interestPatterns = [
    /i (?:love|enjoy|like|adore) ([^.!?,]+)/i,
    /i'?m (?:into|obsessed with|passionate about) ([^.!?,]+)/i,
    /big fan of ([^.!?,]+)/i,
  ];
  for (const p of interestPatterns) {
    const m = msg.match(p);
    if (m?.[1] && m[1].length < 60) {
      updated.interests = dedup([...updated.interests, m[1]]);
    }
  }

  // Goal extraction
  const goalPatterns = [
    /i want to ([^.!?,]+)/i,
    /my goal is (?:to )?([^.!?,]+)/i,
    /i'?m trying to ([^.!?,]+)/i,
    /i plan to ([^.!?,]+)/i,
    /i hope to ([^.!?,]+)/i,
    /i dream of ([^.!?,]+)/i,
  ];
  for (const p of goalPatterns) {
    const m = msg.match(p);
    if (m?.[1] && m[1].length < 80) {
      updated.goals = dedup([...updated.goals, m[1]]);
    }
  }

  // Preference extraction
  const prefPatterns = [
    /i prefer ([^.!?,]+)/i,
    /i (?:hate|dislike|can'?t stand) ([^.!?,]+)/i,
    /i don'?t like ([^.!?,]+)/i,
    /i always ([^.!?,]+)/i,
    /i never ([^.!?,]+)/i,
  ];
  for (const p of prefPatterns) {
    const m = msg.match(p);
    if (m?.[1] && m[1].length < 80) {
      updated.preferences = dedup([...updated.preferences, m[1]]);
    }
  }

  // General fact extraction
  const factPatterns = [
    /i work (?:as|at) ([^.!?,]+)/i,
    /i'?m a ([\w ]{3,40})/i,
    /i am a ([\w ]{3,40})/i,
    /i live in ([^.!?,]+)/i,
    /i'?m from ([^.!?,]+)/i,
    /i study ([^.!?,]+)/i,
    /i speak ([^.!?,]+)/i,
  ];
  for (const p of factPatterns) {
    const m = msg.match(p);
    if (m?.[1] && m[1].length < 60) {
      updated.facts = dedup([...updated.facts, m[1]]);
    }
  }

  return updated;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePersonalIntelligence() {
  const [profile, setProfile] = useState<PersonalProfile>(() => loadProfile());

  const updateFromMessage = useCallback((userMessage: string) => {
    setProfile((prev) => {
      const next = extractFromMessage(userMessage, prev);
      saveProfile(next);
      return next;
    });
  }, []);

  const clearEntry = useCallback(
    (section: keyof Omit<PersonalProfile, "name">, index: number) => {
      setProfile((prev) => {
        const arr = [...(prev[section] as string[])];
        arr.splice(index, 1);
        const next = { ...prev, [section]: arr };
        saveProfile(next);
        return next;
      });
    },
    [],
  );

  const clearName = useCallback(() => {
    setProfile((prev) => {
      const next = { ...prev, name: null };
      saveProfile(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    clearProfile();
    setProfile({
      name: null,
      interests: [],
      goals: [],
      preferences: [],
      facts: [],
    });
  }, []);

  return { profile, updateFromMessage, clearEntry, clearName, clearAll };
}

// ─── ProfileView component ────────────────────────────────────────────────────

type ProfileSection = {
  key: keyof Omit<PersonalProfile, "name">;
  label: string;
  color: string;
};

const SECTIONS: ProfileSection[] = [
  { key: "interests", label: "Interests", color: "text-cyan-400" },
  { key: "goals", label: "Goals", color: "text-green-400" },
  { key: "preferences", label: "Preferences", color: "text-yellow-400" },
  { key: "facts", label: "About You", color: "text-primary" },
];

interface ProfileViewProps {
  profile: PersonalProfile;
  onClearEntry: (
    section: keyof Omit<PersonalProfile, "name">,
    index: number,
  ) => void;
  onClearName: () => void;
  onClearAll: () => void;
}

function ProfileEntryTag({
  text,
  onRemove,
  color,
}: {
  text: string;
  onRemove: () => void;
  color: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.75 }}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border/30 bg-card/30 text-[10px] font-mono ${color}`}
    >
      <span className="truncate max-w-[140px]">{text}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="Remove entry"
      >
        <X size={9} />
      </button>
    </motion.div>
  );
}

export function ProfileView({
  profile,
  onClearEntry,
  onClearName,
  onClearAll,
}: ProfileViewProps) {
  const hasAnyData =
    profile.name !== null ||
    profile.interests.length > 0 ||
    profile.goals.length > 0 ||
    profile.preferences.length > 0 ||
    profile.facts.length > 0;

  return (
    <div className="flex flex-col gap-2" data-ocid="intelligence.panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Brain size={11} className="text-primary/70" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70">
            Personal Intelligence
          </span>
        </div>
        {hasAnyData && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider text-destructive/60 hover:text-destructive transition-colors"
            data-ocid="intelligence.delete_button"
          >
            <Trash2 size={8} />
            Clear All
          </button>
        )}
      </div>

      <ScrollArea className="max-h-[calc(100vh-280px)]">
        <div className="space-y-3 pr-2">
          {!hasAnyData ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6 text-center"
              data-ocid="intelligence.empty_state"
            >
              <User
                size={24}
                className="mx-auto mb-2 text-muted-foreground/20"
              />
              <p className="font-mono text-[9px] text-muted-foreground/40 leading-relaxed">
                I&apos;m still learning about you.
                <br />
                Keep chatting!
              </p>
            </motion.div>
          ) : (
            <>
              {/* Name */}
              {profile.name && (
                <div className="space-y-1">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/50">
                    Name
                  </span>
                  <AnimatePresence>
                    <ProfileEntryTag
                      key="name"
                      text={profile.name}
                      color="text-primary"
                      onRemove={onClearName}
                    />
                  </AnimatePresence>
                </div>
              )}

              {/* Dynamic sections */}
              {SECTIONS.map((sec) => {
                const items = profile[sec.key] as string[];
                if (items.length === 0) return null;
                return (
                  <div key={sec.key} className="space-y-1">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/50">
                      {sec.label}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <AnimatePresence>
                        {items.map((item, idx) => (
                          <ProfileEntryTag
                            key={item}
                            text={item}
                            color={sec.color}
                            onRemove={() => onClearEntry(sec.key, idx)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Connected profile view (reads its own hook) ─────────────────────────────

export function ConnectedProfileView() {
  const { profile, clearEntry, clearName, clearAll } =
    usePersonalIntelligence();
  return (
    <ProfileView
      profile={profile}
      onClearEntry={clearEntry}
      onClearName={clearName}
      onClearAll={clearAll}
    />
  );
}

// Context builder for melina-engine
export function buildPersonalContext(profile: PersonalProfile): string {
  const parts: string[] = [];
  if (profile.name) parts.push(`User's name: ${profile.name}`);
  if (profile.interests.length > 0)
    parts.push(`Interests: ${profile.interests.slice(0, 3).join(", ")}`);
  if (profile.goals.length > 0)
    parts.push(`Goals: ${profile.goals.slice(0, 2).join(", ")}`);
  if (profile.preferences.length > 0)
    parts.push(`Preferences: ${profile.preferences.slice(0, 2).join(", ")}`);
  if (profile.facts.length > 0)
    parts.push(`Facts: ${profile.facts.slice(0, 2).join(", ")}`);
  return parts.join(" | ");
}
