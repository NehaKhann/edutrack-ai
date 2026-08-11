package com.edutrack.staffattendance.dto;

import com.edutrack.staffattendance.entity.LeaveRequest;

import java.time.Instant;
import java.time.LocalDate;

public record LeaveRequestResponse(
        Long id,
        Long teacherId,
        String teacherName,
        String leaveType,
        LocalDate fromDate,
        LocalDate toDate,
        String reason,
        boolean hasDocument,
        String documentFilename,
        String status,
        String reviewedByName,
        Instant reviewedAt,
        Instant createdAt
) {
    public static LeaveRequestResponse from(LeaveRequest r) {
        return new LeaveRequestResponse(
                r.getId(), r.getTeacher().getId(), r.getTeacher().getName(),
                r.getLeaveType().name(), r.getFromDate(), r.getToDate(), r.getReason(),
                r.getDocumentFileRef() != null, r.getDocumentFilename(),
                r.getStatus().name(),
                r.getReviewedBy() != null ? r.getReviewedBy().getName() : null,
                r.getReviewedAt(), r.getCreatedAt()
        );
    }
}
