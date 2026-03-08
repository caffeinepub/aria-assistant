import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export interface ChatResponse {
    message: string;
    response: string;
}
export interface ChatRequest {
    message: string;
}
export interface Message {
    content: string;
    role: string;
    timestamp: Timestamp;
}
export interface MemoryEntry {
    key: string;
    value: string;
}
export interface UserProfile {
    username: string;
    email: string;
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
    deleteMemoryEntry(key: string): Promise<void>;
    getAllMemoryEntries(): Promise<Array<MemoryEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChatHistory(): Promise<Array<Message>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateMemoryEntry(key: string, value: string): Promise<void>;
}
