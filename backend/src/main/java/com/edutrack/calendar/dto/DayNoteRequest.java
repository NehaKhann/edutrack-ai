package com.edutrack.calendar.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record DayNoteRequest(
        @NotNull LocalDate date,
        @Size(max = 500) String note
) {
}
