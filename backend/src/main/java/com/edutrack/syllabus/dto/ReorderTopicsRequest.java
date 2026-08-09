package com.edutrack.syllabus.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ReorderTopicsRequest(@NotEmpty List<Long> topicIdsInOrder) {
}
