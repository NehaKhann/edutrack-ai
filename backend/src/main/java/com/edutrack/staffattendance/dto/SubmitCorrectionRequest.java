package com.edutrack.staffattendance.dto;

import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SubmitCorrectionRequest(
        @NotNull LocalDate attendanceDate,
        TeacherAttendanceStatus requestedStatus,
        @NotBlank String reason
) {
}
