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
export interface ScheduleEvent {
    id: ScheduleEventId;
    startTime: Timestamp;
    title: string;
    endTime: Timestamp;
    date: string;
    note: string;
    completed: boolean;
    category: string;
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
export interface ChatRequest {
    message: string;
}
export type ScheduleEventId = bigint;
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
export interface ChatResponse {
    message: string;
    response: string;
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
    completeScheduleEvent(id: ScheduleEventId): Promise<boolean>;
    createReminder(title: string, note: string, dueTime: Timestamp): Promise<bigint>;
    createScheduleEvent(title: string, note: string, category: string, startTime: Timestamp, endTime: Timestamp, date: string): Promise<ScheduleEventId>;
    deleteMemoryEntry(key: string): Promise<void>;
    deleteReminder(id: bigint): Promise<void>;
    deleteScheduleEvent(id: ScheduleEventId): Promise<boolean>;
    dismissNotification(id: bigint): Promise<void>;
    getActivityStats(): Promise<ActivityStats>;
    getAllMemoryEntries(): Promise<Array<MemoryEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChatHistory(): Promise<Array<Message>>;
    getChatHistoryPage: (offset: bigint, limit: bigint) => Promise<Message[]>;
    getChatHistoryCount: () => Promise<bigint>;
    getIntegrationStatus(): Promise<IntegrationStatus>;
    getNotifications(): Promise<Array<Notification>>;
    getReminders(): Promise<Array<Reminder>>;
    getScheduleEvents(): Promise<Array<ScheduleEvent>>;
    getScheduleEventsByDate(date: string): Promise<Array<ScheduleEvent>>;
    getSettings(): Promise<AssistantSettings>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    seedMockNotifications(): Promise<void>;
    setIntegrationStatus(integration: string, enabled: boolean): Promise<void>;
    updateMemoryEntry(key: string, value: string): Promise<void>;
    updateScheduleEvent(id: ScheduleEventId, title: string, note: string, category: string, startTime: Timestamp, endTime: Timestamp, date: string): Promise<boolean>;
    updateSettings(newSettings: AssistantSettings): Promise<void>;
}
