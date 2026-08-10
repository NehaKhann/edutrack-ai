package com.edutrack.syllabus.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ShiftTopicDatesRequest(@NotNull @Min(-3650) @Max(3650) Integer days) {
}
