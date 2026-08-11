package com.edutrack.attendance.dto;

import com.edutrack.attendance.entity.StudentAttendanceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record BulkAttendanceRequest(
        @NotNull Long classSectionId,
        @NotNull LocalDate date,
        Long subjectId,
        Integer period,
        @NotEmpty @Valid List<Mark> marks
) {
    public record Mark(@NotNull Long studentId, @NotNull StudentAttendanceStatus status) {
    }
}
