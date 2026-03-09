import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActivityStats,
  AssistantSettings,
  IntegrationStatus,
  MemoryEntry,
  Message,
  Notification,
  Reminder,
  ScheduleEvent,
  ScheduleEventId,
  Timestamp,
  UserProfile,
} from "../backend.d";
import { useActor } from "./useActor";

// ─── Chat History ───────────────────────────────────────────────
export function useChatHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getChatHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Send Message ────────────────────────────────────────────────
export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.chat({ message });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
      void queryClient.invalidateQueries({ queryKey: ["activityStats"] });
    },
  });
}

// ─── Clear Chat History ───────────────────────────────────────────
export function useClearChat() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.clearChatHistory();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
  });
}

// ─── Memory Entries ───────────────────────────────────────────────
export function useMemoryEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<MemoryEntry[]>({
    queryKey: ["memoryEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMemoryEntries();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Update Memory Entry ──────────────────────────────────────────
export function useUpdateMemory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateMemoryEntry(key, value);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["memoryEntries"] });
      void queryClient.invalidateQueries({ queryKey: ["activityStats"] });
    },
  });
}

// ─── Delete Memory Entry ──────────────────────────────────────────
export function useDeleteMemory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteMemoryEntry(key);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["memoryEntries"] });
      void queryClient.invalidateQueries({ queryKey: ["activityStats"] });
    },
  });
}

// ─── User Profile ─────────────────────────────────────────────────
export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Save User Profile ────────────────────────────────────────────
export function useSaveUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

// ─── Reminders ────────────────────────────────────────────────────
export function useReminders() {
  const { actor, isFetching } = useActor();
  return useQuery<Reminder[]>({
    queryKey: ["reminders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReminders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateReminder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      note,
      dueTime,
    }: {
      title: string;
      note: string;
      dueTime: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createReminder(title, note, dueTime);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
      void queryClient.invalidateQueries({ queryKey: ["activityStats"] });
    },
  });
}

export function useCompleteReminder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.completeReminder(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
      void queryClient.invalidateQueries({ queryKey: ["activityStats"] });
    },
  });
}

export function useDeleteReminder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteReminder(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
      void queryClient.invalidateQueries({ queryKey: ["activityStats"] });
    },
  });
}

// ─── Notifications ─────────────────────────────────────────────────
export function useNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDismissNotification() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.dismissNotification(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["activityStats"] });
    },
  });
}

export function useSeedNotifications() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.seedMockNotifications();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── Integrations ──────────────────────────────────────────────────
export function useIntegrationStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<IntegrationStatus>({
    queryKey: ["integrations"],
    queryFn: async () => {
      if (!actor) {
        return {
          files: false,
          contacts: false,
          messages: false,
          email: false,
          calendar: false,
          camera: false,
        };
      }
      return actor.getIntegrationStatus();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetIntegration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integration,
      enabled,
    }: {
      integration: string;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setIntegrationStatus(integration, enabled);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

// ─── Assistant Settings ────────────────────────────────────────────
export function useAssistantSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<AssistantSettings | null>({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSettings: AssistantSettings) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateSettings(newSettings);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ─── Activity Stats ────────────────────────────────────────────────
export function useActivityStats() {
  const { actor, isFetching } = useActor();
  return useQuery<ActivityStats | null>({
    queryKey: ["activityStats"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getActivityStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Schedule Events ───────────────────────────────────────────────
export function useScheduleEvents() {
  const { actor, isFetching } = useActor();
  return useQuery<ScheduleEvent[]>({
    queryKey: ["scheduleEvents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getScheduleEvents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useScheduleEventsByDate(date: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ScheduleEvent[]>({
    queryKey: ["scheduleEvents", "byDate", date],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getScheduleEventsByDate(date);
    },
    enabled: !!actor && !isFetching && !!date,
  });
}

export function useCreateScheduleEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      note,
      category,
      startTime,
      endTime,
      date,
    }: {
      title: string;
      note: string;
      category: string;
      startTime: Timestamp;
      endTime: Timestamp;
      date: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createScheduleEvent(
        title,
        note,
        category,
        startTime,
        endTime,
        date,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });
}

export function useUpdateScheduleEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      note,
      category,
      startTime,
      endTime,
      date,
    }: {
      id: ScheduleEventId;
      title: string;
      note: string;
      category: string;
      startTime: Timestamp;
      endTime: Timestamp;
      date: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateScheduleEvent(
        id,
        title,
        note,
        category,
        startTime,
        endTime,
        date,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });
}

export function useDeleteScheduleEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: ScheduleEventId) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteScheduleEvent(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });
}

export function useCompleteScheduleEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: ScheduleEventId) => {
      if (!actor) throw new Error("Actor not available");
      return actor.completeScheduleEvent(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });
}

// ─── Chat History Page ─────────────────────────────────────────────
export function useChatHistoryPage(offset: number, limit: number) {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["chatHistoryPage", offset, limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getChatHistoryPage(BigInt(offset), BigInt(limit));
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Chat History Count ────────────────────────────────────────────
export function useChatHistoryCount() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["chatHistoryCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getChatHistoryCount();
    },
    enabled: !!actor && !isFetching,
  });
}
