/**
 * Phase 120-A: Layered Animated Avatar
 * CSS-animated avatar with blinking, idle sway, expression overlays, lip-sync glow.
 */

import { useEffect, useRef } from "react";

export type AvatarStatus = "idle" | "thinking" | "responding" | "alert";
export type AvatarSize = "sm" | "md" | "lg" | "fullscreen";

interface MelinaAnimatedAvatarProps {
  status?: AvatarStatus;
  size?: AvatarSize;
  className?: string;
  style?: React.CSSProperties;
}

const AVATAR_SRC = "/assets/generated/melina-avatar.dim_400x500.png";

// Size map: controls object-position for small sizes
const SIZE_OBJECT_POSITION: Record<AvatarSize, string> = {
  sm: "object-top",
  md: "object-top",
  lg: "object-top",
  fullscreen: "object-top",
};

export default function MelinaAnimatedAvatar({
  status = "idle",
  size = "md",
  className = "",
  style,
}: MelinaAnimatedAvatarProps) {
  const blinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eyeRef = useRef<HTMLDivElement>(null);

  // Random blink interval
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 4000;
      blinkRef.current = setTimeout(() => {
        if (eyeRef.current) {
          eyeRef.current.classList.add("blink-active");
          setTimeout(() => {
            if (eyeRef.current) eyeRef.current.classList.remove("blink-active");
          }, 160);
        }
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => {
      if (blinkRef.current) clearTimeout(blinkRef.current);
    };
  }, []);

  const expressionOverlay: Record<AvatarStatus, string> = {
    idle: "",
    thinking: "bg-yellow-400/5 mix-blend-screen",
    responding: "bg-cyan-400/5 mix-blend-screen",
    alert: "bg-red-500/10 mix-blend-screen",
  };

  const glowClass: Record<AvatarStatus, string> = {
    idle: "",
    thinking: "shadow-[0_0_12px_rgba(250,204,21,0.25)]",
    responding: "shadow-[0_0_16px_rgba(0,255,247,0.3)]",
    alert: "shadow-[0_0_16px_rgba(239,68,68,0.4)]",
  };

  const objectPos = SIZE_OBJECT_POSITION[size];

  return (
    <div
      className={`relative overflow-hidden ${glowClass[status]} ${className}`}
      style={style}
      data-avatar-status={status}
    >
      {/* Base image with idle sway animation */}
      <img
        src={AVATAR_SRC}
        alt="Melina"
        className={[
          "w-full h-full object-cover",
          objectPos,
          status === "idle" ? "animate-avatar-sway" : "",
          status === "thinking" ? "animate-avatar-think" : "",
          status === "responding" ? "animate-avatar-respond" : "",
          status === "alert" ? "animate-avatar-alert" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        draggable={false}
      />

      {/* Expression overlay */}
      {expressionOverlay[status] && (
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${expressionOverlay[status]}`}
        />
      )}

      {/* Eye blink overlay positioned over upper third */}
      <div
        ref={eyeRef}
        className="avatar-blink-layer absolute pointer-events-none"
        style={{
          top: "20%",
          left: "20%",
          right: "20%",
          height: "8%",
        }}
      />

      {/* Lip-sync glow when responding */}
      {status === "responding" && (
        <div
          className="absolute pointer-events-none animate-lipsync-glow"
          style={{
            bottom: "22%",
            left: "30%",
            right: "30%",
            height: "6%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(0,255,247,0.25) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Scan-line thin animation overlay */}
      <div className="absolute inset-0 pointer-events-none avatar-scanline opacity-20" />
    </div>
  );
}
