package com.edutrack.chat.dto;

import java.time.Instant;

public record ConversationResponse(
        Long id,
        String type,
        String displayName,
        Long otherUserId,
        String lastMessagePreview,
        String lastMessageType,
        Instant lastMessageAt,
        long unreadCount
) {
}
