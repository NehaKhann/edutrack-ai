package com.edutrack.staffattendance.dto;

public record TeacherAttendanceTodayRow(
        Long teacherId,
        String teacherName,
        String status,
        String method,
        String leaveReason,
        Long pendingLeaveId,
        int skippedPeriodsCount,
        boolean absentWithoutLeave
) {
}
