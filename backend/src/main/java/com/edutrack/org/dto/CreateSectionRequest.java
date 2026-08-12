package com.edutrack.org.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSectionRequest(@NotBlank String className, @NotBlank String sectionName) {
}
