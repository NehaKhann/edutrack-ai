package com.edutrack.staffattendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateSkipReportRequest(
        @NotNull Long subjectId,
        @NotNull LocalDate date,
        Integer period,
        @NotBlank String reason,
        Long substituteTeacherId
) {
}
