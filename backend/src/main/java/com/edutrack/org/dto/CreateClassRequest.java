package com.edutrack.org.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateClassRequest(@NotBlank String className) {
}
