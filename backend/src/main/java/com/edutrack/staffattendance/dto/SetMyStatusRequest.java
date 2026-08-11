package com.edutrack.staffattendance.dto;

import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import jakarta.validation.constraints.NotNull;

public record SetMyStatusRequest(@NotNull TeacherAttendanceStatus status) {
}
