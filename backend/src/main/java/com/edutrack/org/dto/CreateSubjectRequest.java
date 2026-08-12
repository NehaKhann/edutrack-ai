package com.edutrack.org.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSubjectRequest(
        @NotNull Long classSectionId,
        @NotBlank String name,
        @NotNull Long teacherId
) {
}
