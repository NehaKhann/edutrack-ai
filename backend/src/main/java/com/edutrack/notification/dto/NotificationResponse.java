package com.edutrack.notification.dto;

import com.edutrack.notification.entity.Notification;

import java.time.Instant;

public record NotificationResponse(Long id, String message, String link, boolean read, Instant createdAt) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getId(), n.getMessage(), n.getLink(), n.isRead(), n.getCreatedAt());
    }
}
