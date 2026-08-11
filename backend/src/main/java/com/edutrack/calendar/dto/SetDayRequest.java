package com.edutrack.calendar.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record SetDayRequest(
        @NotNull LocalDate date,
        @NotNull @Pattern(regexp = "WORKING|OFF|EXAM|EVENT") String status,
        String reason
) {
}
