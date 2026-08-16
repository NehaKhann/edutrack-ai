import { apiClient, unwrap } from "./client";
import type { AppNotification } from "../types/notification";

export function list(): Promise<AppNotification[]> {
  return unwrap(apiClient.get("/api/notifications"));
}

export function unreadCount(): Promise<{ count: number }> {
  return unwrap(apiClient.get("/api/notifications/unread-count"));
}

export function markAllRead(): Promise<void> {
  return unwrap(apiClient.post("/api/notifications/read-all"));
}

export function dismiss(id: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/notifications/${id}`));
}

export function clearAll(): Promise<void> {
  return unwrap(apiClient.delete("/api/notifications"));
}
