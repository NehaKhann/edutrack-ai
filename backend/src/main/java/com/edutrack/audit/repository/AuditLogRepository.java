package com.edutrack.audit.repository;

import com.edutrack.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findBySchoolIdOrderByCreatedAtDesc(Long schoolId, Pageable pageable);
}
