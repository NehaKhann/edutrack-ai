package com.edutrack.staffattendance.dto;

import java.time.Instant;

public record MyTodayStatusResponse(
        String status,
        String method,
        Instant markedAt
) {
}
