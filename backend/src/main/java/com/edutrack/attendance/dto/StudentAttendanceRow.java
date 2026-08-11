package com.edutrack.attendance.dto;

import com.edutrack.attendance.entity.StudentAttendanceStatus;

public record StudentAttendanceRow(
        Long studentId,
        String name,
        String rollNumber,
        StudentAttendanceStatus status
) {
}
