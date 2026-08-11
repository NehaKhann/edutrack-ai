package com.edutrack.face.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmbeddingRequest(
        @NotNull @Size(min = 128, max = 128, message = "A face descriptor must have exactly 128 dimensions")
        double[] embedding
) {
}
