package com.edutrack.calendar.dto;

import com.edutrack.calendar.entity.CalendarDayOverride;

import java.time.Instant;
import java.time.LocalDate;

public record DayOverrideResponse(LocalDate date, String status, String reason, String changedByName, Instant changedAt) {
    public static DayOverrideResponse from(CalendarDayOverride o) {
        return new DayOverrideResponse(
                o.getDate(), o.getStatus().name(), o.getReason(),
                o.getChangedBy() != null ? o.getChangedBy().getName() : null,
                o.getChangedAt()
        );
    }
}
