package com.edutrack.calendar.dto;

import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.util.Set;

public record WeekendDaysRequest(@NotNull Set<DayOfWeek> weekendDays) {
}
