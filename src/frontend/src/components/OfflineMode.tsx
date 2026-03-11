/**
 * Phase 120-E: Offline Mode
 * Hook + visual banner for offline state detection.
 */

import { Wifi, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export function useOfflineMode() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setJustCameOnline(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      setTimeout(() => setJustCameOnline(false), 2500);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return { isOffline, justCameOnline };
}

export default function OfflineBanner() {
  const { isOffline, justCameOnline } = useOfflineMode();
  const show = isOffline || justCameOnline;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden flex-shrink-0"
          data-ocid="offline.banner"
        >
          <div
            className={`flex items-center gap-2 px-4 py-1.5 ${
              isOffline
                ? "bg-destructive/15 border-b border-destructive/30"
                : "bg-green-500/15 border-b border-green-500/30"
            }`}
          >
            {isOffline ? (
              <WifiOff className="w-3 h-3 text-destructive/80 flex-shrink-0" />
            ) : (
              <Wifi className="w-3 h-3 text-green-400 flex-shrink-0" />
            )}
            <span
              className={`font-mono text-[9px] tracking-[0.2em] uppercase ${
                isOffline ? "text-destructive/80" : "text-green-400"
              }`}
            >
              {isOffline
                ? "Offline — using cached responses"
                : "Connection restored"}
            </span>
            {isOffline && (
              <span className="ml-auto font-mono text-[8px] text-destructive/50">
                ARIA·OFFLINE·MODE
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
