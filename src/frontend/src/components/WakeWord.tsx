import { Mic, MicOff, Radio } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface WakeWordProps {
  onActivate: () => void;
  onCommand?: (text: string) => void;
  isRecording?: boolean;
  disabled?: boolean;
}

const WAKE_PHRASES = [
  "hey melina",
  "hi melina",
  "melina",
  "okay melina",
  "ok melina",
];

type WakeState = "idle" | "listening" | "detected" | "error";

export function WakeWord({
  onActivate,
  onCommand,
  isRecording,
  disabled,
}: WakeWordProps) {
  const [wakeState, setWakeState] = useState<WakeState>("idle");
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnabledRef = useRef(false);

  const stopRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!isEnabledRef.current) return;
    if (isRecording) return; // don't run during voice note recording

    const SpeechRecognitionAPI =
      (
        window as unknown as {
          SpeechRecognition?: new () => any;
          webkitSpeechRecognition?: new () => any;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          SpeechRecognition?: new () => any;
          webkitSpeechRecognition?: new () => any;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setWakeState("error");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      if (isEnabledRef.current) setWakeState("listening");
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();

          const detected = WAKE_PHRASES.find((phrase) =>
            transcript.includes(phrase),
          );
          if (detected) {
            setWakeState("detected");
            setLastDetected(detected);
            onActivate();

            // Extract command after wake phrase
            const phraseIndex = transcript.indexOf(detected);
            const afterWake = transcript
              .slice(phraseIndex + detected.length)
              .trim();
            if (afterWake && afterWake.length > 2 && onCommand) {
              onCommand(afterWake);
            }

            // Reset to listening after 2s
            restartTimerRef.current = setTimeout(() => {
              if (isEnabledRef.current) setWakeState("listening");
            }, 2000);
            return;
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setPermissionDenied(true);
        setWakeState("error");
        setIsEnabled(false);
        isEnabledRef.current = false;
        return;
      }
      // Auto-restart on other errors
      if (isEnabledRef.current) {
        restartTimerRef.current = setTimeout(() => startRecognition(), 1000);
      }
    };

    recognition.onend = () => {
      // Auto-restart to keep listening
      if (isEnabledRef.current) {
        restartTimerRef.current = setTimeout(() => startRecognition(), 300);
      } else {
        setWakeState("idle");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      restartTimerRef.current = setTimeout(() => startRecognition(), 1000);
    }
  }, [isRecording, onActivate, onCommand]);

  const toggleEnabled = () => {
    if (permissionDenied) return;
    const next = !isEnabled;
    setIsEnabled(next);
    isEnabledRef.current = next;
    if (next) {
      setLastDetected(null);
      startRecognition();
    } else {
      stopRecognition();
      setWakeState("idle");
    }
  };

  // Pause when voice note recording starts
  useEffect(() => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    } else if (!isRecording && isEnabledRef.current) {
      restartTimerRef.current = setTimeout(() => startRecognition(), 500);
    }
  }, [isRecording, startRecognition]);

  // Cleanup
  useEffect(() => {
    return () => {
      isEnabledRef.current = false;
      stopRecognition();
    };
  }, [stopRecognition]);

  const supportsRecognition =
    !!(window as unknown as Record<string, unknown>).SpeechRecognition ||
    !!(window as unknown as Record<string, unknown>).webkitSpeechRecognition;

  if (!supportsRecognition) return null;

  const stateColors: Record<WakeState, string> = {
    idle: "bg-slate-700 text-slate-400",
    listening: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
    detected: "bg-cyan-900/40 text-cyan-300 border-cyan-600/50",
    error: "bg-red-900/40 text-red-400 border-red-700/50",
  };

  const stateLabels: Record<WakeState, string> = {
    idle: "Wake word off",
    listening: 'Listening for "Hey Melina"',
    detected: `Detected: "${lastDetected}"`,
    error: permissionDenied
      ? "Mic permission denied"
      : "Recognition unavailable",
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-t border-white/5">
      <Button
        variant="ghost"
        size="sm"
        data-ocid="wakeword.toggle"
        onClick={toggleEnabled}
        disabled={disabled || permissionDenied}
        className={`h-7 w-7 p-0 rounded-full transition-all ${
          isEnabled
            ? wakeState === "detected"
              ? "text-cyan-400 bg-cyan-900/30 hover:bg-cyan-900/50"
              : "text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50"
            : "text-slate-500 hover:text-slate-300"
        }`}
        title={
          isEnabled
            ? "Disable wake word"
            : 'Enable wake word (say "Hey Melina")'
        }
      >
        {isEnabled ? (
          <Radio
            className={`h-3.5 w-3.5 ${
              wakeState === "listening" ? "animate-pulse" : ""
            }`}
          />
        ) : (
          <MicOff className="h-3.5 w-3.5" />
        )}
      </Button>

      {isEnabled && (
        <Badge
          variant="outline"
          data-ocid="wakeword.status"
          className={`text-[10px] px-1.5 py-0 h-5 border transition-all ${
            stateColors[wakeState]
          }`}
        >
          {wakeState === "listening" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
          )}
          {wakeState === "detected" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1" />
          )}
          {stateLabels[wakeState]}
        </Badge>
      )}

      {!isEnabled && !permissionDenied && (
        <span className="text-[10px] text-slate-600">
          Say "Hey Melina" to activate
        </span>
      )}

      {permissionDenied && (
        <span className="text-[10px] text-red-500/70">
          Allow mic access to use wake word
        </span>
      )}
    </div>
  );
}
