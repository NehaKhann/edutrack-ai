package com.edutrack.staffattendance.dto;

import com.edutrack.staffattendance.entity.AttendanceCorrectionRequest;

import java.time.Instant;
import java.time.LocalDate;

public record AttendanceCorrectionRequestResponse(
        Long id,
        Long teacherId,
        String teacherName,
        LocalDate attendanceDate,
        String requestedStatus,
        String reason,
        String status,
        String reviewedByName,
        Instant reviewedAt,
        Instant createdAt
) {
    public static AttendanceCorrectionRequestResponse from(AttendanceCorrectionRequest r) {
        return new AttendanceCorrectionRequestResponse(
                r.getId(), r.getTeacher().getId(), r.getTeacher().getName(),
                r.getAttendanceDate(), r.getRequestedStatus() != null ? r.getRequestedStatus().name() : null,
                r.getReason(), r.getStatus().name(),
                r.getReviewedBy() != null ? r.getReviewedBy().getName() : null,
                r.getReviewedAt(), r.getCreatedAt()
        );
    }
}
