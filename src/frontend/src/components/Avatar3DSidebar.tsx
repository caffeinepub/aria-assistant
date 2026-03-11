/**
 * Phase 112-B: 3D Avatar Sidebar with State-Driven Animations
 * Renders Melina's Ready Player Me 3D avatar as a side-by-side panel
 * alongside the main chat inbox, with procedural animations tied to
 * Melina's conversational state: entry wave, idle, thinking, responding.
 */

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const AVATAR_URL = "https://models.readyplayer.me/69b1a14a9853ea0767a5153f.glb";

type MelinaStatus = "idle" | "thinking" | "responding" | "alert" | "wave";

interface AvatarModelProps {
  status: MelinaStatus;
}

function AvatarModel({ status }: AvatarModelProps) {
  const { scene } = useGLTF(AVATAR_URL);
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const wavePhaseRef = useRef(0); // 0 = not started, 1 = waving, 2 = done
  const waveTimerRef = useRef(0);

  // Bone references (Ready Player Me standard rig)
  const spineRef = useRef<THREE.Bone | null>(null);
  const neckRef = useRef<THREE.Bone | null>(null);
  const headRef = useRef<THREE.Bone | null>(null);
  const rightArmRef = useRef<THREE.Bone | null>(null);
  const rightForeArmRef = useRef<THREE.Bone | null>(null);
  const rightHandRef = useRef<THREE.Bone | null>(null);
  const leftArmRef = useRef<THREE.Bone | null>(null);

  // Cache initial rotations
  const initRot = useRef<Record<string, THREE.Euler>>({});

  useEffect(() => {
    if (!scene) return;
    scene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone || obj.type === "Bone") {
        const bone = obj as THREE.Bone;
        const name = bone.name.toLowerCase();
        if (
          name.includes("spine") &&
          !name.includes("spine1") &&
          !name.includes("spine2")
        ) {
          spineRef.current = bone;
          initRot.current.spine = bone.rotation.clone();
        }
        if (name.includes("neck")) {
          neckRef.current = bone;
          initRot.current.neck = bone.rotation.clone();
        }
        if (name.includes("head") && !name.includes("headtop")) {
          headRef.current = bone;
          initRot.current.head = bone.rotation.clone();
        }
        if (
          (name.includes("rightarm") ||
            name === "rightshoulder" ||
            name.includes("arm_r")) &&
          !name.includes("fore")
        ) {
          rightArmRef.current = bone;
          initRot.current.rightArm = bone.rotation.clone();
        }
        if (
          name.includes("rightforearm") ||
          name.includes("lowerarm_r") ||
          name.includes("forearm_r")
        ) {
          rightForeArmRef.current = bone;
          initRot.current.rightForeArm = bone.rotation.clone();
        }
        if (name.includes("righthand") || name.includes("hand_r")) {
          rightHandRef.current = bone;
          initRot.current.rightHand = bone.rotation.clone();
        }
        if (
          (name.includes("leftarm") ||
            name === "leftshoulder" ||
            name.includes("arm_l")) &&
          !name.includes("fore")
        ) {
          leftArmRef.current = bone;
          initRot.current.leftArm = bone.rotation.clone();
        }
      }
    });
    // Trigger entry wave on mount
    wavePhaseRef.current = 1;
    waveTimerRef.current = 0;
  }, [scene]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // --- Entry wave logic ---
    if (wavePhaseRef.current === 1) {
      waveTimerRef.current += delta;
      const wt = waveTimerRef.current;
      const waveDuration = 2.5;

      if (wt < waveDuration) {
        // Raise right arm up
        if (rightArmRef.current) {
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
            initRot.current.rightArm?.z ?? 0,
            -1.8,
            Math.min(wt / 0.4, 1),
          );
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            initRot.current.rightArm?.x ?? 0,
            -0.3,
            Math.min(wt / 0.4, 1),
          );
        }
        // Bend forearm slightly
        if (rightForeArmRef.current) {
          rightForeArmRef.current.rotation.z = THREE.MathUtils.lerp(
            initRot.current.rightForeArm?.z ?? 0,
            0.4,
            Math.min(wt / 0.4, 1),
          );
        }
        // Waving wrist rotation
        if (rightHandRef.current && wt > 0.4) {
          const waveT = (wt - 0.4) / (waveDuration - 0.4);
          rightHandRef.current.rotation.z = Math.sin(waveT * Math.PI * 4) * 0.5;
        }
        // Head tilt toward wave
        if (headRef.current) {
          headRef.current.rotation.z = THREE.MathUtils.lerp(
            0,
            0.1,
            Math.min(wt / 0.5, 1),
          );
        }
      } else {
        // Wave done -- lower arm back
        const returnT = Math.min((wt - waveDuration) / 0.5, 1);
        if (rightArmRef.current) {
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
            -1.8,
            initRot.current.rightArm?.z ?? 0,
            returnT,
          );
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            -0.3,
            initRot.current.rightArm?.x ?? 0,
            returnT,
          );
        }
        if (rightForeArmRef.current) {
          rightForeArmRef.current.rotation.z = THREE.MathUtils.lerp(
            0.4,
            initRot.current.rightForeArm?.z ?? 0,
            returnT,
          );
        }
        if (rightHandRef.current) {
          rightHandRef.current.rotation.z = THREE.MathUtils.lerp(
            rightHandRef.current.rotation.z,
            initRot.current.rightHand?.z ?? 0,
            returnT,
          );
        }
        if (headRef.current) {
          headRef.current.rotation.z = THREE.MathUtils.lerp(0.1, 0, returnT);
        }
        if (returnT >= 1) {
          wavePhaseRef.current = 2; // done
        }
      }
      return;
    }

    // --- State-driven animations (post-wave) ---
    switch (status) {
      case "idle": {
        // Subtle breathing: spine bobs gently
        if (spineRef.current) {
          spineRef.current.rotation.x =
            (initRot.current.spine?.x ?? 0) + Math.sin(t * 0.8) * 0.012;
        }
        // Very slow head sway
        if (headRef.current) {
          headRef.current.rotation.y =
            (initRot.current.head?.y ?? 0) + Math.sin(t * 0.4) * 0.04;
          headRef.current.rotation.z =
            (initRot.current.head?.z ?? 0) + Math.sin(t * 0.3) * 0.025;
        }
        // Gentle body sway
        if (groupRef.current) {
          groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.03;
        }
        break;
      }

      case "thinking": {
        // Head tilt to one side, slight look-around
        if (headRef.current) {
          headRef.current.rotation.z =
            (initRot.current.head?.z ?? 0) + Math.sin(t * 0.6) * 0.12 + 0.08;
          headRef.current.rotation.y =
            (initRot.current.head?.y ?? 0) + Math.sin(t * 0.5) * 0.08;
        }
        // Spine leans slightly forward
        if (spineRef.current) {
          spineRef.current.rotation.x =
            (initRot.current.spine?.x ?? 0) + 0.04 + Math.sin(t * 0.7) * 0.01;
        }
        // Body sway
        if (groupRef.current) {
          groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.04;
        }
        break;
      }

      case "responding": {
        // Talking: head bobs up-down slightly, spine pulses
        if (headRef.current) {
          headRef.current.rotation.x =
            (initRot.current.head?.x ?? 0) + Math.sin(t * 4.5) * 0.025;
          headRef.current.rotation.y =
            (initRot.current.head?.y ?? 0) + Math.sin(t * 1.2) * 0.03;
        }
        if (spineRef.current) {
          spineRef.current.rotation.x =
            (initRot.current.spine?.x ?? 0) + Math.sin(t * 0.9) * 0.015;
          spineRef.current.rotation.y =
            (initRot.current.spine?.y ?? 0) + Math.sin(t * 1.1) * 0.018;
        }
        // Subtle hand gestures
        if (leftArmRef.current) {
          leftArmRef.current.rotation.z =
            (initRot.current.leftArm?.z ?? 0) + Math.sin(t * 1.5) * 0.04;
        }
        if (groupRef.current) {
          groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.025;
        }
        break;
      }

      case "alert": {
        // Alert: head snaps upright, slight back-lean
        if (headRef.current) {
          headRef.current.rotation.z =
            (initRot.current.head?.z ?? 0) + Math.sin(t * 2) * 0.015;
          headRef.current.rotation.x = (initRot.current.head?.x ?? 0) - 0.05;
        }
        if (spineRef.current) {
          spineRef.current.rotation.x = (initRot.current.spine?.x ?? 0) - 0.03;
        }
        break;
      }

      default:
        break;
    }
  });

  return <primitive ref={groupRef} object={scene} position={[0, -1, 0]} />;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#dc2626" wireframe />
    </mesh>
  );
}

interface Avatar3DSidebarProps {
  status?: MelinaStatus;
}

export default function Avatar3DSidebar({
  status = "idle",
}: Avatar3DSidebarProps) {
  const [waveComplete, setWaveComplete] = useState(false);

  // After 3.2s, wave is done -- switch to live status
  useEffect(() => {
    const t = setTimeout(() => setWaveComplete(true), 3200);
    return () => clearTimeout(t);
  }, []);

  const activeStatus: MelinaStatus = waveComplete ? status : "wave";

  const statusLabel: Record<MelinaStatus, string> = {
    idle: "STANDBY",
    thinking: "THINKING",
    responding: "RESPONDING",
    alert: "ALERT",
    wave: "HELLO",
  };

  const statusColor: Record<MelinaStatus, string> = {
    idle: "text-green-400/80",
    thinking: "text-yellow-400/80",
    responding: "text-primary/90",
    alert: "text-orange-400/80",
    wave: "text-cyan-400/80",
  };

  const dotColor: Record<MelinaStatus, string> = {
    idle: "bg-green-400",
    thinking: "bg-yellow-400",
    responding: "bg-primary",
    alert: "bg-orange-400",
    wave: "bg-cyan-400",
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-black/40">
      {/* HUD Overlay Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 pointer-events-none">
        <span className="font-mono text-[9px] text-primary/60 uppercase tracking-[0.2em]">
          AVATAR VIEWER
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor[activeStatus]}`}
          />
          <span
            className={`font-mono text-[8px] tracking-widest uppercase ${statusColor[activeStatus]}`}
          >
            {statusLabel[activeStatus]}
          </span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div
        className="flex-1 w-full h-full"
        data-ocid="avatar3d_sidebar.canvas_target"
        style={{
          boxShadow:
            "inset 0 0 40px rgba(220, 38, 38, 0.08), inset 0 0 1px rgba(220, 38, 38, 0.25)",
        }}
      >
        <Canvas
          camera={{ position: [0, 0.8, 2.5], fov: 45 }}
          style={{ width: "100%", height: "100%" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <pointLight position={[-2, 1, -1]} intensity={0.5} color="#ff2a2a" />
          <pointLight position={[2, 2, 2]} intensity={0.2} color="#00fff7" />

          <Suspense fallback={<LoadingFallback />}>
            <AvatarModel status={activeStatus} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={4}
            target={[0, 0.5, 0]}
          />
        </Canvas>
      </div>

      {/* Bottom scanline accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
    </div>
  );
}
