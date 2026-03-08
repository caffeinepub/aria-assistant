import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChatTone } from "../backend.d";
import { useAssistantSettings, useUpdateSettings } from "../hooks/useQueries";

export default function SettingsSheet() {
  const { data: settings, isLoading } = useAssistantSettings();
  const updateSettings = useUpdateSettings();

  const [displayName, setDisplayName] = useState("Melina");
  const [tone, setTone] = useState<ChatTone>(ChatTone.friendly);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [memoryTrackingEnabled, setMemoryTrackingEnabled] = useState(true);
  const [open, setOpen] = useState(false);

  // Sync from backend when settings load
  useEffect(() => {
    if (settings) {
      setDisplayName(settings.assistantDisplayName || "Melina");
      setTone(settings.tone ?? ChatTone.friendly);
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
      setMemoryTrackingEnabled(settings.memoryTrackingEnabled ?? true);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        assistantDisplayName: displayName.trim() || "Melina",
        tone,
        notificationsEnabled,
        memoryTrackingEnabled,
      });
      toast.success("Settings saved", {
        description: "Melina has updated her configuration.",
      });
      setOpen(false);
    } catch {
      toast.error("Failed to save settings");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary rounded-sm"
          data-ocid="settings.open_modal_button"
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-80 bg-card border-l border-border/60 flex flex-col gap-0 p-0"
        data-ocid="settings.sheet"
      >
        <SheetHeader className="px-4 py-3 border-b border-border/50 bg-card/50">
          <SheetTitle className="font-mono text-xs tracking-[0.3em] uppercase text-primary">
            ◈ ARIA Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* ── Companion Section ── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-px bg-primary/50" />
                  <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-primary/60">
                    Companion
                  </span>
                  <div className="flex-1 h-px bg-primary/10" />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">
                    Display Name
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Melina"
                    className="hud-input h-8 text-sm font-body rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">
                    Personality Tone
                  </Label>
                  <Select
                    value={tone}
                    onValueChange={(v) => setTone(v as ChatTone)}
                  >
                    <SelectTrigger
                      className="hud-input h-8 text-sm font-body rounded-sm border-primary/25 focus:border-primary/70"
                      data-ocid="settings.tone_select"
                    >
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border font-body">
                      <SelectItem
                        value={ChatTone.formal}
                        className="font-body text-sm"
                      >
                        Formal
                      </SelectItem>
                      <SelectItem
                        value={ChatTone.friendly}
                        className="font-body text-sm"
                      >
                        Friendly
                      </SelectItem>
                      <SelectItem
                        value={ChatTone.casual}
                        className="font-body text-sm"
                      >
                        Casual
                      </SelectItem>
                      <SelectItem
                        value={ChatTone.humorous}
                        className="font-body text-sm"
                      >
                        Humorous
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* ── Notifications Section ── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-px bg-primary/50" />
                  <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-primary/60">
                    Notifications
                  </span>
                  <div className="flex-1 h-px bg-primary/10" />
                </div>

                <div className="flex items-center justify-between gap-3 py-1">
                  <div>
                    <p className="font-mono text-xs text-foreground/80 tracking-wide">
                      Enable Notifications
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground/60 mt-0.5">
                      Melina will alert you to incoming events
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                    className="data-[state=checked]:bg-primary"
                    data-ocid="settings.notifications_switch"
                  />
                </div>
              </section>

              {/* ── Memory Section ── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-px bg-primary/50" />
                  <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-primary/60">
                    Memory
                  </span>
                  <div className="flex-1 h-px bg-primary/10" />
                </div>

                <div className="flex items-center justify-between gap-3 py-1">
                  <div>
                    <p className="font-mono text-xs text-foreground/80 tracking-wide">
                      Memory Tracking
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground/60 mt-0.5">
                      Let Melina remember your preferences
                    </p>
                  </div>
                  <Switch
                    checked={memoryTrackingEnabled}
                    onCheckedChange={setMemoryTrackingEnabled}
                    className="data-[state=checked]:bg-primary"
                    data-ocid="settings.memory_switch"
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="p-4 border-t border-border/50 flex-shrink-0">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={updateSettings.isPending}
            className="w-full h-9 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/70 font-mono text-xs tracking-widest uppercase rounded-sm transition-all hover:shadow-cyan-glow"
            data-ocid="settings.save_button"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
