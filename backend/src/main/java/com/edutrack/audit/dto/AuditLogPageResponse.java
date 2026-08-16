package com.edutrack.audit.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record AuditLogPageResponse(
        List<AuditLogResponse> items,
        int page,
        int totalPages,
        long totalItems
) {
    public static AuditLogPageResponse from(Page<AuditLogResponse> page) {
        return new AuditLogPageResponse(page.getContent(), page.getNumber(), page.getTotalPages(), page.getTotalElements());
    }
}
