import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Flame,
  Lightbulb,
  Lock,
  Shield,
  Thermometer,
  Wind,
  ZapOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────
interface LightState {
  on: boolean;
  brightness: number;
  colorTemp: "Warm" | "Cool" | "Daylight";
}

interface ThermostatState {
  current: number;
  target: number;
  mode: "Heat" | "Cool" | "Auto" | "Off";
  fanSpeed: "Low" | "Medium" | "High" | "Auto";
}

interface CameraState {
  armed: boolean;
}

const ROOM_NAMES = ["Living Room", "Bedroom", "Kitchen", "Office"] as const;
const CAMERA_NAMES = [
  "Front Door",
  "Backyard",
  "Garage",
  "Living Room",
] as const;

type RoomName = (typeof ROOM_NAMES)[number];
type CameraName = (typeof CAMERA_NAMES)[number];

export type SmartHomeState = {
  lights: Record<RoomName, LightState>;
  thermostat: ThermostatState;
  cameras: Record<CameraName, CameraState>;
};

// ── Voice command parser ───────────────────────────────────────────
export function parseSmartHomeCommand(
  text: string,
  setLights: React.Dispatch<React.SetStateAction<Record<RoomName, LightState>>>,
  setThermostat: React.Dispatch<React.SetStateAction<ThermostatState>>,
  setCameras: React.Dispatch<
    React.SetStateAction<Record<CameraName, CameraState>>
  >,
): string | null {
  const lower = text.toLowerCase();

  // Turn on/off [room] light
  for (const room of ROOM_NAMES) {
    const roomLower = room.toLowerCase();
    if (lower.includes(roomLower)) {
      if (lower.includes("turn on") || lower.includes("switch on")) {
        setLights((prev) => ({ ...prev, [room]: { ...prev[room], on: true } }));
        return `${room} light turned on.`;
      }
      if (lower.includes("turn off") || lower.includes("switch off")) {
        setLights((prev) => ({
          ...prev,
          [room]: { ...prev[room], on: false },
        }));
        return `${room} light turned off.`;
      }
    }
  }

  // Set thermostat to [number]
  const thermoMatch = lower.match(/set thermostat to (\d+)/);
  if (thermoMatch) {
    const target = Math.max(
      16,
      Math.min(32, Number.parseInt(thermoMatch[1], 10)),
    );
    setThermostat((prev) => ({ ...prev, target }));
    return `Thermostat set to ${target}°C.`;
  }

  // Arm/disarm [camera] camera
  for (const cam of CAMERA_NAMES) {
    const camLower = cam.toLowerCase();
    if (lower.includes(camLower)) {
      if (lower.includes("arm")) {
        setCameras((prev) => ({ ...prev, [cam]: { armed: true } }));
        return `${cam} camera armed.`;
      }
      if (lower.includes("disarm")) {
        setCameras((prev) => ({ ...prev, [cam]: { armed: false } }));
        return `${cam} camera disarmed.`;
      }
    }
  }

  return null;
}

// ── Light Card ────────────────────────────────────────────────────
function LightCard({
  room,
  state,
  onChange,
  index,
}: {
  room: RoomName;
  state: LightState;
  onChange: (s: LightState) => void;
  index: number;
}) {
  const tempColors = {
    Warm: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    Cool: "text-sky-400 bg-sky-400/10 border-sky-400/30",
    Daylight: "text-yellow-300 bg-yellow-300/10 border-yellow-300/30",
  };

  return (
    <div
      className={`rounded-sm border p-2.5 transition-all duration-300 ${
        state.on
          ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_rgba(0,255,200,0.08)]"
          : "border-border/30 bg-card/10 opacity-70"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb
            className={`w-3.5 h-3.5 ${
              state.on ? "text-primary" : "text-muted-foreground/40"
            }`}
          />
          <span
            className={`font-mono text-[9px] tracking-wider uppercase ${
              state.on ? "text-foreground/80" : "text-muted-foreground/50"
            }`}
          >
            {room}
          </span>
        </div>
        <Switch
          checked={state.on}
          onCheckedChange={(v) => onChange({ ...state, on: v })}
          className="scale-[0.65] data-[state=checked]:bg-primary"
          data-ocid={`smarthome.light_toggle.${index}`}
        />
      </div>

      {state.on && (
        <>
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">
                Brightness
              </span>
              <span className="font-mono text-[8px] text-primary/70">
                {state.brightness}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[state.brightness]}
              onValueChange={([v]) => onChange({ ...state, brightness: v })}
              className="h-1"
              data-ocid={`smarthome.brightness_slider.${index}`}
            />
          </div>

          <div className="flex gap-1">
            {(["Warm", "Cool", "Daylight"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...state, colorTemp: t })}
                className={`flex-1 h-5 rounded-sm font-mono text-[7px] tracking-wide uppercase border transition-all ${
                  state.colorTemp === t
                    ? tempColors[t]
                    : "bg-card/10 border-border/20 text-muted-foreground/40 hover:border-border/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Thermostat Dial ───────────────────────────────────────────────
function ThermostatDial({
  state,
  onChange,
}: {
  state: ThermostatState;
  onChange: (s: ThermostatState) => void;
}) {
  const modeColors = {
    Heat: {
      ring: "border-orange-500/60",
      text: "text-orange-400",
      bg: "bg-orange-500/5",
    },
    Cool: {
      ring: "border-sky-500/60",
      text: "text-sky-400",
      bg: "bg-sky-500/5",
    },
    Auto: {
      ring: "border-primary/60",
      text: "text-primary",
      bg: "bg-primary/5",
    },
    Off: {
      ring: "border-border/30",
      text: "text-muted-foreground/50",
      bg: "bg-card/10",
    },
  };
  const colors = modeColors[state.mode];

  // Status string
  let status = "Idle";
  if (state.mode !== "Off") {
    if (state.mode === "Heat" && state.target > state.current)
      status = "Heating...";
    else if (state.mode === "Cool" && state.target < state.current)
      status = "Cooling...";
    else if (state.mode === "Auto") {
      if (state.target > state.current) status = "Heating...";
      else if (state.target < state.current) status = "Cooling...";
    }
  }

  // Dial arc percentage
  const pct = ((state.target - 16) / (32 - 16)) * 100;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div
      className={`rounded-sm border p-3 transition-all ${colors.ring} ${colors.bg}`}
      data-ocid="smarthome.thermostat_section"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Thermometer className={`w-3.5 h-3.5 ${colors.text}`} />
          <span className="font-mono text-[9px] tracking-wider uppercase text-foreground/70">
            Thermostat
          </span>
        </div>
        <span
          className={`font-mono text-[8px] uppercase tracking-wider ${
            status !== "Idle" ? colors.text : "text-muted-foreground/50"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Circular dial */}
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-36 h-36">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-border/20"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={colors.text}
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-2xl font-bold ${colors.text}`}>
              {state.target}°
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
              target
            </span>
            <span className="font-mono text-[10px] text-foreground/70 mt-1">
              {state.current}° now
            </span>
          </div>
        </div>
      </div>

      {/* Up / Down buttons */}
      <div className="flex justify-center gap-3 mb-3">
        <button
          type="button"
          onClick={() =>
            onChange({ ...state, target: Math.min(32, state.target + 1) })
          }
          className={`w-8 h-8 rounded-sm border flex items-center justify-center transition-all ${colors.ring} hover:${colors.bg} ${colors.text}`}
          data-ocid="smarthome.thermostat_up_button"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ ...state, target: Math.max(16, state.target - 1) })
          }
          className={`w-8 h-8 rounded-sm border flex items-center justify-center transition-all ${colors.ring} hover:${colors.bg} ${colors.text}`}
          data-ocid="smarthome.thermostat_down_button"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Mode */}
      <div className="mb-2">
        <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider block mb-1">
          Mode
        </span>
        <div className="grid grid-cols-4 gap-1">
          {(["Heat", "Cool", "Auto", "Off"] as const).map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...state, mode: m })}
              className={`h-6 rounded-sm font-mono text-[8px] tracking-wide uppercase border transition-all ${
                state.mode === m
                  ? `${modeColors[m].ring} ${modeColors[m].text} ${modeColors[m].bg}`
                  : "border-border/20 text-muted-foreground/40 bg-card/10 hover:border-border/40"
              }`}
              data-ocid={`smarthome.thermostat_mode.${i + 1}`}
            >
              {m === "Heat" ? <Flame className="w-3 h-3 mx-auto" /> : m}
            </button>
          ))}
        </div>
      </div>

      {/* Fan speed */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <Wind className="w-3 h-3 text-muted-foreground/50" />
          <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">
            Fan
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(["Low", "Med", "High", "Auto"] as const).map((f) => {
            const fanVal = (
              f === "Med" ? "Medium" : f
            ) as ThermostatState["fanSpeed"];
            return (
              <button
                key={f}
                type="button"
                onClick={() => onChange({ ...state, fanSpeed: fanVal })}
                className={`h-6 rounded-sm font-mono text-[7px] tracking-wide uppercase border transition-all ${
                  state.fanSpeed === fanVal
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border-border/20 text-muted-foreground/40 bg-card/10 hover:border-border/40"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Camera Card ───────────────────────────────────────────────────
function CameraCard({
  name,
  state,
  onChange,
  index,
}: {
  name: CameraName;
  state: CameraState;
  onChange: (s: CameraState) => void;
  index: number;
}) {
  return (
    <div className="rounded-sm border border-border/30 bg-card/10 overflow-hidden">
      {/* Feed area */}
      <div className="relative h-24 bg-zinc-950 overflow-hidden">
        {/* Scan-line effect */}
        <div className="absolute inset-0 camera-scanlines pointer-events-none" />
        {/* Static noise */}
        <div className="absolute inset-0 camera-noise pointer-events-none opacity-30" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* Camera icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera
            className={`w-8 h-8 ${
              state.armed ? "text-primary/20" : "text-muted-foreground/10"
            }`}
          />
        </div>
        {/* LIVE badge */}
        {state.armed && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[8px] text-red-400 uppercase tracking-wider">
              LIVE
            </span>
          </div>
        )}
        {/* Disarmed overlay */}
        {!state.armed && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
            <Lock className="w-4 h-4 text-muted-foreground/50" />
            <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-wider">
              Disarmed
            </span>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-2 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield
            className={`w-3 h-3 ${
              state.armed ? "text-primary" : "text-muted-foreground/30"
            }`}
          />
          <span className="font-mono text-[8px] text-foreground/70 uppercase tracking-wide truncate max-w-[60px]">
            {name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toast.info("Full view not available in demo")}
            className="h-5 px-1.5 rounded-sm font-mono text-[7px] tracking-wider uppercase border border-border/30 text-muted-foreground/50 hover:border-primary/30 hover:text-primary/70 transition-colors"
          >
            View
          </button>
          <Switch
            checked={state.armed}
            onCheckedChange={(v) => onChange({ armed: v })}
            className="scale-[0.6] data-[state=checked]:bg-primary"
            data-ocid={`smarthome.camera_toggle.${index}`}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main SmartHome ────────────────────────────────────────────────
export default function SmartHome() {
  const [lights, setLights] = useState<Record<RoomName, LightState>>({
    "Living Room": { on: true, brightness: 75, colorTemp: "Warm" },
    Bedroom: { on: false, brightness: 50, colorTemp: "Warm" },
    Kitchen: { on: true, brightness: 100, colorTemp: "Daylight" },
    Office: { on: true, brightness: 60, colorTemp: "Cool" },
  });

  const [thermostat, setThermostat] = useState<ThermostatState>({
    current: 21,
    target: 23,
    mode: "Heat",
    fanSpeed: "Auto",
  });

  const [cameras, setCameras] = useState<Record<CameraName, CameraState>>({
    "Front Door": { armed: true },
    Backyard: { armed: true },
    Garage: { armed: false },
    "Living Room": { armed: true },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1 border-b border-border/20">
        <ZapOff className="w-3.5 h-3.5 text-primary/70" />
        <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest">
          Smart Home Control
        </span>
      </div>

      {/* Lights */}
      <section data-ocid="smarthome.lights_section">
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb className="w-3 h-3 text-primary/60" />
          <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
            Lights
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ROOM_NAMES.map((room, i) => (
            <LightCard
              key={room}
              room={room}
              state={lights[room]}
              onChange={(s) => setLights((prev) => ({ ...prev, [room]: s }))}
              index={i + 1}
            />
          ))}
        </div>
      </section>

      {/* Thermostat */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <Thermometer className="w-3 h-3 text-primary/60" />
          <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
            Climate
          </span>
        </div>
        <ThermostatDial state={thermostat} onChange={setThermostat} />
      </section>

      {/* Cameras */}
      <section data-ocid="smarthome.cameras_section">
        <div className="flex items-center gap-1.5 mb-2">
          <Camera className="w-3 h-3 text-primary/60" />
          <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
            Security
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {CAMERA_NAMES.map((cam, i) => (
            <CameraCard
              key={cam}
              name={cam}
              state={cameras[cam]}
              onChange={(s) => setCameras((prev) => ({ ...prev, [cam]: s }))}
              index={i + 1}
            />
          ))}
        </div>
      </section>

      {/* CSS for camera effects */}
      <style>{`
        .camera-scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.15) 2px,
            rgba(0,0,0,0.15) 4px
          );
          animation: scan 8s linear infinite;
        }
        @keyframes scan {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        .camera-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 100px 100px;
        }
      `}</style>
    </div>
  );
}
