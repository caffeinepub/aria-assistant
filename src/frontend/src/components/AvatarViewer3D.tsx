/**
 * Phase 122: 3D Avatar Viewer
 * Base implementation using React Three Fiber + GLTFLoader.
 * Loads a Ready Player Me .glb model and renders it in an interactive 3D scene.
 */

import { Button } from "@/components/ui/button";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";

const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/69b1a14a9853ea0767a5153f.glb";

function AvatarModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} position={[0, -1, 0]} />;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#dc2626" wireframe />
    </mesh>
  );
}

export default function AvatarViewer3D() {
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL);
  const [inputUrl, setInputUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState(DEFAULT_AVATAR_URL);
  const [loadError, setLoadError] = useState(false);

  const handleLoad = () => {
    const url = inputUrl.trim();
    if (!url) return;
    setLoadError(false);
    setAvatarUrl(url);
    setActiveUrl(url);
  };

  const handleReset = () => {
    setInputUrl("");
    setLoadError(false);
    setAvatarUrl(DEFAULT_AVATAR_URL);
    setActiveUrl(DEFAULT_AVATAR_URL);
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
          3D Avatar Viewer
        </span>
        <span className="font-mono text-[8px] text-primary/50 tracking-wider">
          Ready Player Me
        </span>
      </div>

      {/* 3D Canvas */}
      <div
        className="flex-1 min-h-[260px] rounded-sm overflow-hidden border border-border/30 bg-black/40"
        data-ocid="avatar3d.canvas_target"
      >
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <pointLight position={[-2, 1, -1]} intensity={0.4} color="#ff2a2a" />

          <Suspense fallback={<LoadingFallback />}>
            {!loadError && <AvatarModel key={activeUrl} url={avatarUrl} />}
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={1}
            maxDistance={6}
            target={[0, 0.5, 0]}
          />
        </Canvas>
      </div>

      {/* Controls */}
      <div className="space-y-1.5 flex-shrink-0">
        <p className="font-mono text-[8px] text-muted-foreground/50 tracking-wider uppercase">
          Load Custom Avatar URL (.glb)
        </p>
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="https://models.readyplayer.me/your-id.glb"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            className="flex-1 h-7 px-2 rounded-sm font-mono text-[9px] hud-input"
            data-ocid="avatar3d.input"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleLoad}
            disabled={!inputUrl.trim()}
            className="h-7 px-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
            data-ocid="avatar3d.primary_button"
          >
            Load
          </Button>
        </div>

        {loadError && (
          <p
            className="font-mono text-[8px] text-destructive/70 tracking-wider"
            data-ocid="avatar3d.error_state"
          >
            Failed to load model. Check the URL.
          </p>
        )}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleReset}
          className="w-full h-6 font-mono text-[8px] tracking-wider uppercase text-muted-foreground/50 hover:text-muted-foreground rounded-sm"
          data-ocid="avatar3d.secondary_button"
        >
          Reset to Default
        </Button>

        <p className="font-mono text-[7px] text-muted-foreground/30 tracking-wider text-center">
          Drag to rotate · Scroll to zoom
        </p>
      </div>
    </div>
  );
}
