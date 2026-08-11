package com.edutrack.staffattendance.dto;

import com.edutrack.staffattendance.entity.SkippedClassReport;

import java.time.LocalDate;

public record SkippedClassReportResponse(
        Long id,
        Long subjectId,
        String subjectName,
        LocalDate date,
        Integer period,
        String reason,
        Long substituteTeacherId,
        String substituteTeacherName
) {
    public static SkippedClassReportResponse from(SkippedClassReport r) {
        return new SkippedClassReportResponse(
                r.getId(), r.getSubject().getId(), r.getSubject().getName(), r.getReportDate(), r.getPeriod(), r.getReason(),
                r.getSubstituteTeacher() != null ? r.getSubstituteTeacher().getId() : null,
                r.getSubstituteTeacher() != null ? r.getSubstituteTeacher().getName() : null
        );
    }
}
