package com.edutrack.chat.dto;

import com.edutrack.chat.entity.ChatMessage;

import java.time.Instant;

public record MessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        String senderName,
        String type,
        String content,
        boolean hasFile,
        String fileName,
        Long fileSize,
        String mimeType,
        Integer durationSeconds,
        Instant createdAt,
        boolean deleted
) {
    // A deleted message already has its content/file fields cleared in the DB (see
    // ChatService.deleteMessage), so this just passes through whatever's left -- no extra redaction needed.
    public static MessageResponse from(ChatMessage m) {
        return new MessageResponse(
                m.getId(), m.getConversation().getId(), m.getSender().getId(), m.getSender().getName(),
                m.getType().name(), m.getContent(),
                m.getFileRef() != null, m.getFileName(), m.getFileSize(), m.getMimeType(), m.getDurationSeconds(),
                m.getCreatedAt(), m.getDeletedAt() != null
        );
    }
}
