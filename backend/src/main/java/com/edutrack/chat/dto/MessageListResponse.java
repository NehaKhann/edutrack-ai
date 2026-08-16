package com.edutrack.chat.dto;

import java.time.Instant;
import java.util.List;

/**
 * readThroughAt is the point in time up to which every OTHER participant has read the conversation —
 * null if any of them hasn't opened it at all yet. The frontend renders a message's ticks blue when
 * that message's createdAt is at or before this timestamp.
 */
public record MessageListResponse(List<MessageResponse> messages, Instant readThroughAt) {
}
