package com.edutrack.audit.service;

import com.edutrack.audit.dto.AuditLogResponse;
import com.edutrack.audit.entity.AuditAction;
import com.edutrack.audit.entity.AuditLog;
import com.edutrack.audit.repository.AuditLogRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Records one row of the "who changed what, when" trail. Called inline from within the same
     * transaction as the business change it's logging, so a failure here rolls back with it rather
     * than silently succeeding without a matching log entry.
     */
    @Transactional
    public void record(AuditAction action, String targetType, Long targetId, String targetLabel, String detail) {
        AuthenticatedUser actor = CurrentUser.get();
        auditLogRepository.save(new AuditLog(
                actor.getSchoolId(), actor.getUserId(), actor.getName(),
                action, targetType, targetId, targetLabel, detail
        ));
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> list(Pageable pageable) {
        Long schoolId = CurrentUser.get().getSchoolId();
        return auditLogRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId, pageable).map(AuditLogResponse::from);
    }
}
