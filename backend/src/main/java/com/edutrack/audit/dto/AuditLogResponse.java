package com.edutrack.audit.dto;

import com.edutrack.audit.entity.AuditLog;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        String actorName,
        String action,
        String targetType,
        Long targetId,
        String targetLabel,
        String detail,
        Instant createdAt
) {
    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId(), log.getActorName(), log.getAction().name(),
                log.getTargetType(), log.getTargetId(), log.getTargetLabel(),
                log.getDetail(), log.getCreatedAt()
        );
    }
}
