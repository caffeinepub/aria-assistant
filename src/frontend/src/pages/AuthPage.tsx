import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, Loader2, Shield, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        // First login via Internet Identity, then save profile
        login();
        // Profile save will happen after identity is loaded in ChatPage
        // We store registration data temporarily
        if (username && email) {
          sessionStorage.setItem(
            "aria_pending_profile",
            JSON.stringify({ username, email }),
          );
        }
      } else {
        login();
      }
    } catch {
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: Cpu, label: "Adaptive Memory", desc: "Learns your preferences" },
    {
      icon: Shield,
      label: "Encrypted Storage",
      desc: "Your data stays private",
    },
    {
      icon: Zap,
      label: "Real-time Response",
      desc: "Lightning-fast AI responses",
    },
  ];

  return (
    <div className="min-h-screen bg-background hud-grid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left side - Melina preview */}
        <motion.div
          className="hidden lg:flex flex-col items-center gap-6"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="relative hud-corner p-4">
            <div className="relative w-72 xl:w-80 overflow-hidden rounded-sm">
              {/* Scan line effect */}
              <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                <div
                  className="w-full h-8 bg-gradient-to-b from-transparent via-primary/10 to-transparent absolute animate-scan"
                  style={{ animationDuration: "4s" }}
                />
              </div>
              <img
                src="/assets/generated/melina-avatar.dim_600x800.png"
                alt="Melina AI Avatar"
                className="w-full object-cover avatar-glow"
                style={{ aspectRatio: "3/4" }}
              />
              {/* Corner HUD elements */}
              <div className="absolute top-2 left-2 font-mono text-xs text-primary/70 tracking-widest">
                ARIA·SYS
              </div>
              <div className="absolute bottom-2 right-2 font-mono text-xs text-primary/70 tracking-widest">
                v1.0
              </div>
            </div>

            {/* Decorative lines */}
            <div className="absolute -bottom-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute -top-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="font-display text-4xl font-bold tracking-widest glow-cyan text-primary uppercase">
              MELINA
            </h2>
            <p className="font-mono text-xs text-muted-foreground tracking-[0.3em] uppercase">
              ARIA Intelligence System
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-2">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1 p-2 rounded-sm holo-border"
              >
                <f.icon className="w-4 h-4 text-primary" />
                <span className="font-mono text-[9px] text-primary/80 tracking-wider uppercase text-center">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right side - Auth form */}
        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex lg:hidden justify-center mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/40 avatar-glow">
                <img
                  src="/assets/generated/melina-avatar.dim_600x800.png"
                  alt="Melina"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-wider glow-cyan text-primary">
              ARIA
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-1 tracking-[0.25em] uppercase">
              Adaptive Response Intelligence Assistant
            </p>
          </div>

          {/* Mode toggle */}
          <div
            className="flex rounded-sm mb-6 p-1 holo-border bg-card/50"
            data-ocid="auth.toggle.tab"
          >
            {(["login", "register"] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 font-mono text-xs tracking-widest uppercase transition-all duration-200 rounded-sm ${
                  mode === m
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-cyan-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Access" : "Register"}
              </button>
            ))}
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={handleSubmit}
              className="space-y-4 holo-border rounded-sm p-6 bg-card/30 backdrop-blur-sm hud-corner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Form header */}
              <div className="mb-4">
                <h3 className="font-display text-lg text-foreground tracking-wide">
                  {mode === "login" ? "System Access" : "New Registration"}
                </h3>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">
                  {mode === "login"
                    ? "Authenticate via Internet Identity"
                    : "Create your ARIA profile"}
                </p>
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="username"
                    className="font-mono text-xs tracking-widest uppercase text-primary/80"
                  >
                    Callsign
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="hud-input rounded-sm font-mono text-sm"
                    autoComplete="username"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="font-mono text-xs tracking-widest uppercase text-primary/80"
                >
                  Communication Link
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="hud-input rounded-sm font-mono text-sm"
                  autoComplete="email"
                />
              </div>

              {isLoginError && loginError && (
                <p
                  className="font-mono text-xs text-destructive"
                  data-ocid="auth.error_state"
                >
                  {loginError.message}
                </p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoggingIn || isSubmitting}
                  className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/70 font-mono tracking-widest uppercase text-xs rounded-sm transition-all duration-200 hover:shadow-cyan-glow"
                  data-ocid={
                    mode === "login"
                      ? "auth.login.submit_button"
                      : "auth.register.submit_button"
                  }
                >
                  {isLoggingIn || isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : mode === "login" ? (
                    "Initialize Session"
                  ) : (
                    "Create Profile"
                  )}
                </Button>

                {mode === "register" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isLoggingIn || isSubmitting}
                    onClick={login}
                    className="w-full mt-2 text-muted-foreground hover:text-foreground font-mono text-xs tracking-wider"
                    data-ocid="auth.login.submit_button"
                  >
                    Already registered? Access system
                  </Button>
                )}
              </div>

              <p className="font-mono text-[10px] text-muted-foreground/60 text-center">
                Secured by Internet Identity · No passwords stored
              </p>
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center">
        <p className="font-mono text-[10px] text-muted-foreground/40 tracking-wider">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary/80 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
