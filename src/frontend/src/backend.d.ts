import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ActivityStats {
    unreadNotifications: bigint;
    memoryEntries: bigint;
    totalMessages: bigint;
    completedReminders: bigint;
    pendingReminders: bigint;
}
export type Timestamp = bigint;
export interface MemoryEntry {
    key: string;
    value: string;
}
export interface AssistantSettings {
    notificationsEnabled: boolean;
    memoryTrackingEnabled: boolean;
    tone: ChatTone;
    assistantDisplayName: string;
}
export interface Reminder {
    id: bigint;
    title: string;
    note: string;
    completed: boolean;
    dueTime: Timestamp;
}
export interface ChatResponse {
    message: string;
    response: string;
}
export interface Notification {
    id: bigint;
    content: string;
    source: NotificationSource;
    suggestion: string;
    dismissed: boolean;
}
export interface Message {
    content: string;
    role: string;
    timestamp: Timestamp;
}
export interface IntegrationStatus {
    files: boolean;
    contacts: boolean;
    messages: boolean;
    email: boolean;
    calendar: boolean;
    camera: boolean;
}
export interface ChatRequest {
    message: string;
}
export interface UserProfile {
    username: string;
    email: string;
}
export enum ChatTone {
    humorous = "humorous",
    friendly = "friendly",
    casual = "casual",
    formal = "formal"
}
export enum NotificationSource {
    email = "email",
    calendar = "calendar",
    message = "message"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    chat(request: ChatRequest): Promise<ChatResponse>;
    clearChatHistory(): Promise<void>;
    completeReminder(id: bigint): Promise<void>;
    createReminder(title: string, note: string, dueTime: Timestamp): Promise<bigint>;
    deleteMemoryEntry(key: string): Promise<void>;
    deleteReminder(id: bigint): Promise<void>;
    dismissNotification(id: bigint): Promise<void>;
    getActivityStats(): Promise<ActivityStats>;
    getAllMemoryEntries(): Promise<Array<MemoryEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChatHistory(): Promise<Array<Message>>;
    getIntegrationStatus(): Promise<IntegrationStatus>;
    getNotifications(): Promise<Array<Notification>>;
    getReminders(): Promise<Array<Reminder>>;
    getSettings(): Promise<AssistantSettings>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    seedMockNotifications(): Promise<void>;
    setIntegrationStatus(integration: string, enabled: boolean): Promise<void>;
    updateMemoryEntry(key: string, value: string): Promise<void>;
    updateSettings(newSettings: AssistantSettings): Promise<void>;
}
