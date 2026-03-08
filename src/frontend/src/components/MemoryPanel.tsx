import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useDeleteMemory,
  useMemoryEntries,
  useUpdateMemory,
} from "../hooks/useQueries";

export default function MemoryPanel() {
  const { data: entries = [], isLoading } = useMemoryEntries();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  const [isExpanded, setIsExpanded] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = async () => {
    const trimKey = newKey.trim();
    const trimValue = newValue.trim();
    if (!trimKey || !trimValue) return;

    try {
      await updateMemory.mutateAsync({ key: trimKey, value: trimValue });
      setNewKey("");
      setNewValue("");
      setShowAddForm(false);
      toast.success("Memory stored");
    } catch {
      toast.error("Failed to store memory");
    }
  };

  const handleEdit = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async (key: string) => {
    if (!editValue.trim()) return;
    try {
      await updateMemory.mutateAsync({ key, value: editValue.trim() });
      setEditingKey(null);
      toast.success("Memory updated");
    } catch {
      toast.error("Failed to update memory");
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteMemory.mutateAsync(key);
      toast.success("Memory removed");
    } catch {
      toast.error("Failed to remove memory");
    }
  };

  return (
    <div
      className="holo-border rounded-sm bg-card/20 backdrop-blur-sm"
      data-ocid="memory.panel"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-xs tracking-widest uppercase text-primary/80">
            Memory Core
          </span>
          <span className="font-mono text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm">
            {entries.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Add button */}
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddForm((p) => !p)}
                className="w-full h-7 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-mono text-[10px] tracking-widest uppercase rounded-sm"
                data-ocid="memory.add_button"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Memory
              </Button>

              {/* Add form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-1.5 p-2 rounded-sm bg-card/40 border border-primary/20"
                  >
                    <Input
                      placeholder="Key (e.g. name)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="hud-input h-7 text-xs font-mono rounded-sm"
                    />
                    <Input
                      placeholder="Value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
                      className="hud-input h-7 text-xs font-mono rounded-sm"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleAdd()}
                        disabled={
                          updateMemory.isPending ||
                          !newKey.trim() ||
                          !newValue.trim()
                        }
                        className="flex-1 h-6 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-mono text-[9px] rounded-sm"
                      >
                        <Check className="w-3 h-3 mr-0.5" /> Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewKey("");
                          setNewValue("");
                        }}
                        className="h-6 px-2 text-muted-foreground hover:text-foreground font-mono text-[9px] rounded-sm"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Memory list */}
              {isLoading ? (
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 rounded-sm bg-muted/30 animate-pulse"
                    />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div
                  className="text-center py-4"
                  data-ocid="memory.empty_state"
                >
                  <p className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                    No memories stored yet
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {entries.map((entry, idx) => (
                      <motion.div
                        key={entry.key}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="group rounded-sm bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors"
                        data-ocid={`memory.item.${idx + 1}`}
                      >
                        {editingKey === entry.key ? (
                          <div className="p-1.5 space-y-1">
                            <span className="font-mono text-[9px] text-primary/70 uppercase tracking-wider">
                              {entry.key}
                            </span>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                void handleSaveEdit(entry.key)
                              }
                              className="hud-input h-6 text-[10px] font-mono rounded-sm"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleSaveEdit(entry.key)}
                                disabled={updateMemory.isPending}
                                className="flex-1 h-5 bg-primary/20 hover:bg-primary/30 text-primary font-mono text-[9px] rounded-sm"
                              >
                                <Check className="w-2.5 h-2.5 mr-0.5" /> Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingKey(null)}
                                className="h-5 px-1.5 text-muted-foreground font-mono text-[9px] rounded-sm"
                              >
                                <X className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 p-1.5">
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-[9px] text-primary/60 uppercase tracking-wider block truncate">
                                {entry.key}
                              </span>
                              <span className="font-mono text-[10px] text-foreground/80 block truncate">
                                {entry.value}
                              </span>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleEdit(entry.key, entry.value)
                                }
                                className="h-5 w-5 p-0 text-primary/60 hover:text-primary rounded-sm"
                                data-ocid={`memory.edit_button.${idx + 1}`}
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-destructive/60 hover:text-destructive rounded-sm"
                                    data-ocid={`memory.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border font-body max-w-sm">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-display text-foreground">
                                      Remove Memory
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground font-mono text-xs">
                                      Delete &ldquo;{entry.key}&rdquo; from
                                      Melina&apos;s memory?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      className="font-mono text-xs"
                                      data-ocid="memory.cancel_button"
                                    >
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        void handleDelete(entry.key)
                                      }
                                      className="bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/40 font-mono text-xs"
                                      data-ocid="memory.confirm_button"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
