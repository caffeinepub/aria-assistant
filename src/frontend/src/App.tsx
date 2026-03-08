import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background hud-grid flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary/50 border-t-primary animate-spin" />
          <p className="font-mono text-sm text-primary/70 tracking-widest uppercase">
            Initializing ARIA...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {identity ? <ChatPage /> : <AuthPage />}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "bg-card border-border text-foreground font-body",
        }}
      />
    </>
  );
}
