import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemoryEntry, Message, UserProfile } from "../backend.d";
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
