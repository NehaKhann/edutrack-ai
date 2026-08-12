package com.edutrack.org.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateSubjectRequest(
        @NotBlank String name,
        @NotNull Long teacherId
) {
}
