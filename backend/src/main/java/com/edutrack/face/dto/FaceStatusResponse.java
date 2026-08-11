package com.edutrack.face.dto;

import java.time.Instant;

public record FaceStatusResponse(
        boolean enrolled,
        Instant enrolledAt
) {
}
