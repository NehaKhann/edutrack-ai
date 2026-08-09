package com.edutrack.syllabus.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateDocumentTextRequest(@NotNull String extractedText) {
}
