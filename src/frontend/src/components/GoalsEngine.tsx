/**
 * Phase 120-C: Goals Engine
 * Goals panel with CRUD, progress tracking, and useGoals() hook for chat context.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type GoalCategory = "Fitness" | "Learning" | "Productivity" | "Personal";
export type GoalStatus = "active" | "completed";

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  targetDescription: string;
  deadline?: string;
  progress: number; // 0-100
  status: GoalStatus;
  createdAt: number;
}

const STORAGE_KEY = "melina_goals";

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  Fitness: "text-green-400 border-green-400/30 bg-green-400/5",
  Learning: "text-blue-400 border-blue-400/30 bg-blue-400/5",
  Productivity: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  Personal: "text-purple-400 border-purple-400/30 bg-purple-400/5",
};

const CATEGORY_BAR: Record<GoalCategory, string> = {
  Fitness: "bg-green-400",
  Learning: "bg-blue-400",
  Productivity: "bg-yellow-400",
  Personal: "bg-purple-400",
};

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Goal[];
  } catch {}
  return [];
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(loadGoals);

  const refresh = useCallback(() => setGoals(loadGoals()), []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("melina:goals-updated", handler);
    return () => window.removeEventListener("melina:goals-updated", handler);
  }, [refresh]);

  const activeGoals = goals.filter((g) => g.status === "active");

  const goalsContext =
    activeGoals.length > 0
      ? `User's active goals: ${activeGoals
          .map(
            (g) =>
              `${g.title} (${g.category}${
                g.deadline ? `, deadline: ${g.deadline}` : ""
              }, progress: ${g.progress}%)`,
          )
          .join("; ")}`
      : "";

  return { goals, activeGoals, goalsContext, refresh };
}

export default function GoalsEngine() {
  const [goals, setGoals] = useState<Goal[]>(loadGoals);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("Personal");
  const [targetDesc, setTargetDesc] = useState("");
  const [deadline, setDeadline] = useState("");

  const persist = (updated: Goal[]) => {
    setGoals(updated);
    saveGoals(updated);
    window.dispatchEvent(new CustomEvent("melina:goals-updated"));
  };

  const handleAdd = () => {
    if (!title.trim()) {
      toast.error("Goal title is required");
      return;
    }
    const newGoal: Goal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      category,
      targetDescription: targetDesc.trim(),
      deadline: deadline || undefined,
      progress: 0,
      status: "active",
      createdAt: Date.now(),
    };
    persist([...goals, newGoal]);
    setTitle("");
    setTargetDesc("");
    setDeadline("");
    setCategory("Personal");
    setShowForm(false);
    toast.success("Goal added", { description: newGoal.title });
  };

  const handleProgressChange = (id: string, value: number) => {
    const updated = goals.map((g) =>
      g.id === id ? { ...g, progress: value } : g,
    );
    persist(updated);
  };

  const handleComplete = (id: string) => {
    const updated = goals.map((g) =>
      g.id === id
        ? { ...g, status: "completed" as GoalStatus, progress: 100 }
        : g,
    );
    persist(updated);
    toast.success("Goal completed! \uD83C\uDF89");
  };

  const handleDelete = (id: string) => {
    persist(goals.filter((g) => g.id !== id));
    toast.success("Goal removed");
  };

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-primary/60" />
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-primary/70">
            Goals Engine
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="h-6 w-6 flex items-center justify-center rounded-sm border border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition-all"
          aria-label="Add goal"
          data-ocid="goals.open_modal_button"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div
          className="p-2.5 rounded-sm bg-card/20 border border-border/40 space-y-2"
          data-ocid="goals.modal"
        >
          <Input
            placeholder="Goal title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-7 font-body text-xs rounded-sm bg-transparent border-border/50 hud-input"
            data-ocid="goals.input"
          />
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as GoalCategory)}
          >
            <SelectTrigger
              className="h-7 font-mono text-[10px] rounded-sm bg-transparent border-border/50 hud-input"
              data-ocid="goals.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                [
                  "Fitness",
                  "Learning",
                  "Productivity",
                  "Personal",
                ] as GoalCategory[]
              ).map((cat) => (
                <SelectItem key={cat} value={cat} className="font-mono text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Target description (optional)..."
            value={targetDesc}
            onChange={(e) => setTargetDesc(e.target.value)}
            className="h-7 font-body text-xs rounded-sm bg-transparent border-border/50 hud-input"
          />
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="h-7 font-mono text-[10px] rounded-sm bg-transparent border-border/50 hud-input"
          />
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              className="flex-1 h-7 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-mono text-[9px] tracking-widest uppercase rounded-sm"
              data-ocid="goals.submit_button"
            >
              + Add Goal
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="h-7 font-mono text-[9px] rounded-sm text-muted-foreground"
              data-ocid="goals.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Active Goals */}
      {active.length === 0 && !showForm ? (
        <div className="text-center py-6" data-ocid="goals.empty_state">
          <Target className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="font-mono text-[10px] text-muted-foreground/40 tracking-wider">
            No active goals
          </p>
          <p className="font-body text-[10px] text-muted-foreground/30 mt-1">
            Tap + to set a goal
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((goal, idx) => (
            <div
              key={goal.id}
              className={`rounded-sm p-2 border ${CATEGORY_COLORS[goal.category]} space-y-1.5`}
              data-ocid={`goals.item.${idx + 1}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-foreground/90 leading-tight">
                    {goal.title}
                  </p>
                  <span className="font-mono text-[8px] tracking-widest uppercase opacity-70">
                    {goal.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleComplete(goal.id)}
                    className="p-0.5 text-green-400/50 hover:text-green-400 transition-colors"
                    title="Complete"
                    data-ocid={`goals.confirm_button.${idx + 1}`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    className="p-0.5 text-muted-foreground/30 hover:text-destructive transition-colors"
                    title="Delete"
                    data-ocid={`goals.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {goal.targetDescription && (
                <p className="font-body text-[9px] text-muted-foreground/60 leading-snug">
                  {goal.targetDescription}
                </p>
              )}

              {goal.deadline && (
                <p className="font-mono text-[8px] text-muted-foreground/50">
                  Due: {new Date(goal.deadline).toLocaleDateString()}
                </p>
              )}

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] text-muted-foreground/50">
                    Progress
                  </span>
                  <span className="font-mono text-[8px] text-foreground/70">
                    {goal.progress}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${CATEGORY_BAR[goal.category]}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={goal.progress}
                    onChange={(e) =>
                      handleProgressChange(goal.id, Number(e.target.value))
                    }
                    className="w-14 h-1 accent-primary cursor-pointer"
                    data-ocid={`goals.toggle.${idx + 1}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Goals */}
      {completed.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-px bg-border/40" />
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-muted-foreground/40">
              Completed ({completed.length})
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          {completed.slice(0, 3).map((goal, idx) => (
            <div
              key={goal.id}
              className="flex items-center gap-2 px-2 py-1 rounded-sm bg-muted/10 border border-border/20"
              data-ocid={`goals.completed.item.${idx + 1}`}
            >
              <CheckCircle2 className="w-3 h-3 text-green-400/50 flex-shrink-0" />
              <span className="font-mono text-[9px] text-muted-foreground/50 line-through flex-1 truncate">
                {goal.title}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(goal.id)}
                className="text-muted-foreground/20 hover:text-destructive transition-colors"
                aria-label="Remove"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats strip */}
      {goals.length > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/20">
          <TrendingUp className="w-2.5 h-2.5 text-primary/40" />
          <span className="font-mono text-[8px] text-muted-foreground/40">
            {active.length} active \xB7 {completed.length} completed
          </span>
        </div>
      )}
    </div>
  );
}
