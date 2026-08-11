package com.edutrack.calendar.dto;

import java.time.LocalDate;

public record DayStatusResponse(
        LocalDate date,
        String calendarStatus,
        String calendarReason,
        boolean weekend,
        boolean onApprovedLeave,
        boolean diarySubmitted,
        boolean attendanceMarked,
        String personalNote
) {
}
