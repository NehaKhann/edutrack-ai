package com.edutrack.staffattendance.dto;

import java.time.LocalTime;

public record AttendancePolicyResponse(LocalTime cutoffTime, LocalTime autoAbsentTime) {
}
