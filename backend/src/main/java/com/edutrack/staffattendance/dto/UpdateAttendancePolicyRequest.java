package com.edutrack.staffattendance.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record UpdateAttendancePolicyRequest(
        @NotNull LocalTime cutoffTime,
        @NotNull LocalTime autoAbsentTime
) {
}
