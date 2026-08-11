package com.edutrack.face.dto;

import java.time.Instant;

public record FaceVerifyResponse(
        boolean matched,
        double similarity,
        String status,
        Instant markedAt
) {
}
