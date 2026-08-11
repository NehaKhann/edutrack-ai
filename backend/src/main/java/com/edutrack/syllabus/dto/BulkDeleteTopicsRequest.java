package com.edutrack.syllabus.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BulkDeleteTopicsRequest(@NotEmpty List<Long> topicIds) {
}
