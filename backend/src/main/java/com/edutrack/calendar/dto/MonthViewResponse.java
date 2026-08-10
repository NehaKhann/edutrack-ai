package com.edutrack.calendar.dto;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Set;

public record MonthViewResponse(
        int year,
        int month,
        Set<DayOfWeek> weekendDays,
        List<DayOverrideResponse> overrides
) {
}
