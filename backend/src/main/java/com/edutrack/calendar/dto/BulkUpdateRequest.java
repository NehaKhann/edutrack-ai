package com.edutrack.calendar.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.DayOfWeek;
import java.time.LocalDate;

public record BulkUpdateRequest(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        DayOfWeek dayOfWeek,
        @NotNull @Pattern(regexp = "WORKING|OFF") String status,
        String reason
) {
}
