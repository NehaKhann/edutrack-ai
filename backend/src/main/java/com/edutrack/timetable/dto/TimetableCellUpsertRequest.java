package com.edutrack.timetable.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;

public record TimetableCellUpsertRequest(
        @NotNull DayOfWeek dayOfWeek,
        @NotNull @Min(1) @Max(8) Integer period,
        Long subjectId
) {
}
