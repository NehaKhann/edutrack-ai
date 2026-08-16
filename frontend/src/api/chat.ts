import { apiClient, unwrap } from "./client";
import type { ChatMessage, ChatMessageType, Contact, Conversation, MessageListResponse } from "../types/chat";

export function listContacts(): Promise<Contact[]> {
  return unwrap(apiClient.get("/api/chat/contacts"));
}

export function listConversations(): Promise<Conversation[]> {
  return unwrap(apiClient.get("/api/chat/conversations"));
}

export function startDirect(userId: number): Promise<Conversation> {
  return unwrap(apiClient.post("/api/chat/conversations/direct", { userId }));
}

export function createGroup(name: string, participantIds: number[]): Promise<Conversation> {
  return unwrap(apiClient.post("/api/chat/conversations/group", { name, participantIds }));
}

export function getMessages(conversationId: number, before?: string, limit?: number): Promise<MessageListResponse> {
  return unwrap(apiClient.get(`/api/chat/conversations/${conversationId}/messages`, { params: { before, limit } }));
}

export function getNewMessages(conversationId: number, after?: string): Promise<MessageListResponse> {
  return unwrap(apiClient.get(`/api/chat/conversations/${conversationId}/messages/new`, { params: { after } }));
}

export function sendMessage(params: {
  conversationId: number;
  type: ChatMessageType;
  content?: string;
  file?: File | Blob | null;
  fileName?: string;
  durationSeconds?: number;
}): Promise<ChatMessage> {
  const form = new FormData();
  form.append("type", params.type);
  if (params.content) form.append("content", params.content);
  if (params.file) form.append("file", params.file, params.fileName);
  if (params.durationSeconds != null) form.append("durationSeconds", String(params.durationSeconds));
  return unwrap(
    apiClient.post(`/api/chat/conversations/${params.conversationId}/messages`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
}

export function markRead(conversationId: number): Promise<void> {
  return unwrap(apiClient.post(`/api/chat/conversations/${conversationId}/read`));
}

export function deleteMessage(conversationId: number, messageId: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/chat/conversations/${conversationId}/messages/${messageId}`));
}

export function deleteConversation(conversationId: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/chat/conversations/${conversationId}`));
}

export function unreadCount(): Promise<{ count: number }> {
  return unwrap(apiClient.get("/api/chat/unread-count"));
}

export async function loadFileBlob(messageId: number): Promise<Blob> {
  const res = await apiClient.get(`/api/chat/files/${messageId}`, { responseType: "blob" });
  return res.data;
}

export async function downloadFile(messageId: number, filename: string): Promise<void> {
  const blob = await loadFileBlob(messageId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
