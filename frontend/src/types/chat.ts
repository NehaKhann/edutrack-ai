export type ConversationType = "DIRECT" | "GROUP";
export type ChatMessageType = "TEXT" | "IMAGE" | "DOCUMENT" | "VOICE";

export interface Contact {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  displayName: string;
  otherUserId: number | null;
  lastMessagePreview: string | null;
  lastMessageType: ChatMessageType | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  type: ChatMessageType;
  content: string | null;
  hasFile: boolean;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  durationSeconds: number | null;
  createdAt: string;
  deleted: boolean;
}

export interface MessageListResponse {
  messages: ChatMessage[];
  /** Every other participant has read up to this timestamp — null if any of them hasn't opened the conversation at all. */
  readThroughAt: string | null;
}
