package com.edutrack.attendance.dto;

public record ClassAttendanceSummary(
        Long classSectionId,
        String classSectionName,
        int total,
        int present,
        int absent,
        int late,
        int leave,
        double attendancePercent,
        boolean completed
) {
}
