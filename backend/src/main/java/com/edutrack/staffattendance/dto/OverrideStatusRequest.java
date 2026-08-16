package com.edutrack.staffattendance.dto;

import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

/** {@code time} is the actual/tentative time the Principal is recording this against — never defaulted to "now" on the backend. */
public record OverrideStatusRequest(@NotNull TeacherAttendanceStatus status, @NotNull LocalTime time) {
}
