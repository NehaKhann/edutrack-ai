package com.edutrack.staffattendance.dto;

import java.time.Instant;
import java.util.List;

public record TeacherAttendanceDetailResponse(
        Long teacherId,
        String teacherName,
        String todayStatus,
        String todayMethod,
        Instant todayMarkedAt,
        String todayLeaveReason,
        List<SkippedClassReportResponse> skippedClasses,
        List<LeaveRequestResponse> leaveHistory,
        int monthlyPresentDays,
        int monthlyLeavesTaken,
        int monthlyClassesSkipped,
        double monthlyAttendancePercent
) {
}
