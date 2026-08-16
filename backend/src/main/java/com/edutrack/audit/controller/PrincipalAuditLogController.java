package com.edutrack.audit.controller;

import com.edutrack.audit.dto.AuditLogPageResponse;
import com.edutrack.audit.dto.AuditLogResponse;
import com.edutrack.audit.service.AuditLogService;
import com.edutrack.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PrincipalAuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping("/api/principal/audit-log")
    public ApiResponse<AuditLogPageResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<AuditLogResponse> result = auditLogService.list(PageRequest.of(page, Math.min(size, 200), Sort.by(Sort.Direction.DESC, "createdAt")));
        return ApiResponse.ok(AuditLogPageResponse.from(result));
    }
}
