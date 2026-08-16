package com.edutrack.staffattendance.dto;

public record MyAttendanceSummaryResponse(
        long weekPresent,
        long weekAbsent,
        long weekLate,
        long weekOnLeave,
        long weekHalfDay,
        int monthAttendancePercent
) {
}
