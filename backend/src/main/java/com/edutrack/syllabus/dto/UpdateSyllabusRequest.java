package com.edutrack.syllabus.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateSyllabusRequest(@NotBlank String term, @NotNull LocalDate termStartDate) {
}
