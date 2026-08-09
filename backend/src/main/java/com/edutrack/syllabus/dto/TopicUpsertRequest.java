package com.edutrack.syllabus.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record TopicUpsertRequest(
        @NotBlank String title,
        Integer startWeek,
        Integer endWeek,
        @NotNull LocalDate plannedStartDate,
        @NotNull LocalDate plannedEndDate
) {
}
