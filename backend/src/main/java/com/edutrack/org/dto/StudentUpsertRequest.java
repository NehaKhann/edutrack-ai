package com.edutrack.org.dto;

import jakarta.validation.constraints.NotBlank;

public record StudentUpsertRequest(
        @NotBlank String name,
        @NotBlank String rollNumber
) {
}
