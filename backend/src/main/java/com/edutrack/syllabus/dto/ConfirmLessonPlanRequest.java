package com.edutrack.syllabus.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ConfirmLessonPlanRequest(
        @NotNull @Pattern(regexp = "COVERED|MISSED") String status,
        String reason
) {
}
